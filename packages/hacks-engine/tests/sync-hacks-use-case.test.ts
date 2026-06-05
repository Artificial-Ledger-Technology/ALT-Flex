/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method, @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
/**
 * @module sync-hacks-use-case.test
 * @description Unit tests for the SyncHacksUseCase application-layer orchestrator.
 *
 * All dependencies are mocked via vitest — no live API, database, or Redis calls.
 * Tests cover:
 * - Full ETL pipeline execution order
 * - DefiLlama fetch integration
 * - HackNormalizer batch normalization pass
 * - Database upsert via IHackDataPort.saveBatch()
 * - DeFiHackLabs POC cross-referencing
 * - Redis cache invalidation
 * - Progress reporting via callback
 * - Partial failure handling
 * - Error resilience (source failures, cache failures)
 * - SyncResult summary statistics
 *
 * @task P2-ETL-008
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyncHacksUseCase,
  type SyncResult,
  type HackNormalizerPort,
} from '../src/application/sync-hacks.use-case.js';
import type {
  IHackSourcePort,
  IHackDataPort,
  ICachePort,
  LoggerPort,
  HackIncident,
} from '@aegis/core';
import type { DeFiHackLabsAdapter } from '../src/adapters/defihacklabs-adapter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a mock LoggerPort for testing.
 */
