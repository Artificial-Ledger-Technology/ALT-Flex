/**
 * @module IHackSourcePort
 * @description Abstract interface for external hack data sources (ETL ingestion).
 *
 * This is a Hexagonal Architecture "Driven Port". The application layer
 * (use cases) depends on this interface; concrete implementations
 * (DefiLlama API, DeFiHackLabs GitHub, Rekt News) are "Adapters" that
 * live outside the domain.
 *
 * Implementations:
 * - `DefiLlamaAdapter` (packages/hacks-engine/src/adapters/defillama-adapter.ts)
 * - `DeFiHackLabsAdapter` (Phase 2 — P2-ETL-002)
 *
 * @hexagonal Port — Domain Layer
 * @task P2-ETL-001
 */

import type { HackIncident } from '../entities/HackIncident.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Port Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IHackSourcePort — Abstract interface for fetching hack incident data
 * from external APIs or repositories.
 *
 * Contract:
 * - `fetchAllHacks()` returns validated `HackIncident[]` ready for upsert
 * - Invalid records are logged and skipped (partial failure tolerance)
 * - Network/rate-limit errors are retried internally by the adapter
 * - The caller receives only successfully validated records
 *
 * @hexagonal Port — Domain Layer (Driven / Secondary)
 */
export interface IHackSourcePort {
  /** Unique identifier for this data source (e.g., 'defillama', 'defihacklabs') */
  readonly sourceName: string;

  /**
   * Fetch all hack incidents from this external source.
   *
   * The adapter is responsible for:
   * 1. Fetching raw data from the external API
   * 2. Transforming raw fields into `HackIncident` domain entities
   * 3. Validating each record with Zod schema
   * 4. Logging and skipping invalid records
   * 5. Handling retry logic and rate limiting
   *
   * @returns Array of validated `HackIncident` entities ready for database upsert
   * @throws ExternalServiceError if all retries are exhausted
   */
  fetchAllHacks(): Promise<HackIncident[]>;
}
