/**
 * @module @aegis/skills-engine/infrastructure
 *
 * Infrastructure concerns for the Skills Engine.
 * BullMQ job definitions, queue configuration, and worker setup
 * for skill indexing and safety scanning background jobs.
 *
 * @hexagonal Infrastructure Layer — Engine β
 * @task P2-ETL-006
 */

// ── Skills Index Queue ───────────────────────────────────────────────────────
export {
  createSkillsIndexQueue,
  registerSkillsIndexCron,
  enqueueManualSkillsIndex,
} from './skills-index-queue.js';

// ── Safety Scan Queue ────────────────────────────────────────────────────────
export { createSafetyScanQueue, enqueueSafetyScan } from './safety-scan-queue.js';

// ── Skills Index Processor ───────────────────────────────────────────────────
export { createSkillsIndexProcessor } from './skills-index-processor.js';

// ── Safety Scan Processor ────────────────────────────────────────────────────
export { createSafetyScanProcessor } from './safety-scan-processor.js';

// ── Safety Rules Loader ──────────────────────────────────────────────────────
export { SafetyRuleLoader } from './safety-rules/rule-loader.js';
