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
  TransactionData,
  TransactionTrace,
  InternalCall,
  DecodedEvent,
  BlockData,
  ContractInfo,
  PaginatedResult,
  SortConfig,
  // API Schemas
  ForensicPocListQuery,
  ForensicPocDetailParams,
  ForensicSimulateRequest,
  ForensicTraceRequest,
  ForensicJobStatus,
  ForensicJobProgress,
} from '@aegis/core';

// ── Engine-specific Application Layer (populated in Phase 2+) ───────────────
// export * from './application/index.js';

// ── Engine-specific Adapter Layer (populated in Phase 2+) ───────────────────
// export * from './adapters/index.js';

// ── Engine-specific Domain Extensions (populated in Phase 2+) ───────────────
// export * from './domain/index.js';
