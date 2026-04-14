/**
 * @module forensics-api.schema
 * @description Zod API contract schemas for the Forensic Engine (Engine γ).
 *
 * These schemas define the request/response contracts for all 6 Forensic
 * Engine endpoints. They are the single source of truth for:
 * - Fastify route validation (via Zod type providers)
 * - OpenAPI 3.1 specification generation
 * - Frontend TypeScript types (shared via @aegis/core)
 *
 * Design Principles:
 * 1. COMPOSE domain types — never duplicate ExploitPOC fields
 * 2. Use `z.coerce.*` for query params (strings from URL → typed values)
 * 3. Long-running ops (simulate, trace) use AsyncJobResponseSchema pattern
 * 4. Job status extends base with typed `result` discriminants
 * 5. All schemas aligned with IChainDataPort interfaces
 *
 * Key Difference from Hacks/Skills:
 * Forensic endpoints include async job patterns for long-running
 * Foundry simulations and EVM trace analysis. Jobs are dispatched
 * via BullMQ and polled for results.
 *
 * @hexagonal Shared Kernel — API Contract Layer
 * @task P1-ARCH-005
 */

import { z } from 'zod';
import { ChainSchema } from '../../domain/value-objects/Chain.js';
import { AttackVectorSchema } from '../../domain/value-objects/AttackVector.js';
import {
  ExploitPOCSchema,
  PocSourceSchema,
  PocExecutionStatusSchema,
  ExploitComplexitySchema,
} from '../../domain/entities/ExploitPOC.js';
import {
  PaginationQuerySchema,
  createSortQuerySchema,
  createPaginatedResponseSchema,
  AsyncJobResponseSchema,
} from './common.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Forensic POC Sort Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Allowed sort fields for forensic POC queries.
 * Maps to columns on the ExploitPOC entity.
 */
export const FORENSIC_POC_SORT_FIELDS = [
  'exploitDate',
  'estimatedLossUsd',
  'protocol',
  'complexity',
] as const;
export type ForensicPocSortField = (typeof FORENSIC_POC_SORT_FIELDS)[number];

/**
 * Sort query schema for forensic POC endpoints.
 * Default: sort by exploit date descending (most recent first).
 */
export const ForensicPocSortQuerySchema = createSortQuerySchema(
  FORENSIC_POC_SORT_FIELDS,
  'exploitDate',
);

// ═══════════════════════════════════════════════════════════════════════════════
// Job Status Schemas (Extended Async Pattern)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extended job status enum for forensic operations.
 * Adds granular states beyond the base AsyncJobResponseSchema.
 */
export const ForensicJobStatusSchema = z.enum([
  'queued',
  'active',
  'completed',
  'failed',
  'cancelled',
]);
export type ForensicJobStatus = z.infer<typeof ForensicJobStatusSchema>;

/**
 * Job progress tracking for long-running forensic operations.
 * Reports percentage completion and a human-readable stage description.
 */
export const ForensicJobProgressSchema = z.object({
  /** Completion percentage (0–100) */
  percentage: z.number().min(0).max(100),

  /** Current stage of the operation */
  stage: z.string(),
});
export type ForensicJobProgress = z.infer<typeof ForensicJobProgressSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/forensics/pocs — List Available Foundry POCs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query parameters for listing Foundry POCs with filter support.
 *
 * All filter fields are optional — omitting a field means "no filter".
 * Combines pagination, sorting, and domain-specific filters.
 *
 * @example
 * ```
 * GET /api/v1/forensics/pocs?chain=ethereum&source=defihacklabs
 *   &complexity=advanced&executionStatus=passing
 *   &vulnerabilityClass=flash-loan&page=1&pageSize=20
 *   &sortBy=estimatedLossUsd&sortOrder=desc
 * ```
 */
