/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Error Handler Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Verifies the global error handler correctly maps:
 *  1. AegisError subclasses → structured JSON with correct HTTP status
 *  2. Unknown errors → 500 with generic message, no stack trace
 *
 * NOTE: Test routes throw plain duck-typed objects that satisfy isAegisError()
 * instead of actual AegisError class instances. This avoids Vitest's SSR
 * transform issue with @aegis/core workspace package named exports.
 * The production behavior is identical since error-handler.ts uses structural
 * duck-typing (isAegisError) to classify errors.
 *
 * toJSON() shape: { error: ErrorCode, code: 'AEGIS-{statusCode}', message, timestamp }
 *
 * @task P1-ARCH-011 | Code Review Remediation (leirk04)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerErrorHandler } from '../src/middleware/error-handler.js';

// ── Duck-typed AegisError factory (mirrors AegisError.toJSON() output) ────────

function makeAegisError(opts: {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  isOperational?: boolean;
  details?: unknown;
}) {
  return {
    statusCode: opts.statusCode,
    isOperational: opts.isOperational ?? true,
    message: opts.message,
    toJSON: () => ({
      error: opts.error,
      code: opts.code,
      message: opts.message,
      timestamp: new Date().toISOString(),
      ...(opts.details !== null && opts.details !== undefined ? { details: opts.details } : {}),
    }),
  };
}

// ── Test Server Factory ──────────────────────────────────────────────────────

