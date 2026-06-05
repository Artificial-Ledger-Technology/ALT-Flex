/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * @module sync-hacks.use-case
 * @description Application-layer orchestrator for the full hacks ETL pipeline.
 *
 * Coordinates the end-to-end sync flow:
 *   1. Fetch raw hack data from DefiLlama
 *   2. Normalize via HackNormalizer (batch normalization + dedup)
 *   3. Upsert normalized records to PostgreSQL
 *   4. Fetch POC mappings from DeFiHackLabs
 *   5. Cross-reference POCs with stored incidents
 *   6. Invalidate Redis cache
 *   7. Return summary statistics
 *
 * Design:
 * - All dependencies are constructor-injected port interfaces
 * - Progress reporting via optional callback (BullMQ-agnostic)
 * - Partial failure tolerance — individual record errors don't abort the pipeline
 * - DeFiHackLabs and cache failures are non-fatal (logged, not thrown)
 *
 * @hexagonal Application Layer — Engine α
 * @task P2-ETL-008
 */

import type {
  IHackSourcePort,
  IHackDataPort,
  ICachePort,
  LoggerPort,
  HackIncident,
} from '@aegis/core';

import type { DeFiHackLabsAdapter } from '../adapters/defihacklabs-adapter.js';
import type { NormalizationResult, RawDefiLlamaHack } from '../adapters/hack-normalizer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Summary statistics returned by the sync operation.
 * Logged to `etl_sync_log` by the BullMQ processor.
 */
export interface SyncResult {
  /** Number of new records inserted */
  readonly recordsAdded: number;
  /** Number of existing records updated */
  readonly recordsUpdated: number;
  /** Number of records that failed normalization or upsert */
  readonly recordsFailed: number;
  /** Number of incidents linked to DeFiHackLabs POCs */
  readonly pocLinked: number;
  /** Number of Redis cache keys invalidated */
  readonly cacheKeysInvalidated: number;
  /** Total duration in milliseconds */
  readonly durationMs: number;
  /** Data source identifier */
  readonly source: string;
}

/**
 * Optional configuration for the sync operation.
 */
export interface SyncHacksOptions {
  /** Progress callback for BullMQ integration (or any external observer). */
  readonly onProgress?: (percent: number, stage: string) => Promise<void>;
}

/**
 * Abstraction for the HackNormalizer so we can inject it and mock it in tests.
 * The real implementation lives in `hack-normalizer.ts`.
 */
export interface HackNormalizerPort {
  normalizeDefiLlamaHacks(rawHacks: RawDefiLlamaHack[], logger: LoggerPort): NormalizationResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Use Case
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SyncHacksUseCase — Orchestrates the full hacks ETL pipeline.
 *
 * @example
 * ```typescript
 * const useCase = new SyncHacksUseCase(
 *   defiLlamaAdapter,
 *   defiHackLabsAdapter,
 *   postgresHackRepo,
 *   { normalizeDefiLlamaHacks },
 *   redisCacheAdapter,
 *   logger,
 * );
 *
 * const result = await useCase.execute({
 *   onProgress: async (pct, stage) => job.updateProgress({ percent: pct, stage }),
 * });
 * ```
 */
export class SyncHacksUseCase {
  private readonly logger: LoggerPort;

  constructor(
    private readonly defiLlamaSource: IHackSourcePort,
    private readonly defiHackLabsSource: DeFiHackLabsAdapter,
    private readonly hackRepo: IHackDataPort,
    private readonly normalizer: HackNormalizerPort,
    private readonly cache: ICachePort,
    logger: LoggerPort,
  ) {
    this.logger = logger.child({ useCase: 'SyncHacksUseCase' });
  }

