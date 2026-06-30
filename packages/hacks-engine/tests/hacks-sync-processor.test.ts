/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Hacks Sync Processor Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests for the HacksSyncJob processor function.
 * Mocks pg.Pool, BullMQ Job, and SyncHacksUseCase — no live dependencies.
 *
 * @task P2-ETL-006, P2-ETL-008
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHacksSyncProcessor } from '../src/infrastructure/hacks-sync-processor.js';
import type { LoggerPort, HacksSyncJobData } from '@aegis/core';
import type { Job } from 'bullmq';
import type { SyncHacksUseCase, SyncResult } from '../src/application/sync-hacks.use-case.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Factories
// ═══════════════════════════════════════════════════════════════════════════════

function createMockPool(): never {
  return {
    query: vi.fn().mockResolvedValue({
      rows: [{ id: 'sync-log-id-123' }],
      rowCount: 1,
    }),
  } as never;
}

function createMockLogger(): LoggerPort {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as LoggerPort;
}

function createMockJob(overrides: Partial<Job<HacksSyncJobData>> = {}): Job<HacksSyncJobData> {
  return {
    id: 'job-123',
    name: 'manual-sync',
    data: {},
    updateProgress: vi.fn(),
    ...overrides,
  } as unknown as Job<HacksSyncJobData>;
}

function createMockSyncResult(overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    recordsAdded: 5,
    recordsUpdated: 2,
    recordsFailed: 0,
    pocLinked: 1,
    cacheKeysInvalidated: 3,
    durationMs: 1234,
    source: 'defillama+defihacklabs',
    ...overrides,
  };
}

function createMockSyncHacksUseCase(result?: SyncResult): SyncHacksUseCase {
  const syncResult = result ?? createMockSyncResult();
  return {
    execute: vi.fn().mockResolvedValue(syncResult),
  } as unknown as SyncHacksUseCase;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('HacksSyncProcessor', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let mockLogger: LoggerPort;
  let mockUseCase: SyncHacksUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = createMockPool();
    mockLogger = createMockLogger();
    mockUseCase = createMockSyncHacksUseCase();
  });

  it('should create a processor function', () => {
    const processor = createHacksSyncProcessor(mockUseCase, mockPool, mockLogger);
    expect(typeof processor).toBe('function');
  });

  it('should delegate to SyncHacksUseCase.execute()', async () => {
    const processor = createHacksSyncProcessor(mockUseCase, mockPool, mockLogger);
    const job = createMockJob();

    await processor(job);

    expect(mockUseCase.execute).toHaveBeenCalledOnce();
    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        onProgress: expect.any(Function),
      }),
    );
  });

  it('should return HacksSyncJobResult with correct shape', async () => {
    const processor = createHacksSyncProcessor(mockUseCase, mockPool, mockLogger);
    const job = createMockJob();

    const result = await processor(job);

    expect(result).toHaveProperty('recordsAdded');
    expect(result).toHaveProperty('recordsUpdated');
    expect(result).toHaveProperty('durationMs');
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.recordsAdded).toBe(5);
    expect(result.recordsUpdated).toBe(2);
  });

  it('should insert an etl_sync_log entry at start', async () => {
    const processor = createHacksSyncProcessor(mockUseCase, mockPool, mockLogger);
    const job = createMockJob();

    await processor(job);

    const poolQuery = (mockPool as unknown as { query: ReturnType<typeof vi.fn> }).query;
    const firstCall = poolQuery.mock.calls[0];
    expect(firstCall[0]).toContain('INSERT INTO etl_sync_log');
    expect(firstCall[1]).toContain('running');
  });

  it('should update etl_sync_log to completed on success', async () => {
    const processor = createHacksSyncProcessor(mockUseCase, mockPool, mockLogger);
    const job = createMockJob();

    await processor(job);

    const poolQuery = (mockPool as unknown as { query: ReturnType<typeof vi.fn> }).query;
    const lastCall = poolQuery.mock.calls[poolQuery.mock.calls.length - 1];
    expect(lastCall[0]).toContain('UPDATE etl_sync_log');
    expect(lastCall[1]).toContain('completed');
  });

  it('should update etl_sync_log to failed on error', async () => {
    const failingUseCase = {
      execute: vi.fn().mockRejectedValue(new Error('Database connection lost')),
    } as unknown as SyncHacksUseCase;

    const processor = createHacksSyncProcessor(failingUseCase, mockPool, mockLogger);
    const job = createMockJob();

    await expect(processor(job)).rejects.toThrow('Database connection lost');

    const poolQuery = (mockPool as unknown as { query: ReturnType<typeof vi.fn> }).query;
    const lastCall = poolQuery.mock.calls[poolQuery.mock.calls.length - 1];
    expect(lastCall[0]).toContain('UPDATE etl_sync_log');
    expect(lastCall[1]).toContain('failed');
  });

  it('should re-throw errors for BullMQ retry', async () => {
    const failingUseCase = {
      execute: vi.fn().mockRejectedValue(new Error('Database connection timeout')),
    } as unknown as SyncHacksUseCase;

    const processor = createHacksSyncProcessor(failingUseCase, mockPool, mockLogger);
    const job = createMockJob();

    await expect(processor(job)).rejects.toThrow('Database connection timeout');
  });

  it('should log info at start and completion', async () => {
    const processor = createHacksSyncProcessor(mockUseCase, mockPool, mockLogger);
    const job = createMockJob();

    await processor(job);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('started'),
      expect.objectContaining({ jobId: 'job-123' }),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('completed'),
      expect.objectContaining({ jobId: 'job-123' }),
    );
  });
});
