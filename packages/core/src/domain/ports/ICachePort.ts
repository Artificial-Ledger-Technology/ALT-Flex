/**
 * @module ICachePort
 * @description Abstract interface for cache operations.
 *
 * Hexagonal Port for caching layer (Redis in production, in-memory for tests).
 * Provides a simple key-value interface with TTL support.
 *
 * Implementations:
 * - `RedisCacheAdapter` (packages/hacks-engine/src/adapters/)
 * - `InMemoryCacheAdapter` (test utility)
 *
 * @hexagonal Port — Domain Layer
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Port Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ICachePort — Abstract caching interface.
 *
 * Design Rationale:
 * - Generic type parameter for type-safe cache access
 * - TTL-based expiration for all cache entries
 * - Namespace support for key isolation between engines
 * - Batch operations for efficient multi-key access
 *
 * @hexagonal Port — Domain Layer
 */
export interface ICachePort {
  // ── Basic Operations ────────────────────────────────────────────────────
  /**
   * Get a cached value by key.
   * Returns null if key doesn't exist or has expired.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a cached value with optional TTL.
   * @param key Cache key
   * @param value Value to cache (must be JSON-serializable)
   * @param ttlSeconds Time-to-live in seconds (0 = no expiration)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a cached value by key.
   * Returns true if the key existed and was deleted.
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if a key exists in the cache.
   */
  exists(key: string): Promise<boolean>;

  // ── Batch Operations ────────────────────────────────────────────────────
  /**
   * Get multiple cached values by keys.
   * Returns a Map where missing keys are omitted.
   */
  getMany<T>(keys: readonly string[]): Promise<Map<string, T>>;

  /**
   * Set multiple cached values.
   */
  setMany<T>(
    entries: ReadonlyArray<{ key: string; value: T; ttlSeconds?: number }>,
  ): Promise<void>;

  /**
   * Delete multiple cached values by keys.
   * Returns the count of keys that were deleted.
   */
  deleteMany(keys: readonly string[]): Promise<number>;

  // ── Namespace Operations ────────────────────────────────────────────────
  /**
   * Delete all keys matching a pattern/namespace.
   * Pattern follows Redis glob-style matching (e.g., "hacks:*").
   */
  deleteByPattern(pattern: string): Promise<number>;

  // ── Utility ─────────────────────────────────────────────────────────────
  /**
   * Check if the cache backend is healthy.
   */
  isHealthy(): Promise<boolean>;

  /**
   * Flush all cached data (use with extreme caution).
   */
  flush(): Promise<void>;
}