  /**
   * Execute the full hacks ETL pipeline.
   *
   * Flow:
   *   0%  → Start
   *   25% → Fetched raw hacks from DefiLlama
   *   50% → Normalized hacks
   *   75% → Upserted to database
   *   90% → Cross-referenced with DeFiHackLabs POCs
   *   95% → Cache invalidated
   *   100% → Complete
   */
  async execute(options: SyncHacksOptions = {}): Promise<SyncResult> {
    const startMs = Date.now();
    const { onProgress } = options;

    this.logger.info('SyncHacksUseCase started');

    let recordsAdded = 0;
    const recordsUpdated = 0;
    let recordsFailed = 0;
    let pocLinked = 0;
    let cacheKeysInvalidated = 0;

    // ── Stage 1: Fetch raw hacks from DefiLlama (0% → 25%) ──────────────
    await this.reportProgress(onProgress, 0, 'fetching');

    const rawHacks = await this.defiLlamaSource.fetchAllHacks();

    this.logger.info('Raw hacks fetched from DefiLlama', {
      count: rawHacks.length,
    });

    await this.reportProgress(onProgress, 25, 'normalizing');

    // ── Stage 2: Normalize (25% → 50%) ──────────────────────────────────
    // The adapter already returns HackIncident[], but we run them through
    // the normalizer's deduplication and validation pass for safety.
    // Cast the already-validated incidents as raw records for re-normalization.
    const normalizationInput = rawHacks as unknown as RawDefiLlamaHack[];
    let normalizedIncidents: HackIncident[];

    if (normalizationInput.length > 0 && this.looksLikeRawRecords(normalizationInput)) {
      const normResult: NormalizationResult = this.normalizer.normalizeDefiLlamaHacks(
        normalizationInput,
        this.logger,
      );
      normalizedIncidents = normResult.valid;
      recordsFailed += normResult.invalidCount;
    } else {
      // Already normalized by the adapter — use directly
      normalizedIncidents = rawHacks;
    }

    this.logger.info('Normalization complete', {
      valid: normalizedIncidents.length,
      failed: recordsFailed,
    });

    await this.reportProgress(onProgress, 50, 'upserting');

    // ── Stage 3: Upsert to database (50% → 75%) ────────────────────────
    if (normalizedIncidents.length > 0) {
      try {
        const upsertedCount = await this.hackRepo.saveBatch(normalizedIncidents);
        // saveBatch returns the total count of affected rows.
        // We approximate: if fewer than total were affected, some were updates.
        recordsAdded = upsertedCount;
        // In the absence of a more granular return from saveBatch,
        // we treat the total as "added". The BullMQ processor uses
        // recordsAdded + recordsUpdated for the sync log.
      } catch (error) {
        recordsFailed += normalizedIncidents.length;
        this.logger.error('Database upsert failed', {
          error: error instanceof Error ? error.message : String(error),
          recordCount: normalizedIncidents.length,
        });
        // Re-throw — a full database failure is fatal for the pipeline
        throw error;
      }
    }

    this.logger.info('Database upsert complete', {
      recordsAdded,
    });

    await this.reportProgress(onProgress, 75, 'cross-referencing');

    // ── Stage 4: Cross-reference with DeFiHackLabs POCs (75% → 90%) ────
    try {
      const pocEntries = await this.defiHackLabsSource.fetchPocMappings();

      if (pocEntries.length > 0) {
        pocLinked = await this.crossReferencePocs(pocEntries, normalizedIncidents);
      }

      this.logger.info('POC cross-referencing complete', {
        pocEntries: pocEntries.length,
        linked: pocLinked,
      });
    } catch (error) {
      // DeFiHackLabs failure is non-fatal — log and continue
      this.logger.warn('DeFiHackLabs cross-referencing failed (non-fatal)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await this.reportProgress(onProgress, 90, 'cache-invalidation');

    // ── Stage 5: Invalidate Redis cache (90% → 95%) ────────────────────
    try {
      cacheKeysInvalidated = await this.cache.deleteByPattern('hacks:*');
      this.logger.info('Cache invalidated', {
        keysDeleted: cacheKeysInvalidated,
      });
    } catch (error) {
      // Cache invalidation failure is non-fatal
      this.logger.warn('Cache invalidation failed (non-fatal)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await this.reportProgress(onProgress, 95, 'completing');

    // ── Stage 6: Build result (95% → 100%) ─────────────────────────────
    const durationMs = Date.now() - startMs;

    const result: SyncResult = {
      recordsAdded,
      recordsUpdated,
      recordsFailed,
      pocLinked,
      cacheKeysInvalidated,
      durationMs,
      source: 'defillama+defihacklabs',
    };

    this.logger.info('SyncHacksUseCase completed', { result });

    await this.reportProgress(onProgress, 100, 'complete');

    return result;
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Cross-reference DeFiHackLabs POC entries with stored incidents.
   *
   * Matching strategy: protocol name similarity + date proximity.
   * When a match is found, update `hasFoundryPoc` and `foundryTestPath`.
   */
  private async crossReferencePocs(
    pocEntries: Array<{
      protocolName: string;
      date: Date;
      testFilePath: string;
    }>,
    incidents: HackIncident[],
  ): Promise<number> {
    let linkedCount = 0;

    for (const poc of pocEntries) {
      // Find matching incident by protocol name (case-insensitive) + date (same day)
      const pocDateStr = poc.date.toISOString().slice(0, 10);
      const pocNameLower = poc.protocolName.toLowerCase().trim();

      const match = incidents.find((incident) => {
        const incidentDateStr = incident.date.toISOString().slice(0, 10);
        const incidentNameLower = incident.protocolName.toLowerCase().trim();

        return (
          (incidentNameLower.includes(pocNameLower) || pocNameLower.includes(incidentNameLower)) &&
          incidentDateStr === pocDateStr
        );
      });

      if (match && !match.hasFoundryPoc) {
        try {
          await this.hackRepo.update({
            id: match.id,
            hasFoundryPoc: true,
            foundryTestPath: poc.testFilePath,
          });
          linkedCount++;
        } catch (error) {
          // Individual POC link failure is non-fatal
          this.logger.warn('Failed to link POC to incident', {
            pocProtocol: poc.protocolName,
            incidentId: match.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return linkedCount;
  }

  /**
   * Report progress via the optional callback.
   * Swallows errors to prevent progress reporting from breaking the pipeline.
   */
  private async reportProgress(
    onProgress: SyncHacksOptions['onProgress'],
    percent: number,
    stage: string,
  ): Promise<void> {
    if (onProgress === undefined) return;

    try {
      await onProgress(percent, stage);
    } catch (error) {
      this.logger.debug('Progress reporting failed (non-fatal)', {
        percent,
        stage,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Heuristic check: does the array look like raw DefiLlama records
   * (has numeric `id` and `amount` fields) vs. already-normalized HackIncidents?
   */
  private looksLikeRawRecords(records: unknown[]): boolean {
    if (records.length === 0) return false;
    const first = records[0] as Record<string, unknown>;
    return typeof first['amount'] === 'number' && typeof first['technique'] === 'string';
  }
}
