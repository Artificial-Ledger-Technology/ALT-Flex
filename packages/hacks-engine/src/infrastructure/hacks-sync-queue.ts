/**
 * @module hacks-sync-queue
 * @description BullMQ queue definition for the Hacks ETL sync job.
 *
 * Creates and manages the `aegis:queue:hacks-sync` queue that triggers
 * DefiLlama + DeFiHackLabs data synchronization on a cron schedule
 * (every 6 hours) or on-demand via admin API.
 *
 * @hexagonal Infrastructure Layer — Engine α
 * @task P2-ETL-006
 */

import { Queue, type JobsOptions } from 'bullmq';
import type IORedis from 'ioredis';
import {
  QUEUE_NAMES,
  type HacksSyncJobData,
  type HacksSyncJobResult,
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
 * Create the HacksSyncQueue.
 *
 * @param connection — Dedicated ioredis connection for this queue
 */
export function createHacksSyncQueue(
  connection: IORedis,
): Queue<HacksSyncJobData, HacksSyncJobResult> {
  return new Queue<HacksSyncJobData, HacksSyncJobResult>(
    QUEUE_NAMES.HACKS_SYNC,
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
 * Register the recurring cron job for hacks sync.
 * Default: every 6 hours (`0 * /6 * * *`), configurable via HACKS_SYNC_CRON env.
 */
export async function registerHacksSyncCron(
  queue: Queue<HacksSyncJobData, HacksSyncJobResult>,
): Promise<void> {
  const cronExpression = process.env['HACKS_SYNC_CRON'] ?? '0 */6 * * *';

  await queue.add(
    'scheduled-sync',
    { force: false },
    {
      repeat: { pattern: cronExpression },
      jobId: 'hacks-sync-cron', // Stable ID prevents duplicate cron registrations
    },
  );
}

/**
 * Enqueue a manual (on-demand) hacks sync job.
 *
 * Checks for active/waiting jobs to prevent duplicate syncs.
 * Returns the job ID if enqueued, or null if a sync is already in progress.
 */
export async function enqueueManualHacksSync(
  queue: Queue<HacksSyncJobData, HacksSyncJobResult>,
  data: HacksSyncJobData = {},
): Promise<string | null> {
  // Check for active or waiting jobs to prevent duplicate syncs
  const [activeJobs, waitingJobs] = await Promise.all([
    queue.getActive(),
    queue.getWaiting(),
  ]);

  const nonCronActive = activeJobs.filter(
    (j) => j.name !== 'scheduled-sync' || j.opts?.repeat === undefined,
  );
  const nonCronWaiting = waitingJobs.filter(
    (j) => j.name !== 'scheduled-sync' || j.opts?.repeat === undefined,
  );

  if (nonCronActive.length > 0 || nonCronWaiting.length > 0) {
    return null; // Sync already in progress
  }

  const job = await queue.add('manual-sync', data);
  return job.id ?? null;
}
