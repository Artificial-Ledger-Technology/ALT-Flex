/**
 * @module schemas
 * @description Barrel export for all API contract schemas.
 *
 * These schemas define the request/response contracts at the API boundary.
 * They compose domain types from the domain layer — never duplicate them.
 *
 * @hexagonal Shared Kernel — API Contract Layer
 */

// ── Common / Reusable Schemas ───────────────────────────────────────────────
export {
  // Pagination
  PaginationQuerySchema,
  PaginationMetadataSchema,
  createPaginatedResponseSchema,
  // Sorting
  SortOrderSchema,
  createSortQuerySchema,
  // Error
  ErrorCodeSchema,
  ValidationErrorDetailSchema,
  StandardErrorResponseSchema,
  // Common params
  UuidParamSchema,
  DateRangeQuerySchema,
  SearchQuerySchema,
  // Success wrappers
  MessageResponseSchema,
  AsyncJobResponseSchema,
} from './common.schema.js';

export type {
  PaginationQuery,
  SortOrder,
  PaginationMetadata,
  ErrorCode,
  ValidationErrorDetail,
  StandardErrorResponse,
  UuidParam,
  DateRangeQuery,
  SearchQuery,
  MessageResponse,
  AsyncJobResponse,
} from './common.schema.js';

// ── Hacks API Schemas (Engine α) ────────────────────────────────────────────
export {
  // Sort
  HACK_SORT_FIELDS,
  HackSortQuerySchema,
  // Endpoint schemas
  HackListQuerySchema,
  HackListResponseSchema,
  HackDetailParamsSchema,
  HackDetailResponseSchema,
  HackStatsResponseSchema,
  TimeSeriesGranularitySchema,
  HackTimelineQuerySchema,
  LossTimeSeriesPointSchema,
  HackTimelineResponseSchema,
  AttackVectorStatSchema,
  HackVectorsResponseSchema,
  ChainStatSchema,
  HackChainsResponseSchema,
  HackSearchQuerySchema,
  HackSearchResponseSchema,
  HackSyncRequestSchema,
  HackSyncResponseSchema,
} from './hacks-api.schema.js';

export type {
  HackApiSortField,
  HackListQuery,
  HackListResponse,
  HackDetailParams,
  HackDetailResponse,
  HackStatsResponse,
  TimeSeriesGranularity,
  HackTimelineQuery,
  LossTimeSeriesPointApi,
  HackTimelineResponse,
  AttackVectorStatApi,
  HackVectorsResponse,
  ChainStatApi,
  HackChainsResponse,
  HackSearchQuery,
  HackSearchResponse,
  HackSyncRequest,
  HackSyncResponse,
} from './hacks-api.schema.js';

// ── System & Gateway API Schemas (P1-ARCH-006) ─────────────────────────────
export {
  // Health
  HealthStatusSchema,
  ServiceHealthSchema,
  SystemHealthResponseSchema,
  // Detailed health
  DetailedServiceHealthSchema,
  DetailedHealthResponseSchema,
  // Meta
  FeatureFlagSchema,
  SystemMetaResponseSchema,
  // Auth (future)
  AuthTokenRequestSchema,
  AuthTokenResponseSchema,
  // Rate limit
  RateLimitStatusResponseSchema,
} from './system-api.schema.js';

export type {
  HealthStatus,
  ServiceHealth,
  SystemHealthResponse,
  DetailedServiceHealth,
  DetailedHealthResponse,
  FeatureFlag,
  SystemMetaResponse,
  AuthTokenRequest,
  AuthTokenResponse,
  RateLimitStatusResponse,
} from './system-api.schema.js';
