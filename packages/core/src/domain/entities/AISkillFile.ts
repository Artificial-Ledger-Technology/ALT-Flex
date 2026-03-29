/**
 * @module AISkillFile
 * @description Domain entity for AI audit skill files scraped from GitHub.
 *
 * These are structured prompts (YAML/Markdown/JSON) that provide AI assistants
 * with specialized knowledge for smart contract security auditing.
 *
 * Skill files are sourced from open-source repositories and indexed by
 * Engine β (AI Skills Explorer). Each file undergoes safety analysis
 * by the AEGIS Safety Scanner to detect malicious patterns.
 *
 * @hexagonal Entity — Domain Layer
 * @academic Central to Thesis 1: "Automated Detection of Malicious Intent
 *           in AI Audit Skill Files for Web3 Security"
 */

import { z } from 'zod';
import { SafetyLabel, SafetyLabelSchema } from '../value-objects/SafetyLabel.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Target AI platform for the skill file.
 * Each platform has different skill file formats and conventions.
 */
export const AIPlatformSchema = z.enum([
  'claude',   // Anthropic Claude (.claude/skills/)
  'cursor',   // Cursor IDE (.cursor/rules/)
  'mcp',      // Model Context Protocol (tool definitions)
  'copilot',  // GitHub Copilot instructions
  'gemini',   // Google Gemini (.gemini/skills/)
  'windsurf', // Windsurf IDE
  'generic',  // Platform-agnostic or unknown
]);
export type AIPlatform = z.infer<typeof AIPlatformSchema>;

/**
 * Target smart contract language the skill specializes in.
 */
export const SmartContractLanguageSchema = z.enum([
  'solidity', // Ethereum / EVM
  'vyper',    // Ethereum / EVM (Python-like)
  'rust',     // Solana (Anchor), NEAR, Cosmos
  'move',     // Aptos, Sui
  'cairo',    // StarkNet
  'multi',    // Multi-language or language-agnostic
]);
export type SmartContractLanguage = z.infer<typeof SmartContractLanguageSchema>;

/**
 * Source file format of the skill file.
 */
export const SkillFileFormatSchema = z.enum([
  'yaml',       // YAML with frontmatter
  'markdown',   // Pure Markdown (e.g., SKILL.md)
  'json',       // JSON configuration
  'toml',       // TOML configuration
  'text',       // Plain text instructions
]);
export type SkillFileFormat = z.infer<typeof SkillFileFormatSchema>;

/**
 * Audit skill category classification.
 * Organized by purpose for the AI Skills Explorer UI.
 */
