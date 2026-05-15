/**
 * @module RateLimitError
 * @description Rate limit exceeded error (HTTP 429).
 *
 * Includes `retryAfterMs` for the client to know when to retry.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import { AegisError } from './aegis-error.js';

/**
 * Rate limit exceeded — HTTP 429.
 *
 * @example
 * ```typescript
 * throw new RateLimitError(30000); // retry after 30 seconds
 * ```
 */
export class RateLimitError extends AegisError {
  /** Milliseconds until the rate limit resets. */
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number = 60000, message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.retryAfterMs = retryAfterMs;
  }
}
