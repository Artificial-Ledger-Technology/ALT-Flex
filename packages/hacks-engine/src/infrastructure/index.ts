/**
 * @module @aegis/hacks-engine/infrastructure
 *
 * Infrastructure concerns for the Hacks Engine.
 * BullMQ job definitions, queue configuration, and worker setup
 * for hack data synchronization background jobs.
 *
 * @hexagonal Infrastructure Layer — Engine α
 * @task P2-ETL-006
 */

// ── Hacks Sync Queue ─────────────────────────────────────────────────────────
export {
  createHacksSyncQueue,
  registerHacksSyncCron,
  enqueueManualHacksSync,
} from './hacks-sync-queue.js';

// ── Hacks Sync Processor ─────────────────────────────────────────────────────
export { createHacksSyncProcessor } from './hacks-sync-processor.js';
