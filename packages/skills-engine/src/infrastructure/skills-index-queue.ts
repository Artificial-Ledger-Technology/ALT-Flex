/**
 * @module skills-index-queue
 * @description BullMQ queue definition for the Skills indexing job.
 *
 * Creates and manages the `aegis:queue:skills-index` queue that triggers
 * GitHub AI skill file discovery and indexing on a cron schedule
 * (every 1 hour) or on-demand via admin API.
 *
 * @hexagonal Infrastructure Layer — Engine β
 * @task P2-ETL-006
 */

import { Queue, type JobsOptions } from 'bullmq';
import type IORedis from 'ioredis';
import {
  QUEUE_NAMES,
  type SkillsIndexJobData,
  type SkillsIndexJobResult,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Default Job Options
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Queue Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create the SkillsIndexQueue.
 *
 * @param connection — Dedicated ioredis connection for this queue
 */
export function createSkillsIndexQueue(
  connection: IORedis,
): Queue<SkillsIndexJobData, SkillsIndexJobResult> {
  return new Queue<SkillsIndexJobData, SkillsIndexJobResult>(
    QUEUE_NAMES.SKILLS_INDEX,
    {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Job Scheduling Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register the recurring cron job for skills indexing.
 * Default: every 1 hour (`0 * * * *`).
 */
export async function registerSkillsIndexCron(
  queue: Queue<SkillsIndexJobData, SkillsIndexJobResult>,
): Promise<void> {
  const cronExpression = '0 * * * *'; // Every hour

  await queue.add(
    'scheduled-index',
    { force: false },
    {
      repeat: { pattern: cronExpression },
      jobId: 'skills-index-cron', // Stable ID prevents duplicate cron registrations
    },
  );
}

/**
 * Enqueue a manual (on-demand) skills indexing job.
 *
 * Checks for active/waiting jobs to prevent duplicate indexing runs.
 * Returns the job ID if enqueued, or null if indexing is already in progress.
 */
export async function enqueueManualSkillsIndex(
  queue: Queue<SkillsIndexJobData, SkillsIndexJobResult>,
  data: SkillsIndexJobData = {},
): Promise<string | null> {
  const [activeJobs, waitingJobs] = await Promise.all([
    queue.getActive(),
    queue.getWaiting(),
  ]);

  const nonCronActive = activeJobs.filter(
    (j) => j.name !== 'scheduled-index' || j.opts?.repeat === undefined,
  );
  const nonCronWaiting = waitingJobs.filter(
    (j) => j.name !== 'scheduled-index' || j.opts?.repeat === undefined,
  );

  if (nonCronActive.length > 0 || nonCronWaiting.length > 0) {
    return null; // Indexing already in progress
  }

  const job = await queue.add('manual-index', data);
  return job.id ?? null;
}