export const SkillCategorySchema = z.enum([
  'vulnerability-detection',   // Finding bugs and exploits
  'code-review',               // General code review assistance
  'gas-optimization',          // Gas efficiency analysis
  'formal-verification',       // Mathematical proof assistance
  'documentation',             // NatSpec / documentation generation
  'testing',                   // Test generation and fuzzing
  'deployment',                // Deployment and upgrade assistance
  'monitoring',                // On-chain monitoring and alerting
  'incident-response',         // Post-exploit analysis
  'general',                   // General-purpose
]);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// AISkillFile Entity Schema
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AISkillFile — Domain entity for indexed AI audit skill files.
 *
 * Design Decisions:
 * 1. `contentHash` (SHA-256) enables deduplication across repos that fork/copy skills
 * 2. `safetyLabel` starts as UNANALYZED and transitions through scanner pipeline
 * 3. `copyCount` + `starCount` enable popularity-based ranking
 * 4. `platform` + `language` enable multi-dimensional filtering
 * 5. `tags` provide free-form categorization beyond the fixed `category` enum
 * 6. `sourceRepo` + `filePath` form a composite natural key for dedup
 *
 * @invariant content.length > 0 (can't index an empty file)
 * @invariant contentHash is the SHA-256 of `content`
 */
export const AISkillFileSchema = z.object({
  // ── Identity ──────────────────────────────────────────────────────────────
  /** Unique identifier (UUID v4) */
  id: z.string().uuid(),

  // ── Skill Metadata ────────────────────────────────────────────────────────
  /** Skill name (e.g., "Solidity Reentrancy Detector") */
  name: z.string().min(1),

  /** Short description of the skill's purpose */
  description: z.string().default(''),

  /** Skill category classification */
  category: SkillCategorySchema.default('general'),

  /** Free-form tags for additional categorization */
  tags: z.array(z.string()).default([]),

  /** Semantic version of the skill file (if declared in metadata) */
  version: z.string().optional(),

  // ── Source Information ─────────────────────────────────────────────────────
  /** Source GitHub repository (owner/repo format) */
  sourceRepo: z.string().regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/),

  /** File path within the repository */
  filePath: z.string().min(1),

  /** GitHub URL to the raw file */
  rawUrl: z.string().url().optional(),

  /** Git commit SHA at time of indexing */
  commitSha: z.string().optional(),

  /** License of the source repository */
  license: z.string().optional(),

  // ── Content ───────────────────────────────────────────────────────────────
  /** Target AI platform */
  platform: AIPlatformSchema,

  /** Target smart contract language */
  language: SmartContractLanguageSchema,

  /** Raw file content */
  content: z.string().min(1),

  /** File format */
  format: SkillFileFormatSchema,

  /** Content hash (SHA-256 hex digest) for deduplication */
  contentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/, 'Must be a valid SHA-256 hex digest'),

  /** Content size in bytes */
  contentSizeBytes: z.number().int().nonnegative(),

  // ── Safety ────────────────────────────────────────────────────────────────
  /** Safety assessment label assigned by the Safety Scanner */
  safetyLabel: SafetyLabelSchema,

  /** ID of the most recent SafetyScanResult (if scanned) */
  latestScanId: z.string().uuid().optional(),

  // ── Attribution ───────────────────────────────────────────────────────────
  /** Author / team (e.g., "Trail of Bits", "Pashov", "Cyfrin") */
  author: z.string().default('Unknown'),

  /** Author's GitHub profile URL */
  authorUrl: z.string().url().optional(),

  // ── Engagement Metrics ────────────────────────────────────────────────────
  /** Number of times copied by users in the AEGIS platform */
  copyCount: z.number().int().nonnegative().default(0),

  /** Number of stars/likes received in the AEGIS platform */
  starCount: z.number().int().nonnegative().default(0),

  /** Number of views in the AEGIS platform */
  viewCount: z.number().int().nonnegative().default(0),

  // ── ETL Metadata ──────────────────────────────────────────────────────────
  /** When this skill was last synced from the source repo */
  lastSyncedAt: z.coerce.date(),

  /** When this record was first created in AEGIS */
  createdAt: z.coerce.date(),

  /** When this record was last updated in AEGIS */
  updatedAt: z.coerce.date(),
});

export type AISkillFile = z.infer<typeof AISkillFileSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input type for creating a new AISkillFile.
 * Omits auto-generated fields.
 */
export type CreateAISkillInput = Omit<
  z.input<typeof AISkillFileSchema>,
  'id' | 'createdAt' | 'updatedAt' | 'copyCount' | 'starCount' | 'viewCount'
>;

/**
 * Input type for updating an existing AISkillFile.
 */
export type UpdateAISkillInput = Partial<
  Omit<z.input<typeof AISkillFileSchema>, 'id' | 'createdAt'>
> & {
  id: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Computed Properties
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the full GitHub URL for the skill file source.
 */
export function getGitHubUrl(skill: AISkillFile): string {
  return `https://github.com/${skill.sourceRepo}/blob/main/${skill.filePath}`;
}

/**
 * Determine if the skill file has been scanned by the safety scanner.
 */
export function hasBeenScanned(skill: AISkillFile): boolean {
  return skill.safetyLabel !== SafetyLabel.UNANALYZED;
}

/**
 * Calculate an engagement score for ranking (simple weighted formula).
 * Stars weigh more than copies which weigh more than views.
 */
export function getEngagementScore(skill: AISkillFile): number {
  return skill.starCount * 5 + skill.copyCount * 3 + skill.viewCount;
}

/**
 * Get a unique natural key for deduplication across ETL runs.
 */
export function getNaturalKey(skill: AISkillFile): string {
  return `${skill.sourceRepo}:${skill.filePath}`;
}

/**
 * Determine if the skill file is stale (not synced in 7+ days).
 */
export function isStale(skill: AISkillFile, now: Date = new Date()): boolean {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - skill.lastSyncedAt.getTime() > sevenDaysMs;
}
