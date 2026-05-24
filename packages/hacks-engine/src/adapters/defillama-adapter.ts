/**
 * @module defillama-adapter
 * @description Hexagonal driven adapter that fetches hack incident data
 * from the DefiLlama Hacks API and transforms it into domain entities.
 *
 * Features:
 * - Implements `IHackSourcePort` interface
 * - Fetches all hacks from `GET https://api.llama.fi/hacks`
 * - Maps raw DefiLlama fields to `HackIncident` entity schema
 * - Handles HTTP 429 rate limiting with exponential backoff
 * - Retries network errors (configurable, default 3 attempts)
 * - Validates each record with `HackIncidentSchema` (Zod)
 * - Logs invalid records instead of throwing (partial failure tolerance)
 *
 * @hexagonal Adapter — Infrastructure Layer (Driven / Secondary)
 * @task P2-ETL-001
 */

import { v5 as uuidv5 } from 'uuid';
import axios, { type AxiosInstance, type AxiosError, type AxiosHeaders } from 'axios';
import {
  HackIncidentSchema,
  type HackIncident,
  type IHackSourcePort,
  type LoggerPort,
} from '@aegis/core';

import {
  DEFAULT_DEFILLAMA_CONFIG,
  type DefiLlamaAdapterConfig,
} from './defillama-adapter.config.js';
import { normalizeChains } from './chain-normalizer.js';
import { classifyAttackVector } from './attack-vector-classifier.js';

// Define a stable namespace for DefiLlama (e.g. using a random but fixed UUID)
const DEFILLAMA_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw API Response Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw hack record shape from the DefiLlama Hacks API.
 *
 * @see https://api.llama.fi/hacks
 */
export interface DefiLlamaHack {
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

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Slug Generator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a URL-safe slug from a protocol name.
 * "Euler Finance" → "euler-finance"
 */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Delay
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Async delay utility for backoff logic.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DefiLlama Adapter
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DefiLlamaAdapter — Fetches and transforms hack data from the DefiLlama API.
 *
 * Implements the `IHackSourcePort` driven port interface.
 * All dependencies are constructor-injected for testability.
 *
 * @example
 * ```typescript
 * const adapter = new DefiLlamaAdapter(logger);
 * const hacks = await adapter.fetchAllHacks();
 * // hacks: HackIncident[] — validated, ready for DB upsert
 * ```
 */
export class DefiLlamaAdapter implements IHackSourcePort {
  readonly sourceName = 'defillama' as const;

  private readonly config: DefiLlamaAdapterConfig;
  private readonly logger: LoggerPort;
  private readonly httpClient: AxiosInstance;

  constructor(logger: LoggerPort, config?: Partial<DefiLlamaAdapterConfig>) {
    this.config = { ...DEFAULT_DEFILLAMA_CONFIG, ...config };
    this.logger = logger.child({ adapter: 'defillama' });
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.requestTimeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AEGIS/3.0 DefiLlamaAdapter',
      },
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Fetch all hack incidents from the DefiLlama API.
   *
   * Flow:
   * 1. HTTP GET → raw JSON array
   * 2. Transform each record → HackIncident shape
   * 3. Validate with HackIncidentSchema (Zod)
   * 4. Log and skip invalid records
   * 5. Return validated HackIncident[]
   *
   * @throws ExternalServiceError if all retries are exhausted
   */
  async fetchAllHacks(): Promise<HackIncident[]> {
    this.logger.info('Starting DefiLlama hacks fetch', {
      url: `${this.config.baseUrl}${this.config.hacksEndpoint}`,
    });

    const rawHacks = await this.fetchWithRetry();

    this.logger.info('Raw hacks fetched from DefiLlama', {
      count: rawHacks.length,
    });

    const validIncidents: HackIncident[] = [];
    let invalidCount = 0;

    for (const raw of rawHacks) {
      try {
        const transformed = this.transformRecord(raw);
        const validated = HackIncidentSchema.parse(transformed);
        validIncidents.push(validated);
      } catch (error) {
        invalidCount++;
        this.logger.warn('Skipping invalid DefiLlama record', {
          rawId: raw.id,
          rawName: raw.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('DefiLlama hacks fetch complete', {
      total: rawHacks.length,
      valid: validIncidents.length,
      invalid: invalidCount,
    });

    return validIncidents;
  }

  // ── Private: HTTP Fetch with Retry ──────────────────────────────────────────

  /**
   * Fetch raw hacks from the API with retry and rate-limit handling.
   *
   * Retry strategy:
   * - HTTP 429 (rate limited) → exponential backoff, uses Retry-After header if present
   * - Network errors (ECONNREFUSED, ETIMEDOUT, etc.) → exponential backoff
   * - HTTP 4xx (except 429) → no retry (client error)
   * - HTTP 5xx → retry with backoff
   */
  private async fetchWithRetry(): Promise<DefiLlamaHack[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.httpClient.get<DefiLlamaHack[]>(this.config.hacksEndpoint);

        // DefiLlama returns the array directly (not wrapped in { data: [...] })
        const data = Array.isArray(response.data) ? response.data : [];
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.shouldRetry(error, attempt)) {
          break;
        }

        const delayMs = this.calculateBackoff(error, attempt);
        this.logger.warn('DefiLlama request failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          delayMs,
          error: lastError.message,
        });

        await delay(delayMs);
      }
    }

    // All retries exhausted
    const errorMessage = `DefiLlama API request failed after ${this.config.maxRetries + 1} attempts`;
    this.logger.error(errorMessage, {
      lastError: lastError?.message,
    });
    throw lastError ?? new Error(errorMessage);
  }

