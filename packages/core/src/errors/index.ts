/**
 * @module errors
 * @description Barrel export for the AEGIS error hierarchy.
 *
 * Every error class maps 1:1 to an ErrorCode from ErrorCodeSchema.
 * Import errors from `@aegis/core` — never import individual files directly.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

// ── Base Class ───────────────────────────────────────────────────────────────
export { AegisError } from './aegis-error.js';
export type { AegisErrorOptions } from './aegis-error.js';

// ── Concrete Error Classes ───────────────────────────────────────────────────
export { ValidationError } from './validation-error.js';
export { BadRequestError } from './bad-request-error.js';
export { UnauthorizedError } from './unauthorized-error.js';
export { ForbiddenError } from './forbidden-error.js';
export { NotFoundError } from './not-found-error.js';
export { ConflictError } from './conflict-error.js';
export { RateLimitError } from './rate-limit-error.js';
export { InternalError } from './internal-error.js';
export { ExternalServiceError } from './external-service-error.js';