export const ForensicPocListQuerySchema = PaginationQuerySchema.merge(
  ForensicPocSortQuerySchema,
).extend({
  /** Filter by blockchain network */
  chain: ChainSchema.optional(),

  /** Filter by POC source repository */
  source: PocSourceSchema.optional(),

  /** Filter by exploit complexity rating */
  complexity: ExploitComplexitySchema.optional(),

  /** Filter by current execution status */
  executionStatus: PocExecutionStatusSchema.optional(),

  /** Filter by primary vulnerability class */
  vulnerabilityClass: AttackVectorSchema.optional(),

  /** Full-text search across protocol names and POC titles */
  search: z
    .string()
    .trim()
    .min(1, 'Search query must not be empty')
    .max(200, 'Search query must be ≤ 200 characters')
    .optional(),
});

export type ForensicPocListQuery = z.infer<typeof ForensicPocListQuerySchema>;

/**
 * Response schema for the POC list endpoint.
 * Wraps ExploitPOC[] in the standard pagination envelope.
 */
export const ForensicPocListResponseSchema = createPaginatedResponseSchema(ExploitPOCSchema);
export type ForensicPocListResponse = z.infer<typeof ForensicPocListResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/forensics/pocs/:id — POC Detail with Solidity Source
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the POC detail endpoint.
 */
export const ForensicPocDetailParamsSchema = z.object({
  /** ExploitPOC UUID */
  id: z.string().uuid('Invalid POC ID format'),
});

export type ForensicPocDetailParams = z.infer<typeof ForensicPocDetailParamsSchema>;

/**
 * Response schema for a single POC detail.
 * Includes the full ExploitPOC data plus API-level computed fields.
 *
 * Computed fields provide convenience data that the frontend needs
 * without requiring client-side computation:
 * - `forgeCommand`: Ready-to-run Foundry command
 * - `githubUrl`: Direct link to source file on GitHub
 * - `isExecutable`: Whether the POC can be executed
 * - `allVulnerabilityClasses`: Primary + additional vectors deduplicated
 */
export const ForensicPocDetailResponseSchema = z.object({
  // ── Core ExploitPOC fields (composed from domain entity) ────────────────
  id: z.string().uuid(),
  hackIncidentId: z.string().uuid().optional(),
  source: PocSourceSchema,
  testFilePath: z.string(),
  testFunctionName: z.string(),
  sourceUrl: z.string().url().optional(),
  title: z.string(),
  protocol: z.string(),
  exploitDate: z.coerce.date(),
  vulnerabilityClass: AttackVectorSchema,
  additionalVulnerabilities: z.array(AttackVectorSchema),
  chain: ChainSchema,
  estimatedLossUsd: z.number().nonnegative().optional(),
  complexity: ExploitComplexitySchema,
  targetContracts: z.array(
    z.object({
      address: z.string(),
      name: z.string(),
      chain: ChainSchema,
      isPrimaryTarget: z.boolean(),
      isVerified: z.boolean().optional(),
    }),
  ),
  forkParameters: z.object({
    rpcUrlEnvVar: z.string(),
    forkBlockNumber: z.number().int().nonnegative(),
    chain: ChainSchema,
    gasLimit: z.number().int().nonnegative().optional(),
    blockTimestamp: z.number().int().nonnegative().optional(),
  }),
  solcVersion: z.string().optional(),
  foundryFlags: z.array(z.string()),
  requiredEnvVars: z.array(z.string()),
  executionStatus: PocExecutionStatusSchema,
  lastExecutedAt: z.coerce.date().optional(),
  lastExecutionOutput: z.string().optional(),
  executionTimeMs: z.number().int().nonnegative().optional(),
  explanation: z.string(),
  keyTakeaways: z.array(z.string()),
  relatedIds: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),

  // ── Computed fields (API-level enrichment) ──────────────────────────────
  /** Ready-to-run `forge test` command for this POC */
  forgeCommand: z.string(),

  /** Direct GitHub URL (DeFiHackLabs source) — null if not from DeFiHackLabs */
  githubUrl: z.string().url().nullable(),

  /** Whether the POC can be executed (not deprecated, valid fork params) */
  isExecutable: z.boolean(),

  /** All vulnerability classes (primary + additional) deduplicated */
  allVulnerabilityClasses: z.array(AttackVectorSchema),
});

