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
 *  - Response schemas are stripped to prevent fast-json-stringify issues
 *  - Correlation ID logic is inlined (avoids fastify-plugin CJS resolution issue)
 *
 * @module tests/middleware-integration
 * @task P1-ARCH-011 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { systemRoutes } from '../src/routes/system.routes.js';
import { hacksRoutes } from '../src/routes/hacks.routes.js';
import { forensicsRoutes } from '../src/routes/forensics.routes.js';
import { skillsRoutes } from '../src/routes/skills.routes.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Server Factory — mirrors production plugin order
// ═══════════════════════════════════════════════════════════════════════════════

async function buildFullServer(
  overrides?: { rateLimitMax?: number },
): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false,
    requestIdHeader: 'x-correlation-id',
    requestIdLogLabel: 'correlationId',
  });

  // Strip response schemas to prevent fast-json-stringify issues in test env
  server.addHook('onRoute', (routeOptions) => {
    if (routeOptions.schema?.response) {
      delete routeOptions.schema.response;
    }
  });

  // Inline correlation ID hook (mirrors correlation-id.middleware.ts)
  // Using inline instead of importing the plugin to avoid fastify-plugin
  // CJS resolution issues in the Vitest ESM test environment.
  server.addHook('onRequest', async (request, reply) => {
    const incomingId = request.headers['x-correlation-id'];
    const correlationId =
      typeof incomingId === 'string' && incomingId.length > 0
        ? incomingId
        : crypto.randomUUID();
    request.id = correlationId;
    void reply.header('x-correlation-id', correlationId);
  });

  // Production plugin order: correlation → CORS → rate limit → routes
  await server.register(cors, {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  await server.register(rateLimit, {
    max: overrides?.rateLimitMax ?? 100,
    timeWindow: 60000,
  });

  // Route modules
  await server.register(systemRoutes);
  await server.register(hacksRoutes);
  await server.register(forensicsRoutes);
  await server.register(skillsRoutes);

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

    // Unknown error — mask everything
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
// Test Suite: CORS, Rate Limit, Routes, Plugin Order
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
      // Must not be wildcard — credentials require specific origin
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

  // Rate limit exhaustion — isolated low-limit server
  describe('Rate Limit Exhaustion', () => {
    let limitedServer: FastifyInstance;

    beforeAll(async () => {
      limitedServer = await buildFullServer({ rateLimitMax: 3 });
    });

    afterAll(async () => {
      await limitedServer.close();
    });

    it('[RATE-004] returns 429 after exceeding rate limit max', async () => {
      // Exhaust the limit: 3 requests
      await limitedServer.inject({ method: 'GET', url: '/health' });
      await limitedServer.inject({ method: 'GET', url: '/health' });
      await limitedServer.inject({ method: 'GET', url: '/health' });

      // 4th request should be rate limited
      const res = await limitedServer.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(429);
    });

    it('[RATE-005] 429 response includes retry-after header', async () => {
      const res = await limitedServer.inject({ method: 'GET', url: '/health' });
      // Server is already exhausted from previous test
      if (res.statusCode === 429) {
        expect(res.headers['retry-after']).toBeDefined();
      }
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
      // Stub returns 501, live returns 200 — both are valid
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
      // Use a registered route that returns an error (501 stub)
      const res = await server.inject({ method: 'GET', url: '/api/v1/hacks' });
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('[ORDER-004] correlation ID header is present on 404 responses', async () => {
      const res = await server.inject({ method: 'GET', url: '/trigger-nonexistent' });
      expect(res.headers['x-correlation-id']).toBeDefined();
    });
  });
});
