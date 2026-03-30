/**
 * @module SafetyScanResult
 * @description Domain entity for safety scan results produced by the AEGIS Safety Scanner.
 *
 * Each scan result represents a single execution of the safety scanner
 * against an AISkillFile. The scanner produces a list of findings
 * (matched rules, severity, and evidence) and a final aggregated label.
 *
 * Multiple scan results may exist per skill file (re-scans after
 * scanner rule updates or skill file content changes).
 *
 * @hexagonal Entity — Domain Layer
 * @academic Core output artifact for Thesis 1: "Automated Detection of
 *           Malicious Intent in AI Audit Skill Files for Web3 Security"
 */

import { z } from 'zod';
import { SafetyLabel, SafetyLabelSchema } from '../value-objects/SafetyLabel.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Severity classification for individual scan findings.
 * Aligned with traditional security audit severity levels.
 */
export const FindingSeveritySchema = z.enum([
  'critical', // Confirmed malicious intent (e.g., code exfiltration)
  'high', // Highly suspicious pattern (e.g., network requests in a code review skill)
  'medium', // Moderately suspicious (e.g., file system access)
  'low', // Minor concern, unlikely malicious
  'info', // Informational note (e.g., deprecated pattern usage)
]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

/**
 * Category of the safety finding.
 * Maps to the threat model in the Thesis 1 research framework.
 */
export const FindingCategorySchema = z.enum([
  'prompt-injection', // Attempts to override AI system instructions
  'code-exfiltration', // Attempts to read/transmit source code
  'file-system-access', // Unauthorized file read/write instructions
  'network-request', // Unauthorized external API/network calls
  'shell-execution', // Instructions to execute shell commands
  'data-extraction', // Attempts to extract sensitive data (keys, tokens)
  'instruction-override', // Attempts to override safety guidelines
  'obfuscation', // Obfuscated or encoded content hiding intent
  'supply-chain', // Dependencies or imports from untrusted sources
  'other', // Unclassified finding
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

/**
 * A single finding from the safety scanner.
 * Each finding maps to one matched rule and includes evidence.
 */
export const ScanFindingSchema = z.object({
  /** Finding identifier (e.g., "AEGIS-PI-001" for Prompt Injection Rule 1) */
  ruleId: z.string().min(1),

  /** Human-readable rule name */
  ruleName: z.string().min(1),

  /** Finding category */
  category: FindingCategorySchema,

  /** Severity level */
  severity: FindingSeveritySchema,

  /** Detailed description of what was found */
  description: z.string(),

  /** The exact snippet / evidence that triggered the rule */
  evidence: z.string(),

  /** Line number in the skill file content where the finding was detected */
  lineNumber: z.number().int().nonnegative().optional(),

  /** Column number (if applicable, for precise location) */
  columnNumber: z.number().int().nonnegative().optional(),

  /** Confidence score (0.0 - 1.0) — how confident the scanner is in this finding */
  confidence: z.number().min(0).max(1),

  /** Whether this is a false positive (set during manual review) */
  isFalsePositive: z.boolean().default(false),

  /** Remediation suggestion */
  remediation: z.string().optional(),
});
export type ScanFinding = z.infer<typeof ScanFindingSchema>;

/**
 * A matched rule result (lighter-weight than a full finding).
 * Used for aggregate statistics and rule effectiveness tracking.
 */
export const RuleMatchSchema = z.object({
  /** Rule identifier */
  ruleId: z.string().min(1),

  /** Rule category */
  category: FindingCategorySchema,

  /** Number of matches for this rule in the scanned file */
  matchCount: z.number().int().nonnegative(),

  /** Whether this rule match contributed to the final label decision */
  contributedToLabel: z.boolean(),
});
export type RuleMatch = z.infer<typeof RuleMatchSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// SafetyScanResult Entity Schema
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SafetyScanResult — Output of the AEGIS Safety Scanner.
 *
 * Design Decisions:
 * 1. Separate entity from AISkillFile to support historical scan results
 * 2. `scannerVersion` tracks which version of the scanner produced the result
 *    (critical for reproducibility — an academic requirement)
 * 3. `findings` provide detailed evidence; `ruleMatches` provide aggregate stats
 * 4. `scanDurationMs` enables performance benchmarking of the scanner
 * 5. `manualReviewStatus` supports the human-in-the-loop workflow
 *
 * @invariant findings.length >= 0
 * @invariant If finalLabel is SAFE, then no critical/high findings exist
 */
export const SafetyScanResultSchema = z.object({
  // ── Identity ──────────────────────────────────────────────────────────────
  /** Unique identifier (UUID v4) */
  id: z.string().uuid(),

  /** ID of the AISkillFile that was scanned */
  skillFileId: z.string().uuid(),

  // ── Scan Execution ────────────────────────────────────────────────────────
  /** Timestamp when the scan was initiated */
  scanTimestamp: z.coerce.date(),

  /** Duration of the scan in milliseconds */
  scanDurationMs: z.number().int().nonnegative(),

  /** Version of the AEGIS Safety Scanner that produced this result */
  scannerVersion: z.string().regex(/^\d+\.\d+\.\d+$/),

  /** Number of rules evaluated during this scan */
  totalRulesEvaluated: z.number().int().nonnegative(),

  // ── Results ───────────────────────────────────────────────────────────────
  /** Final aggregated safety label */
  finalLabel: SafetyLabelSchema,

  /** Detailed findings with evidence */
  findings: z.array(ScanFindingSchema).default([]),

  /** Aggregate rule match statistics */
  ruleMatches: z.array(RuleMatchSchema).default([]),

  // ── Finding Counts (denormalized for query performance) ─────────────────
  /** Count of critical severity findings */
  criticalCount: z.number().int().nonnegative().default(0),

  /** Count of high severity findings */
  highCount: z.number().int().nonnegative().default(0),

  /** Count of medium severity findings */
  mediumCount: z.number().int().nonnegative().default(0),

  /** Count of low severity findings */
  lowCount: z.number().int().nonnegative().default(0),

  /** Count of informational findings */
  infoCount: z.number().int().nonnegative().default(0),

  // ── Manual Review ─────────────────────────────────────────────────────────
  /** Whether manual review has been performed on this scan result */
  manualReviewStatus: z.enum(['pending', 'reviewed', 'overridden']).default('pending'),

  /** ID of the reviewer (if manually reviewed) */
  reviewedBy: z.string().optional(),

  /** Notes from manual review */
  reviewNotes: z.string().optional(),

  /** Overridden label (if reviewer disagrees with scanner) */
  overriddenLabel: SafetyLabelSchema.optional(),

  // ── Metadata ──────────────────────────────────────────────────────────────
  /** Content hash of the skill file at scan time (for change detection) */
  contentHashAtScan: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),

  /** When this record was created */
  createdAt: z.coerce.date(),
});

export type SafetyScanResult = z.infer<typeof SafetyScanResultSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input type for creating a new SafetyScanResult.
 */
export type CreateScanResultInput = Omit<
  z.input<typeof SafetyScanResultSchema>,
  'id' | 'createdAt' | 'manualReviewStatus'
>;

// ═══════════════════════════════════════════════════════════════════════════════
// Computed Properties
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the total count of all findings.
 */
export function getTotalFindingCount(result: SafetyScanResult): number {
  return result.findings.length;
}

/**
 * Get the effective label (overridden label if manual review overrode scanner).
 */
export function getEffectiveLabel(result: SafetyScanResult): SafetyLabel {
  return result.overriddenLabel ?? result.finalLabel;
}

/**
 * Get findings filtered by severity.
 */
export function getFindingsBySeverity(
  result: SafetyScanResult,
  severity: FindingSeverity,
): ScanFinding[] {
  return result.findings.filter((f) => f.severity === severity);
}

/**
 * Get findings filtered by category.
 */
export function getFindingsByCategory(
  result: SafetyScanResult,
  category: FindingCategory,
): ScanFinding[] {
  return result.findings.filter((f) => f.category === category);
}

/**
 * Get the highest-severity finding.
 */
export function getHighestSeverity(result: SafetyScanResult): FindingSeverity | null {
  if (result.findings.length === 0) return null;
  const order: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
  for (const sev of order) {
    if (result.findings.some((f) => f.severity === sev)) return sev;
  }
  return null;
}

/**
 * Check if the scan result has any actionable findings (non-info, non-false-positive).
 */
export function hasActionableFindings(result: SafetyScanResult): boolean {
  return result.findings.some((f) => f.severity !== 'info' && !f.isFalsePositive);
}

/**
 * Get unique finding categories present in the scan.
 */
export function getUniqueCategories(result: SafetyScanResult): FindingCategory[] {
  const categories = new Set(result.findings.map((f) => f.category));
  return [...categories];
}
