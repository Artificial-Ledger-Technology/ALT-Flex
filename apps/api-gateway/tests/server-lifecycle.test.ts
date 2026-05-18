/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Server Lifecycle & Configuration QA Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates graceful shutdown behavior and server.ts configuration
 * via static source analysis (no runtime env manipulation needed).
 *
 * Multi-Role Coverage:
 *  - Senior DevSecOps:  [OPS] Shutdown, SIGTERM/SIGINT, env config
 *  - Senior SWE:        Fastify lifecycle, configuration patterns
 *
 * NOTE: CONF-006 was updated post code-review to reflect that requestIdHeader
 * was intentionally removed from server.ts (FIX 5). The test now verifies
 * the middleware comment instead.
 *
 * @module tests/server-lifecycle
 * @task P1-ARCH-011 | Code Review Remediation (leirk04)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTestServer } from './test-utils/build-test-server.js';
import { systemRoutes } from '../src/routes/system.routes.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_SOURCE_PATH = path.resolve(__dirname, '..', 'src', 'server.ts');

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function buildLifecycleServer(): Promise<FastifyInstance> {
  const server = await buildTestServer({ withRateLimit: false, withCors: false });
  await server.register(systemRoutes);
  await server.ready();
  return server;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Server Lifecycle — P1-ARCH-011', () => {
  // ═════════════════════════════════════════════════════════════════════════
  // GAP-4: Graceful Shutdown
  // ═════════════════════════════════════════════════════════════════════════

  describe('Graceful Shutdown', () => {
    it('[LIFE-001] server.close() resolves without error after ready()', async () => {
      const server = await buildLifecycleServer();
      await expect(server.close()).resolves.not.toThrow();
    });

    it('[LIFE-002] server does not listen after close()', async () => {
      const server = await buildLifecycleServer();

      const res1 = await server.inject({ method: 'GET', url: '/health' });
      expect(res1.statusCode).toBe(200);

      await server.close();
      expect(server.server.listening).toBe(false);
    });

    it('[LIFE-003] multiple server instances can be created and destroyed independently', async () => {
      const server1 = await buildLifecycleServer();
      const server2 = await buildLifecycleServer();

      const res1 = await server1.inject({ method: 'GET', url: '/health' });
      const res2 = await server2.inject({ method: 'GET', url: '/health' });
      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);

      await server1.close();
      const res3 = await server2.inject({ method: 'GET', url: '/health' });
      expect(res3.statusCode).toBe(200);

      await server2.close();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-9: Server Configuration — Static Source Analysis
  // ═════════════════════════════════════════════════════════════════════════

  describe('Server Configuration (static analysis)', () => {
    let source: string;

    beforeAll(() => {
      source = fs.readFileSync(SERVER_SOURCE_PATH, 'utf-8');
    });

    it('[CONF-001] server.ts reads API_PORT from env', () => {
      expect(source).toMatch(/process\.env\[?['"]API_PORT/);
    });

    it('[CONF-002] server.ts reads API_HOST from env', () => {
      expect(source).toMatch(/process\.env\[?['"]API_HOST/);
    });

    it('[CONF-003] server.ts reads LOG_LEVEL from env', () => {
      expect(source).toMatch(/process\.env\[?['"]LOG_LEVEL/);
    });

    it('[CONF-004] server.ts reads CORS_ORIGIN from env', () => {
      expect(source).toMatch(/process\.env\[?['"]CORS_ORIGIN/);
    });

    it('[CONF-005] server.ts reads API_RATE_LIMIT_MAX from env', () => {
      expect(source).toMatch(/process\.env\[?['"]API_RATE_LIMIT_MAX/);
    });

    it("[CONF-006] [OPS] server.ts uses x-correlation-id via correlation ID middleware", () => {
      // requestIdHeader was intentionally removed (FIX 5) — the correlation
      // middleware owns the x-correlation-id lifecycle exclusively.
      // We verify both that x-correlation-id is referenced and the middleware comment exists.
      expect(source).toContain('x-correlation-id');
      expect(source).toContain('correlation ID middleware');
    });

    it('[CONF-007] [OPS] server.ts registers SIGTERM and SIGINT handlers', () => {
      expect(source).toContain('SIGTERM');
      expect(source).toContain('SIGINT');
    });
  });
});
