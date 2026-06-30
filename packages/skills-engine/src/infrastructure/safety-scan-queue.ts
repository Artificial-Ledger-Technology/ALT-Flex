/**
 * @module safety-scan-queue
 * @description BullMQ queue definition for the Safety Scan job (Phase 3 placeholder).
 *
 * Creates and manages the `aegis:queue:safety-scan` queue. Jobs are triggered
 * by the SkillsIndexJob for each newly indexed skill file. The actual scanning
 * logic will be implemented in Phase 3 (AI Safety Scanner).
 *
 * @hexagonal Infrastructure Layer — Engine β
 * @task P2-ETL-006
 */

import { Queue, type JobsOptions } from 'bullmq';
import type IORedis from 'ioredis';
import {
  QUEUE_NAMES,
  type SafetyScanJobData,
  type SafetyScanJobResult,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Default Job Options
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 3000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 100 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Queue Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create the SafetyScanQueue.
 *
 * @param connection — Dedicated ioredis connection for this queue
 */
export function createSafetyScanQueue(
  connection: IORedis,
): Queue<SafetyScanJobData, SafetyScanJobResult> {
  return new Queue<SafetyScanJobData, SafetyScanJobResult>(
    QUEUE_NAMES.SAFETY_SCAN,
    {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Job Enqueue Helper
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enqueue a safety scan job for a specific skill file.
 *
 * Triggered by the SkillsIndexJob processor for each newly indexed
 * or updated skill file. No cron schedule — event-driven only.
 *
 * @param queue — The safety scan queue instance
 * @param skillId — The skill record ID to scan
 * @param contentHash — Content hash at indexing time
 */
export async function enqueueSafetyScan(
  queue: Queue<SafetyScanJobData, SafetyScanJobResult>,
  skillId: string,
  contentHash: string,
): Promise<string | null> {
  const job = await queue.add(
    'scan-skill',
    { skillId, contentHash },
    {
      // Use skillId as deduplication key — only one scan per skill at a time
      jobId: `safety-scan-${skillId}`,
    },
  );
  return job.id ?? null;
}
