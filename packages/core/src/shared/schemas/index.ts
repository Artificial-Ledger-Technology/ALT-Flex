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

// ── Forensics API Schemas (Engine γ) ─────────────────────────────────────────
export {
  // Sort
  FORENSIC_POC_SORT_FIELDS,
  ForensicPocSortQuerySchema,
  // Job status
  ForensicJobStatusSchema,
  ForensicJobProgressSchema,
  // 1. List POCs
  ForensicPocListQuerySchema,
  ForensicPocListResponseSchema,
  // 2. POC Detail
  ForensicPocDetailParamsSchema,
  ForensicPocDetailResponseSchema,
  // 3. Simulate
  ForensicSimulateRequestSchema,
  ForensicSimulateResponseSchema,
  // 4. Simulate Job Status
  ForensicSimulateJobParamsSchema,
  SimulationResultSchema,
  ForensicSimulateJobResponseSchema,
  // 5. Trace
  ForensicTraceRequestSchema,
  ForensicTraceResponseSchema,
  // 6. Trace Job Status
  ForensicTraceJobParamsSchema,
  StorageDiffSchema,
  CallTreeNodeSchema,
  DecodedEventLogSchema,
  TraceResultSchema,
  ForensicTraceJobResponseSchema,
} from './forensics-api.schema.js';

export type {
  ForensicPocSortField,
  ForensicJobStatus,
  ForensicJobProgress,
  ForensicPocListQuery,
  ForensicPocListResponse,
  ForensicPocDetailParams,
  ForensicPocDetailResponse,
  ForensicSimulateRequest,
  ForensicSimulateResponse,
  ForensicSimulateJobParams,
  SimulationResult,
  ForensicSimulateJobResponse,
  ForensicTraceRequest,
  ForensicTraceResponse,
  ForensicTraceJobParams,
  StorageDiff,
  CallTreeNode,
  DecodedEventLog,
  TraceResult,
  ForensicTraceJobResponse,
} from './forensics-api.schema.js';

// ── Skills API Schemas (Engine β) ───────────────────────────────────────────
export {
  // Sort
  SKILL_SORT_FIELDS,
  SkillSortQuerySchema,
  // Endpoint schemas
  SkillListQuerySchema,
  SkillListResponseSchema,
  SkillDetailParamsSchema,
  SkillDetailResponseSchema,
  SkillContentParamsSchema,
  SkillContentResponseSchema,
  SkillStatsResponseSchema,
  PlatformStatSchema,
  SkillPlatformsResponseSchema,
  LanguageStatSchema,
  SkillLanguagesResponseSchema,
  SkillCopyParamsSchema,
  SkillCopyResponseSchema,
  SkillStarParamsSchema,
  SkillStarResponseSchema,
  SkillScanRequestSchema,
  SkillScanResponseSchema,
  SkillSyncRequestSchema,
  SkillSyncResponseSchema,
  SkillSafetyParamsSchema,
  SafetyScanSummarySchema,
  SkillSafetyResponseSchema,
} from './skills-api.schema.js';

export type {
  SkillApiSortField,
  SkillListQuery,
  SkillListResponse,
  SkillDetailParams,
  SkillDetailResponse,
  SkillContentParams,
  SkillContentResponse,
  SkillStatsResponse,
  PlatformStatApi,
  SkillPlatformsResponse,
  LanguageStatApi,
  SkillLanguagesResponse,
  SkillCopyParams,
  SkillCopyResponse,
  SkillStarParams,
  SkillStarResponse,
  SkillScanRequest,
  SkillScanResponse,
  SkillSyncRequest,
  SkillSyncResponse,
  SkillSafetyParams,
  SafetyScanSummary,
  SkillSafetyResponse,
} from './skills-api.schema.js';
