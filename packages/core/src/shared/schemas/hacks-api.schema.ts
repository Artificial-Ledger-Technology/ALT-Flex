/**
 * @module hacks-api.schema
 * @description Zod API contract schemas for the Hacks Dashboard (Engine α).
 *
 * These schemas define the request/response contracts for all 8 Hacks API
 * endpoints. They are the single source of truth for:
 * - Fastify route validation (via Zod type providers)
 * - OpenAPI 3.1 specification generation
 * - Frontend TypeScript types (shared via @aegis/core)
 *
 * Design Principles:
 * 1. COMPOSE domain types — never duplicate HackIncident fields
 * 2. Use `z.coerce.*` for query params (strings from URL → typed values)
 * 3. Response schemas wrap domain types with API-level computed fields
 * 4. All schemas aligned with IHackDataPort interfaces
 *
 * @hexagonal Shared Kernel — API Contract Layer
 * @task P1-ARCH-003
 */

import { z } from 'zod';
import { AttackVectorSchema } from '../../domain/value-objects/AttackVector.js';
import { ChainSchema } from '../../domain/value-objects/Chain.js';
import { HackIncidentSchema, DataSourceSchema } from '../../domain/entities/HackIncident.js';
import {
  PaginationQuerySchema,
  createSortQuerySchema,
  createPaginatedResponseSchema,
  AsyncJobResponseSchema,
} from './common.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Hack Sort Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Allowed sort fields for hack incident queries.
 * Must align with HackSortField in IHackDataPort.
 */
export const HACK_SORT_FIELDS = ['date', 'lossUsd', 'protocolName'] as const;
export type HackApiSortField = (typeof HACK_SORT_FIELDS)[number];

/**
 * Sort query schema for hack endpoints.
 * Default: sort by date descending (most recent first).
 */
export const HackSortQuerySchema = createSortQuerySchema(HACK_SORT_FIELDS, 'date');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/hacks — Paginated List with Filters
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query parameters for listing hack incidents with full filter support.
 *
 * All filter fields are optional — omitting a field means "no filter".
 * Combines pagination, sorting, and domain-specific filters into a
 * single schema that maps directly to `HackFilters` in IHackDataPort.
 *
 * @example
 * ```
 * GET /api/v1/hacks?attackVector=flash-loan&chain=ethereum&dateFrom=2023-01-01
 *   &dateTo=2024-12-31&minLossUsd=1000000&hasFoundryPoc=true
 *   &page=1&pageSize=20&sortBy=lossUsd&sortOrder=desc
 * ```
 */
export const HackListQuerySchema = PaginationQuerySchema.merge(HackSortQuerySchema).extend({
  /** Filter by primary attack vector(s) (enum value or array of enum values) */
  attackVector: z.union([AttackVectorSchema, z.array(AttackVectorSchema)]).optional(),

  /** Filter by blockchain network(s) (enum value or array of enum values) */
  chain: z.union([ChainSchema, z.array(ChainSchema)]).optional(),

  /** Filter by date range start (inclusive) — ISO 8601 date string */
  dateFrom: z.coerce.date().optional(),

  /** Filter by date range end (inclusive) — ISO 8601 date string */
  dateTo: z.coerce.date().optional(),

  /** Minimum loss amount in USD (inclusive) */
  minLossUsd: z.coerce
    .number()
    .nonnegative('Minimum loss must be ≥ 0')
    .optional(),

  /** Maximum loss amount in USD (inclusive) */
  maxLossUsd: z.coerce
    .number()
    .nonnegative('Maximum loss must be ≥ 0')
    .optional(),

  /** Filter by Foundry POC availability */
  hasFoundryPoc: z.coerce.boolean().optional(),

  /** Full-text search across protocol name and description */
  search: z
    .string()
    .trim()
    .min(1, 'Search query must not be empty')
    .max(200, 'Search query must be ≤ 200 characters')
    .optional(),

  /** Filter by data source origin */
  dataSource: DataSourceSchema.optional(),
});

export type HackListQuery = z.infer<typeof HackListQuerySchema>;

/**
 * Response schema for the hack list endpoint.
 * Wraps HackIncident[] in the standard pagination envelope.
 */
export const HackListResponseSchema = createPaginatedResponseSchema(HackIncidentSchema);
export type HackListResponse = z.infer<typeof HackListResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/hacks/:id — Single Hack Detail
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the hack detail endpoint.
 */
export const HackDetailParamsSchema = z.object({
  /** Hack incident UUID */
  id: z.string().uuid('Invalid hack incident ID format'),
});

export type HackDetailParams = z.infer<typeof HackDetailParamsSchema>;

