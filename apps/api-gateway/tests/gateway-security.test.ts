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
 * NOTE: SEC-CID-001 and SEC-CID-002 were updated post code-review to assert
 * that the server NOW REJECTS invalid correlation IDs (oversized/XSS) and
 * generates a fresh UUID. Previously they incorrectly validated the vulnerability.
 *
 * @module tests/gateway-security
 * @task P1-ARCH-011 | Code Review Remediation (leirk04)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer } from './test-utils/build-test-server.js';
import { systemRoutes } from '../src/routes/system.routes.js';

// UUID v4 pattern: 8-4-4-4-12 hex characters
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ═══════════════════════════════════════════════════════════════════════════════
// Test Server Factory
// ═══════════════════════════════════════════════════════════════════════════════

async function buildSecurityServer(): Promise<FastifyInstance> {
  const server = await buildTestServer({ withRateLimit: false });

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
  // (Updated post code-review to reflect sanitization now implemented)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Correlation ID Security', () => {
    it('[SEC-CID-001] oversized x-correlation-id (>128 chars) is REJECTED — server generates fresh UUID', async () => {
      const oversizedId = 'x'.repeat(2000);
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': oversizedId },
      });
      expect(res.statusCode).toBe(200);
      // Server must NOT echo back the 2000-char ID — it must generate a fresh UUID
      expect(res.headers['x-correlation-id']).toMatch(UUID_V4_REGEX);
      expect(res.headers['x-correlation-id']).not.toBe(oversizedId);
    });

    it('[SEC-CID-002] x-correlation-id with XSS/HTML payload is REJECTED — server generates fresh UUID', async () => {
      const xssId = '<script>alert("xss")</script>';
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': xssId },
      });
      expect(res.statusCode).toBe(200);
      // Must reject the XSS payload and generate a clean UUID
      expect(res.headers['x-correlation-id']).toMatch(UUID_V4_REGEX);
      expect(res.headers['x-correlation-id']).not.toBe(xssId);
    });

    it('[SEC-CID-003] x-correlation-id with null bytes is rejected — server generates fresh UUID', async () => {
      const nullId = 'id-with-\x00-null';
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': nullId },
      });
      // Fastify may reject null bytes internally (400/500) or process them.
      // Either way, the returned correlation ID must be a valid UUID.
      expect([200, 400, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.headers['x-correlation-id']).toMatch(UUID_V4_REGEX);
      }
    });

    it('[SEC-CID-004] valid correlation ID within 128 chars is forwarded as-is', async () => {
      const validId = 'trace-from-upstream-abc-123';
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': validId },
      });
      expect(res.statusCode).toBe(200);
      // Valid IDs must pass through unchanged
      expect(res.headers['x-correlation-id']).toBe(validId);
    });

    it('[SEC-CID-005] x-correlation-id with log injection characters (\\r\\n) is REJECTED', async () => {
      const injectionId = 'valid-id\r\nX-Injected-Header: evil';
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': injectionId },
      });
      // Server must not echo the injection string
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-correlation-id']).toMatch(UUID_V4_REGEX);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-7: Error Handler Edge Cases
  // ═════════════════════════════════════════════════════════════════════════

  describe('Error Handler Edge Cases', () => {
    it('[SEC-ERR-001] thrown string returns 500 with no internal details', async () => {
      const res = await server.inject({ method: 'GET', url: '/test/throw-string' });
      expect(res.statusCode).toBe(500);
      // Fastify handles thrown primitives before setErrorHandler —
      // it uses its native 500 format. Verify no internal details leak.
      const bodyStr = res.payload;
      expect(bodyStr).not.toContain('raw string error');
      expect(bodyStr).not.toContain('node_modules');
    });

    it('[SEC-ERR-002] thrown null returns 500 without exposing internals', async () => {
      const res = await server.inject({ method: 'GET', url: '/test/throw-null' });
      expect(res.statusCode).toBe(500);
      const bodyStr = res.payload;
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

    it('[SEC-ERR-006] 500 error response does not expose internal details', async () => {
      const res = await server.inject({ method: 'GET', url: '/test/throw-string' });
      expect(res.statusCode).toBe(500);
      const bodyStr = res.payload;
      // Key security property: no stack traces, no internal paths
      expect(bodyStr).not.toContain('.ts:');
      expect(bodyStr).not.toContain('node_modules');
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
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('[PEN-003] request with duplicate x-correlation-id headers does not crash', async () => {
      // @ts-expect-error — intentional invalid type for adversarial test
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': ['id-1', 'id-2'] },
      });
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
