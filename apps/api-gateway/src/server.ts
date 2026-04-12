/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — API Gateway Server
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify 5 Backend-for-Frontend (BFF) API Gateway.
 * Boots with health check, CORS, rate limiting, and Swagger docs.
 *
 * @module @aegis/api-gateway
 * @hexagonal Infrastructure Layer — Primary Adapter (HTTP)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

// ── Route Modules ────────────────────────────────────────────────────────────
import { hacksRoutes } from './routes/hacks.routes.js';
import { systemRoutes } from './routes/system.routes.js';

// ── Configuration ────────────────────────────────────────────────────────────
const PORT = parseInt(process.env['API_PORT'] ?? '4000', 10);
const HOST = process.env['API_HOST'] ?? '0.0.0.0';
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';

// ── Server Instance ──────────────────────────────────────────────────────────
const isDev = process.env['NODE_ENV'] === 'development';

const loggerConfig = isDev
  ? {
      level: LOG_LEVEL,
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }
  : { level: LOG_LEVEL };

const server = Fastify({
  logger: loggerConfig,
});

// ── Plugins ──────────────────────────────────────────────────────────────────
async function registerPlugins(): Promise<void> {
  await server.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  await server.register(rateLimit, {
    max: parseInt(process.env['API_RATE_LIMIT_MAX'] ?? '100', 10),
    timeWindow: parseInt(process.env['API_RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
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
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    await registerPlugins();
    await registerRoutes();

    await server.listen({ port: PORT, host: HOST });
    server.log.info(`🛡️  AEGIS API Gateway listening on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

void start();
