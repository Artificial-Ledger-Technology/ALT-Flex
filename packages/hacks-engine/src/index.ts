/**
 * @module @aegis/hacks-engine
 *
 * AltFlex AEGIS v3.0 — Hacks Engine (Engine α)
 * Barrel export for the Hacks Dashboard domain logic.
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
  HackIncident,
  CreateHackIncidentInput,
  UpdateHackIncidentInput,
  // Value Objects
  AttackVectorType,
  AttackVectorMetadata,
  ChainType,
  ChainMetadata,
  // Ports
  IHackDataPort,
  HackFilters,
  HackSortField,
  PaginatedResult,
  SortConfig,
  DashboardStats,
  AttackVectorStat,
  ChainStat,
  LossTimeSeriesPoint,
  // API Schemas
  HackListQuery,
  HackDetailParams,
  HackStatsResponse,
  HackSearchQuery,
  HackSyncRequest,
} from '@aegis/core';

// ── Engine-specific Application Layer (populated in Phase 2+) ───────────────
// export * from './application/index.js';

// ── Engine-specific Adapter Layer (populated in Phase 2+) ───────────────────
// export * from './adapters/index.js';

// ── Engine-specific Domain Extensions (populated in Phase 2+) ───────────────
// export * from './domain/index.js';
