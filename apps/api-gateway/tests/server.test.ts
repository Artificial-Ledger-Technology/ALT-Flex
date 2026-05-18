/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Server Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Verifies the API Gateway boots correctly with all middleware
 * and plugins integrated:
 *  1. Health check endpoint responds with 200
 *  2. Swagger UI is available at /documentation
 *  3. Unknown routes return 404
 *
 * @task P1-ARCH-011
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { correlationIdMiddleware } from '../src/middleware/correlation-id.middleware.js';
import { registerErrorHandler } from '../src/middleware/error-handler.js';
import { registerSwagger } from '../src/plugins/swagger.plugin.js';
import { systemRoutes } from '../src/routes/system.routes.js';

// ── Test Server Factory ──────────────────────────────────────────────────────

async function buildIntegrationServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false,
    requestIdHeader: 'x-correlation-id',
    requestIdLogLabel: 'correlationId',
  });

  // Register plugins in production order
  await server.register(correlationIdMiddleware);
  await server.register(cors, {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  await registerSwagger(server);
  await server.register(systemRoutes);
  registerErrorHandler(server);

  await server.ready();
  return server;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Server Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildIntegrationServer();
  });

  afterAll(async () => {
    await server.close();
  });

  // ── Health Check ─────────────────────────────────────────────────────────

  it('GET /health returns 200 with status ok', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['status']).toBe('ok');
    expect(body['service']).toBe('aegis-api-gateway');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
  });

  it('GET /api/v1/health returns system health with services', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body['status']).toBe('healthy');
    expect(body).toHaveProperty('services');
  });

  // ── Swagger UI ───────────────────────────────────────────────────────────

  it('GET /documentation redirects or serves Swagger UI', async () => {
    const res = await server.inject({ method: 'GET', url: '/documentation/' });
    // Swagger UI may redirect or serve directly — both are valid
    expect([200, 302]).toContain(res.statusCode);
  });

  it('GET /documentation/json returns OpenAPI spec', async () => {
    const res = await server.inject({ method: 'GET', url: '/documentation/json' });
    expect(res.statusCode).toBe(200);
    const spec = JSON.parse(res.payload) as Record<string, unknown>;
    expect(spec).toHaveProperty('openapi');
    const info = spec['info'] as Record<string, unknown>;
    expect(info['title']).toBe('AltFlex AEGIS API Gateway');
    expect(info['version']).toBe('3.0.0');
  });

  // ── Root Endpoint ────────────────────────────────────────────────────────

  it('GET / returns service identification', async () => {
    const res = await server.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as Record<string, unknown>;
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('docs');
  });

  // ── 404 Handling ─────────────────────────────────────────────────────────

  it('unknown route returns 404', async () => {
    const res = await server.inject({ method: 'GET', url: '/this-does-not-exist' });
    expect(res.statusCode).toBe(404);
  });

  // ── Correlation ID integration ───────────────────────────────────────────

  it('health check includes x-correlation-id response header', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    // The correlation middleware sets the header via onSend hook
    const correlationId = res.headers['x-correlation-id'];
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe('string');
  });
});
