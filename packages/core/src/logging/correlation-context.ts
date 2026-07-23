/**
 * @module correlation-context
 * @description Request-scoped correlation ID storage via AsyncLocalStorage.
 *
 * Enables automatic correlation ID injection into every log entry
 * within a request context. The API Gateway middleware creates the context,
 * and the logger reads it automatically.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/** Shape of the correlation context stored in AsyncLocalStorage. */
export interface CorrelationContext {
  readonly correlationId: string;
}

/** Singleton AsyncLocalStorage instance for request-scoped correlation IDs. */
export const correlationStorage = (() => {
  try {
    return new AsyncLocalStorage<CorrelationContext>();
  } catch {
    return null as unknown as AsyncLocalStorage<CorrelationContext>;
  }
})();

/**
 * Get the current correlation ID from the active async context.
 *
 * Returns `'unknown'` when called outside a correlation context
 * (e.g., during startup, background jobs without explicit context).
 */
export function getCorrelationId(): string {
  return correlationStorage.getStore()?.correlationId ?? 'unknown';
}

/**
 * Run a function within a correlation context.
 *
 * All code executed within `fn` (including async continuations)
 * will have access to the provided correlation ID via `getCorrelationId()`.
 *
 * @param correlationId - The correlation ID for this context
 * @param fn - The function to execute within the context
 * @returns The return value of `fn`
 */
export function runWithCorrelation<T>(correlationId: string, fn: () => T): T {
  return correlationStorage.run({ correlationId }, fn);
}

/**
 * Generate a new cryptographically secure correlation ID.
 * Uses `crypto.randomUUID()` (UUID v4).
 */
export function createCorrelationId(): string {
  return randomUUID();
}
