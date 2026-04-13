/**
 * @module skills-api.schema
 * @description Zod API contract schemas for the AI Skills Explorer (Engine β).
 *
 * These schemas define the request/response contracts for all 13 Skills API
 * endpoints. They are the single source of truth for:
 * - Fastify route validation (via Zod type providers)
 * - OpenAPI 3.1 specification generation
 * - Frontend TypeScript types (shared via @aegis/core)
 *
 * Design Principles:
 * 1. COMPOSE domain types — never duplicate AISkillFile fields
 * 2. Use `z.coerce.*` for query params (strings from URL → typed values)
 * 3. Response schemas wrap domain types with API-level computed fields
 * 4. All schemas aligned with ISkillDataPort interfaces
 *
 * @hexagonal Shared Kernel — API Contract Layer
 * @task P1-ARCH-004
 */

import { z } from 'zod';
import {
  AIPlatformSchema,
  SmartContractLanguageSchema,
  SkillFileFormatSchema,
  SkillCategorySchema,
  AISkillFileSchema,
} from '../../domain/entities/AISkillFile.js';
import { SafetyLabelSchema } from '../../domain/value-objects/SafetyLabel.js';
// Domain entities and value objects
import {
  PaginationQuerySchema,
  createSortQuerySchema,
  createPaginatedResponseSchema,
  AsyncJobResponseSchema,
  UuidParamSchema,
} from './common.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Sort Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Allowed sort fields for AI skill file queries.
 * Must align with SkillSortField in ISkillDataPort.
 */
export const SKILL_SORT_FIELDS = ['name', 'copyCount', 'starCount', 'createdAt'] as const;
export type SkillApiSortField = (typeof SKILL_SORT_FIELDS)[number];

/**
 * Sort query schema for skill endpoints.
 * Default: sort by createdAt descending (most recently indexed first).
 */
export const SkillSortQuerySchema = createSortQuerySchema(SKILL_SORT_FIELDS, 'createdAt');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/skills — Paginated List with Filters
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query parameters for listing AI skill files with full filter support.
 *
 * All filter fields are optional — omitting a field means "no filter".
 * Combines pagination, sorting, and domain-specific filters into a
 * single schema that maps directly to `SkillFilters` in ISkillDataPort.
 *
 * @example
 * ```
 * GET /api/v1/skills?platform=claude&language=solidity&safetyLabel=safe
 *   &author=cyfrin&search=reentrancy&page=1&pageSize=20
 *   &sortBy=copyCount&sortOrder=desc
 * ```
 */
export const SkillListQuerySchema = PaginationQuerySchema.merge(SkillSortQuerySchema).extend({
  /** Filter by target AI platform (enum value) */
  platform: AIPlatformSchema.optional(),

  /** Filter by target smart contract language (enum value) */
  language: SmartContractLanguageSchema.optional(),

  /** Filter by safety label classification (enum value) */
  safetyLabel: SafetyLabelSchema.optional(),

  /** Filter by skill file author or team */
  author: z
    .string()
    .trim()
    .min(1, 'Author filter must not be empty')
    .max(100, 'Author filter must be ≤ 100 characters')
    .optional(),

  /** Filter by skill file format (yaml, markdown, json, etc.) */
  format: SkillFileFormatSchema.optional(),

  /** Filter by skill category */
  category: SkillCategorySchema.optional(),

  /** Full-text search across name, description, and content */
  search: z
    .string()
    .trim()
    .min(1, 'Search query must not be empty')
    .max(200, 'Search query must be ≤ 200 characters')
    .optional(),
});

export type SkillListQuery = z.infer<typeof SkillListQuerySchema>;

/**
 * Response schema for the skill list endpoint.
 * Wraps AISkillFile[] in the standard pagination envelope.
 */
export const SkillListResponseSchema = createPaginatedResponseSchema(AISkillFileSchema);
export type SkillListResponse = z.infer<typeof SkillListResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/skills/:id — Single Skill Detail
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the skill detail endpoint.
 */
