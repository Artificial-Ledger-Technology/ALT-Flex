/**
 * @module NotFoundError
 * @description Resource not found error (HTTP 404).
 *
 * Generates structured messages like "HackIncident with id '123' not found".
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import { AegisError } from './aegis-error.js';

/**
 * Resource not found — HTTP 404.
 *
 * @example
 * ```typescript
 * throw new NotFoundError('HackIncident', 'abc-123');
 * // → message: "HackIncident with id 'abc-123' not found"
 *
 * throw new NotFoundError('Endpoint');
 * // → message: "Endpoint not found"
 * ```
 */
export class NotFoundError extends AegisError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;

    super(message, 'NOT_FOUND', 404);
  }
}
