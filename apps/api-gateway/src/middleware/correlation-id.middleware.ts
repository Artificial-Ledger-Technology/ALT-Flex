/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Correlation ID Middleware
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify plugin that assigns a unique correlation ID to every request
 * and echoes it back on the response via the `x-correlation-id` header.
 *
 * Flow:
 *  1. Read `x-correlation-id` from incoming headers (distributed tracing)
 *  2. If missing, generate a new UUID via `createCorrelationId()`
 *  3. Set `request.id` for Fastify's native request ID tracking + Pino logs
 *  4. Echo `x-correlation-id` on the response header
 *
 * @module middleware/correlation-id
 * @hexagonal Infrastructure Layer — Cross-Cutting Middleware
 * @task P1-ARCH-011
 */

import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createCorrelationId } from '@aegis/core';

/**
 * Correlation ID plugin — must be registered BEFORE any other plugins/routes
 * to ensure all downstream code has access to the correlation ID.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- Fastify plugin API requires async signature
async function correlationIdPlugin(server: FastifyInstance): Promise<void> {
  // Assign correlation ID on every incoming request
  server.addHook('onRequest', async (request, reply) => {
    const incomingId = request.headers['x-correlation-id'];
    const correlationId =
      typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : createCorrelationId();

    // Set Fastify's native request ID — automatically injected into Pino logs
    request.id = correlationId;

    // Echo correlation ID back on the response immediately
    void reply.header('x-correlation-id', correlationId);
  });
}

export const correlationIdMiddleware = fp(correlationIdPlugin, {
  name: 'aegis-correlation-id',
  fastify: '>=5.0.0',
});
