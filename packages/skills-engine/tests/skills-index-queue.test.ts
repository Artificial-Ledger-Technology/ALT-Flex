/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Skills Index Queue Unit Tests
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
  createSkillsIndexQueue,
  registerSkillsIndexCron,
  enqueueManualSkillsIndex,
} from '../src/infrastructure/skills-index-queue.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillsIndexQueue', () => {
  const mockConnection = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdd.mockResolvedValue({ id: 'skills-job-id' });
    mockGetActive.mockResolvedValue([]);
    mockGetWaiting.mockResolvedValue([]);
  });

  describe('createSkillsIndexQueue', () => {
    it('should create a queue with the correct name', () => {
      const queue = createSkillsIndexQueue(mockConnection);
      expect(queue.name).toBe(QUEUE_NAMES.SKILLS_INDEX);
    });

    it('should configure 3 retry attempts with exponential backoff', () => {
      const queue = createSkillsIndexQueue(mockConnection);
      expect(Queue).toHaveBeenCalledWith(
        QUEUE_NAMES.SKILLS_INDEX,
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }),
        }),
      );
      void queue;
    });
  });

  describe('registerSkillsIndexCron', () => {
    it('should register a recurring job with hourly cron pattern', async () => {
      const queue = createSkillsIndexQueue(mockConnection);
      await registerSkillsIndexCron(queue);

      expect(mockAdd).toHaveBeenCalledWith(
        'scheduled-index',
        { force: false },
        expect.objectContaining({
          repeat: expect.objectContaining({
            pattern: '0 * * * *',
          }),
          jobId: 'skills-index-cron',
        }),
      );
    });
  });

  describe('enqueueManualSkillsIndex', () => {
    it('should enqueue a manual index job when no jobs are active', async () => {
      const queue = createSkillsIndexQueue(mockConnection);
      const jobId = await enqueueManualSkillsIndex(queue);

      expect(jobId).toBe('skills-job-id');
      expect(mockAdd).toHaveBeenCalledWith('manual-index', {});
    });

    it('should return null when indexing is already in progress', async () => {
      mockGetActive.mockResolvedValue([{ name: 'manual-index', opts: {} }]);

      const queue = createSkillsIndexQueue(mockConnection);
      const jobId = await enqueueManualSkillsIndex(queue);

      expect(jobId).toBeNull();
    });
  });
});
