/**
 * @module @aegis/forensic-engine
 *
 * AltFlex AEGIS v3.0 — Forensic Engine (Engine γ)
 * Barrel export for the Forensic Engine domain logic.
 *
 * Re-exports core domain types consumed by this engine and exposes
 * engine-specific use cases, adapters, and infrastructure as they
 * are implemented in subsequent phases.
 *
 * @hexagonal Application + Adapter Layers
 */

// ── Core Domain Re-exports (types consumed by this engine) ──────────────────
export type {
  // Entities
  ExploitPOC,
  CreateExploitPOCInput,
  UpdateExploitPOCInput,
  PocExecutionStatus,
  ExploitComplexity,
  TargetContract,
  ForkParameters,
  // Ports
  IChainDataPort,
  IRpcPort,
  TransactionData,
  TransactionTrace,
  InternalCall,
  DecodedEvent,
  BlockData,
  ContractInfo,
  PaginatedResult,
  SortConfig,
  // RPC Types
  RpcBlock,
  RpcTransaction,
  RpcTransactionReceipt,
  RpcLog,
  RpcTraceResult,
  CallRequest,
  LogFilter,
  // API Schemas
  ForensicPocListQuery,
  ForensicPocDetailParams,
  ForensicSimulateRequest,
  ForensicTraceRequest,
  ForensicJobStatus,
  ForensicJobProgress,
} from '@aegis/core';

// ── Engine-specific Application Layer (populated in Phase 5+) ───────────────
// export * from './application/index.js';  // Uncomment when use cases are added

// ── Engine-specific Adapter Layer (P5-EVM-001+) ─────────────────────────────
export * from './adapters/index.js';

// ── Engine-specific Domain Extensions (P5-EVM-002+) ────────────────────────
export * from './domain/index.js';
