/**
 * @module ForbiddenError
 * @description Authorization failure error (HTTP 403).
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import { AegisError } from './aegis-error.js';

/**
 * Access denied — HTTP 403.
 *
 * @example
 * ```typescript
 * throw new ForbiddenError('Admin access required for ETL sync');
 * ```
 */
export class ForbiddenError extends AegisError {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
  }
}
