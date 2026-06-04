/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
/**
 * @module RedisCacheAdapter
 * @description Concrete Redis implementation of ICachePort using ioredis.
 *
 * Provides TTL-based caching, cache-aside pattern, and bulk invalidation
 * by key prefix. Designed for graceful degradation — all operations
 * swallow Redis errors and return safe fallback values so that the
 * system never crashes due to cache unavailability.
 *
 * Key design decisions:
 *   1. JSON serializer by default, but pluggable via constructor.
 *   2. All keys are namespaced under a configurable prefix (default: "aegis:").
 *   3. getOrSet() implements the cache-aside (read-through) pattern.
 *   4. deleteByPattern() uses SCAN (not KEYS) to avoid blocking the event loop.
 *   5. Every public method wraps Redis calls in try/catch for resilience.
 *
 * @hexagonal Adapter — Infrastructure Layer (Driven)
 * @task P2-ETL-005
 */

import Redis, { type RedisOptions } from 'ioredis';
import type { ICachePort } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Serializer Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pluggable serializer for cache values.
 * JSON is the default; consumers can provide msgpack, protobuf, etc.
 */
export interface CacheSerializer {
  serialize(value: unknown): string;
  deserialize<T>(raw: string): T;
}

const jsonSerializer: CacheSerializer = {
  serialize: (value: unknown): string => JSON.stringify(value),
  deserialize: <T>(raw: string): T => JSON.parse(raw) as T,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export interface RedisCacheConfig {
  /** ioredis connection options. */
  readonly redisOptions?: RedisOptions;
  /** Global key prefix (default: "aegis:"). */
  readonly keyPrefix?: string;
  /** Default TTL in seconds when none is specified (default: 300 = 5 min). */
  readonly defaultTtlSeconds?: number;
  /** Custom serializer (default: JSON). */
  readonly serializer?: CacheSerializer;
  /** Whether to log warnings on Redis errors (default: true). */
  readonly logWarnings?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Adapter Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class RedisCacheAdapter implements ICachePort {
  private readonly client: Redis;
  private readonly prefix: string;
  private readonly defaultTtl: number;
  private readonly serializer: CacheSerializer;
  private readonly logWarnings: boolean;

  constructor(config: RedisCacheConfig = {}) {
    this.client = new Redis({
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number): number => Math.min(times * 200, 3000),
      lazyConnect: true,
      ...config.redisOptions,
    });
    this.prefix = config.keyPrefix ?? 'aegis:';
    this.defaultTtl = config.defaultTtlSeconds ?? 300;
    this.serializer = config.serializer ?? jsonSerializer;
    this.logWarnings = config.logWarnings ?? true;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Resolve the full Redis key with namespace prefix. */
  private resolveKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /** Safe wrapper that catches Redis errors and returns a fallback value. */
  private async safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      if (this.logWarnings) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[RedisCacheAdapter] Redis operation failed: ${message}`);
      }
      return fallback;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Explicitly connect to Redis (called if lazyConnect is true). */
  async connect(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  /** Gracefully disconnect from Redis. */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  // ── Basic Operations (ICachePort) ─────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    return this.safe(null, async () => {
      const raw = await this.client.get(this.resolveKey(key));
      if (raw === null) return null;
      return this.serializer.deserialize<T>(raw);
    });
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.safe(undefined, async () => {
      const resolved = this.resolveKey(key);
      const serialized = this.serializer.serialize(value);
      const ttl = ttlSeconds ?? this.defaultTtl;

      if (ttl > 0) {
        await this.client.setex(resolved, ttl, serialized);
      } else {
        await this.client.set(resolved, serialized);
      }
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.safe(false, async () => {
      const count = await this.client.del(this.resolveKey(key));
      return count > 0;
    });
  }

  async exists(key: string): Promise<boolean> {
    return this.safe(false, async () => {
      const count = await this.client.exists(this.resolveKey(key));
      return count > 0;
    });
  }

  // ── Batch Operations (ICachePort) ─────────────────────────────────────

  async getMany<T>(keys: readonly string[]): Promise<Map<string, T>> {
    return this.safe(new Map(), async () => {
      if (keys.length === 0) return new Map();

      const resolvedKeys = keys.map((k) => this.resolveKey(k));
      const results = await this.client.mget(...resolvedKeys);
      const map = new Map<string, T>();

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const raw = results[i];
        if (key !== undefined && raw !== undefined && raw !== null) {
          map.set(key, this.serializer.deserialize<T>(raw));
        }
      }
      return map;
    });
  }

  async setMany<T>(
    entries: ReadonlyArray<{ key: string; value: T; ttlSeconds?: number }>,
  ): Promise<void> {
    await this.safe(undefined, async () => {
      if (entries.length === 0) return;

      const pipeline = this.client.pipeline();
      for (const entry of entries) {
        const resolved = this.resolveKey(entry.key);
        const serialized = this.serializer.serialize(entry.value);
        const ttl = entry.ttlSeconds ?? this.defaultTtl;

        if (ttl > 0) {
          pipeline.setex(resolved, ttl, serialized);
        } else {
          pipeline.set(resolved, serialized);
        }
      }
      await pipeline.exec();
    });
  }

  async deleteMany(keys: readonly string[]): Promise<number> {
    return this.safe(0, async () => {
      if (keys.length === 0) return 0;
      const resolvedKeys = keys.map((k) => this.resolveKey(k));
      return await this.client.del(...resolvedKeys);
    });
  }

  // ── Namespace Operations (ICachePort) ──────────────────────────────────

  async deleteByPattern(pattern: string): Promise<number> {
    return this.safe(0, async () => {
      const resolvedPattern = this.resolveKey(pattern);
      let deletedCount = 0;
      let cursor = '0';

      // Use SCAN to avoid blocking Redis with KEYS on large datasets
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          resolvedPattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          deletedCount += await this.client.del(...keys);
        }
      } while (cursor !== '0');

      return deletedCount;
    });
  }

  // ── Utility (ICachePort) ───────────────────────────────────────────────

  async isHealthy(): Promise<boolean> {
    return this.safe(false, async () => {
      const response = await this.client.ping();
      return response === 'PONG';
    });
  }

  async flush(): Promise<void> {
    await this.safe(undefined, async () => {
      // Only flush keys under our prefix, not the entire Redis DB
      await this.deleteByPattern('*');
    });
  }

  // ── Extended: Cache-Aside Pattern ─────────────────────────────────────

  /**
   * getOrSet — Cache-aside (read-through) helper.
   *
   * If the key exists in cache, return the cached value.
   * Otherwise, call the factory function, cache the result, and return it.
   * If Redis is down, the factory is always called (graceful degradation).
   *
   * @param key     Cache key (without prefix)
   * @param factory Async function to produce the value on cache miss
   * @param ttlSeconds Optional TTL override
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    // Fire-and-forget set — don't let a cache-write failure break the flow
    void this.set(key, value, ttlSeconds);
    return value;
  }
}
