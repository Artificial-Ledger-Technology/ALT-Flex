/**
 * @module hacks-sync-processor
 * @description BullMQ job processor for the HacksSyncJob.
 *
 * Orchestrates the hacks ETL pipeline with progress tracking and
 * completion logging to the `etl_sync_log` table. This processor is
 * a thin orchestrator that will delegate to `SyncHacksUseCase` once
 * P2-ETL-008 is implemented.
 *
 * Progress stages: fetching → normalizing → upserting → cross-referencing → complete
 *
 * @hexagonal Infrastructure Layer — Engine α
 * @task P2-ETL-006
 */

import type { Job } from 'bullmq';
import type { Pool } from 'pg';
import type {
  LoggerPort,
  HacksSyncJobData,
  HacksSyncJobResult,
  JobProgress,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// ETL Sync Log Helper
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
 * Create the HacksSyncJob processor function.
 *
 * @param pool — PostgreSQL connection pool for etl_sync_log writes
 * @param logger — Structured logger
 */
export function createHacksSyncProcessor(
  pool: Pool,
  logger: LoggerPort,
): (job: Job<HacksSyncJobData>) => Promise<HacksSyncJobResult> {
  return async (job: Job<HacksSyncJobData>): Promise<HacksSyncJobResult> => {
    const startedAt = new Date();
    const startMs = Date.now();
    const jobId = job.id ?? 'unknown';

    logger.info('HacksSyncJob started', { jobId, jobName: job.name });

    // Insert initial sync log entry
    const syncLogId = await insertSyncLog(pool, {
      source: 'defillama+defihacklabs',
      engine: 'hacks-engine',
      status: 'running',
      recordsAdded: 0,
      recordsUpdated: 0,
      startedAt,
    });

    try {
      // ── Stage 1: Fetching ─────────────────────────────────────────────
      const progress1: JobProgress = { stage: 'fetching', percent: 25 };
      await job.updateProgress(progress1);
      logger.info('Fetching hack data from sources', { jobId, stage: 'fetching' });

      // TODO (P2-ETL-008): Call SyncHacksUseCase.execute() here

      // ── Stage 2: Normalizing ──────────────────────────────────────────
      const progress2: JobProgress = { stage: 'normalizing', percent: 50 };
      await job.updateProgress(progress2);
      logger.info('Normalizing hack records', { jobId, stage: 'normalizing' });

      // ── Stage 3: Upserting ────────────────────────────────────────────
      const progress3: JobProgress = { stage: 'upserting', percent: 75 };
      await job.updateProgress(progress3);
      logger.info('Upserting records to database', { jobId, stage: 'upserting' });

      // ── Stage 4: Cross-referencing ────────────────────────────────────
      const progress4: JobProgress = { stage: 'cross-referencing', percent: 90 };
      await job.updateProgress(progress4);
      logger.info('Cross-referencing with DeFiHackLabs POCs', { jobId, stage: 'cross-referencing' });

      // ── Stage 5: Complete ─────────────────────────────────────────────
      const durationMs = Date.now() - startMs;
      const result: HacksSyncJobResult = {
        recordsAdded: 0,     // Placeholder until SyncHacksUseCase is wired
        recordsUpdated: 0,   // Placeholder until SyncHacksUseCase is wired
        durationMs,
      };

      await updateSyncLog(pool, syncLogId, {
        status: 'completed',
        recordsAdded: result.recordsAdded,
        recordsUpdated: result.recordsUpdated,
        completedAt: new Date(),
        durationMs,
      });

      const progressDone: JobProgress = { stage: 'complete', percent: 100 };
      await job.updateProgress(progressDone);
      logger.info('HacksSyncJob completed successfully', { jobId, durationMs, result });

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

      logger.error('HacksSyncJob failed', { jobId, error: errorMessage, durationMs });

      throw error; // Re-throw for BullMQ retry logic
    }
  };
}
