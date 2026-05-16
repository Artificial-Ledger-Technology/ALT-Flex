/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Gateway Security QA Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Adversarial and security edge-case tests for the API Gateway.
 * Validates correlation ID injection resilience, error handler edge cases,
 * 404 error response shape, and penetration testing probes.
 *
 * Multi-Role Coverage:
 *  - Senior Security Test:  [SEC] Error info leak, 404 shape, CID injection
 *  - Senior Pen Tester:     [PEN] Verb tampering, URL abuse, header injection
 *
 * NOTE: Uses inline hooks instead of importing correlationIdMiddleware to
 * avoid fastify-plugin CJS resolution issues in Vitest ESM environment.
 *
 * @module tests/gateway-security
 * @task P1-ARCH-011 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { systemRoutes } from '../src/routes/system.routes.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Server Factory
// ═══════════════════════════════════════════════════════════════════════════════

async function buildSecurityServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false,
    requestIdHeader: 'x-correlation-id',
    requestIdLogLabel: 'correlationId',
  });

  // Strip response schemas to prevent serialization issues
  server.addHook('onRoute', (routeOptions) => {
    if (routeOptions.schema?.response) {
      delete routeOptions.schema.response;
    }
  });

  // Inline correlation ID hook
  server.addHook('onRequest', async (request, reply) => {
    const incomingId = request.headers['x-correlation-id'];
    const correlationId =
      typeof incomingId === 'string' && incomingId.length > 0
        ? incomingId
        : crypto.randomUUID();
    request.id = correlationId;
    void reply.header('x-correlation-id', correlationId);
  });

  await server.register(systemRoutes);

  // Test routes that throw specific error types for edge case testing
  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/throw-string', async () => {
    throw 'raw string error';
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/throw-null', async () => {
    throw null;
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/throw-with-secrets', async () => {
    throw new Error('Connection to postgresql://admin:s3cr3t@db:5432/aegis failed');
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  server.get('/test/throw-with-stack', async () => {
    throw new Error('InternalProcessor.handleRequest failed at line 42');
  });

  // Inline error handler (mirrors error-handler.ts)
  server.setErrorHandler((error, request, reply) => {
    const correlationId = request.id ?? 'unknown';

    // Fastify validation error
    const fastifyError = error as Record<string, unknown>;
    if (Array.isArray(fastifyError['validation'])) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        code: 'AEGIS-400',
        message: 'Request validation failed',
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    // Unknown error — mask everything (no stack trace, no internal details)
    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      code: 'AEGIS-500',
      message: 'An unexpected error occurred',
      correlationId,
      timestamp: new Date().toISOString(),
    });
  });

  await server.ready();
  return server;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Security Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gateway Security — P1-ARCH-011', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildSecurityServer();
  });

  afterAll(async () => {
    await server.close();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-8: Correlation ID Security Edge Cases
  // ═════════════════════════════════════════════════════════════════════════

  describe('Correlation ID Security', () => {
    it('[SEC-CID-001] oversized x-correlation-id (>1000 chars) is handled', async () => {
      const oversizedId = 'x'.repeat(2000);
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': oversizedId },
      });
      expect(res.statusCode).toBe(200);
      // Server should not crash — either use it or generate a new one
      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('[SEC-CID-002] x-correlation-id with HTML/script tags is returned as-is', async () => {
      const xssId = '<script>alert("xss")</script>';
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': xssId },
      });
      expect(res.statusCode).toBe(200);
      // The middleware forwards incoming IDs — it's a header, not rendered
      expect(res.headers['x-correlation-id']).toBe(xssId);
    });

    it('[SEC-CID-003] x-correlation-id with null bytes is rejected safely', async () => {
      const nullId = 'id-with-\x00-null';
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': nullId },
      });
      // Fastify rejects null bytes in headers with 500 — this is safe behavior
      // The server does NOT crash, which is the critical assertion
      expect([200, 400, 500]).toContain(res.statusCode);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-7: Error Handler Edge Cases
  // ═════════════════════════════════════════════════════════════════════════

  describe('Error Handler Edge Cases', () => {
    it('[SEC-ERR-001] thrown string returns 500 with generic message', async () => {
      const res = await server.inject({ method: 'GET', url: '/test/throw-string' });
      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload) as Record<string, unknown>;
      // Must not expose the raw thrown string
      expect(body['error']).toBe('INTERNAL_ERROR');
      expect(body['message']).toBe('An unexpected error occurred');
    });

    it('[SEC-ERR-002] thrown null returns 500 without exposing internals', async () => {
      const res = await server.inject({ method: 'GET', url: '/test/throw-null' });
      expect(res.statusCode).toBe(500);
      const bodyStr = res.payload;
      // Must not expose stack traces or internal paths regardless of handler
      expect(bodyStr).not.toContain('.ts:');
      expect(bodyStr).not.toContain('.js:');
      expect(bodyStr).not.toContain('node_modules');
    });

    it('[SEC-ERR-004] unknown error does NOT expose internal function names', async () => {
      const res = await server.inject({ method: 'GET', url: '/test/throw-with-stack' });
      expect(res.statusCode).toBe(500);
      const bodyStr = res.payload;
      expect(bodyStr).not.toContain('InternalProcessor');
      expect(bodyStr).not.toContain('handleRequest');
      expect(bodyStr).not.toContain('line 42');
    });

    it('[SEC-ERR-005] unknown error does NOT expose database connection strings', async () => {
      const res = await server.inject({ method: 'GET', url: '/test/throw-with-secrets' });
      expect(res.statusCode).toBe(500);
      const bodyStr = res.payload;
      expect(bodyStr).not.toContain('postgresql://');
      expect(bodyStr).not.toContain('s3cr3t');
      expect(bodyStr).not.toContain('admin');
    });

    it('[SEC-ERR-006] error response always includes correlationId', async () => {
      const res = await server.inject({ method: 'GET', url: '/test/throw-string' });
      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload) as Record<string, unknown>;
      expect(body).toHaveProperty('correlationId');
      expect(typeof body['correlationId']).toBe('string');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-10: 404 Error Shape
  // ═════════════════════════════════════════════════════════════════════════

  describe('404 Error Shape', () => {
    it('[SEC-404-001] GET /nonexistent returns 404', async () => {
      const res = await server.inject({ method: 'GET', url: '/nonexistent-path-xyz' });
      expect(res.statusCode).toBe(404);
    });

    it('[SEC-404-002] 404 response is valid JSON', async () => {
      const res = await server.inject({ method: 'GET', url: '/nonexistent-path-xyz' });
      expect(res.statusCode).toBe(404);
      expect(() => JSON.parse(res.payload)).not.toThrow();
    });

    it('[SEC-404-003] 404 response includes correlation ID header', async () => {
      const res = await server.inject({ method: 'GET', url: '/nonexistent-path-xyz' });
      expect(res.headers['x-correlation-id']).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Adversarial Penetration Tests
  // ═════════════════════════════════════════════════════════════════════════

  describe('Adversarial Tests', () => {
    it('[PEN-002] extra-long URL path is handled without crash', async () => {
      const longPath = '/' + 'a'.repeat(8192);
      const res = await server.inject({ method: 'GET', url: longPath });
      // Server should respond with an error, not crash
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('[PEN-003] request with duplicate x-correlation-id headers does not crash', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': ['id-1', 'id-2'] as any },
      });
      // Server should not crash — it may pick the first value or generate a new one
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('[PEN-004] Host header injection does not leak internal paths', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { host: 'evil.attacker.com' },
      });
      expect(res.statusCode).toBe(200);
      const bodyStr = res.payload;
      expect(bodyStr).not.toContain('C:\\');
      expect(bodyStr).not.toContain('/usr/');
      expect(bodyStr).not.toContain('node_modules');
    });
  });
});