/**
 * Response schema for a single hack incident detail.
 * Includes the full HackIncident data plus API-level computed fields.
 *
 * Note: We use z.object() composition instead of HackIncidentSchema.extend()
 * because HackIncidentSchema uses .refine() (ZodEffects doesn't support .extend()).
 */
export const HackDetailResponseSchema = z.object({
  // ── Core HackIncident fields (mirrored, not duplicated — same Zod types) ──
  id: z.string().uuid(),
  protocolName: z.string(),
  protocolSlug: z.string().optional(),
  date: z.coerce.date(),
  chain: ChainSchema,
  attackVector: AttackVectorSchema,
  secondaryVectors: z.array(AttackVectorSchema),
  lossUsd: z.number().nonnegative(),
  fundsReturned: z.number().nonnegative(),
  txHashes: z.array(z.string()),
  transactionRefs: z.array(z.object({
    hash: z.string(),
    chain: ChainSchema,
    label: z.string(),
  })),
  sources: z.array(z.string().url()),
  description: z.string(),
  postMortem: z.string().optional(),
  hasFoundryPoc: z.boolean(),
  foundryTestPath: z.string().optional(),
  targetContracts: z.array(z.string()),
  protocolCategory: z.string().optional(),
  protocolTvlAtExploit: z.number().nonnegative().optional(),
  wasAudited: z.boolean().optional(),
  auditFirms: z.array(z.string()),
  dataSource: DataSourceSchema,
  lastSyncedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),

  // ── Computed fields (API-level enrichment) ────────────────────────────────
  /** Net loss after fund recovery (lossUsd - fundsReturned) */
  netLossUsd: z.number().nonnegative(),

  /** Fund recovery percentage (0-100) */
  recoveryRate: z.number().min(0).max(100),

  /** Whether this is a high-impact incident (≥ $1M USD) */
  isHighImpact: z.boolean(),

  /** Whether funds have been fully recovered */
  isFullyRecovered: z.boolean(),

  /** All attack vectors (primary + secondary) deduplicated */
  allAttackVectors: z.array(AttackVectorSchema),
});

export type HackDetailResponse = z.infer<typeof HackDetailResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/v1/hacks/stats — Aggregate Dashboard Statistics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Response schema for aggregate dashboard statistics.
 * Aligns with `DashboardStats` in IHackDataPort.
 *
 * Used by the frontend dashboard header cards:
 * "Total Incidents", "Total Loss", "Recovery Rate", "POC Coverage"
 */
export const HackStatsResponseSchema = z.object({
  /** Total number of hack incidents in the database */
  totalIncidents: z.number().int().nonnegative(),

  /** Total cumulative loss in USD across all incidents */
  totalLossUsd: z.number().nonnegative(),

  /** Total funds recovered in USD across all incidents */
  totalRecoveredUsd: z.number().nonnegative(),

  /** Average loss per incident in USD */
  avgLossUsd: z.number().nonnegative(),

  /** Median loss per incident in USD */
  medianLossUsd: z.number().nonnegative(),

  /** Percentage of incidents with a Foundry POC (0-100) */
  pocCoverage: z.number().min(0).max(100),

  /** Number of unique protocols affected */
  uniqueProtocols: z.number().int().nonnegative(),

  /** Number of unique chains with incidents */
  uniqueChains: z.number().int().nonnegative(),
});

export type HackStatsResponse = z.infer<typeof HackStatsResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /api/v1/hacks/stats/timeline — Time-Series Loss Data
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Granularity for time-series aggregation.
 * Aligns with the `granularity` parameter in IHackDataPort.getLossTimeSeries().
 */
export const TimeSeriesGranularitySchema = z.enum(['day', 'week', 'month', 'year'], {
  errorMap: () => ({ message: 'Granularity must be one of: day, week, month, year' }),
});

export type TimeSeriesGranularity = z.infer<typeof TimeSeriesGranularitySchema>;

/**
 * Query parameters for the timeline endpoint.
 */
export const HackTimelineQuerySchema = z.object({
  /** Time bucket granularity */
  granularity: TimeSeriesGranularitySchema.default('month'),

  /** Start date filter (inclusive) — ISO 8601 date string */
  dateFrom: z.coerce.date().optional(),

  /** End date filter (inclusive) — ISO 8601 date string */
  dateTo: z.coerce.date().optional(),
});

export type HackTimelineQuery = z.infer<typeof HackTimelineQuerySchema>;

/**
 * Single data point in the loss time series.
 * Aligns with `LossTimeSeriesPoint` in IHackDataPort.
 */
