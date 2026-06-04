/**
 * @module queue-types
 * @description Shared type definitions for BullMQ job queues.
 *
 * Centralizes queue name constants, job payload shapes, result types,
 * and progress tracking contracts so that both engines (hacks, skills)
 * and the API gateway share a single source of truth.
 *
 * @hexagonal Shared Kernel — Infrastructure Types
 * @task P2-ETL-006
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Queue Name Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Namespaced queue identifiers for BullMQ.
 * Convention: `aegis:queue:<domain>-<action>`
 */
export const QUEUE_NAMES = {
  HACKS_SYNC: 'aegis:queue:hacks-sync',
  SKILLS_INDEX: 'aegis:queue:skills-index',
  SAFETY_SCAN: 'aegis:queue:safety-scan',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ═══════════════════════════════════════════════════════════════════════════════
// Job Data Types (what the producer sends)
// ═══════════════════════════════════════════════════════════════════════════════

/** Data payload for HacksSyncJob. */
export interface HacksSyncJobData {
  /** Skip deduplication checks and re-fetch all records. */
  readonly force?: boolean;
}

/** Data payload for SkillsIndexJob. */
export interface SkillsIndexJobData {
  /** Skip content hash checks and re-index all files. */
  readonly force?: boolean;
}

/** Data payload for SafetyScanJob (triggered per-skill by SkillsIndexJob). */
export interface SafetyScanJobData {
  /** The skill record ID to scan. */
  readonly skillId: string;
  /** The content hash at time of indexing, for staleness detection. */
  readonly contentHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Job Result Types (what the processor returns)
// ═══════════════════════════════════════════════════════════════════════════════

/** Result returned by the HacksSyncJob processor. */
export interface HacksSyncJobResult {
  readonly recordsAdded: number;
  readonly recordsUpdated: number;
  readonly durationMs: number;
}

/** Result returned by the SkillsIndexJob processor. */
export interface SkillsIndexJobResult {
  readonly added: number;
  readonly updated: number;
  readonly skipped: number;
  readonly durationMs: number;
}

/** Result returned by the SafetyScanJob processor. */
export interface SafetyScanJobResult {
  readonly safetyLabel: string;
  readonly scannedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Progress Tracking
// ═══════════════════════════════════════════════════════════════════════════════

/** Named stages for ETL sync progress reporting. */
export type SyncProgressStage =
  | 'fetching'
  | 'normalizing'
  | 'upserting'
  | 'cross-referencing'
  | 'complete';

/** Progress payload reported via `job.updateProgress()`. */
export interface JobProgress {
  readonly stage: SyncProgressStage;
  readonly percent: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Queue Dashboard Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Status summary for a single queue (used by admin dashboard endpoint). */
export interface QueueStatus {
  readonly name: string;
  readonly active: number;
  readonly waiting: number;
  readonly completed: number;
  readonly failed: number;
  readonly delayed: number;
}
