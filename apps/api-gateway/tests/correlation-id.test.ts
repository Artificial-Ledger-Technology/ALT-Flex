/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Correlation ID Middleware Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Verifies:
 *  1. Auto-generated UUID correlation ID on every response
 *  2. Incoming x-correlation-id header is forwarded (distributed tracing)
 *  3. Generated IDs are valid UUID v4 format
 *
 * @task P1-ARCH-011
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { correlationIdMiddleware } from '../src/middleware/correlation-id.middleware.js';

// UUID v4 pattern: 8-4-4-4-12 hex characters
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Test Server Factory ──────────────────────────────────────────────────────

function buildTestServer(): FastifyInstance {
  const server = Fastify({
    logger: false,
    requestIdHeader: 'x-correlation-id',
    requestIdLogLabel: 'correlationId',
  });

  void server.register(correlationIdMiddleware);

  // Echo route that returns the request ID
  // eslint-disable-next-line @typescript-eslint/require-await -- test route returns synchronously
  server.get('/echo', async (request) => {
    return { requestId: request.id };
  });

  return server;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Correlation ID Middleware', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = buildTestServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('sets x-correlation-id response header on every response', async () => {
    const res = await server.inject({ method: 'GET', url: '/echo' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('generates a valid UUID format when no incoming header', async () => {
    const res = await server.inject({ method: 'GET', url: '/echo' });
    const correlationId = res.headers['x-correlation-id'] as string;
    expect(correlationId).toMatch(UUID_V4_REGEX);
  });

  it('forwards incoming x-correlation-id header for distributed tracing', async () => {
    const customId = 'trace-from-upstream-abc-123';
    const res = await server.inject({
      method: 'GET',
      url: '/echo',
      headers: { 'x-correlation-id': customId },
    });
    expect(res.headers['x-correlation-id']).toBe(customId);
    const body = JSON.parse(res.payload) as { requestId: string };
    expect(body.requestId).toBe(customId);
  });

  it('generates unique IDs for concurrent requests', async () => {
    const results = await Promise.all([
      server.inject({ method: 'GET', url: '/echo' }),
      server.inject({ method: 'GET', url: '/echo' }),
      server.inject({ method: 'GET', url: '/echo' }),
    ]);

    const ids = results.map((r) => r.headers['x-correlation-id'] as string);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('ignores empty x-correlation-id header and generates a new one', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/echo',
      headers: { 'x-correlation-id': '' },
    });
    const correlationId = res.headers['x-correlation-id'] as string;
    expect(correlationId).toMatch(UUID_V4_REGEX);
    expect(correlationId.length).toBeGreaterThan(0);
  });
});