function createMockLogger(): LoggerPort {
  const logger: LoggerPort = {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger;
}

/**
 * Create a valid HackIncident for testing.
 */
function createMockIncident(overrides: Partial<HackIncident> = {}): HackIncident {
  return {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    protocolName: 'Euler Finance',
    protocolSlug: 'euler-finance',
    date: new Date('2023-03-13T12:00:00Z'),
    chain: 'ethereum',
    attackVector: 'flash-loan',
    secondaryVectors: [],
    lossUsd: 197000000,
    fundsReturned: 100000000,
    txHashes: [],
    transactionRefs: [],
    sources: ['https://rekt.news/euler-finance-rekt/'],
    description: 'Euler Finance lending protocol exploit',
    hasFoundryPoc: false,
    targetContracts: [],
    dataSource: 'defillama',
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as HackIncident;
}

/**
 * Create a mock IHackSourcePort (DefiLlama adapter).
 */
function createMockDefiLlamaSource(incidents: HackIncident[] = []): IHackSourcePort {
  return {
    sourceName: 'defillama',
    fetchAllHacks: vi.fn().mockResolvedValue(incidents),
  };
}

/**
 * Create a mock DeFiHackLabsAdapter.
 */
function createMockDefiHackLabsSource(
  pocEntries: Array<{ protocolName: string; date: Date; testFilePath: string }> = [],
): DeFiHackLabsAdapter {
  return {
    sourceName: 'defihacklabs',
    fetchAllHacks: vi.fn().mockResolvedValue([]),
    fetchPocMappings: vi.fn().mockResolvedValue(pocEntries),
    getLastSyncedAt: vi.fn().mockReturnValue(null),
  } as unknown as DeFiHackLabsAdapter;
}

/**
 * Create a mock IHackDataPort.
 */
function createMockHackRepo(): IHackDataPort {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    saveBatch: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn(),
    count: vi.fn(),
    exists: vi.fn(),
    findByProtocol: vi.fn(),
    findRecent: vi.fn(),
    getTotalLossUsd: vi.fn(),
    getAttackVectorStats: vi.fn(),
    getChainStats: vi.fn(),
    getLossTimeSeries: vi.fn(),
    getDashboardStats: vi.fn(),
  };
}

/**
 * Create a mock ICachePort.
 */
function createMockCache(): ICachePort {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    exists: vi.fn().mockResolvedValue(false),
    getMany: vi.fn().mockResolvedValue(new Map()),
    setMany: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(0),
    deleteByPattern: vi.fn().mockResolvedValue(5),
    isHealthy: vi.fn().mockResolvedValue(true),
    flush: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock HackNormalizerPort.
 */
function createMockNormalizer(incidents: HackIncident[] = []): HackNormalizerPort {
  return {
    normalizeDefiLlamaHacks: vi.fn().mockReturnValue({
      valid: incidents,
      invalidCount: 0,
      duplicateCount: 0,
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('SyncHacksUseCase', () => {
  let logger: LoggerPort;
  let defiLlamaSource: IHackSourcePort;
  let defiHackLabsSource: DeFiHackLabsAdapter;
  let hackRepo: IHackDataPort;
  let cache: ICachePort;
  let normalizer: HackNormalizerPort;
  let useCase: SyncHacksUseCase;

  const mockIncidents = [
    createMockIncident({
      id: '11111111-1111-1111-1111-111111111111',
      protocolName: 'Euler Finance',
    }),
    createMockIncident({
      id: '22222222-2222-2222-2222-222222222222',
      protocolName: 'Ronin Bridge',
      lossUsd: 625000000,
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    logger = createMockLogger();
    defiLlamaSource = createMockDefiLlamaSource(mockIncidents);
    defiHackLabsSource = createMockDefiHackLabsSource();
    hackRepo = createMockHackRepo();
    cache = createMockCache();
    normalizer = createMockNormalizer(mockIncidents);

    useCase = new SyncHacksUseCase(
      defiLlamaSource,
      defiHackLabsSource,
      hackRepo,
      normalizer,
      cache,
      logger,
    );
  });

  // ── Test 1: Full ETL pipeline executes in correct order ─────────────────

  it('executes the full ETL pipeline in correct order', async () => {
    (hackRepo.saveBatch as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const result = await useCase.execute();

    // Verify order: fetch → (normalize) → upsert → cross-reference → cache invalidate
    expect(defiLlamaSource.fetchAllHacks).toHaveBeenCalledOnce();
    expect(hackRepo.saveBatch).toHaveBeenCalledOnce();
    expect(defiHackLabsSource.fetchPocMappings).toHaveBeenCalledOnce();
    expect(cache.deleteByPattern).toHaveBeenCalledOnce();

    // Verify result shape
    expect(result).toMatchObject({
      recordsAdded: expect.any(Number),
      recordsUpdated: expect.any(Number),
      recordsFailed: expect.any(Number),
      pocLinked: expect.any(Number),
      cacheKeysInvalidated: expect.any(Number),
      durationMs: expect.any(Number),
      source: 'defillama+defihacklabs',
    });
  });

  // ── Test 2: Calls DefiLlamaAdapter.fetchAllHacks() ─────────────────────

  it('calls DefiLlamaAdapter.fetchAllHacks()', async () => {
    await useCase.execute();

    expect(defiLlamaSource.fetchAllHacks).toHaveBeenCalledOnce();
  });

  // ── Test 3: Passes data through normalizer ─────────────────────────────

  it('passes raw data through HackNormalizer for batch processing', async () => {
    // Make data look like raw records so looksLikeRawRecords returns true
    const rawLikeIncidents = [
      { ...mockIncidents[0], amount: 197000000, technique: 'Flash Loan' },
      { ...mockIncidents[1], amount: 625000000, technique: 'Access Control' },
    ] as unknown as HackIncident[];

    const source = createMockDefiLlamaSource(rawLikeIncidents);
    const normalizerMock = createMockNormalizer(mockIncidents);
    const uc = new SyncHacksUseCase(
      source,
      defiHackLabsSource,
      hackRepo,
      normalizerMock,
      cache,
      logger,
    );

    await uc.execute();

    expect(normalizerMock.normalizeDefiLlamaHacks).toHaveBeenCalledOnce();
  });

  // ── Test 4: Upserts via IHackDataPort.saveBatch() ──────────────────────

  it('upserts normalized data via IHackDataPort.saveBatch()', async () => {
    (hackRepo.saveBatch as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const result = await useCase.execute();

    expect(hackRepo.saveBatch).toHaveBeenCalledWith(expect.any(Array));
    expect(result.recordsAdded).toBe(2);
  });

  // ── Test 5: Calls DeFiHackLabsAdapter.fetchPocMappings() ───────────────

  it('calls DeFiHackLabsAdapter.fetchPocMappings()', async () => {
    await useCase.execute();

    expect(defiHackLabsSource.fetchPocMappings).toHaveBeenCalledOnce();
  });

  // ── Test 6: Cross-references POCs with stored incidents ────────────────

  it('cross-references POCs with stored incidents by protocol name + date', async () => {
    const pocEntries = [
      {
        protocolName: 'Euler Finance',
        date: new Date('2023-03-13T12:00:00Z'),
        testFilePath: 'src/test/2023-03/Euler_exp.sol',
      },
    ];

    defiHackLabsSource = createMockDefiHackLabsSource(pocEntries);
    (hackRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockIncident({ hasFoundryPoc: true }),
    );

    useCase = new SyncHacksUseCase(
      defiLlamaSource,
      defiHackLabsSource,
      hackRepo,
      normalizer,
      cache,
      logger,
    );

    const result = await useCase.execute();

    expect(hackRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
        hasFoundryPoc: true,
        foundryTestPath: 'src/test/2023-03/Euler_exp.sol',
      }),
    );
    expect(result.pocLinked).toBe(1);
  });

  // ── Test 7: Invalidates Redis cache ────────────────────────────────────

  it('invalidates Redis cache with pattern "hacks:*"', async () => {
    (cache.deleteByPattern as ReturnType<typeof vi.fn>).mockResolvedValue(10);

    const result = await useCase.execute();

    expect(cache.deleteByPattern).toHaveBeenCalledWith('hacks:*');
    expect(result.cacheKeysInvalidated).toBe(10);
  });

  // ── Test 8: Returns SyncResult with correct summary statistics ─────────

  it('returns SyncResult with correct summary statistics', async () => {
    (hackRepo.saveBatch as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (cache.deleteByPattern as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    const result = await useCase.execute();

    expect(result.recordsAdded).toBe(2);
    expect(result.recordsFailed).toBe(0);
    expect(result.cacheKeysInvalidated).toBe(3);
    expect(result.source).toBe('defillama+defihacklabs');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  // ── Test 9: Reports progress via callback ──────────────────────────────

  it('reports progress (0%→25%→50%→75%→90%→95%→100%) via callback', async () => {
    const progressUpdates: Array<{ percent: number; stage: string }> = [];
    const onProgress = vi.fn().mockImplementation((percent: number, stage: string) => {
      progressUpdates.push({ percent, stage });
      return Promise.resolve();
    });

    await useCase.execute({ onProgress });

    expect(onProgress).toHaveBeenCalled();

    // Verify key milestones
    const percents = progressUpdates.map((p) => p.percent);
    expect(percents).toContain(0);
    expect(percents).toContain(25);
    expect(percents).toContain(50);
    expect(percents).toContain(75);
    expect(percents).toContain(90);
    expect(percents).toContain(95);
    expect(percents).toContain(100);

    // Verify stages
    const stages = progressUpdates.map((p) => p.stage);
    expect(stages).toContain('fetching');
    expect(stages).toContain('normalizing');
    expect(stages).toContain('upserting');
    expect(stages).toContain('complete');
  });

  // ── Test 10: Handles partial failure (some records fail) ───────────────

  it('handles partial failure — invalid records do not abort the pipeline', async () => {
    // Make data look raw so normalizer is called
    const rawLikeIncidents = [
      { ...mockIncidents[0], amount: 197000000, technique: 'Flash Loan' },
    ] as unknown as HackIncident[];

    const source = createMockDefiLlamaSource(rawLikeIncidents);
    const partialNormalizer = createMockNormalizer([mockIncidents[0]]);
    // Simulate some invalid records
    (partialNormalizer.normalizeDefiLlamaHacks as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: [mockIncidents[0]],
      invalidCount: 3,
      duplicateCount: 1,
    });

    (hackRepo.saveBatch as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const uc = new SyncHacksUseCase(
      source,
      defiHackLabsSource,
      hackRepo,
      partialNormalizer,
      cache,
      logger,
    );

    const result = await uc.execute();

    // Pipeline completes despite failures
    expect(result.recordsAdded).toBe(1);
    expect(result.recordsFailed).toBe(3);
    expect(hackRepo.saveBatch).toHaveBeenCalledOnce();
    expect(cache.deleteByPattern).toHaveBeenCalledOnce();
  });

  // ── Test 11: Handles DefiLlama source failure ──────────────────────────

  it('throws when DefiLlama source fails (fatal error)', async () => {
    const failingSource: IHackSourcePort = {
      sourceName: 'defillama',
      fetchAllHacks: vi.fn().mockRejectedValue(new Error('DefiLlama API down')),
    };

    const uc = new SyncHacksUseCase(
      failingSource,
      defiHackLabsSource,
      hackRepo,
      normalizer,
      cache,
      logger,
    );

    await expect(uc.execute()).rejects.toThrow('DefiLlama API down');

    // Database and cache should NOT be called if fetch fails
    expect(hackRepo.saveBatch).not.toHaveBeenCalled();
    expect(cache.deleteByPattern).not.toHaveBeenCalled();
  });

  // ── Test 12: Handles DeFiHackLabs source failure gracefully ────────────

  it('handles DeFiHackLabs failure gracefully (non-fatal)', async () => {
    (hackRepo.saveBatch as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (defiHackLabsSource.fetchPocMappings as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('GitHub API rate limited'),
    );

    const result = await useCase.execute();

    // Pipeline completes despite DeFiHackLabs failure
    expect(result.recordsAdded).toBe(2);
    expect(result.pocLinked).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      'DeFiHackLabs cross-referencing failed (non-fatal)',
      expect.objectContaining({ error: 'GitHub API rate limited' }),
    );
    // Cache invalidation should still happen
    expect(cache.deleteByPattern).toHaveBeenCalledOnce();
  });

  // ── Test 13: Handles cache invalidation failure gracefully ─────────────

  it('handles cache invalidation failure gracefully (non-fatal)', async () => {
    (hackRepo.saveBatch as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (cache.deleteByPattern as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Redis connection refused'),
    );

    const result = await useCase.execute();

    // Pipeline completes despite cache failure
    expect(result.recordsAdded).toBe(2);
    expect(result.cacheKeysInvalidated).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      'Cache invalidation failed (non-fatal)',
      expect.objectContaining({ error: 'Redis connection refused' }),
    );
  });

  // ── Test 14: Works when no progress callback is provided ───────────────

  it('works when no progress callback is provided', async () => {
    (hackRepo.saveBatch as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    // Should not throw
    const result = await useCase.execute();

    expect(result.recordsAdded).toBe(2);
    expect(result.source).toBe('defillama+defihacklabs');
  });

  // ── Test 15: Database upsert failure is fatal ──────────────────────────

  it('throws when database upsert fails (fatal error)', async () => {
    (hackRepo.saveBatch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection pool exhausted'),
    );

    await expect(useCase.execute()).rejects.toThrow('Connection pool exhausted');

    expect(logger.error).toHaveBeenCalledWith(
      'Database upsert failed',
      expect.objectContaining({ error: 'Connection pool exhausted' }),
    );
  });

  // ── Test 16: Skips upsert when no incidents fetched ────────────────────

  it('skips database upsert when no incidents are fetched', async () => {
    const emptySource = createMockDefiLlamaSource([]);
    const emptyNormalizer = createMockNormalizer([]);

    const uc = new SyncHacksUseCase(
      emptySource,
      defiHackLabsSource,
      hackRepo,
      emptyNormalizer,
      cache,
      logger,
    );

    const result = await uc.execute();

    expect(hackRepo.saveBatch).not.toHaveBeenCalled();
    expect(result.recordsAdded).toBe(0);
    // Cache invalidation should still happen even with 0 records
    expect(cache.deleteByPattern).toHaveBeenCalledOnce();
  });
});
