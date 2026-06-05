/**
 * @module hack-normalizer
 * @description Normalizes raw external hack data into validated `HackIncident`
 * domain entities. Sits between raw API responses and the domain layer.
 *
 * Responsibilities:
 * - Field mapping (DefiLlama raw → HackIncident shape)
 * - Type coercion (Unix timestamp → Date, amount → USD)
 * - Enum classification via `classifyAttackVector` and `normalizeChains`
 * - Source URL validation
 * - Deduplication by `protocolName + date` composite key
 * - Zod validation (every output is schema-valid)
 * - Invalid record logging (never silently dropped)
 *
 * @hexagonal Adapter Utility — Infrastructure Layer
 * @task P2-ETL-007
 */

import { v5 as uuidv5 } from 'uuid';
import {
  HackIncidentSchema,
  type HackIncident,
  type LoggerPort,
} from '@aegis/core';

import { normalizeChains } from './chain-normalizer.js';
import { classifyAttackVector } from './attack-vector-classifier.js';

// Stable UUID namespace for DefiLlama deterministic IDs
const DEFILLAMA_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Data Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw hack record shape from the DefiLlama Hacks API.
 * This is the input contract for the normalizer.
 */
export interface RawDefiLlamaHack {
  readonly id: number;
  readonly name: string;
  readonly date: number;
  readonly amount: number;
  readonly chains: string[];
  readonly technique: string;
  readonly bridgeHack: boolean;
  readonly returnedFunds: number | null;
  readonly target: string;
  readonly source?: string;
}

/**
 * Result of batch normalization — includes counts for observability.
 */
export interface NormalizationResult {
  readonly valid: HackIncident[];
  readonly invalidCount: number;
  readonly duplicateCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a URL-safe slug from a protocol name.
 * "Euler Finance" → "euler-finance"
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate a URL string.
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a deduplication key from protocol name + date.
 */
function deduplicationKey(protocolName: string, dateUnix: number): string {
  const dateStr = new Date(dateUnix * 1000).toISOString().slice(0, 10);
  return `${protocolName.toLowerCase().trim()}::${dateStr}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Single Record Normalization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a single raw DefiLlama hack record into a Zod-validated
 * `HackIncident` domain entity.
 *
 * @param raw - Raw DefiLlama hack record
 * @returns Validated `HackIncident`
 * @throws ZodError if the transformed record fails validation
 */
export function normalizeDefiLlamaHack(raw: RawDefiLlamaHack): HackIncident {
  const now = new Date();

  const sources: string[] = [];
  if (raw.source !== undefined && raw.source !== null && raw.source !== '') {
    if (isValidUrl(raw.source)) {
      sources.push(raw.source);
    }
  }

  const transformed = {
    id: uuidv5(raw.id.toString(), DEFILLAMA_NAMESPACE),
    protocolName: raw.name,
    protocolSlug: toSlug(raw.name),
    date: raw.date !== 0 ? new Date(raw.date * 1000) : new Date(0),
    chain: normalizeChains(raw.chains ?? []),
    attackVector: classifyAttackVector(raw.technique ?? '', raw.bridgeHack ?? false),
    secondaryVectors: [],
    lossUsd: Math.max(raw.amount ?? 0, 0),
    fundsReturned: Math.max(raw.returnedFunds ?? 0, 0),
    txHashes: [],
    transactionRefs: [],
    sources,
    description: raw.target ?? '',
    hasFoundryPoc: false,
    targetContracts: [],
    dataSource: 'defillama' as const,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Ensure fundsReturned doesn't exceed lossUsd (Zod refinement would catch
  // this, but we clamp proactively to avoid unnecessary validation failures)
  if (transformed.fundsReturned > transformed.lossUsd) {
    transformed.fundsReturned = transformed.lossUsd;
  }

  return HackIncidentSchema.parse(transformed);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Batch Normalization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a batch of raw DefiLlama hack records with deduplication
 * and invalid-record logging.
 *
 * Deduplication key: `protocolName + date` (same protocol hacked on the
 * same day is considered a duplicate — first record wins).
 *
 * @param rawHacks - Array of raw DefiLlama hack records
 * @param logger - Logger for reporting invalid/duplicate records
 * @returns Normalization result with valid records and counts
 */
export function normalizeDefiLlamaHacks(
  rawHacks: RawDefiLlamaHack[],
  logger: LoggerPort,
): NormalizationResult {
  const valid: HackIncident[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;
  const seen = new Set<string>();

  for (const raw of rawHacks) {
    // Deduplication check
    const key = deduplicationKey(raw.name, raw.date);
    if (seen.has(key)) {
      duplicateCount++;
      logger.debug('Duplicate DefiLlama record skipped', {
        protocolName: raw.name,
        date: raw.date,
        deduplicationKey: key,
      });
      continue;
    }
    seen.add(key);

    // Normalize and validate
    try {
      const incident = normalizeDefiLlamaHack(raw);
      valid.push(incident);
    } catch (error) {
      invalidCount++;
      logger.warn('Invalid DefiLlama record skipped', {
        rawId: raw.id,
        rawName: raw.name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('DefiLlama normalization complete', {
    total: rawHacks.length,
    valid: valid.length,
    invalid: invalidCount,
    duplicates: duplicateCount,
  });

  return { valid, invalidCount, duplicateCount };
}
