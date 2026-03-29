/**
 * @module entities
 * @description Barrel export for all domain entities.
 *
 * Entities are domain objects with a unique identity (UUID) that persist
 * over time. They encapsulate business rules and invariants through
 * Zod schemas for runtime validation.
 *
 * @hexagonal Entity Layer — Domain Kernel
 */

// ── HackIncident ─────────────────────────────────────────────────────────────
export {
  HackIncidentSchema,
  DataSourceSchema,
  TransactionReferenceSchema,
  getNetLoss,
  getRecoveryRate,
  getAllAttackVectorsForIncident,
  isHighImpact,
  isFullyRecovered,
} from './HackIncident.js';
export type {
  HackIncident,
  DataSource,
  TransactionReference,
  CreateHackIncidentInput,
  UpdateHackIncidentInput,
} from './HackIncident.js';

// ── AISkillFile ──────────────────────────────────────────────────────────────
export {
  AISkillFileSchema,
  AIPlatformSchema,
  SmartContractLanguageSchema,
  SkillFileFormatSchema,
  SkillCategorySchema,
  getGitHubUrl,
  hasBeenScanned,
  getEngagementScore,
  getNaturalKey,
  isStale,
} from './AISkillFile.js';
export type {
  AISkillFile,
  AIPlatform,
  SmartContractLanguage,
  SkillFileFormat,
  SkillCategory,
  CreateAISkillInput,
  UpdateAISkillInput,
} from './AISkillFile.js';

// ── SafetyScanResult ─────────────────────────────────────────────────────────
export {
  SafetyScanResultSchema,
  FindingSeveritySchema,
  FindingCategorySchema,
  ScanFindingSchema,
  RuleMatchSchema,
  getTotalFindingCount,
  getEffectiveLabel,
  getFindingsBySeverity,
  getFindingsByCategory,
  getHighestSeverity,
  hasActionableFindings,
  getUniqueCategories,
} from './SafetyScanResult.js';
export type {
  SafetyScanResult,
  FindingSeverity,
  FindingCategory,
  ScanFinding,
  RuleMatch,
  CreateScanResultInput,
} from './SafetyScanResult.js';

// ── ExploitPOC ───────────────────────────────────────────────────────────────
export {
  ExploitPOCSchema,
  PocSourceSchema,
  PocExecutionStatusSchema,
  ExploitComplexitySchema,
  TargetContractSchema,
  ForkParametersSchema,
  getAllVulnerabilityClasses,
  getPrimaryTarget,
  buildForgeCommand,
  isExecutable,
  getDeFiHackLabsUrl,
} from './ExploitPOC.js';
export type {
  ExploitPOC,
  PocSource,
  PocExecutionStatus,
  ExploitComplexity,
  TargetContract,
  ForkParameters,
  CreateExploitPOCInput,
  UpdateExploitPOCInput,
} from './ExploitPOC.js';
