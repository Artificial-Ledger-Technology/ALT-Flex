/**
 * @module skills-index-processor
 * @description BullMQ job processor for the SkillsIndexJob.
 *
 * Orchestrates the skills ETL pipeline with progress tracking and
 * completion logging to the `etl_sync_log` table. This processor is
 * a thin orchestrator that will delegate to `IndexSkillsUseCase` once
 * P2-ETL-009 is implemented.
 *
 * For each newly indexed skill, enqueues a SafetyScanJob for Phase 3.
 *
 * Progress stages: fetching → normalizing → upserting → complete
 *
 * @hexagonal Infrastructure Layer — Engine β
 * @task P2-ETL-006
 */

import type { Queue, Job } from 'bullmq';
import type { Pool } from 'pg';
import type {
  LoggerPort,
  SkillsIndexJobData,
  SkillsIndexJobResult,
  SafetyScanJobData,
  SafetyScanJobResult,
  JobProgress,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// ETL Sync Log Helper (same pattern as hacks processor)
// ═══════════════════════════════════════════════════════════════════════════════

interface SyncLogEntry {
  readonly source: string;
  readonly engine: string;
  readonly status: 'running' | 'completed' | 'failed';
  readonly recordsAdded: number;
  readonly recordsUpdated: number;
  readonly errorMessage?: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly durationMs?: number;
}

async function insertSyncLog(pool: Pool, entry: SyncLogEntry): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO etl_sync_log (source, engine, status, records_added, records_updated, error_message, started_at, completed_at, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      entry.source,
      entry.engine,
      entry.status,
      entry.recordsAdded,
      entry.recordsUpdated,
      entry.errorMessage ?? null,
      entry.startedAt,
      entry.completedAt ?? null,
      entry.durationMs ?? null,
    ],
  );
  return result.rows[0]!.id;
}

async function updateSyncLog(
  pool: Pool,
  id: string,
  update: Partial<Pick<SyncLogEntry, 'status' | 'recordsAdded' | 'recordsUpdated' | 'errorMessage' | 'completedAt' | 'durationMs'>>,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (update.status !== undefined) {
    sets.push(`status = $${idx++}`);
    values.push(update.status);
  }
  if (update.recordsAdded !== undefined) {
    sets.push(`records_added = $${idx++}`);
    values.push(update.recordsAdded);
  }
  if (update.recordsUpdated !== undefined) {
    sets.push(`records_updated = $${idx++}`);
    values.push(update.recordsUpdated);
  }
  if (update.errorMessage !== undefined) {
    sets.push(`error_message = $${idx++}`);
    values.push(update.errorMessage);
  }
  if (update.completedAt !== undefined) {
    sets.push(`completed_at = $${idx++}`);
    values.push(update.completedAt);
  }
  if (update.durationMs !== undefined) {
    sets.push(`duration_ms = $${idx++}`);
    values.push(update.durationMs);
  }

  if (sets.length === 0) return;

  values.push(id);
  await pool.query(
    `UPDATE etl_sync_log SET ${sets.join(', ')} WHERE id = $${idx}`,
    values,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Processor Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create the SkillsIndexJob processor function.
 *
 * @param pool — PostgreSQL connection pool for etl_sync_log writes
 * @param logger — Structured logger
 * @param safetyScanQueue — Queue for enqueuing safety scans for new skills
 */
export function createSkillsIndexProcessor(
  pool: Pool,
  logger: LoggerPort,
  safetyScanQueue: Queue<SafetyScanJobData, SafetyScanJobResult>,
): (job: Job<SkillsIndexJobData>) => Promise<SkillsIndexJobResult> {
  return async (job: Job<SkillsIndexJobData>): Promise<SkillsIndexJobResult> => {
    const startedAt = new Date();
    const startMs = Date.now();

    logger.info('SkillsIndexJob started', { jobId: job.id, jobName: job.name });

    // Insert initial sync log entry
    const syncLogId = await insertSyncLog(pool, {
      source: 'github-skills',
      engine: 'skills-engine',
      status: 'running',
      recordsAdded: 0,
      recordsUpdated: 0,
      startedAt,
    });

    try {
      // ── Stage 1: Fetching ─────────────────────────────────────────────
      const progress1: JobProgress = { stage: 'fetching', percent: 25 };
      await job.updateProgress(progress1);
      logger.info('Discovering skill files from GitHub', { jobId: job.id, stage: 'fetching' });

      // TODO (P2-ETL-009): Call IndexSkillsUseCase.execute() here
      // For now, this is a placeholder that simulates the pipeline stages.

      // ── Stage 2: Normalizing ──────────────────────────────────────────
      const progress2: JobProgress = { stage: 'normalizing', percent: 50 };
      await job.updateProgress(progress2);
      logger.info('Normalizing skill file metadata', { jobId: job.id, stage: 'normalizing' });

      // ── Stage 3: Upserting ────────────────────────────────────────────
      const progress3: JobProgress = { stage: 'upserting', percent: 75 };
      await job.updateProgress(progress3);
      logger.info('Upserting skill records to database', { jobId: job.id, stage: 'upserting' });

      // TODO (P2-ETL-009): For each newly indexed skill, enqueue safety scan:
      // for (const newSkill of newlyIndexedSkills) {
      //   await enqueueSafetyScan(safetyScanQueue, newSkill.id, newSkill.contentHash);
      // }
      void safetyScanQueue; // Acknowledge the parameter until P2-ETL-009 wires it

      // ── Stage 4: Complete ─────────────────────────────────────────────
      const durationMs = Date.now() - startMs;
      const result: SkillsIndexJobResult = {
        added: 0,       // Placeholder until IndexSkillsUseCase is wired
        updated: 0,     // Placeholder until IndexSkillsUseCase is wired
        skipped: 0,     // Placeholder until IndexSkillsUseCase is wired
        durationMs,
      };

      await updateSyncLog(pool, syncLogId, {
        status: 'completed',
        recordsAdded: result.added,
        recordsUpdated: result.updated,
        completedAt: new Date(),
        durationMs,
      });

      const progressDone: JobProgress = { stage: 'complete', percent: 100 };
      await job.updateProgress(progressDone);
      logger.info(
        'SkillsIndexJob completed successfully',
        { jobId: job.id, durationMs, result },
      );

      return result;
    } catch (error: unknown) {
      const durationMs = Date.now() - startMs;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await updateSyncLog(pool, syncLogId, {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
        durationMs,
      });

      logger.error(
        'SkillsIndexJob failed',
        { jobId: job.id, error: errorMessage, durationMs },
      );

      throw error; // Re-throw for BullMQ retry logic
    }
  };
}
