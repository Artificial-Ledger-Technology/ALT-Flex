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
 *  2. Validate incoming ID: enforce 128-char max and character whitelist
 *  3. If missing or invalid, generate a new UUID via `createCorrelationId()`
 *  4. Set `request.id` for Fastify's native request ID tracking + Pino logs
 *  5. Echo `x-correlation-id` on the response header
 *
 * Security:
 *  Incoming IDs are validated against a strict character whitelist to prevent:
 *  - Log injection via \r\n or structured JSON in header values
 *  - Unbounded memory usage from oversized correlation ID headers
 *  - Header injection via special characters
 *
 * @module middleware/correlation-id
 * @hexagonal Infrastructure Layer — Cross-Cutting Middleware
 * @task P1-ARCH-011 | Code Review Remediation (leirk04)
 */

import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

/** Maximum allowed length for an incoming correlation ID header. */
const MAX_CORRELATION_ID_LENGTH = 128;

/**
 * Allowed characters: alphanumeric, hyphens, underscores, dots.
 * Prevents log injection (\r\n), XSS payloads, and unbounded input.
 * Max length is enforced here AND by the length check above for defense-in-depth.
 */
const CORRELATION_ID_PATTERN = /^[a-zA-Z0-9\-_.]{1,128}$/;

/**
 * Correlation ID plugin — must be registered BEFORE any other plugins/routes
 * to ensure all downstream code has access to the correlation ID.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- Fastify plugin API requires async signature
async function correlationIdPlugin(server: FastifyInstance): Promise<void> {
  // Assign and validate correlation ID on every incoming request
  server.addHook('onRequest', async (request, reply) => {
    const incomingId = request.headers['x-correlation-id'];

    // Accept incoming ID only if it is a non-empty string within the allowed
    // length and character set. Any violation falls back to a fresh UUID.
    const correlationId =
      typeof incomingId === 'string' &&
      incomingId.length > 0 &&
      incomingId.length <= MAX_CORRELATION_ID_LENGTH &&
      CORRELATION_ID_PATTERN.test(incomingId)
        ? incomingId
        : randomUUID();

    // Set Fastify's native request ID — automatically injected into Pino logs
    request.id = correlationId;

    // Echo correlation ID back on the response
    void reply.header('x-correlation-id', correlationId);
  });
}

export const correlationIdMiddleware = fp(correlationIdPlugin, {
  name: 'aegis-correlation-id',
  fastify: '>=5.0.0',
});
