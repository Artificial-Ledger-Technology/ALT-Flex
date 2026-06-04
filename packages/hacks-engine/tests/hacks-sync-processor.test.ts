/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Hacks Sync Processor Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests for the HacksSyncJob processor function.
 * Mocks pg.Pool and BullMQ Job — no live database or Redis required.
 *
 * @task P2-ETL-006
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHacksSyncProcessor } from '../src/infrastructure/hacks-sync-processor.js';
import type { LoggerPort } from '@aegis/core';
import type { Job } from 'bullmq';
import type { HacksSyncJobData } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Factories
// ═══════════════════════════════════════════════════════════════════════════════

function createMockPool() {
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

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('HacksSyncProcessor', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let mockLogger: LoggerPort;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = createMockPool();
    mockLogger = createMockLogger();
  });

  it('should create a processor function', () => {
    const processor = createHacksSyncProcessor(mockPool, mockLogger);
    expect(typeof processor).toBe('function');
  });

  it('should report progress through all stages', async () => {
    const processor = createHacksSyncProcessor(mockPool, mockLogger);
    const job = createMockJob();

    await processor(job);

    // Should have called updateProgress 5 times (fetching, normalizing, upserting, cross-referencing, complete)
    expect(job.updateProgress).toHaveBeenCalledTimes(5);
    expect(job.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'fetching', percent: 25 }),
    );
    expect(job.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'normalizing', percent: 50 }),
    );
    expect(job.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'upserting', percent: 75 }),
    );
    expect(job.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'cross-referencing', percent: 90 }),
    );
    expect(job.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'complete', percent: 100 }),
    );
  });

  it('should return HacksSyncJobResult with correct shape', async () => {
    const processor = createHacksSyncProcessor(mockPool, mockLogger);
    const job = createMockJob();

    const result = await processor(job);

    expect(result).toHaveProperty('recordsAdded');
    expect(result).toHaveProperty('recordsUpdated');
    expect(result).toHaveProperty('durationMs');
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should insert an etl_sync_log entry at start', async () => {
    const processor = createHacksSyncProcessor(mockPool, mockLogger);
    const job = createMockJob();

    await processor(job);

    // First pool.query call should be the INSERT
    const poolQuery = (mockPool as unknown as { query: ReturnType<typeof vi.fn> }).query;
    const firstCall = poolQuery.mock.calls[0];
    expect(firstCall[0]).toContain('INSERT INTO etl_sync_log');
    expect(firstCall[1]).toContain('running');
  });

  it('should update etl_sync_log to completed on success', async () => {
    const processor = createHacksSyncProcessor(mockPool, mockLogger);
    const job = createMockJob();

    await processor(job);

    // Second pool.query call should be the UPDATE
    const poolQuery = (mockPool as unknown as { query: ReturnType<typeof vi.fn> }).query;
    const lastCall = poolQuery.mock.calls[poolQuery.mock.calls.length - 1];
    expect(lastCall[0]).toContain('UPDATE etl_sync_log');
    expect(lastCall[1]).toContain('completed');
  });

  it('should update etl_sync_log to failed on error', async () => {
    const failingJob = createMockJob({
      updateProgress: vi.fn().mockRejectedValueOnce(new Error('Redis connection lost')),
    });

    const processor = createHacksSyncProcessor(mockPool, mockLogger);

    await expect(processor(failingJob)).rejects.toThrow('Redis connection lost');

    // Should have logged the error
    const poolQuery = (mockPool as unknown as { query: ReturnType<typeof vi.fn> }).query;
    const lastCall = poolQuery.mock.calls[poolQuery.mock.calls.length - 1];
    expect(lastCall[0]).toContain('UPDATE etl_sync_log');
    expect(lastCall[1]).toContain('failed');
  });

  it('should re-throw errors for BullMQ retry', async () => {
    const error = new Error('Database connection timeout');
    const failingJob = createMockJob({
      updateProgress: vi.fn().mockRejectedValueOnce(error),
    });

    const processor = createHacksSyncProcessor(mockPool, mockLogger);

    await expect(processor(failingJob)).rejects.toThrow('Database connection timeout');
  });

  it('should log info at start and completion', async () => {
    const processor = createHacksSyncProcessor(mockPool, mockLogger);
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
