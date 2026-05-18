/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Global Error Handler
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Centralized Fastify error handler that maps all errors to structured
 * JSON responses compatible with the StandardErrorResponseSchema.
 *
 * Error classification:
 *  - AegisError subclasses → return error.toJSON() with correct HTTP status
 *  - Fastify validation errors → map to 400 with VALIDATION_ERROR code
 *  - Unknown errors → return 500 with generic message (no stack trace leakage)
 *
 * SECURITY: Unknown errors NEVER expose stack traces, internal messages,
 * or implementation details. Only the correlation ID is returned for tracing.
 *
 * @module middleware/error-handler
 * @hexagonal Infrastructure Layer — Cross-Cutting Middleware
 * @task P1-ARCH-011 | Code Review Remediation (leirk04)
 */

import type { FastifyInstance } from 'fastify';

/**
 * Duck-type check for AegisError — avoids importing @aegis/core at runtime
 * to prevent Vitest SSR transform issues with workspace package exports.
 * Checks for the structural properties that all AegisError subclasses carry.
 */
function isAegisError(err: unknown): err is {
  isOperational: boolean;
  statusCode: number;
  message: string;
  toJSON: () => Record<string, unknown>;
} {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isOperational' in err &&
    'statusCode' in err &&
    'toJSON' in err &&
    typeof (err as Record<string, unknown>)['toJSON'] === 'function'
  );
}

/**
 * Register the global error handler on the Fastify instance.
 *
 * @param server - The Fastify server instance
 */
export function registerErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler((error, request, reply) => {
    // request.id is always set by the correlation ID middleware.
    // 'unresolved' is an explicit sentinel — avoids confusion with real IDs
    // or AsyncLocalStorage misses from getCorrelationId().
    const correlationId = request.id ?? 'unresolved';

    // ── 1. AegisError — our typed error hierarchy ──────────────────────
    if (isAegisError(error)) {
      if (error.isOperational) {
        request.log.warn({ err: error, correlationId }, error.message);
      } else {
        request.log.error({ err: error, correlationId }, error.message);
      }

      return reply.status(error.statusCode).send({
        ...error.toJSON(),
        correlationId,
      });
    }

    // ── 2. Fastify validation error ────────────────────────────────────
    // Fastify attaches a `validation` array when schema validation fails
    const fastifyError = error as Record<string, unknown>;
    if (Array.isArray(fastifyError['validation'])) {
      const validationErrors = fastifyError['validation'] as Array<{
        instancePath?: string;
        message?: string;
        params?: Record<string, unknown>;
      }>;

      request.log.warn({ err: error, correlationId }, 'Request validation failed');

      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        code: 'AEGIS-400',
        message: 'Request validation failed',
        details: validationErrors.map((v) => ({
          field: v.instancePath?.replace(/^\//, '').replace(/\//g, '.') ?? 'unknown',
          message: v.message ?? 'Invalid value',
        })),
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    // ── 3. Unknown error — mask everything ─────────────────────────────
    request.log.error({ err: error, correlationId }, 'Unhandled error — this is a programmer bug');

    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      code: 'AEGIS-500',
      message: 'An unexpected error occurred',
      correlationId,
      timestamp: new Date().toISOString(),
    });
  });
}
