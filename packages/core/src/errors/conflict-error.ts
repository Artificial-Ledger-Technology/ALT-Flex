/**
 * @module ConflictError
 * @description Duplicate resource conflict error (HTTP 409).
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import { AegisError } from './aegis-error.js';

/**
 * Resource conflict (duplicate) — HTTP 409.
 *
 * @example
 * ```typescript
 * throw new ConflictError('Hack incident with this tx hash already exists');
 * ```
 */
export class ConflictError extends AegisError {
  constructor(message: string = 'Resource conflict') {
    super(message, 'CONFLICT', 409);
  }
}
