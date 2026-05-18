/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Middleware Integration QA Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates CORS policy, rate limiting behavior, route module registration,
 * and plugin registration order for the Fastify API Gateway.
 *
 * Multi-Role Coverage:
 *  - Senior SDET:           Route registration, rate limit behavior
 *  - Senior Security Test:  [SEC] CORS origin policy, credentials
 *  - Senior Pen Tester:     [PEN] Rate limit uniformity
 *  - Senior SWE:            Plugin ordering verification
 *
 * Architecture:
 *  - All tests use Fastify server.inject() — zero TCP ports opened
 *  - Rate limit exhaustion tests use an isolated low-limit server instance
 *  - Server factory is shared via test-utils/build-test-server.ts
 *
 * @module tests/middleware-integration
 * @task P1-ARCH-011 | Code Review Remediation (leirk04)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer } from './test-utils/build-test-server.js';
import { correlationIdMiddleware } from '../src/middleware/correlation-id.middleware.js';
import { systemRoutes } from '../src/routes/system.routes.js';
import { hacksRoutes } from '../src/routes/hacks.routes.js';
import { forensicsRoutes } from '../src/routes/forensics.routes.js';
import { skillsRoutes } from '../src/routes/skills.routes.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function buildFullServer(overrides?: { rateLimitMax?: number }): Promise<FastifyInstance> {
  const server = await buildTestServer({ rateLimitMax: overrides?.rateLimitMax });
  await server.register(systemRoutes);
  await server.register(hacksRoutes);
  await server.register(forensicsRoutes);
  await server.register(skillsRoutes);
  await server.ready();
  return server;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════════

describe('Middleware Integration — P1-ARCH-011', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildFullServer();
  });

  afterAll(async () => {
    await server.close();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-1: CORS Policy
  // ═════════════════════════════════════════════════════════════════════════

  describe('CORS Policy', () => {
    it('[CORS-001] response includes Access-Control-Allow-Origin header', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:3000' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('[CORS-002] OPTIONS preflight returns 204 with CORS headers', async () => {
      const res = await server.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'GET',
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });

    it('[CORS-003] Access-Control-Allow-Methods includes GET, POST, PUT, DELETE, PATCH', async () => {
      const res = await server.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'POST',
        },
      });
      const allowMethods = (res.headers['access-control-allow-methods'] as string) ?? '';
      expect(allowMethods).toContain('GET');
      expect(allowMethods).toContain('POST');
      expect(allowMethods).toContain('PUT');
      expect(allowMethods).toContain('DELETE');
      expect(allowMethods).toContain('PATCH');
    });

    it('[CORS-004] Access-Control-Allow-Credentials is true', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:3000' },
      });
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('[CORS-005] [SEC] CORS origin is not wildcard *', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:3000' },
      });
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-2: Rate Limiting
  // ═════════════════════════════════════════════════════════════════════════

  describe('Rate Limiting', () => {
    it('[RATE-001] response includes x-ratelimit-limit header', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('[RATE-002] response includes x-ratelimit-remaining header', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('[RATE-003] x-ratelimit-remaining decrements on sequential requests', async () => {
      const res1 = await server.inject({ method: 'GET', url: '/health' });
      const res2 = await server.inject({ method: 'GET', url: '/health' });
      const remaining1 = parseInt(res1.headers['x-ratelimit-remaining'] as string, 10);
      const remaining2 = parseInt(res2.headers['x-ratelimit-remaining'] as string, 10);
      expect(remaining2).toBeLessThan(remaining1);
    });

    it('[RATE-006] [PEN] rate limit headers present on domain route responses', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/hacks' });
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  // Rate limit exhaustion — fully isolated standalone server
  describe('Rate Limit Exhaustion', () => {
    let limitedServer: FastifyInstance;

    beforeAll(async () => {
      // Build a completely standalone Fastify instance with max:3 and a
      // unique keyGenerator to guarantee isolation from the outer server's counters.
      const Fastify2 = (await import('fastify')).default;
      const corsPlugin = (await import('@fastify/cors')).default;
      const rateLimitPlugin = (await import('@fastify/rate-limit')).default;

      const srv = Fastify2({ logger: false, requestIdLogLabel: 'correlationId' });
      srv.addHook('onRoute', (ro) => {
        if (ro.schema?.response) delete ro.schema.response;
      });
      await srv.register(correlationIdMiddleware);
      await srv.register(corsPlugin, {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
      });
      await srv.register(rateLimitPlugin, {
        max: 3,
        timeWindow: 60000,
        keyGenerator: () => 'rate-limit-exhaustion-isolated',
      });
      await srv.register(systemRoutes);
      await srv.ready();
      limitedServer = srv;
    });

    afterAll(async () => {
      await limitedServer.close();
    });

    it('[RATE-004] returns 429 after exceeding rate limit max', async () => {
      // Exhaust the limit: 3 requests consume the budget
      await limitedServer.inject({ method: 'GET', url: '/health' });
      await limitedServer.inject({ method: 'GET', url: '/health' });
      await limitedServer.inject({ method: 'GET', url: '/health' });
      // 4th request must be rate limited
      const res = await limitedServer.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(429);
    });

    it('[RATE-005] 429 response includes retry-after header', async () => {
      // Server is already exhausted by RATE-004 (3 prior requests consumed the limit)
      const res = await limitedServer.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-3: Route Module Registration
  // ═════════════════════════════════════════════════════════════════════════

  describe('Route Module Registration', () => {
    it('[ROUTE-001] systemRoutes registered — GET /api/v1/health returns 200', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/health' });
      expect(res.statusCode).toBe(200);
    });

    it('[ROUTE-002] hacksRoutes registered — GET /api/v1/hacks responds', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/hacks' });
      expect([200, 501]).toContain(res.statusCode);
    });

    it('[ROUTE-003] forensicsRoutes registered — GET /api/v1/forensics/pocs responds', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/forensics/pocs' });
      expect([200, 501]).toContain(res.statusCode);
    });

    it('[ROUTE-004] skillsRoutes registered — GET /api/v1/skills responds', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/skills' });
      expect([200, 501]).toContain(res.statusCode);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // GAP-5: Plugin Registration Order
  // ═════════════════════════════════════════════════════════════════════════

  describe('Plugin Registration Order', () => {
    it('[ORDER-001] correlation ID header is set on all responses', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/health' });
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(typeof res.headers['x-correlation-id']).toBe('string');
    });

    it('[ORDER-002] CORS headers present on error responses', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/trigger-nonexistent',
        headers: { origin: 'http://localhost:3000' },
      });
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('[ORDER-003] rate limit headers present on registered route errors', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/hacks' });
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('[ORDER-004] correlation ID header is present on 404 responses', async () => {
      const res = await server.inject({ method: 'GET', url: '/trigger-nonexistent' });
      expect(res.headers['x-correlation-id']).toBeDefined();
    });
  });
});
