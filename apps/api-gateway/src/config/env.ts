/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — API Gateway Environment Configuration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates and exports the API Gateway's environment configuration.
 * Uses the composed GatewayEnvSchema from @aegis/core which includes:
 *   - Application settings (NODE_ENV, LOG_LEVEL)
 *   - Database connection (PostgreSQL)
 *   - Cache connection (Redis)
 *   - API-specific settings (port, rate limiting, JWT, CORS)
 *   - Feature flags
 *
 * @module @aegis/api-gateway/config
 * @hexagonal Infrastructure Layer — Configuration Adapter
 */

import { validateEnv, GatewayEnvSchema } from '@aegis/core';

/**
 * Validated, frozen environment configuration singleton.
 *
 * This is validated on first import — if any required variable
 * is missing or invalid, the process will terminate with a
 * structured error table before the server starts.
 *
 * @example
 * ```typescript
 * import { env } from './config/env';
 *
 * const server = Fastify({ logger: env.LOG_LEVEL === 'debug' });
 * server.listen({ port: env.API_PORT, host: env.API_HOST });
 * ```
 */
export const env = validateEnv(GatewayEnvSchema);

/**
 * Helper to construct the full PostgreSQL connection string.
 * Prefers DATABASE_URL if explicitly set, otherwise constructs from parts.
 */
export function getDatabaseUrl(): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB } = env;
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
}

/**
 * Helper to construct the Redis connection URL.
 */
export function getRedisUrl(): string {
  const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } = env;
  const auth = REDIS_PASSWORD ? `:${REDIS_PASSWORD}@` : '';
  return `redis://${auth}${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}`;
}
