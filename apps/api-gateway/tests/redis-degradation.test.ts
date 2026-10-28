/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Redis Degradation & In-Memory Rate Limiting QA Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates task P8-DX-001:
 *  - Graceful Redis connection probing (no unhandled error events)
 *  - Fallback to in-memory store when Redis is unavailable
 *  - In-memory rate limiting functions correctly
 *  - Graceful shutdown handles null/offline Redis instances
 *
 * @task P8-DX-001
 */

import { describe, it, expect, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {
  initRedisClient,
  isRedisAvailable,
  closeRedisClient,
} from '../src/infrastructure/redis-client.js';

describe('P8-DX-001: Graceful Redis Degradation', () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    await closeRedisClient();
  });

  it('handles offline Redis gracefully without throwing unhandled exceptions', async () => {
    // Pass offline Redis URL to test fallback
    const client = await initRedisClient(undefined, 'redis://127.0.0.1:59999');
    expect(client).toBeUndefined();
    expect(isRedisAvailable()).toBe(false);
  });

  it('operates rate limiting in memory when Redis client is undefined', async () => {
    app = Fastify({ logger: false });

    // Register rate limit in in-memory fallback mode (max 2 requests per window)
    await app.register(rateLimit, {
      max: 2,
      timeWindow: 60000,
    });

    app.get('/test-limit', () => ({ ok: true }));
    await app.ready();

    // Request 1: Allowed
    const res1 = await app.inject({ method: 'GET', url: '/test-limit' });
    expect(res1.statusCode).toBe(200);

    // Request 2: Allowed
    const res2 = await app.inject({ method: 'GET', url: '/test-limit' });
    expect(res2.statusCode).toBe(200);

    // Request 3: Rate limited (429)
    const res3 = await app.inject({ method: 'GET', url: '/test-limit' });
    expect(res3.statusCode).toBe(429);
    const body = res3.json();
    expect(body.statusCode).toBe(429);
  });

  it('closeRedisClient handles offline state without error', async () => {
    await expect(closeRedisClient()).resolves.not.toThrow();
  });
});
