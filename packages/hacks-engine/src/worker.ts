/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Hacks Engine Worker
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * BullMQ Worker process for the Hacks Engine (Engine α).
 * Runs as a standalone process (Docker: aegis-hacks-worker-dev).
 *
 * Responsibilities:
 *  - Creates BullMQ Worker for `aegis:queue:hacks-sync`
 *  - Registers recurring cron job (every 6 hours by default)
 *  - Processes sync jobs with progress tracking + etl_sync_log writes
 *  - Handles graceful shutdown (SIGTERM, SIGINT)
 *
 * @module worker
 * @hexagonal Infrastructure Layer — Engine α
 * @task P2-ETL-006
 */

import { Worker } from 'bullmq';
import pg from 'pg';
import {
  createQueueConnection,
  createLogger,
  QUEUE_NAMES,
  type HacksSyncJobData,
  type HacksSyncJobResult,
} from '@aegis/core';
import { createHacksSyncQueue, registerHacksSyncCron } from './infrastructure/hacks-sync-queue.js';
import { createHacksSyncProcessor } from './infrastructure/hacks-sync-processor.js';
import { SyncHacksUseCase } from './application/sync-hacks.use-case.js';
import { DefiLlamaAdapter } from './adapters/defillama-adapter.js';
import { DeFiHackLabsAdapter } from './adapters/defihacklabs-adapter.js';
import { PostgresHackRepository } from './adapters/postgres/postgres-hack-repository.js';
import { RedisCacheAdapter } from './adapters/redis/redis-cache-adapter.js';
import { normalizeDefiLlamaHacks } from './adapters/hack-normalizer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Logger
// ═══════════════════════════════════════════════════════════════════════════════

const logger = createLogger({ name: 'hacks-worker' });

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
  logger.info('🚀 Hacks Worker starting...');

  // Create dedicated Redis connections (BullMQ requires separate connections)
  const queueConnection = createQueueConnection();
  const workerConnection = createQueueConnection();

  // Create queue instance (for cron registration)
  const hacksSyncQueue = createHacksSyncQueue(queueConnection);

  // Register recurring cron job
  await registerHacksSyncCron(hacksSyncQueue);
  const cron = process.env['HACKS_SYNC_CRON'] ?? '0 */6 * * *';
  logger.info('⏰ Hacks sync cron schedule registered', { cron });

  // Construct use case dependencies
  const defiLlamaSource = new DefiLlamaAdapter(logger);
  const defiHackLabsSource = new DeFiHackLabsAdapter(logger);
  const hackRepo = new PostgresHackRepository({
    connectionString: dbUrl,
    min: 1,
    max: 3,
    idleTimeoutMillis: 30000,
  });
  const redisCacheAdapter = new RedisCacheAdapter();
  await redisCacheAdapter.connect();

  // Create the application-layer orchestrator
  const syncHacksUseCase = new SyncHacksUseCase(
    defiLlamaSource,
    defiHackLabsSource,
    hackRepo,
    { normalizeDefiLlamaHacks },
    redisCacheAdapter,
    logger,
  );

  // Create job processor
  const processor = createHacksSyncProcessor(syncHacksUseCase, pool, logger);

  // Create BullMQ Worker
  const worker = new Worker<HacksSyncJobData, HacksSyncJobResult>(
    QUEUE_NAMES.HACKS_SYNC,
    processor,
    {
      connection: workerConnection,
      concurrency: 1, // ETL jobs are sequential by design
    },
  );

  // ── Worker Event Handlers ───────────────────────────────────────────────
  worker.on('completed', (job) => {
    logger.info('✅ Job completed', { jobId: job.id, jobName: job.name });
  });

  worker.on('failed', (job, error) => {
    logger.error('❌ Job failed', {
      jobId: job?.id,
      jobName: job?.name,
      error: error.message,
    });
  });

  worker.on('progress', (job, progress) => {
    logger.debug('📊 Job progress', { jobId: job.id, progress });
  });

  worker.on('error', (error) => {
    logger.error('⚠️ Worker error', { error: error.message });
  });

  logger.info(`🔗 Hacks Worker listening on queue: ${QUEUE_NAMES.HACKS_SYNC}`);

  // ── Graceful Shutdown ─────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('🛑 Received shutdown signal, closing gracefully...', { signal });
    await worker.close();
    await hacksSyncQueue.close();
    await queueConnection.quit();
    await workerConnection.quit();
    await redisCacheAdapter.disconnect();
    await pool.end();
    logger.info('👋 Hacks Worker shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void start().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  logger.error('💀 Hacks Worker failed to start', { error: msg });
  process.exit(1);
});