export const SkillDetailParamsSchema = z.object({
  /** AI skill file UUID */
  id: z.string().uuid('Invalid skill file ID format'),
});

export type SkillDetailParams = z.infer<typeof SkillDetailParamsSchema>;

/**
 * Response schema for a single skill file detail.
 * Includes the full AISkillFile data plus API-level computed fields.
 *
 * Note: We mirror domain fields explicitly rather than using .extend()
 * because AISkillFileSchema may use .refine() (ZodEffects doesn't support .extend()).
 */
export const SkillDetailResponseSchema = z.object({
  // ── Core AISkillFile fields (mirrored, not duplicated — same Zod types) ──
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  category: SkillCategorySchema,
  tags: z.array(z.string()),
  version: z.string().optional(),
  sourceRepo: z.string(),
  filePath: z.string(),
  rawUrl: z.string().url().optional(),
  commitSha: z.string().optional(),
  license: z.string().optional(),
  platform: AIPlatformSchema,
  language: SmartContractLanguageSchema,
  content: z.string(),
  format: SkillFileFormatSchema,
  contentHash: z.string(),
  contentSizeBytes: z.number().int().nonnegative(),
  safetyLabel: SafetyLabelSchema,
  latestScanId: z.string().uuid().optional(),
  author: z.string(),
  authorUrl: z.string().url().optional(),
  copyCount: z.number().int().nonnegative(),
  starCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative(),
  lastSyncedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),

  // ── Computed fields (API-level enrichment) ────────────────────────────────
  /** Engagement score based on weighted formula: stars*5 + copies*3 + views */
  engagementScore: z.number().nonnegative(),

  /** Whether the skill file is safe to use (based on safety label) */
  isSafe: z.boolean(),

  /** Whether the skill file has been scanned by the safety scanner */
  hasBeenScanned: z.boolean(),

  /** Whether the skill file is stale (not synced in 7+ days) */
  isStale: z.boolean(),

  /** Full GitHub URL to the source file */
  githubUrl: z.string().url(),
});

export type SkillDetailResponse = z.infer<typeof SkillDetailResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/v1/skills/:id/content — Raw Skill Content for Copy
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the skill content endpoint.
 * Reuses the same UUID param pattern.
 */
export const SkillContentParamsSchema = UuidParamSchema;
export type SkillContentParams = z.infer<typeof SkillContentParamsSchema>;

/**
 * Response schema for the raw skill content endpoint.
 * Returns just the content and metadata needed for one-click copy.
 */
export const SkillContentResponseSchema = z.object({
  /** Skill file UUID */
  id: z.string().uuid(),

  /** Raw file content (the actual skill instructions) */
  content: z.string(),

  /** File format for syntax highlighting in the UI */
  format: SkillFileFormatSchema,

  /** Content hash for cache validation */
  contentHash: z.string(),

  /** Content size in bytes */
  contentSizeBytes: z.number().int().nonnegative(),

  /** Skill file name (for copy confirmation UI) */
  name: z.string(),
});

export type SkillContentResponse = z.infer<typeof SkillContentResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /api/v1/skills/stats — Aggregate Dashboard Statistics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Response schema for aggregate Skills Explorer statistics.
 * Aligns with `SkillsDashboardStats` in ISkillDataPort.
 *
 * Used by the frontend dashboard header cards:
 * "Total Skills", "Platforms", "Safety Coverage", "Total Copies"
 */
