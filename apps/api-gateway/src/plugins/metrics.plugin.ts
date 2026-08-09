/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Prometheus Metrics Fastify Plugin
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify plugin that:
 *  1. Boots a shared prom-client registry with default Node.js metrics.
 *  2. Instruments all HTTP requests with duration histograms and error counters.
 *  3. Exposes a GET /metrics endpoint returning Prometheus text format.
 *
 * @module plugins/metrics
 * @hexagonal Infrastructure Layer — Observability Adapter
 * @task P6-PROD-005
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createMetricsRegistry } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Plugin
// ═══════════════════════════════════════════════════════════════════════════════

async function metricsPluginImpl(server: FastifyInstance): Promise<void> {
  const { registry, httpRequestDuration, httpErrorsTotal } =
    createMetricsRegistry();

  // ── Request Timer Hook ──────────────────────────────────────────────────
  // Attach a high-resolution start time to every incoming request.
  server.addHook(
    'onRequest',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      (request as FastifyRequest & { _metricsStart: [number, number] })._metricsStart =
        process.hrtime();
    },
  );

  // ── Response Observer Hook ──────────────────────────────────────────────
  // On response, compute duration and record metrics.
  server.addHook(
    'onResponse',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const start = (request as FastifyRequest & { _metricsStart?: [number, number] })
        ._metricsStart;
      if (!start) return;

      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds + nanoseconds / 1e9;

      // Normalize the route URL to avoid high-cardinality label explosion.
      // Uses the Fastify routeOptions.url (e.g., "/api/v1/hacks/:id") instead
      // of the raw URL (e.g., "/api/v1/hacks/123").
      const route = request.routeOptions?.url ?? request.url;
      const method = request.method;
      const statusCode = String(reply.statusCode);

      httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

      if (reply.statusCode >= 400) {
        httpErrorsTotal.inc({ method, route, status_code: statusCode });
      }
    },
  );

  // ── GET /metrics Endpoint ───────────────────────────────────────────────
  server.get(
    '/metrics',
    {
      schema: {
        description:
          'Prometheus metrics endpoint. Returns all registered metrics in text exposition format.',
        tags: ['System - Observability'],
        hide: true,
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const metrics = await registry.metrics();
      return reply
        .header('Content-Type', registry.contentType)
        .send(metrics);
    },
  );

  server.log.info('📊 Prometheus metrics plugin registered — GET /metrics');
}

/**
 * Fastify plugin wrapper — ensures the plugin is applied to the root instance.
 */
export const metricsPlugin = fp(metricsPluginImpl, {
  name: 'aegis-metrics',
  fastify: '5.x',
});
