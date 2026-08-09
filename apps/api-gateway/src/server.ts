/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — API Gateway Server
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify 5 Backend-for-Frontend (BFF) API Gateway.
 * Boots with health check, CORS, rate limiting, Swagger docs,
 * correlation ID middleware, and centralized error handling.
 *
 * Plugin registration order:
 *  1. Correlation ID middleware (must be FIRST)
 *  2. CORS
 *  3. Rate limiting
 *  4. Swagger/OpenAPI
 *  5. Routes
 *  6. Error handler
 *
 * @module @aegis/api-gateway
 * @hexagonal Infrastructure Layer — Primary Adapter (HTTP)
 * @task P1-ARCH-011
 */

import Fastify from 'fastify';
import { createPinoLogger } from '@aegis/core';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

// ── Cross-Cutting Middleware ─────────────────────────────────────────────────
import { correlationIdMiddleware } from './middleware/correlation-id.middleware.js';
import { registerErrorHandler } from './middleware/error-handler.js';

// ── Plugins ──────────────────────────────────────────────────────────────────
import { registerSwagger } from './plugins/swagger.plugin.js';

// ── Route Modules ────────────────────────────────────────────────────────────
import { hacksRoutes } from './routes/hacks.routes.js';
import { systemRoutes } from './routes/system.routes.js';
import { forensicsRoutes } from './routes/forensics.routes.js';
import { skillsRoutes } from './routes/skills.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { safetyRoutes } from './routes/safety.routes.js';

// ── Observability ────────────────────────────────────────────────────────────
import { metricsPlugin } from './plugins/metrics.plugin.js';

// ── Configuration ────────────────────────────────────────────────────────────
const PORT = parseInt(process.env['API_PORT'] ?? '4000', 10);
const HOST = process.env['API_HOST'] ?? '0.0.0.0';
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';

// ── Server Instance ──────────────────────────────────────────────────────────
const server = Fastify({
  logger: createPinoLogger({ name: 'api-gateway' }) as any,
  disableRequestLogging: true,
  // requestIdLogLabel: label used by Pino to log the request ID as 'correlationId'
  // requestIdHeader intentionally omitted — the correlation ID middleware owns the
  // full x-correlation-id lifecycle including validation and sanitization.
  requestIdLogLabel: 'correlationId',
});

// ── Plugins ──────────────────────────────────────────────────────────────────
async function registerPlugins(): Promise<void> {
  // 1. Correlation ID — must be first to ensure all downstream hooks have context
  await server.register(correlationIdMiddleware);

  // 2. CORS
  await server.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // 3. Rate limiting
  await server.register(rateLimit, {
    max: parseInt(process.env['API_RATE_LIMIT_MAX'] ?? '100', 10),
    timeWindow: parseInt(process.env['API_RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
  });

  // 4. Swagger/OpenAPI
  await registerSwagger(server);

  // 5. Prometheus Metrics (P6-PROD-005)
  await server.register(metricsPlugin);

  // 6. Custom Request Logging (P6-PROD-007)
  server.addHook('onResponse', (request, reply, done) => {
    request.log.info({
      reqId: request.id,
      method: request.method,
      url: request.routeOptions.url ?? request.url,
      statusCode: reply.statusCode,
      responseTime: Math.round((reply as any).getResponseTime?.() ?? 0),
    }, 'Request completed');
    done();
  });
}

// ── Routes ───────────────────────────────────────────────────────────────────
async function registerRoutes(): Promise<void> {
  // ── System & Gateway Routes (P1-ARCH-006) ───────────────────────────────
  // Health checks, meta, auth, rate-limit status, root info
  await server.register(systemRoutes);

  // ── Domain Route Modules ─────────────────────────────────────────────────
  // P1-ARCH-003: Hacks Dashboard API (Engine α)
  await server.register(hacksRoutes);

  // P1-ARCH-005: Forensic Engine API (Engine γ)
  await server.register(forensicsRoutes);

  // P1-ARCH-004: AI Skills Explorer API (Engine β)
  await server.register(skillsRoutes);

  // P2-ETL-006: Admin Job Queue Dashboard
  await server.register(adminRoutes);

  // P3-SCAN-011: Safety Analytics Dashboard API
  await server.register(safetyRoutes, { prefix: '/api/v1/safety' });
}

// ── Graceful Shutdown ────────────────────────────────────────────────────────
function registerShutdownHandlers(): void {
  const shutdown = async (signal: string): Promise<void> => {
    server.log.info({ signal }, 'Received shutdown signal, closing gracefully...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    await registerPlugins();
    await registerRoutes();

    // Error handler — registered after routes so it catches all route errors
    registerErrorHandler(server);

    // Graceful shutdown handlers
    registerShutdownHandlers();

    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🛡️  AEGIS API Gateway listening on http://${HOST}:${PORT}`);
    server.log.info(`📚 Swagger UI available at http://${HOST}:${PORT}/documentation`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

void start();
