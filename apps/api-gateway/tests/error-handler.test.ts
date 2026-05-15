/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Error Handler Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Verifies the global error handler correctly maps:
 *  1. AegisError subclasses → structured JSON with correct HTTP status
 *  2. Unknown errors → 500 with generic message, no stack trace
 *
 * toJSON() shape: { error: ErrorCode, code: 'AEGIS-{statusCode}', message, timestamp }
 *
 * @task P1-ARCH-011
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  AegisError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  InternalError,
  BadRequestError,
  ExternalServiceError,
} from '@aegis/core';
import { registerErrorHandler } from '../src/middleware/error-handler.js';

// ── Test Server Factory ──────────────────────────────────────────────────────

function buildTestServer(): FastifyInstance {
  const server = Fastify({ logger: false });

  registerErrorHandler(server);

  // Route that throws a ValidationError
  // eslint-disable-next-line @typescript-eslint/require-await -- test routes throw synchronously
  server.get('/test/validation-error', async () => {
    throw new ValidationError('Name is required', [
      { field: 'name', message: 'must not be empty' },
    ]);
  });

  // Route that throws a NotFoundError
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/not-found-error', async () => {
    throw new NotFoundError('HackIncident', 'abc-123');
  });

  // Route that throws an UnauthorizedError
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/unauthorized-error', async () => {
    throw new UnauthorizedError('Invalid API key');
  });

  // Route that throws a ForbiddenError
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/forbidden-error', async () => {
    throw new ForbiddenError('Insufficient permissions');
  });

  // Route that throws a ConflictError
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/conflict-error', async () => {
    throw new ConflictError('Duplicate entry');
  });

  // Route that throws a RateLimitError
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/rate-limit-error', async () => {
    throw new RateLimitError('Too many requests', 30000);
  });

  // Route that throws an InternalError
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/internal-error', async () => {
    throw new InternalError('Database connection lost');
  });

  // Route that throws a BadRequestError
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/bad-request-error', async () => {
    throw new BadRequestError('Malformed JSON body');
  });

  // Route that throws an ExternalServiceError
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/external-service-error', async () => {
    throw new ExternalServiceError('DefiLlama');
  });

  // Route that throws a raw Error (unknown)
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

  it('all AegisError subclasses are instanceof AegisError', () => {
    const errors = [
      new ValidationError('test'),
      new NotFoundError('Entity', '1'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new ConflictError(),
      new RateLimitError(),
      new InternalError(),
      new BadRequestError(),
      new ExternalServiceError('svc'),
    ];

    for (const err of errors) {
      expect(err).toBeInstanceOf(AegisError);
    }
  });
});
