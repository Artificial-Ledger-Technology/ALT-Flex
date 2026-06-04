/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Safety Scan Queue Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests for the SafetyScanQueue factory and enqueue helper.
 * All tests mock ioredis — no live Redis required.
 *
 * @task P2-ETL-006
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@aegis/core';

// ── Mock BullMQ ──────────────────────────────────────────────────────────────

const mockAdd = vi.fn();

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation((name: string, opts: unknown) => ({
    name,
    opts,
    add: mockAdd,
    close: vi.fn(),
  })),
}));

// ── Import after mocking ─────────────────────────────────────────────────────

import {
  createSafetyScanQueue,
  enqueueSafetyScan,
} from '../src/infrastructure/safety-scan-queue.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('SafetyScanQueue', () => {
  const mockConnection = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdd.mockResolvedValue({ id: 'scan-job-id' });
  });

  describe('createSafetyScanQueue', () => {
    it('should create a queue with the correct name', () => {
      const queue = createSafetyScanQueue(mockConnection);
      expect(queue.name).toBe(QUEUE_NAMES.SAFETY_SCAN);
    });

    it('should configure 2 retry attempts with exponential backoff at 3000ms', () => {
      const queue = createSafetyScanQueue(mockConnection);
      expect(Queue).toHaveBeenCalledWith(
        QUEUE_NAMES.SAFETY_SCAN,
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            attempts: 2,
            backoff: { type: 'exponential', delay: 3000 },
          }),
        }),
      );
      void queue;
    });
  });

  describe('enqueueSafetyScan', () => {
    it('should enqueue a safety scan job with skill data', async () => {
      const queue = createSafetyScanQueue(mockConnection);
      const jobId = await enqueueSafetyScan(queue, 'skill-abc', 'hash-123');

      expect(jobId).toBe('scan-job-id');
      expect(mockAdd).toHaveBeenCalledWith(
        'scan-skill',
        { skillId: 'skill-abc', contentHash: 'hash-123' },
        expect.objectContaining({
          jobId: 'safety-scan-skill-abc',
        }),
      );
    });

    it('should use skillId as deduplication key in jobId', async () => {
      const queue = createSafetyScanQueue(mockConnection);
      await enqueueSafetyScan(queue, 'my-unique-skill', 'hash-456');

      expect(mockAdd).toHaveBeenCalledWith(
        'scan-skill',
        expect.anything(),
        expect.objectContaining({
          jobId: 'safety-scan-my-unique-skill',
        }),
      );
    });
  });
});
