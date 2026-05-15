/**
 * @module ExternalServiceError
 * @description Upstream/external service failure error (HTTP 502).
 *
 * Used when calls to DefiLlama, DeFiHackLabs, RPC nodes,
 * or any external dependency fail.
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import { AegisError } from './aegis-error.js';

/**
 * External service unavailable — HTTP 502.
 *
 * @example
 * ```typescript
 * throw new ExternalServiceError('DefiLlama', 'API returned 503', upstreamError);
 * ```
 */
export class ExternalServiceError extends AegisError {
  /** Name of the external service that failed. */
  readonly serviceName: string;

  constructor(serviceName: string, message?: string, cause?: Error) {
    const errorMessage = message ?? `External service '${serviceName}' is unavailable`;
    super(errorMessage, 'SERVICE_UNAVAILABLE', 502, cause ? { cause } : undefined);
    this.serviceName = serviceName;
  }
}
