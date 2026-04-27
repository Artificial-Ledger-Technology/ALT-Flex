/**
 * @module @aegis/skills-engine
 *
 * AltFlex AEGIS v3.0 — Skills Engine (Engine β)
 * Barrel export for the AI Skills Explorer domain logic.
 *
 * Re-exports core domain types consumed by this engine and exposes
 * engine-specific use cases, adapters, and infrastructure as they
 * are implemented in subsequent phases.
 *
 * @hexagonal Application + Adapter Layers
 */

// ── Core Domain Re-exports (types consumed by this engine) ──────────────────
export type {
  // Entities
  AISkillFile,
  CreateAISkillInput,
  UpdateAISkillInput,
  SafetyScanResult,
  CreateScanResultInput,
  // Value Objects
  SafetyLabelType,
  SafetyLabelMetadata,
  // Ports
  ISkillDataPort,
  SkillFilters,
  SkillSortField,
  PlatformStat,
  LanguageStat,
  SafetyDistribution,
  SkillsDashboardStats,
  ISafetyScannerPort,
  ScannerConfig,
  ScanRequest,
  ScanResponse,
  PaginatedResult,
  SortConfig,
  // API Schemas
  SkillListQuery,
  SkillDetailParams,
  SkillStatsResponse,
  SkillScanRequest,
  SkillSyncRequest,
} from '@aegis/core';

// ── Engine-specific Application Layer (populated in Phase 2+) ───────────────
// export * from './application/index.js';

// ── Engine-specific Adapter Layer (populated in Phase 2+) ───────────────────
// export * from './adapters/index.js';

// ── Engine-specific Domain Extensions (populated in Phase 2+) ───────────────
// export * from './domain/index.js';