  /**
   * Determine whether to retry a failed request.
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }

    if (!axios.isAxiosError(error)) {
      // Non-Axios errors (e.g., network issues) → retry
      return true;
    }

    const axiosError = error as AxiosError;

    // No response → network error → retry
    if (!axiosError.response) {
      return true;
    }

    const status = axiosError.response.status;

    // 429 → rate limited → retry
    if (status === 429) {
      return true;
    }

    // 5xx → server error → retry
    if (status >= 500) {
      return true;
    }

    // 4xx (except 429) → client error → don't retry
    return false;
  }

  /**
   * Calculate exponential backoff delay.
   * Respects Retry-After header for 429 responses.
   */
  private calculateBackoff(error: unknown, attempt: number): number {
    // Check for Retry-After header on 429 responses
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const retryAfter = (axiosError.response?.headers as AxiosHeaders)?.get?.('retry-after') ?? axiosError.response?.headers?.['retry-after'];
      if (retryAfter !== undefined && retryAfter !== null) {
        const retryAfterMs = parseInt(String(retryAfter), 10) * 1000;
        if (!isNaN(retryAfterMs) && retryAfterMs > 0) {
          return Math.min(retryAfterMs, this.config.retryMaxDelayMs);
        }
      }
    }

    // Exponential backoff: base * 2^attempt
    const exponentialDelay = this.config.retryBaseDelayMs * Math.pow(2, attempt);
    return Math.min(exponentialDelay, this.config.retryMaxDelayMs);
  }

  // ── Private: Record Transformation ──────────────────────────────────────────

  /**
   * Transform a raw DefiLlama hack record into the HackIncident entity shape.
   *
   * Field mapping:
   * - name → protocolName
   * - date (Unix timestamp) → date (Date object)
   * - amount → lossUsd (raw USD — DefiLlama returns actual USD values)
   * - chains[] → chain (normalized via chain-normalizer)
   * - technique → attackVector (classified via attack-vector-classifier)
   * - bridgeHack → attackVector override if true
   * - returnedFunds → fundsReturned
   * - source → sources[]
   */
  private transformRecord(raw: DefiLlamaHack): Record<string, unknown> {
    const now = new Date();

    return {
      id: uuidv5(raw.id.toString(), DEFILLAMA_NAMESPACE),
      protocolName: raw.name,
      protocolSlug: toSlug(raw.name),
      date: raw.date ? new Date(raw.date * 1000) : new Date(0),
      chain: normalizeChains(raw.chains ?? []),
      attackVector: classifyAttackVector(raw.technique ?? '', raw.bridgeHack ?? false),
      secondaryVectors: [],
      lossUsd: raw.amount ?? 0,
      fundsReturned: raw.returnedFunds ?? 0,
      txHashes: [],
      transactionRefs: [],
      sources:
        raw.source !== undefined && raw.source !== null && raw.source !== ''
          ? [raw.source].filter((s) => this.isValidUrl(s))
          : [],
      description: raw.target ?? '',
      hasFoundryPoc: false,
      targetContracts: [],
      dataSource: 'defillama',
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Basic URL validation for source links.
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
