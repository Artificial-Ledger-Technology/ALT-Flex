/**
 * @module logging
 * @description Barrel export for the AEGIS structured logging framework.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

// ── Correlation Context ──────────────────────────────────────────────────────
export {
  correlationStorage,
  getCorrelationId,
  runWithCorrelation,
  createCorrelationId,
} from './correlation-context.js';

export type { CorrelationContext } from './correlation-context.js';

// ── Logger Port (Interface) ──────────────────────────────────────────────────
export type { LoggerPort } from './logger-port.js';

// ── Logger Factory (Implementation) ──────────────────────────────────────────
export { createLogger } from './logger.js';
export type { LoggerOptions, LogLevel } from './logger.js';

// ── Error Formatting ─────────────────────────────────────────────────────────
export { describeError } from './describe-error.js';
