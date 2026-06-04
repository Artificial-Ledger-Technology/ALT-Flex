/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Hacks Sync Queue Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests for the BullMQ queue factory and scheduling helpers.
 * All tests mock ioredis — no live Redis required.
 *
 * @task P2-ETL-006
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@aegis/core';

// ── Mock BullMQ ──────────────────────────────────────────────────────────────

const mockAdd = vi.fn();
const mockGetActive = vi.fn();
const mockGetWaiting = vi.fn();

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((name: string, opts: unknown) => ({
    name,
    opts,
    add: mockAdd,
    getActive: mockGetActive,
    getWaiting: mockGetWaiting,
    close: vi.fn(),
  })),
}));

// ── Import after mocking ─────────────────────────────────────────────────────

import {
  createHacksSyncQueue,
  registerHacksSyncCron,
  enqueueManualHacksSync,
} from '../src/infrastructure/hacks-sync-queue.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('HacksSyncQueue', () => {
  const mockConnection = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdd.mockResolvedValue({ id: 'test-job-id' });
    mockGetActive.mockResolvedValue([]);
    mockGetWaiting.mockResolvedValue([]);
  });

  describe('createHacksSyncQueue', () => {
    it('should create a queue with the correct name', () => {
      const queue = createHacksSyncQueue(mockConnection);
      expect(queue.name).toBe(QUEUE_NAMES.HACKS_SYNC);
    });

    it('should configure 3 retry attempts with exponential backoff', () => {
      const queue = createHacksSyncQueue(mockConnection);
      // Queue is created via the mock — verify constructor was called with correct opts
      expect(Queue).toHaveBeenCalledWith(
        QUEUE_NAMES.HACKS_SYNC,
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }),
        }),
      );
      // Keep queue alive for linting
      void queue;
    });

    it('should configure removeOnComplete with count 100', () => {
      const queue = createHacksSyncQueue(mockConnection);
      expect(Queue).toHaveBeenCalledWith(
        QUEUE_NAMES.HACKS_SYNC,
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
          }),
        }),
      );
      void queue;
    });
  });

  describe('registerHacksSyncCron', () => {
    it('should register a recurring job with cron pattern', async () => {
      const queue = createHacksSyncQueue(mockConnection);
      await registerHacksSyncCron(queue);

      expect(mockAdd).toHaveBeenCalledWith(
        'scheduled-sync',
        { force: false },
        expect.objectContaining({
          repeat: expect.objectContaining({
            pattern: expect.any(String),
          }),
          jobId: 'hacks-sync-cron',
        }),
      );
    });
  });

  describe('enqueueManualHacksSync', () => {
    it('should enqueue a manual sync job when no jobs are active', async () => {
      const queue = createHacksSyncQueue(mockConnection);
      const jobId = await enqueueManualHacksSync(queue);

      expect(jobId).toBe('test-job-id');
      expect(mockAdd).toHaveBeenCalledWith('manual-sync', {});
    });

    it('should return null when a manual sync job is already active', async () => {
      mockGetActive.mockResolvedValue([{ name: 'manual-sync', opts: {} }]);

      const queue = createHacksSyncQueue(mockConnection);
      const jobId = await enqueueManualHacksSync(queue);

      expect(jobId).toBeNull();
    });

    it('should pass force flag when provided', async () => {
      const queue = createHacksSyncQueue(mockConnection);
      await enqueueManualHacksSync(queue, { force: true });

      expect(mockAdd).toHaveBeenCalledWith('manual-sync', { force: true });
    });
  });
});
