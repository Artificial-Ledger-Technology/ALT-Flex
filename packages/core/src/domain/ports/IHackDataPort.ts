/**
 * @module IHackDataPort
 * @description Abstract interface for hack incident data persistence.
 *
 * This is a Hexagonal Architecture "Port". The domain layer depends
 * on this interface; concrete implementations (PostgreSQL, in-memory)
 * are "Adapters" that live outside the domain.
 *
 * Implementations:
 * - `PostgresHackDataAdapter` (packages/hacks-engine/src/adapters/postgres/)
 * - `InMemoryHackDataAdapter` (test utility)
 *
 * @hexagonal Port — Domain Layer
 */

import type {
  HackIncident,
  CreateHackIncidentInput,
  UpdateHackIncidentInput,
} from '../entities/HackIncident.js';
import type { AttackVector } from '../value-objects/AttackVector.js';
import type { Chain } from '../value-objects/Chain.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Shared Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic paginated result wrapper.
 * Used across all port interfaces for consistent pagination.
 */
export interface PaginatedResult<T> {
  /** The data items for the current page */
  readonly data: readonly T[];
  /** Total number of items matching the query (across all pages) */
  readonly total: number;
  /** Current page number (1-indexed) */
  readonly page: number;
  /** Items per page */
  readonly pageSize: number;
  /** Total number of pages */
  readonly totalPages: number;
  /** Whether there are more pages after this one */
  readonly hasNextPage: boolean;
  /** Whether there are pages before this one */
  readonly hasPreviousPage: boolean;
}

/**
 * Sorting configuration.
 */
export interface SortConfig<T extends string = string> {
  /** Field to sort by */
  readonly sortBy: T;
  /** Sort direction */
  readonly sortOrder: 'asc' | 'desc';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hack Filters
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Available sort fields for hack incidents.
 */
export type HackSortField = 'date' | 'lossUsd' | 'protocolName' | 'fundsReturned' | 'chain';

/**
 * Filter parameters for querying hack incidents.
 * All filter fields are optional — omitting a field means "no filter on that dimension".
 */
export interface HackFilters extends SortConfig<HackSortField> {
  /** Filter by primary attack vector */
  readonly attackVector?: AttackVector;
  /** Filter by chain */
  readonly chain?: Chain;
  /** Filter by protocol name (partial match) */
  readonly protocol?: string;
  /** Filter by date range start (inclusive) */
  readonly dateFrom?: Date;
  /** Filter by date range end (inclusive) */
  readonly dateTo?: Date;
  /** Filter by minimum loss amount (USD) */
  readonly minLossUsd?: number;
  /** Filter by maximum loss amount (USD) */
  readonly maxLossUsd?: number;
  /** Filter by Foundry POC availability */
  readonly hasFoundryPoc?: boolean;
  /** Full-text search across protocol name and description */
  readonly search?: string;
  /** Filter by data source */
  readonly dataSource?: string;
  /** Page number (1-indexed) */
  readonly page: number;
  /** Items per page */
  readonly pageSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Statistics Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aggregate statistics for a single attack vector.
 * Used for the dashboard's attack vector breakdown chart.
 */
export interface AttackVectorStat {
  readonly attackVector: AttackVector;
  readonly count: number;
  readonly totalLossUsd: number;
  readonly avgLossUsd: number;
  readonly lastIncidentDate: Date;
}

/**
 * Aggregate statistics for a single chain.
 * Used for the dashboard's chain breakdown chart.
 */
export interface ChainStat {
  readonly chain: Chain;
  readonly count: number;
  readonly totalLossUsd: number;
  readonly avgLossUsd: number;
}

/**
 * Time-series data point for loss over time charts.
 */
export interface LossTimeSeriesPoint {
  readonly date: Date;
  readonly totalLossUsd: number;
  readonly incidentCount: number;
  readonly cumulativeLossUsd: number;
}

/**
 * Dashboard-level aggregate statistics.
 */
export interface DashboardStats {
  readonly totalIncidents: number;
  readonly totalLossUsd: number;
  readonly totalRecoveredUsd: number;
  readonly avgLossUsd: number;
  readonly medianLossUsd: number;
  readonly pocCoverage: number;
  readonly uniqueProtocols: number;
  readonly uniqueChains: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Port Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IHackDataPort — Abstract persistence interface for hack incident data.
 *
 * Contract:
 * - All operations are async (database I/O)
 * - `findById` returns null if not found (never throws for missing records)
 * - `save` is an upsert — creates if new, updates if existing
 * - `saveBatch` is transactional — all succeed or all fail
 * - Filter operations use the builder pattern via `HackFilters`
 *
 * @hexagonal Port — Domain Layer
 */
export interface IHackDataPort {
  // ── CRUD Operations ─────────────────────────────────────────────────────
  findById(id: string): Promise<HackIncident | null>;
  findAll(filters: HackFilters): Promise<PaginatedResult<HackIncident>>;
  save(incident: CreateHackIncidentInput | HackIncident): Promise<HackIncident>;
  saveBatch(incidents: Array<CreateHackIncidentInput | HackIncident>): Promise<number>;
  update(input: UpdateHackIncidentInput): Promise<HackIncident | null>;
  delete(id: string): Promise<boolean>;

  // ── Query Operations ────────────────────────────────────────────────────
  count(filters?: Partial<HackFilters>): Promise<number>;
  exists(id: string): Promise<boolean>;
  findByProtocol(protocolName: string): Promise<HackIncident[]>;
  findRecent(limit: number): Promise<HackIncident[]>;

  // ── Aggregate Operations ────────────────────────────────────────────────
  getTotalLossUsd(filters?: Partial<HackFilters>): Promise<number>;
  getAttackVectorStats(): Promise<AttackVectorStat[]>;
  getChainStats(): Promise<ChainStat[]>;
  getLossTimeSeries(granularity: 'day' | 'week' | 'month' | 'year'): Promise<LossTimeSeriesPoint[]>;
  getDashboardStats(): Promise<DashboardStats>;
}
