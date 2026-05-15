/**
 * @module BadRequestError
 * @description General malformed request error (HTTP 400).
 *
 * Use for malformed requests without specific field-level details.
 * For field-level validation errors, use ValidationError instead.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import { AegisError } from './aegis-error.js';

/**
 * General bad request — HTTP 400.
 *
 * @example
 * ```typescript
 * throw new BadRequestError('Request body is not valid JSON');
 * ```
 */
export class BadRequestError extends AegisError {
  constructor(message: string = 'Bad request') {
    super(message, 'BAD_REQUEST', 400);
  }
}
