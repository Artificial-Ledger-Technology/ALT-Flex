/**
 * @module describe-error
 * @description Renders an unknown thrown value as a non-empty log message.
 *
 * `error instanceof Error ? error.message : String(error)` looks safe but can
 * still yield an empty string. Node throws an `AggregateError` when a dual-stack
 * connect fails — every address is reported in `errors`, while `message` itself
 * is empty. A worker whose database is unreachable therefore logged
 * `{"error":"","msg":"❌ Job failed"}` and gave no clue why.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 */

/**
 * Describe a thrown value for logging, never returning an empty string.
 *
 * @param error - Any caught value
 * @returns The error message, expanded with aggregated causes when present
 *
 * @example
 * ```typescript
 * // AggregateError from a refused connection to an unreachable host
 * describeError(err);
 * // → 'AggregateError: connect ECONNREFUSED ::1:5432; connect ECONNREFUSED 127.0.0.1:5432'
 * ```
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const detail =
    error instanceof AggregateError
      ? (error.errors as unknown[]).map(describeError).join('; ')
      : '';

  if (error.message !== '') {
    return detail === '' ? error.message : `${error.message}: ${detail}`;
  }

  // Empty message — fall back to the class name so the log line stays useful.
  return detail === '' ? error.name : `${error.name}: ${detail}`;
}
