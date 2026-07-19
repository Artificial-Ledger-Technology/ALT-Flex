/**
 * @module queue-connection
 * @description Factory for creating BullMQ-compatible ioredis connections.
 *
 * Each BullMQ Queue, Worker, and FlowProducer requires its own dedicated
 * Redis connection instance. This factory reads connection parameters from
 * environment variables and returns a fresh ioredis instance configured
 * with BullMQ-required settings.
 *
 * @see https://docs.bullmq.io/guide/connections
 * @hexagonal Shared Kernel — Infrastructure Utility
 * @task P2-ETL-006
 */

import IORedis, { type RedisOptions } from 'ioredis';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueueConnectionConfig {
  /** Redis host (default: env REDIS_HOST or 'localhost'). */
  readonly host?: string;
  /** Redis port (default: env REDIS_PORT or 6379). */
  readonly port?: number;
  /** Redis password (default: env REDIS_PASSWORD or undefined). */
  readonly password?: string;
  /** Redis database index (default: env REDIS_DB or 0). */
  readonly db?: number;
  /** Additional ioredis options to merge. */
  readonly redisOptions?: RedisOptions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new ioredis connection for BullMQ queues/workers.
 *
 * BullMQ requires:
 *  - `maxRetriesPerRequest: null` (otherwise workers throw on timeout)
 *  - `enableReadyCheck: false` (avoids startup delays in cluster mode)
 *
 * Each call returns a NEW connection — do not share connections across
 * Queue and Worker instances.
 */
export function createQueueConnection(config: QueueConnectionConfig = {}): IORedis {
  const host = config.host ?? process.env['REDIS_HOST'] ?? 'localhost';
  const port = config.port ?? parseInt(process.env['REDIS_PORT'] ?? '6379', 10);
  const password = config.password ?? process.env['REDIS_PASSWORD'] ?? '';
  const db = config.db ?? parseInt(process.env['REDIS_DB'] ?? '0', 10);

  const baseOptions: RedisOptions = {
    host,
    port,
    db,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Avoids startup delays
    retryStrategy: (times: number): number => Math.min(times * 200, 5000),
    ...config.redisOptions,
  };

  // Only set password when non-empty (satisfies exactOptionalPropertyTypes)
  if (password.length > 0) {
    baseOptions.password = password;
  }

  return new IORedis(baseOptions);
}