export type ForensicPocDetailResponse = z.infer<typeof ForensicPocDetailResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. POST /api/v1/forensics/simulate — Trigger Foundry Simulation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request body for triggering a Foundry simulation of a POC.
 *
 * The simulation runs `forge test` against the specified POC on a
 * mainnet fork at the configured block number. Optional overrides
 * allow adjusting fork parameters for experimentation.
 */
export const ForensicSimulateRequestSchema = z.object({
  /** UUID of the ExploitPOC to simulate */
  pocId: z.string().uuid('Invalid POC ID format'),

  /** Optional fork parameter overrides for experimentation */
  overrides: z
    .object({
      /** Override the RPC URL environment variable name */
      rpcUrlEnvVar: z.string().optional(),

      /** Override the fork block number */
      forkBlockNumber: z.number().int().nonnegative().optional(),

      /** Override the gas limit */
      gasLimit: z.number().int().nonnegative().optional(),

      /** Override the block timestamp */
      blockTimestamp: z.number().int().nonnegative().optional(),

      /** Additional Foundry flags to append */
      additionalFlags: z.array(z.string()).optional(),

      /** Foundry verbosity level (1–5, default is 3 = -vvv) */
      verbosity: z.number().int().min(1).max(5).default(3),
    })
    .optional(),
});

export type ForensicSimulateRequest = z.infer<typeof ForensicSimulateRequestSchema>;

/**
 * Response schema for the simulate trigger endpoint.
 * Wraps the standard async job response with simulation-specific context.
 */
export const ForensicSimulateResponseSchema = AsyncJobResponseSchema.extend({
  /** UUID of the POC being simulated */
  pocId: z.string().uuid(),

  /** Protocol name for display context */
  protocol: z.string(),
});

export type ForensicSimulateResponse = z.infer<typeof ForensicSimulateResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /api/v1/forensics/simulate/:jobId — Simulation Status & Results
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the simulation job status endpoint.
 */
export const ForensicSimulateJobParamsSchema = z.object({
  /** BullMQ job identifier */
  jobId: z.string().min(1, 'Job ID is required'),
});

export type ForensicSimulateJobParams = z.infer<typeof ForensicSimulateJobParamsSchema>;

/**
 * Simulation execution result — returned when job status is 'completed'.
 *
 * Contains the full Foundry execution output, gas metrics, and
 * pass/fail determination for the exploit reproduction.
 */
export const SimulationResultSchema = z.object({
  /** Whether the exploit was successfully reproduced */
  success: z.boolean(),

  /** Raw Foundry stdout output (truncated to 50KB max) */
  output: z.string(),

  /** Raw Foundry stderr output (truncated to 10KB max) */
  stderr: z.string().default(''),

  /** Total gas consumed by the simulation */
  gasUsed: z.string(),

  /** Execution time in milliseconds */
  executionTimeMs: z.number().int().nonnegative(),

  /** Forge test command that was executed */
  forgeCommand: z.string(),

  /** Fork block number used */
  forkBlockNumber: z.number().int().nonnegative(),

  /** Chain forked for the simulation */
  chain: ChainSchema,

  /** Number of test assertions that passed */
  assertionsPassed: z.number().int().nonnegative(),

  /** Number of test assertions that failed */
  assertionsFailed: z.number().int().nonnegative(),

  /** Decoded trace logs from the simulation (if verbosity ≥ 3) */
  traces: z.array(z.string()).default([]),
});

export type SimulationResult = z.infer<typeof SimulationResultSchema>;

/**
 * Full simulation job status response.
 * Follows the `{ jobId, status, result?, error?, progress }` pattern.
 *
 * - `status: 'queued'` → result is null, progress may have initial stage
 * - `status: 'active'` → result is null, progress updates in real-time
 * - `status: 'completed'` → result contains SimulationResult
 * - `status: 'failed'` → error contains failure details
 */
