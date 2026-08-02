/**
 * @module @aegis/forensic-engine/domain
 *
 * Engine-specific domain extensions for the Forensic Engine.
 * Engine-local entities, value objects, and specifications
 * that extend or compose the @aegis/core shared kernel.
 *
 * @hexagonal Domain Layer — Engine γ
 */

// ── Forge Domain Types (P5-EVM-002) ─────────────────────────────────────────
export type {
  ForgeCallType,
  ForgeTrace,
  ForgeLog,
  ForgeTestResult,
  FoundryProjectConfig,
  SimulationRequest,
  SimulationResult,
  RawForgeJsonOutput,
  RawForgeContractResult,
  RawForgeTestEntry,
  RawForgeLogEntry,
  RawForgeDecodedLog,
} from './forge-types.js';

// ── Trace Domain Types (P5-EVM-003) ─────────────────────────────────────────
export type {
  CallType,
  CallTreeNode,
  DecodedCall,
  DecodedArg,
  TransactionTraceResult,
  GasBreakdown,
  ValueFlowEntry,
  TraceSummary,
  ReentrancyMatch,
  DelegateCallMatch,
  CallCategory,
  CategorizedCall,
  DecodedEvent as TraceDecodedEvent,
} from './trace-types.js';
