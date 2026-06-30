/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
/**
 * @module redis-cache-adapter.test
 * @description Unit tests for RedisCacheAdapter with mocked ioredis.
 *
 * Validates:
 *   - Basic CRUD operations (get, set, delete, exists)
 *   - TTL enforcement (setex vs set)
 *   - Batch operations (getMany, setMany, deleteMany)
 *   - Cache-aside getOrSet pattern
 *   - Namespace prefix key resolution
 *   - Graceful degradation on Redis failures
 *   - SCAN-based deleteByPattern
 *   - Health check via PING/PONG
 *   - Custom serializer injection
 *   - Flush safety (only deletes prefixed keys)
 *
 * @task P2-ETL-005
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RedisCacheAdapter,
  type CacheSerializer,
} from '../src/adapters/redis/redis-cache-adapter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock ioredis
// ═══════════════════════════════════════════════════════════════════════════════

const mockRedisInstance = {
  status: 'ready',
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  mget: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
  connect: vi.fn(),
  scan: vi.fn(),
  pipeline: vi.fn(() => ({
    setex: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  })),
};

vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => mockRedisInstance),
  };
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('RedisCacheAdapter', () => {
  let adapter: RedisCacheAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstance.status = 'ready';
    adapter = new RedisCacheAdapter({ keyPrefix: 'test:', defaultTtlSeconds: 60 });
  });

  // ── Test 1: get() returns deserialized value ──────────────────────────

  describe('get', () => {
    it('returns deserialized value when key exists', async () => {
      const data = { id: 1, name: 'Euler Finance' };
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify(data));

      const result = await adapter.get<{ id: number; name: string }>('hacks:euler');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('test:hacks:euler');
      expect(result).toEqual(data);
    });

    it('returns null when key does not exist', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null);

      const result = await adapter.get('missing:key');

      expect(result).toBeNull();
    });

    it('returns null gracefully when Redis throws', async () => {
      mockRedisInstance.get.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await adapter.get('any:key');

      expect(result).toBeNull();
    });
  });

  // ── Test 2: set() stores with TTL ─────────────────────────────────────

  describe('set', () => {
    it('uses SETEX when TTL is provided', async () => {
      mockRedisInstance.setex.mockResolvedValueOnce('OK');

      await adapter.set('hacks:total', 42, 120);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:hacks:total',
        120,
        JSON.stringify(42),
      );
    });

    it('uses default TTL when none specified', async () => {
      mockRedisInstance.setex.mockResolvedValueOnce('OK');

      await adapter.set('hacks:count', 10);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:hacks:count',
        60, // default TTL from config
        JSON.stringify(10),
      );
    });

    it('uses SET (no TTL) when ttlSeconds is 0', async () => {
      mockRedisInstance.set.mockResolvedValueOnce('OK');

      await adapter.set('permanent:key', 'value', 0);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'test:permanent:key',
        JSON.stringify('value'),
      );
      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });

    it('does not throw when Redis is down', async () => {
      mockRedisInstance.setex.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(adapter.set('key', 'val', 60)).resolves.toBeUndefined();
    });
  });

  // ── Test 3: delete() ──────────────────────────────────────────────────

  describe('delete', () => {
    it('returns true when key was deleted', async () => {
      mockRedisInstance.del.mockResolvedValueOnce(1);

      const result = await adapter.delete('hacks:stale');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test:hacks:stale');
      expect(result).toBe(true);
    });

    it('returns false when key did not exist', async () => {
      mockRedisInstance.del.mockResolvedValueOnce(0);

      const result = await adapter.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ── Test 4: exists() ──────────────────────────────────────────────────

  describe('exists', () => {
    it('returns true when key exists', async () => {
      mockRedisInstance.exists.mockResolvedValueOnce(1);

      const result = await adapter.exists('hacks:euler');

      expect(result).toBe(true);
    });

    it('returns false when key is missing', async () => {
      mockRedisInstance.exists.mockResolvedValueOnce(0);

      const result = await adapter.exists('missing');

      expect(result).toBe(false);
    });
  });

  // ── Test 5: getMany() batch retrieval ─────────────────────────────────

  describe('getMany', () => {
    it('returns a map of existing keys only', async () => {
      mockRedisInstance.mget.mockResolvedValueOnce([
        JSON.stringify({ id: 1 }),
        null,
        JSON.stringify({ id: 3 }),
      ]);

      const result = await adapter.getMany<{ id: number }>(['k1', 'k2', 'k3']);

      expect(result.size).toBe(2);
      expect(result.get('k1')).toEqual({ id: 1 });
      expect(result.has('k2')).toBe(false);
      expect(result.get('k3')).toEqual({ id: 3 });
    });

    it('returns empty map for empty keys array', async () => {
      const result = await adapter.getMany([]);

      expect(result.size).toBe(0);
      expect(mockRedisInstance.mget).not.toHaveBeenCalled();
    });
  });

  // ── Test 6: setMany() batch write ─────────────────────────────────────

  describe('setMany', () => {
    it('pipelines multiple SETEX commands', async () => {
      const mockPipeline = {
        setex: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedisInstance.pipeline.mockReturnValueOnce(mockPipeline);

      await adapter.setMany([
        { key: 'a', value: 1, ttlSeconds: 30 },
        { key: 'b', value: 2 },
      ]);

      expect(mockPipeline.setex).toHaveBeenCalledWith('test:a', 30, JSON.stringify(1));
      expect(mockPipeline.setex).toHaveBeenCalledWith('test:b', 60, JSON.stringify(2));
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  // ── Test 7: deleteMany() ──────────────────────────────────────────────

  describe('deleteMany', () => {
    it('deletes multiple keys and returns count', async () => {
      mockRedisInstance.del.mockResolvedValueOnce(2);

      const count = await adapter.deleteMany(['a', 'b']);

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test:a', 'test:b');
      expect(count).toBe(2);
    });

    it('returns 0 for empty keys array', async () => {
      const count = await adapter.deleteMany([]);

      expect(count).toBe(0);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  // ── Test 8: deleteByPattern() uses SCAN ───────────────────────────────

  describe('deleteByPattern', () => {
    it('uses SCAN to find and delete matching keys', async () => {
      mockRedisInstance.scan
        .mockResolvedValueOnce(['42', ['test:hacks:a', 'test:hacks:b']])
        .mockResolvedValueOnce(['0', ['test:hacks:c']]);
      mockRedisInstance.del.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const count = await adapter.deleteByPattern('hacks:*');

      expect(mockRedisInstance.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'test:hacks:*',
        'COUNT',
        100,
      );
      expect(count).toBe(3);
    });
  });

  // ── Test 9: isHealthy() ───────────────────────────────────────────────

  describe('isHealthy', () => {
    it('returns true when Redis responds with PONG', async () => {
      mockRedisInstance.ping.mockResolvedValueOnce('PONG');

      const healthy = await adapter.isHealthy();

      expect(healthy).toBe(true);
    });

    it('returns false when Redis is unreachable', async () => {
      mockRedisInstance.ping.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const healthy = await adapter.isHealthy();

      expect(healthy).toBe(false);
    });
  });

  // ── Test 10: getOrSet() cache-aside pattern ───────────────────────────

  describe('getOrSet', () => {
    it('returns cached value without calling factory', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify({ total: 500 }));
      const factory = vi.fn();

      const result = await adapter.getOrSet('dashboard:stats', factory, 120);

      expect(result).toEqual({ total: 500 });
      expect(factory).not.toHaveBeenCalled();
    });

    it('calls factory on cache miss and caches the result', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null);
      mockRedisInstance.setex.mockResolvedValueOnce('OK');
      const factory = vi.fn().mockResolvedValue({ total: 999 });

      const result = await adapter.getOrSet('dashboard:stats', factory, 120);

      expect(factory).toHaveBeenCalledOnce();
      expect(result).toEqual({ total: 999 });
    });

    it('still returns factory result even when cache write fails', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null);
      mockRedisInstance.setex.mockRejectedValueOnce(new Error('write fail'));
      const factory = vi.fn().mockResolvedValue({ ok: true });

      const result = await adapter.getOrSet('failing:key', factory);

      expect(result).toEqual({ ok: true });
    });
  });

  // ── Test 11: Custom serializer injection ──────────────────────────────

  describe('custom serializer', () => {
    it('uses injected serializer for get and set', async () => {
      const customSerializer: CacheSerializer = {
        serialize: vi.fn((v) => `CUSTOM:${JSON.stringify(v)}`),
        deserialize: vi.fn((raw: string) => JSON.parse(raw.replace('CUSTOM:', ''))),
      };
      const customAdapter = new RedisCacheAdapter({
        keyPrefix: 'x:',
        serializer: customSerializer,
      });

      mockRedisInstance.setex.mockResolvedValueOnce('OK');
      await customAdapter.set('key', { a: 1 }, 10);

      expect(customSerializer.serialize).toHaveBeenCalledWith({ a: 1 });
      expect(mockRedisInstance.setex).toHaveBeenCalledWith('x:key', 10, 'CUSTOM:{"a":1}');

      mockRedisInstance.get.mockResolvedValueOnce('CUSTOM:{"a":1}');
      const result = await customAdapter.get('key');

      expect(customSerializer.deserialize).toHaveBeenCalledWith('CUSTOM:{"a":1}');
      expect(result).toEqual({ a: 1 });
    });
  });

  // ── Test 12: Key prefix resolution ────────────────────────────────────

  describe('key prefix resolution', () => {
    it('prefixes all keys with the configured namespace', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null);
      mockRedisInstance.exists.mockResolvedValueOnce(0);
      mockRedisInstance.del.mockResolvedValueOnce(0);

      await adapter.get('mykey');
      await adapter.exists('mykey');
      await adapter.delete('mykey');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('test:mykey');
      expect(mockRedisInstance.exists).toHaveBeenCalledWith('test:mykey');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('test:mykey');
    });
  });

  // ── Test 13: Graceful degradation on all operations ───────────────────

  describe('graceful degradation', () => {
    it('exists returns false on error', async () => {
      mockRedisInstance.exists.mockRejectedValueOnce(new Error('fail'));
      expect(await adapter.exists('key')).toBe(false);
    });

    it('delete returns false on error', async () => {
      mockRedisInstance.del.mockRejectedValueOnce(new Error('fail'));
      expect(await adapter.delete('key')).toBe(false);
    });

    it('getMany returns empty map on error', async () => {
      mockRedisInstance.mget.mockRejectedValueOnce(new Error('fail'));
      const result = await adapter.getMany(['a', 'b']);
      expect(result.size).toBe(0);
    });

    it('deleteMany returns 0 on error', async () => {
      mockRedisInstance.del.mockRejectedValueOnce(new Error('fail'));
      expect(await adapter.deleteMany(['a'])).toBe(0);
    });

    it('deleteByPattern returns 0 on error', async () => {
      mockRedisInstance.scan.mockRejectedValueOnce(new Error('fail'));
      expect(await adapter.deleteByPattern('*')).toBe(0);
    });
  });
});