export const ForensicSimulateJobResponseSchema = z.object({
  /** BullMQ job identifier */
  jobId: z.string(),

  /** Current job status */
  status: ForensicJobStatusSchema,

  /** Simulation result — present only when status is 'completed' */
  result: SimulationResultSchema.nullable().default(null),

  /** Error details — present only when status is 'failed' */
  error: z
    .object({
      /** Error classification */
      code: z.string(),
      /** Human-readable error message */
      message: z.string(),
      /** Stack trace (development only — stripped in production) */
      stack: z.string().optional(),
    })
    .nullable()
    .default(null),

  /** Progress tracking — present during 'queued' and 'active' states */
  progress: ForensicJobProgressSchema.nullable().default(null),

  /** ISO 8601 timestamp of when the job was created */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last status update */
  updatedAt: z.string().datetime(),
});

export type ForensicSimulateJobResponse = z.infer<typeof ForensicSimulateJobResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. POST /api/v1/forensics/trace — Trace a Transaction
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request body for tracing a transaction on a given chain.
 *
 * Traces use debug_traceTransaction (EVM) or equivalent RPC method
 * to reconstruct the complete call tree, storage state changes,
 * and decoded event logs.
 */
export const ForensicTraceRequestSchema = z.object({
  /** Transaction hash to trace */
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a valid 66-character hex transaction hash'),

  /** Chain to trace the transaction on */
  chain: ChainSchema,

  /** Optional: include storage diffs (more expensive RPC call) */
  includeStorageDiffs: z.boolean().default(true),

  /** Optional: include decoded event logs */
  includeDecodedLogs: z.boolean().default(true),

  /** Optional: maximum call depth to trace (default: unlimited) */
  maxDepth: z.number().int().positive().optional(),
});

export type ForensicTraceRequest = z.infer<typeof ForensicTraceRequestSchema>;

/**
 * Response schema for the trace trigger endpoint.
 * Wraps the standard async job response with trace-specific context.
 */
export const ForensicTraceResponseSchema = AsyncJobResponseSchema.extend({
  /** Transaction hash being traced */
  txHash: z.string(),

  /** Chain the trace is running on */
  chain: ChainSchema,
});

export type ForensicTraceResponse = z.infer<typeof ForensicTraceResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET /api/v1/forensics/trace/:jobId — Trace Results
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Path parameters for the trace job status endpoint.
 */
export const ForensicTraceJobParamsSchema = z.object({
  /** BullMQ job identifier */
  jobId: z.string().min(1, 'Job ID is required'),
});

export type ForensicTraceJobParams = z.infer<typeof ForensicTraceJobParamsSchema>;

/**
 * Single storage diff entry — shows a slot's value change.
 */
export const StorageDiffSchema = z.object({
  /** Contract address where the storage change occurred */
  address: z.string(),

  /** Storage slot key (hex) */
  slot: z.string(),

  /** Value before the transaction */
  previousValue: z.string(),

  /** Value after the transaction */
  newValue: z.string(),
});

export type StorageDiff = z.infer<typeof StorageDiffSchema>;

/**
 * Single node in the transaction call tree.
 * Aligned with `InternalCall` from IChainDataPort but serialized for API transport.
 */
export const CallTreeNodeSchema = z.object({
  /** Call type */
  type: z.enum(['call', 'delegatecall', 'staticcall', 'create', 'create2', 'selfdestruct']),

  /** Caller address */
  from: z.string(),

  /** Target address */
  to: z.string(),

  /** ETH value transferred (wei, as string for BigInt safety) */
  value: z.string(),

  /** Gas consumed by this call */
  gasUsed: z.string(),

  /** Input data (hex) */
  input: z.string(),

  /** Output data (hex) */
  output: z.string(),

  /** Error message if the call reverted */
  error: z.string().nullable(),

  /** Depth in the call tree (0 = top-level) */
  depth: z.number().int().nonnegative(),

  /** Nested child calls */
  children: z.array(z.lazy((): z.ZodTypeAny => CallTreeNodeSchema)).default([]),
});