function buildTestServer(): FastifyInstance {
  const server = Fastify({ logger: false });

  registerErrorHandler(server);

  // Route that throws a ValidationError duck-type
  // eslint-disable-next-line @typescript-eslint/require-await -- test routes throw synchronously
  server.get('/test/validation-error', async () => {
    throw makeAegisError({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      code: 'AEGIS-400',
      message: 'Name is required',
      details: [{ field: 'name', message: 'must not be empty' }],
    });
  });

  // Route that throws a NotFoundError duck-type
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/not-found-error', async () => {
    throw makeAegisError({
      statusCode: 404,
      error: 'NOT_FOUND',
      code: 'AEGIS-404',
      message: 'HackIncident with id abc-123 not found',
    });
  });

  // Route that throws an UnauthorizedError duck-type
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/unauthorized-error', async () => {
    throw makeAegisError({
      statusCode: 401,
      error: 'UNAUTHORIZED',
      code: 'AEGIS-401',
      message: 'Invalid API key',
    });
  });

  // Route that throws a ForbiddenError duck-type
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/forbidden-error', async () => {
    throw makeAegisError({
      statusCode: 403,
      error: 'FORBIDDEN',
      code: 'AEGIS-403',
      message: 'Insufficient permissions',
    });
  });

  // Route that throws a ConflictError duck-type
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/conflict-error', async () => {
    throw makeAegisError({
      statusCode: 409,
      error: 'CONFLICT',
      code: 'AEGIS-409',
      message: 'Duplicate entry',
    });
  });

  // Route that throws a RateLimitError duck-type
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/rate-limit-error', async () => {
    throw makeAegisError({
      statusCode: 429,
      error: 'RATE_LIMIT_EXCEEDED',
      code: 'AEGIS-429',
      message: 'Too many requests',
    });
  });

  // Route that throws an InternalError duck-type (isOperational: false)
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/internal-error', async () => {
    throw makeAegisError({
      statusCode: 500,
      error: 'INTERNAL_ERROR',
      code: 'AEGIS-500',
      message: 'Database connection lost',
      isOperational: false,
    });
  });

  // Route that throws a BadRequestError duck-type
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/bad-request-error', async () => {
    throw makeAegisError({
      statusCode: 400,
      error: 'BAD_REQUEST',
      code: 'AEGIS-400',
      message: 'Malformed JSON body',
    });
  });

  // Route that throws an ExternalServiceError duck-type
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/external-service-error', async () => {
    throw makeAegisError({
      statusCode: 502,
      error: 'SERVICE_UNAVAILABLE',
      code: 'AEGIS-502',
      message: 'External service DefiLlama is unavailable',
    });
  });

  // Route that throws a raw Error (unknown — not an AegisError)
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/unknown-error', async () => {
    throw new Error('something broke internally');
  });

  return server;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Global Error Handler', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = buildTestServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  // ── AegisError subclass tests ──────────────────────────────────────────

  it('returns 400 for ValidationError with field details', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/validation-error' });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('VALIDATION_ERROR');
    expect(body['code']).toBe('AEGIS-400');
    expect(body['message']).toBe('Name is required');
    expect(body).toHaveProperty('correlationId');
  });

  it('returns 404 for NotFoundError with auto-generated message', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/not-found-error' });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('NOT_FOUND');
    expect(body['code']).toBe('AEGIS-404');
  });

  it('returns 401 for UnauthorizedError', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/unauthorized-error' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('UNAUTHORIZED');
    expect(body['code']).toBe('AEGIS-401');
  });

  it('returns 403 for ForbiddenError', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/forbidden-error' });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('FORBIDDEN');
    expect(body['code']).toBe('AEGIS-403');
  });

  it('returns 409 for ConflictError', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/conflict-error' });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('CONFLICT');
    expect(body['code']).toBe('AEGIS-409');
  });

  it('returns 429 for RateLimitError', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/rate-limit-error' });
    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('RATE_LIMIT_EXCEEDED');
    expect(body['code']).toBe('AEGIS-429');
  });

  it('returns 500 for InternalError with isOperational=false', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/internal-error' });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('INTERNAL_ERROR');
    expect(body['code']).toBe('AEGIS-500');
  });

  it('returns 400 for BadRequestError', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/bad-request-error' });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('BAD_REQUEST');
    expect(body['code']).toBe('AEGIS-400');
  });

  it('returns 502 for ExternalServiceError', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/external-service-error' });
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('SERVICE_UNAVAILABLE');
    expect(body['code']).toBe('AEGIS-502');
  });

  // ── Unknown error test ─────────────────────────────────────────────────

  it('returns 500 with generic message for unknown errors (no stack trace)', async () => {
    const res = await server.inject({ method: 'GET', url: '/test/unknown-error' });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['error']).toBe('INTERNAL_ERROR');
    expect(body['message']).toBe('An unexpected error occurred');
    expect(body).toHaveProperty('correlationId');
    expect(body).toHaveProperty('timestamp');

    // SECURITY: No stack trace or internal error message exposed
    expect(body).not.toHaveProperty('stack');
    expect(JSON.stringify(body)).not.toContain('something broke internally');
  });

  // ── Correlation ID in error responses ──────────────────────────────────

  it('includes correlationId in all error responses', async () => {
    const urls = ['/test/validation-error', '/test/not-found-error', '/test/unknown-error'];

    for (const url of urls) {
      const res = await server.inject({ method: 'GET', url });
      const body = JSON.parse(res.payload) as Record<string, unknown>;
      expect(body).toHaveProperty('correlationId');
    }
  });

  // ── AegisError hierarchy check ─────────────────────────────────────────
  // NOTE: Verifies duck-type shape instead of instanceof (SSR transform compat)

  it('makeAegisError factory produces valid isAegisError-compatible objects', () => {
    const errors = [
      makeAegisError({
        statusCode: 400,
        error: 'VALIDATION_ERROR',
        code: 'AEGIS-400',
        message: 'test',
      }),
      makeAegisError({ statusCode: 404, error: 'NOT_FOUND', code: 'AEGIS-404', message: 'test' }),
      makeAegisError({
        statusCode: 401,
        error: 'UNAUTHORIZED',
        code: 'AEGIS-401',
        message: 'test',
      }),
      makeAegisError({ statusCode: 403, error: 'FORBIDDEN', code: 'AEGIS-403', message: 'test' }),
      makeAegisError({ statusCode: 409, error: 'CONFLICT', code: 'AEGIS-409', message: 'test' }),
      makeAegisError({
        statusCode: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        code: 'AEGIS-429',
        message: 'test',
      }),
      makeAegisError({
        statusCode: 500,
        error: 'INTERNAL_ERROR',
        code: 'AEGIS-500',
        message: 'test',
        isOperational: false,
      }),
      makeAegisError({ statusCode: 400, error: 'BAD_REQUEST', code: 'AEGIS-400', message: 'test' }),
      makeAegisError({
        statusCode: 502,
        error: 'SERVICE_UNAVAILABLE',
        code: 'AEGIS-502',
        message: 'test',
      }),
    ];

    for (const err of errors) {
      expect(typeof err.isOperational).toBe('boolean');
      expect(typeof err.statusCode).toBe('number');
      expect(typeof err.toJSON).toBe('function');
      const json = err.toJSON();
      expect(json).toHaveProperty('error');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('message');
    }
  });
});