export const LossTimeSeriesPointSchema = z.object({
  /** Date bucket (ISO 8601 string for API transport) */
  date: z.string().datetime(),

  /** Total loss in USD for this time bucket */
  totalLossUsd: z.number().nonnegative(),

  /** Number of incidents in this time bucket */
  incidentCount: z.number().int().nonnegative(),

  /** Running cumulative total loss in USD */
  cumulativeLossUsd: z.number().nonnegative(),
});

export type LossTimeSeriesPointApi = z.infer<typeof LossTimeSeriesPointSchema>;

/**
 * Response schema for the timeline endpoint.
 */
export const HackTimelineResponseSchema = z.object({
  /** Granularity used for aggregation */
  granularity: TimeSeriesGranularitySchema,

  /** Array of time-series data points */
  data: z.array(LossTimeSeriesPointSchema),

  /** Total data points returned */
  count: z.number().int().nonnegative(),
});

export type HackTimelineResponse = z.infer<typeof HackTimelineResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GET /api/v1/hacks/vectors — Attack Vector Breakdown
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single attack vector statistic entry.
 * Aligns with `AttackVectorStat` in IHackDataPort.
 */
export const AttackVectorStatSchema = z.object({
  /** Attack vector enum value */
  attackVector: AttackVectorSchema,

  /** Number of incidents using this vector */
  count: z.number().int().nonnegative(),

  /** Total cumulative loss for this vector in USD */
  totalLossUsd: z.number().nonnegative(),

  /** Average loss per incident for this vector in USD */
  avgLossUsd: z.number().nonnegative(),

  /** Date of the most recent incident using this vector */
  lastIncidentDate: z.string().datetime(),
});

export type AttackVectorStatApi = z.infer<typeof AttackVectorStatSchema>;

/**
 * Response schema for the attack vectors endpoint.
 */
export const HackVectorsResponseSchema = z.object({
  /** Array of attack vector statistics */
  data: z.array(AttackVectorStatSchema),

  /** Total number of attack vector categories returned */
  count: z.number().int().nonnegative(),
});

export type HackVectorsResponse = z.infer<typeof HackVectorsResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET /api/v1/hacks/chains — Chain Breakdown
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single chain statistic entry.
 * Aligns with `ChainStat` in IHackDataPort.
 */
export const ChainStatSchema = z.object({
  /** Chain enum value */
  chain: ChainSchema,

  /** Number of incidents on this chain */
  count: z.number().int().nonnegative(),

  /** Total cumulative loss on this chain in USD */
  totalLossUsd: z.number().nonnegative(),

  /** Average loss per incident on this chain in USD */
  avgLossUsd: z.number().nonnegative(),
});

export type ChainStatApi = z.infer<typeof ChainStatSchema>;

/**
 * Response schema for the chains endpoint.
 */
export const HackChainsResponseSchema = z.object({
  /** Array of chain statistics */
  data: z.array(ChainStatSchema),

  /** Total number of chains returned */
  count: z.number().int().nonnegative(),
});

export type HackChainsResponse = z.infer<typeof HackChainsResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 7. GET /api/v1/hacks/search — Full-Text Protocol Search
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query parameters for the search endpoint.
 * Combines full-text search with pagination.
 */
export const HackSearchQuerySchema = PaginationQuerySchema.extend({
  /** Full-text search query (protocol name, description) */
  search: z
    .string()
    .trim()
    .min(1, 'Search query is required')
    .max(200, 'Search query must be ≤ 200 characters'),
});

export type HackSearchQuery = z.infer<typeof HackSearchQuerySchema>;

/**
 * Response schema for the search endpoint.
 * Same pagination envelope as the list endpoint.
 */
export const HackSearchResponseSchema = createPaginatedResponseSchema(HackIncidentSchema);
export type HackSearchResponse = z.infer<typeof HackSearchResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 8. POST /api/v1/hacks/sync — Trigger ETL Sync (Admin Only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request body for triggering an ETL sync.
 * Admin-only endpoint — requires API key authentication.
 */
export const HackSyncRequestSchema = z.object({
  /** Data source to sync from. If omitted, syncs all sources. */
  source: DataSourceSchema.optional(),

  /** Force full re-sync (ignores lastSyncedAt). Default: false. */
  force: z.boolean().default(false),
});

export type HackSyncRequest = z.infer<typeof HackSyncRequestSchema>;

/**
 * Response schema for the sync trigger endpoint.
 * Wraps the standard async job response with sync-specific details.
 */
export const HackSyncResponseSchema = AsyncJobResponseSchema.extend({
  /** Data source being synced */
  source: z.string(),

  /** Whether this is a forced full sync */
  force: z.boolean(),
});

export type HackSyncResponse = z.infer<typeof HackSyncResponseSchema>;