export type CallTreeNode = z.infer<typeof CallTreeNodeSchema>;

/**
 * Decoded event log from the traced transaction.
 * Aligned with `DecodedEvent` from IChainDataPort.
 */
export const DecodedEventLogSchema = z.object({
  /** Contract address that emitted the event */
  address: z.string(),

  /** Event name (e.g., "Transfer", "Approval") */
  name: z.string(),

  /** Event signature (e.g., "Transfer(address,address,uint256)") */
  signature: z.string(),

  /** Indexed topics */
  topics: z.array(z.string()),

  /** Non-indexed event data (hex) */
  data: z.string(),

  /** Log index within the transaction */
  logIndex: z.number().int().nonnegative(),

  /** Decoded parameter key-value pairs (null if ABI not available) */
  decoded: z.record(z.string(), z.unknown()).nullable(),
});

export type DecodedEventLog = z.infer<typeof DecodedEventLogSchema>;

/**
 * Full trace result — returned when trace job status is 'completed'.
 *
 * Contains the complete call tree, storage diffs, decoded events,
 * and transaction metadata for forensic analysis.
 */
export const TraceResultSchema = z.object({
  /** Transaction hash that was traced */
  txHash: z.string(),

  /** Chain where the transaction was executed */
  chain: ChainSchema,

  /** Block number of the transaction */
  blockNumber: z.number().int().nonnegative(),

  /** Block timestamp (ISO 8601) */
  blockTimestamp: z.string().datetime(),

  /** Transaction sender */
  from: z.string(),

  /** Transaction recipient (null for contract creation) */
  to: z.string().nullable(),

  /** ETH value transferred (wei, as string) */
  value: z.string(),

  /** Total gas used by the transaction */
  gasUsed: z.string(),

  /** Transaction status */
  txStatus: z.enum(['success', 'failure']),

  /** Root-level call tree (contains nested children) */
  callTree: CallTreeNodeSchema,

  /** Total number of internal calls (flattened count) */
  totalInternalCalls: z.number().int().nonnegative(),

  /** Maximum call depth reached */
  maxDepthReached: z.number().int().nonnegative(),

  /** Storage slot diffs — empty array if includeStorageDiffs was false */
  storageDiffs: z.array(StorageDiffSchema).default([]),

  /** Decoded event logs — empty array if includeDecodedLogs was false */
  decodedLogs: z.array(DecodedEventLogSchema).default([]),

  /** Execution time for the trace operation in milliseconds */
  traceTimeMs: z.number().int().nonnegative(),
});

export type TraceResult = z.infer<typeof TraceResultSchema>;

/**
 * Full trace job status response.
 * Follows the `{ jobId, status, result?, error?, progress }` pattern.
 *
 * - `status: 'queued'` → result is null, progress may have initial stage
 * - `status: 'active'` → result is null, progress updates in real-time
 * - `status: 'completed'` → result contains TraceResult
 * - `status: 'failed'` → error contains failure details
 */
export const ForensicTraceJobResponseSchema = z.object({
  /** BullMQ job identifier */
  jobId: z.string(),

  /** Current job status */
  status: ForensicJobStatusSchema,

  /** Trace result — present only when status is 'completed' */
  result: TraceResultSchema.nullable().default(null),

  /** Error details — present only when status is 'failed' */
  error: z
    .object({
      /** Error classification */
      code: z.string(),
      /** Human-readable error message */
      message: z.string(),
      /** Stack trace (development only — stripped in production) */
      stack: z.string().optional(),
    })
    .nullable()
    .default(null),

  /** Progress tracking — present during 'queued' and 'active' states */
  progress: ForensicJobProgressSchema.nullable().default(null),

  /** ISO 8601 timestamp of when the job was created */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last status update */
  updatedAt: z.string().datetime(),
});

export type ForensicTraceJobResponse = z.infer<typeof ForensicTraceJobResponseSchema>;
