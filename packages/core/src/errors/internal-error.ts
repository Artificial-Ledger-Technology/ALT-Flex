/**
 * @module InternalError
 * @description Unexpected internal server error (HTTP 500).
 *
 * Marks `isOperational = false` to indicate a programmer bug
 * rather than an expected business error.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import { AegisError } from './aegis-error.js';

/**
 * Unexpected internal error — HTTP 500.
 *
 * Non-operational: indicates a programmer error, not a business-expected failure.
 *
 * @example
 * ```typescript
 * throw new InternalError('Unexpected null in result set', originalError);
 * ```
 */
export class InternalError extends AegisError {
  constructor(message: string = 'An unexpected error occurred', cause?: Error) {
    super(message, 'INTERNAL_ERROR', 500, {
      isOperational: false,
      ...(cause ? { cause } : {}),
    });
  }
}
