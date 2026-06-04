/**
 * @module queue
 * @description Barrel export for BullMQ queue infrastructure.
 *
 * @hexagonal Shared Kernel — Infrastructure Types + Utilities
 * @task P2-ETL-006
 */

// ── Queue Types ──────────────────────────────────────────────────────────────
export {
  QUEUE_NAMES,
  type QueueName,
  type HacksSyncJobData,
  type HacksSyncJobResult,
  type SkillsIndexJobData,
  type SkillsIndexJobResult,
  type SafetyScanJobData,
  type SafetyScanJobResult,
  type SyncProgressStage,
  type JobProgress,
  type QueueStatus,
} from './queue-types.js';

// ── Queue Connection ─────────────────────────────────────────────────────────
export {
  createQueueConnection,
  type QueueConnectionConfig,
} from './queue-connection.js';