export const SkillStatsResponseSchema = z.object({
  /** Total number of indexed skill files */
  totalSkills: z.number().int().nonnegative(),

  /** Total number of unique source repositories */
  totalRepositories: z.number().int().nonnegative(),

  /** Total number of unique authors */
  totalAuthors: z.number().int().nonnegative(),

  /** Safety label distribution */
  safetyDistribution: z.object({
    safe: z.number().int().nonnegative(),
    unanalyzed: z.number().int().nonnegative(),
    suspicious: z.number().int().nonnegative(),
    malicious: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),

  /** Total number of copies across all skills */
  totalCopies: z.number().int().nonnegative(),

  /** Total number of stars across all skills */
  totalStars: z.number().int().nonnegative(),
});

export type SkillStatsResponse = z.infer<typeof SkillStatsResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GET /api/v1/skills/platforms — Platform Breakdown
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single platform statistic entry.
 * Aligns with `PlatformStat` in ISkillDataPort.
 */
export const PlatformStatSchema = z.object({
  /** AI platform enum value */
  platform: AIPlatformSchema,

  /** Number of skill files targeting this platform */
  count: z.number().int().nonnegative(),

  /** Number of safe-labeled skills on this platform */
  safeCount: z.number().int().nonnegative(),

  /** Number of suspicious-labeled skills on this platform */
  suspiciousCount: z.number().int().nonnegative(),

  /** Number of malicious-labeled skills on this platform */
  maliciousCount: z.number().int().nonnegative(),
});

export type PlatformStatApi = z.infer<typeof PlatformStatSchema>;

/**
 * Response schema for the platforms endpoint.
 */
export const SkillPlatformsResponseSchema = z.object({
  /** Array of platform statistics */
  data: z.array(PlatformStatSchema),

  /** Total number of platforms returned */
  count: z.number().int().nonnegative(),
});

export type SkillPlatformsResponse = z.infer<typeof SkillPlatformsResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET /api/v1/skills/languages — Language Breakdown
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single language statistic entry.
 * Aligns with `LanguageStat` in ISkillDataPort.
 */
export const LanguageStatSchema = z.object({
  /** Smart contract language enum value */
  language: SmartContractLanguageSchema,

  /** Number of skill files targeting this language */
  count: z.number().int().nonnegative(),
});

export type LanguageStatApi = z.infer<typeof LanguageStatSchema>;

/**
 * Response schema for the languages endpoint.
 */
export const SkillLanguagesResponseSchema = z.object({
  /** Array of language statistics */
  data: z.array(LanguageStatSchema),

  /** Total number of languages returned */
  count: z.number().int().nonnegative(),
});

export type SkillLanguagesResponse = z.infer<typeof SkillLanguagesResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 7. POST /api/v1/skills/:id/copy — Increment Copy Count
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the copy endpoint.
 */
export const SkillCopyParamsSchema = UuidParamSchema;
export type SkillCopyParams = z.infer<typeof SkillCopyParamsSchema>;

/**
 * Response schema for the copy endpoint.
 * Returns the updated copy count after increment.
 */
export const SkillCopyResponseSchema = z.object({
  /** Skill file UUID */
  id: z.string().uuid(),

  /** Updated copy count after increment */
  copyCount: z.number().int().nonnegative(),

  /** Human-readable confirmation message */
  message: z.string(),

  /** ISO 8601 timestamp */
  timestamp: z.string().datetime(),
});

export type SkillCopyResponse = z.infer<typeof SkillCopyResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 8. POST /api/v1/skills/:id/star — Increment Star Count
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the star endpoint.
 */
export const SkillStarParamsSchema = UuidParamSchema;
export type SkillStarParams = z.infer<typeof SkillStarParamsSchema>;

/**
 * Response schema for the star endpoint.
 * Returns the updated star count after increment.
 */
export const SkillStarResponseSchema = z.object({
  /** Skill file UUID */
  id: z.string().uuid(),

  /** Updated star count after increment */
  starCount: z.number().int().nonnegative(),

  /** Human-readable confirmation message */
  message: z.string(),

  /** ISO 8601 timestamp */
  timestamp: z.string().datetime(),
});

export type SkillStarResponse = z.infer<typeof SkillStarResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 9. POST /api/v1/skills/scan — Trigger Safety Scan (Admin Only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request body for triggering a safety scan on a specific skill file.
 * Admin-only endpoint — requires API key authentication.
 */
export const SkillScanRequestSchema = z.object({
  /** ID of the skill file to scan */
  skillId: z.string().uuid('Invalid skill file ID format'),

  /** Force re-scan even if already scanned. Default: false. */
  force: z.boolean().default(false),
});

export type SkillScanRequest = z.infer<typeof SkillScanRequestSchema>;

/**
 * Response schema for the scan trigger endpoint.
 * Wraps the standard async job response with scan-specific details.
 */
export const SkillScanResponseSchema = AsyncJobResponseSchema.extend({
  /** ID of the skill file being scanned */
  skillId: z.string().uuid(),

  /** Whether this is a forced re-scan */
  force: z.boolean(),
});

export type SkillScanResponse = z.infer<typeof SkillScanResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 10. POST /api/v1/skills/sync — Trigger GitHub Scraper Sync (Admin Only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request body for triggering a GitHub scraper sync.
 * Admin-only endpoint — requires API key authentication.
 */
export const SkillSyncRequestSchema = z.object({
  /** Force full re-sync (ignores lastSyncedAt). Default: false. */
  force: z.boolean().default(false),

  /** Specific repositories to sync. If omitted, syncs all configured repos. */
  repositories: z
    .array(
      z
        .string()
        .regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/, 'Repository must be in owner/repo format'),
    )
    .optional(),
});

export type SkillSyncRequest = z.infer<typeof SkillSyncRequestSchema>;

/**
 * Response schema for the sync trigger endpoint.
 * Wraps the standard async job response with sync-specific details.
 */
export const SkillSyncResponseSchema = AsyncJobResponseSchema.extend({
  /** Source of the sync operation */
  source: z.literal('github'),

  /** Number of repositories queued for sync */
  repositoriesQueued: z.number().int().nonnegative(),

  /** Whether this is a forced full sync */
  force: z.boolean(),
});

export type SkillSyncResponse = z.infer<typeof SkillSyncResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 11. GET /api/v1/skills/:id/safety — Safety Scan Results
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the safety results endpoint.
 */
export const SkillSafetyParamsSchema = UuidParamSchema;
export type SkillSafetyParams = z.infer<typeof SkillSafetyParamsSchema>;

/**
 * Summary of a single safety scan result for API response.
 * Lighter-weight than the full SafetyScanResult entity.
 */
export const SafetyScanSummarySchema = z.object({
  /** Scan result UUID */
  id: z.string().uuid(),

  /** Final safety label from this scan */
  finalLabel: SafetyLabelSchema,

  /** Scanner version that produced this result */
  scannerVersion: z.string(),

  /** Timestamp when the scan was performed */
  scanTimestamp: z.coerce.date(),

  /** Duration of the scan in milliseconds */
  scanDurationMs: z.number().int().nonnegative(),

  /** Total number of rules evaluated */
  totalRulesEvaluated: z.number().int().nonnegative(),

  /** Finding counts by severity */
  criticalCount: z.number().int().nonnegative(),
  highCount: z.number().int().nonnegative(),
  mediumCount: z.number().int().nonnegative(),
  lowCount: z.number().int().nonnegative(),
  infoCount: z.number().int().nonnegative(),

  /** Total findings count */
  totalFindings: z.number().int().nonnegative(),

  /** Manual review status */
  manualReviewStatus: z.enum(['pending', 'reviewed', 'overridden']),
});

export type SafetyScanSummary = z.infer<typeof SafetyScanSummarySchema>;

/**
 * Response schema for the safety results endpoint.
 * Returns the current safety label and all scan history for a skill file.
 */
export const SkillSafetyResponseSchema = z.object({
  /** Skill file UUID */
  skillId: z.string().uuid(),

  /** Current effective safety label */
  currentLabel: SafetyLabelSchema,

  /** Whether the skill file has been scanned */
  hasBeenScanned: z.boolean(),

  /** Latest scan result (if scanned) */
  latestScan: SafetyScanSummarySchema.optional(),

  /** All scan history (most recent first) */
  scanHistory: z.array(SafetyScanSummarySchema),

  /** Total number of scans performed */
  totalScans: z.number().int().nonnegative(),
});

export type SkillSafetyResponse = z.infer<typeof SkillSafetyResponseSchema>;
