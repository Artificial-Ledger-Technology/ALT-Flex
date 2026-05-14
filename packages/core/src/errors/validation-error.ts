/**
 * @module ValidationError
 * @description Input validation failure error (HTTP 400).
 *
 * Carries field-level validation details from Zod schema parsing.
 * Use this when you have specific field-level error information.
 * For general malformed requests without field details, use BadRequestError.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import type { ValidationErrorDetail } from '../shared/schemas/common.schema.js';
import { AegisError } from './aegis-error.js';

/**
 * Input validation failure — HTTP 400.
 *
 * @example
 * ```typescript
 * throw new ValidationError('Invalid query parameters', [
 *   { field: 'page', message: 'Must be ≥ 1' },
 *   { field: 'attackVector', message: 'Invalid enum value' },
 * ]);
 * ```
 */
export class ValidationError extends AegisError {
  constructor(message: string, details?: ValidationErrorDetail[]) {
    super(message, 'VALIDATION_ERROR', 400, { details });
  }
}
