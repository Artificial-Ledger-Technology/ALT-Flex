/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Redis Infrastructure & Rate-Limiter Adapter
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Resilient Redis connection provider for rate limiting and caching.
 * Automatically probes Redis availability on startup:
 *  - If Redis is reachable: uses Redis-backed rate limiting and caching.
 *  - If Redis is unreachable/offline: logs a single clean warning and
 *    gracefully degrades to Fastify's native in-memory store without crashing.
 *
 * @module @aegis/api-gateway/infrastructure/redis-client
 * @hexagonal Infrastructure Layer — Secondary Adapter (Cache / RateLimit)
 * @task P8-DX-001
 */

import Redis from 'ioredis';
import { getRedisUrl } from '../config/env.js';

let activeRedisClient: Redis | null = null;
let redisAvailabilityState: boolean | null = null;

/**
 * Probes and initializes a Redis client for rate limiting.
 * Returns the connected client if available, or undefined if offline.
 *
 * @param logger - Optional Fastify logger instance for structured output
 * @returns Connected Redis client or undefined
 */
export async function initRedisClient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: any,
  overrideUrl?: string,
): Promise<Redis | undefined> {
  const url = overrideUrl ?? getRedisUrl();
  const startTime = performance.now();

  const client = new Redis(url, {
    connectTimeout: 1500,
    maxRetriesPerRequest: 1,
    retryStrategy(times: number): number | null {
      // Do not retry indefinitely when offline during local dev
      if (times > 1) return null;
      return 200;
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  // Attach error handler to prevent unhandled EventEmitter errors from crashing Node.js
  client.on('error', (err: Error) => {
    logger?.debug?.({ error: err.message }, 'Redis background connection error (suppressed)');
  });

  try {
    // Race connection & ping against a 1.2s timeout
    await Promise.race([
      client.connect().then(() => client.ping()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout (1200ms)')), 1200),
      ),
    ]);

    const latencyMs = Math.round(performance.now() - startTime);
    logger?.info?.({ latencyMs }, 'Redis connected successfully for rate limiting');
    activeRedisClient = client;
    redisAvailabilityState = true;
    return client;
  } catch (err) {
    const errorMsg = (err as Error).message;
    logger?.warn?.(
      { error: errorMsg },
      'Redis is offline or unreachable; falling back to Fastify in-memory rate limiting',
    );
    redisAvailabilityState = false;

    try {
      client.disconnect();
    } catch {
      // Ignore disconnect errors on failed sockets
    }

    return undefined;
  }
}

/**
 * Returns whether Redis is currently available.
 * If not probed yet, returns false.
 */
export function isRedisAvailable(): boolean {
  return (
    redisAvailabilityState === true &&
    activeRedisClient !== null &&
    activeRedisClient.status === 'ready'
  );
}

/**
 * Returns the active Redis client if connected.
 */
export function getActiveRedisClient(): Redis | null {
  return activeRedisClient;
}

/**
 * Gracefully close Redis client on server shutdown.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function closeRedisClient(logger?: any): Promise<void> {
  if (activeRedisClient) {
    try {
      logger?.info?.('Closing Redis client connection...');
      await activeRedisClient.quit();
    } catch {
      activeRedisClient.disconnect();
    } finally {
      activeRedisClient = null;
      redisAvailabilityState = false;
    }
  }
}
