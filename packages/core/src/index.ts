/**
 * @module @aegis/core
 *
 * AltFlex AEGIS v3.0 — Shared Kernel
 * Barrel export for all core domain models, utilities, and infrastructure.
 *
 * This is the single entry point for the @aegis/core package. All engines
 * (hacks-engine, skills-engine, forensic-engine) and applications
 * (api-gateway, web) import domain types from here.
 *
 * Architecture: Hexagonal (Ports & Adapters)
 * - Domain entities with Zod runtime validation
 * - Value objects with rich metadata
 * - Port interfaces for dependency inversion
 */

// ── Domain Layer ────────────────────────────────────────────────────────────
// Entities, Value Objects, and Port interfaces (framework-agnostic nucleus)
export * from './domain/index.js';

// ── Environment Configuration ───────────────────────────────────────────────
export {
  // Schemas
  AppEnvSchema,
  DatabaseEnvSchema,
  RedisEnvSchema,
  HacksEngineEnvSchema,
  SkillsEngineEnvSchema,
  ForensicEngineEnvSchema,
  ApiGatewayEnvSchema,
  FrontendEnvSchema,
  FeatureFlagsEnvSchema,
  ServerEnvSchema,
  GatewayEnvSchema,
  // Validators
  validateEnv,
  validateEnvSafe,
} from './shared/env/index.js';

export type {
  AppEnv,
  DatabaseEnv,
  RedisEnv,
  HacksEngineEnv,
  SkillsEngineEnv,
  ForensicEngineEnv,
  ApiGatewayEnv,
  FrontendEnv,
  FeatureFlagsEnv,
  ServerEnv,
  GatewayEnv,
} from './shared/env/index.js';

export {
  SeveritySchema,
  RuleFindingSchema,
  ASTFindingSchema,
  SemanticFindingSchema,
  ScanVerdictSchema,
  FindingSchema,
  CodeBlockSchema,
  ParsedContentSchema,
  SafetyRuleSchema,
  RulePatternTypeSchema,
  RulePatternSchema,
} from './domain/value-objects/index.js';

export type {
  SafetyRule,
  RuleCategory,
  Severity,
  RuleFinding,
  ASTFinding,
  SemanticFinding,
  ScanVerdict,
  Finding,
  CodeBlock,
  ParsedContent,
  RulePattern,
} from './domain/value-objects/index.js';

// ── API Contract Schemas ────────────────────────────────────────────────────
// Request/response Zod schemas for all API endpoints.
// These compose domain types — never duplicate them.
export * from './shared/schemas/index.js';

// ── Error Hierarchy (P1-ARCH-010) ───────────────────────────────────────────
// Typed error classes — every engine and app uses these.
// Maps 1:1 to ErrorCodeSchema values from common.schema.
export * from './errors/index.js';

// ── Logging Framework (P1-ARCH-010) ─────────────────────────────────────────
// Pino-based structured logging with AsyncLocalStorage correlation IDs.
// Domain layers depend on LoggerPort interface, not Pino directly.
export * from './logging/index.js';

// ── Queue Infrastructure (P2-ETL-006) ───────────────────────────────────────
// BullMQ queue connection factory and shared job type definitions.
// Both hacks-engine and skills-engine import queue types from here.
export * from './shared/queue/index.js';
export { QUEUE_NAMES, createQueueConnection } from './shared/queue/index.js';
export type {
  QueueName,
  HacksSyncJobData,
  HacksSyncJobResult,
  SkillsIndexJobData,
  SkillsIndexJobResult,
  SafetyScanJobData,
  SafetyScanJobResult,
  SyncProgressStage,
  JobProgress,
  QueueStatus,
  QueueConnectionConfig,
} from './shared/queue/index.js';

// Re-export specific schemas to guarantee they are in the barrel
export {
  SafetyStatsResponseSchema,
  SafetyRuleStatSchema,
  SafetyTimelineDataPointSchema,
  TopFindingSchema,
} from './shared/schemas/index.js';
export type {
  SafetyStatsResponse,
  SafetyRuleStat,
  SafetyTimelineDataPoint,
  TopFinding,
} from './shared/schemas/index.js';

// ── Observability — Prometheus Metrics ──────────────────────────────────────
export { createMetricsRegistry } from './metrics/index.js';
export type { AegisMetrics } from './metrics/index.js';
