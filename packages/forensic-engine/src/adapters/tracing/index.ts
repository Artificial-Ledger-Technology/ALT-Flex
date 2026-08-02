/**
 * @module @aegis/forensic-engine/adapters/tracing
 *
 * Transaction trace analysis adapter for EVM call tree extraction.
 * Wraps debug_traceTransaction RPC calls and provides rich analysis
 * including function decoding, pattern detection, and gas breakdown.
 *
 * @hexagonal Adapter Layer — Engine γ (Driven/Secondary)
 * @task P5-EVM-003
 */

// ── Core Service ────────────────────────────────────────────────────────────
export { TransactionTraceAnalyzer } from './transaction-trace-analyzer.js';

// ── Supporting Components ───────────────────────────────────────────────────
export { SelectorResolver } from './selector-resolver.js';

// ── Error Types ─────────────────────────────────────────────────────────────
export {
  TraceNotAvailableError,
  TraceTooLargeError,
  TraceDepthExceededError,
} from './trace-errors.js';
