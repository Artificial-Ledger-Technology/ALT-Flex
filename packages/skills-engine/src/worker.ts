/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Skills Engine Worker
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * BullMQ Worker process for the Skills Engine (Engine β).
 * Runs as a standalone process (Docker: aegis-skills-worker-dev).
 *
 * Responsibilities:
 *  - Creates BullMQ Worker for `aegis:queue:skills-index`
 *  - Creates BullMQ Worker for `aegis:queue:safety-scan`
 *  - Registers recurring cron job (every 1 hour by default)
 *  - Handles graceful shutdown (SIGTERM, SIGINT)
 *
 * @module worker
 * @hexagonal Infrastructure Layer — Engine β
 * @task P2-ETL-006
 */

import { Worker } from 'bullmq';
import pg from 'pg';
import {
  createQueueConnection,
  createLogger,
  QUEUE_NAMES,
  type SkillsIndexJobData,
  type SkillsIndexJobResult,
  type SafetyScanJobData,
  type SafetyScanJobResult,
} from '@aegis/core';
import { createSkillsIndexQueue, registerSkillsIndexCron } from './infrastructure/skills-index-queue.js';
import { createSafetyScanQueue } from './infrastructure/safety-scan-queue.js';
import { createSkillsIndexProcessor } from './infrastructure/skills-index-processor.js';
import { createSafetyScanProcessor } from './infrastructure/safety-scan-processor.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Logger
// ═══════════════════════════════════════════════════════════════════════════════

const logger = createLogger({ name: 'skills-worker' });

// ═══════════════════════════════════════════════════════════════════════════════
// Database Pool
// ═══════════════════════════════════════════════════════════════════════════════

const dbUrl = process.env['DATABASE_URL'] ?? 'postgresql://aegis:changeme@localhost:5432/aegis_dev';
const pool = new pg.Pool({
  connectionString: dbUrl,
  min: 1,
  max: 3, // Workers use minimal connections
  idleTimeoutMillis: 30000,
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════════════════════════════════════════

async function start(): Promise<void> {
  logger.info('🚀 Skills Worker starting...');

  // Create dedicated Redis connections (BullMQ requires separate connections)
  const skillsQueueConn = createQueueConnection();
  const skillsWorkerConn = createQueueConnection();
  const safetyScanQueueConn = createQueueConnection();
  const safetyScanWorkerConn = createQueueConnection();

  // Create queue instances
  const skillsIndexQueue = createSkillsIndexQueue(skillsQueueConn);
  const safetyScanQueue = createSafetyScanQueue(safetyScanQueueConn);

  // Register recurring cron job for skills indexing
  await registerSkillsIndexCron(skillsIndexQueue);
  logger.info('⏰ Skills index cron schedule registered', { cron: '0 * * * *' });

  // Create job processors
  const skillsProcessor = createSkillsIndexProcessor(pool, logger, safetyScanQueue);
  const safetyScanProcessor = createSafetyScanProcessor(logger);

  // ── Skills Index Worker ─────────────────────────────────────────────────
  const skillsWorker = new Worker<SkillsIndexJobData, SkillsIndexJobResult>(
    QUEUE_NAMES.SKILLS_INDEX,
    skillsProcessor,
    {
      connection: skillsWorkerConn,
      concurrency: 1, // ETL jobs are sequential by design
    },
  );

  skillsWorker.on('completed', (job) => {
    logger.info('✅ SkillsIndex job completed', { jobId: job.id, jobName: job.name });
  });

  skillsWorker.on('failed', (job, error) => {
    logger.error('❌ SkillsIndex job failed', {
      jobId: job?.id,
      jobName: job?.name,
      error: error.message,
    });
  });

  skillsWorker.on('error', (error) => {
    logger.error('⚠️ SkillsIndex worker error', { error: error.message });
  });

  // ── Safety Scan Worker ──────────────────────────────────────────────────
  const safetyScanWorker = new Worker<SafetyScanJobData, SafetyScanJobResult>(
    QUEUE_NAMES.SAFETY_SCAN,
    safetyScanProcessor,
    {
      connection: safetyScanWorkerConn,
      concurrency: 3, // Safety scans can run in parallel
    },
  );

  safetyScanWorker.on('completed', (job) => {
    logger.info(
      '✅ SafetyScan job completed',
      { jobId: job.id, skillId: job.data.skillId },
    );
  });

  safetyScanWorker.on('failed', (job, error) => {
    logger.error(
      '❌ SafetyScan job failed',
      { jobId: job?.id, skillId: job?.data.skillId, error: error.message },
    );
  });

  safetyScanWorker.on('error', (error) => {
    logger.error('⚠️ SafetyScan worker error', { error: error.message });
  });

  logger.info(`🔗 Skills Worker listening on queues: ${QUEUE_NAMES.SKILLS_INDEX}, ${QUEUE_NAMES.SAFETY_SCAN}`);

  // ── Graceful Shutdown ─────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('🛑 Received shutdown signal, closing gracefully...', { signal });
    await skillsWorker.close();
    await safetyScanWorker.close();
    await skillsIndexQueue.close();
    await safetyScanQueue.close();
    await skillsQueueConn.quit();
    await skillsWorkerConn.quit();
    await safetyScanQueueConn.quit();
    await safetyScanWorkerConn.quit();
    await pool.end();
    logger.info('👋 Skills Worker shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void start().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  logger.error('💀 Skills Worker failed to start', { error: msg });
  process.exit(1);
});
