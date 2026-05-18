/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Shared QA Test Server Factory
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Centralized Fastify test server factory used by all P1-ARCH-011 QA tests.
 * Mirrors production plugin order and eliminates copy-paste drift across
 * middleware-integration, gateway-security, and server-lifecycle test files.
 *
 * Prerequisites:
 *  - vitest.config.ts must have deps.inline: ['fastify-plugin'] so that
 *    the correlationIdMiddleware CJS import resolves correctly in ESM mode.
 *
 * Usage:
 *  const server = await buildTestServer({ rateLimitMax: 3 });
 *  await server.register(systemRoutes);
 *  await server.ready();
 *  // ... inject and assert ...
 *  await server.close();
 *
 * @module tests/test-utils/build-test-server
 * @task P1-ARCH-011 Code Review Remediation (leirk04)
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { correlationIdMiddleware } from '../../src/middleware/correlation-id.middleware.js';
import { registerErrorHandler } from '../../src/middleware/error-handler.js';

// ─────────────────────────────────────────────────────────────────────────────

export interface TestServerOptions {
  /** Max requests per timeWindow for rate limiting. Default: 100 */
  rateLimitMax?: number;
  /** Include @fastify/rate-limit plugin. Default: true */
  withRateLimit?: boolean;
  /** Include @fastify/cors plugin. Default: true */
  withCors?: boolean;
  /** Include the global AegisError handler. Default: true */
  withErrorHandler?: boolean;
}

/**
 * Build a minimal Fastify test server with the same plugin order as production.
 *
 * Route modules must be registered by the caller AFTER this function returns,
 * before calling server.ready(). This keeps the factory flexible for tests
 * that only need specific route subsets.
 *
 * Plugin registration order (mirrors server.ts):
 *  1. correlationIdMiddleware (validation-hardened)
 *  2. @fastify/cors             (if withCors)
 *  3. @fastify/rate-limit      (if withRateLimit)
 *  4. Error handler            (if withErrorHandler)
 *  → caller registers routes, then calls server.ready()
 */
export async function buildTestServer(
  options: TestServerOptions = {},
): Promise<FastifyInstance> {
  const {
    rateLimitMax = 100,
    withRateLimit = true,
    withCors = true,
    withErrorHandler = true,
  } = options;

  const server = Fastify({
    logger: false,
    // Match production: omit requestIdHeader — correlation middleware owns lifecycle
    requestIdLogLabel: 'correlationId',
  });

  // Strip response schemas to prevent fast-json-stringify issues in test env.
  // Production still uses schemas for serialization performance and type safety.
  server.addHook('onRoute', (routeOptions) => {
    if (routeOptions.schema?.response) {
      delete routeOptions.schema.response;
    }
  });

  // 1. Correlation ID — must be first (resolves correctly via vitest.config.ts)
  await server.register(correlationIdMiddleware);

  // 2. CORS — production-matching config (not wildcard *)
  if (withCors) {
    await server.register(cors, {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    });
  }

  // 3. Rate limiting
  if (withRateLimit) {
    await server.register(rateLimit, {
      max: rateLimitMax,
      timeWindow: 60000,
    });
  }

  // 4. Error handler — registered after plugins, before routes are ready
  if (withErrorHandler) {
    registerErrorHandler(server);
  }

  return server;
}
