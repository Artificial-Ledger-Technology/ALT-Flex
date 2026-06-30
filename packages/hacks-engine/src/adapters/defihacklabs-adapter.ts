/**
 * @module defihacklabs-adapter
 * @description Hexagonal driven adapter that fetches exploit POC data
 * from the SunWeb3Sec/DeFiHackLabs GitHub repository.
 *
 * Features:
 * - Implements `IHackSourcePort` interface
 * - Fetches `README.md` via GitHub Contents API
 * - Parses markdown tables to extract exploit-to-POC mappings
 * - Transforms parsed entries into partial `HackIncident` entities
 * - Exposes `fetchPocMappings()` for cross-referencing in use cases
 * - Handles GitHub API rate limiting and incremental sync (304 Not Modified)
 *
 * @hexagonal Adapter — Infrastructure Layer (Driven / Secondary)
 * @task P2-ETL-002
 */

import { v5 as uuidv5 } from 'uuid';
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import {
  HackIncidentSchema,
  Chain,
  type HackIncident,
  type IHackSourcePort,
  type LoggerPort,
} from '@aegis/core';

import {
  DEFAULT_DEFIHACKLABS_CONFIG,
  type DeFiHackLabsAdapterConfig,
} from './defihacklabs-adapter.config.js';
import { parseReadmeTables, type DeFiHackLabsPocEntry } from './readme-parser.js';
import { classifyAttackVector } from './attack-vector-classifier.js';

// Stable namespace for DeFiHackLabs UUIDs
const DEFIHACKLABS_NAMESPACE = '7c2e391b-1f7c-482f-8d9e-10b284e36ab4';

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Slug Generator
// ═══════════════════════════════════════════════════════════════════════════════

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeFiHackLabs Adapter
// ═══════════════════════════════════════════════════════════════════════════════

export class DeFiHackLabsAdapter implements IHackSourcePort {
  readonly sourceName = 'defihacklabs' as const;

  private readonly config: DeFiHackLabsAdapterConfig;
  private readonly logger: LoggerPort;
  private readonly httpClient: AxiosInstance;
  
  private lastSyncedAt: Date | null = null;
  private etag: string | null = null;

  constructor(logger: LoggerPort, config?: Partial<DeFiHackLabsAdapterConfig>) {
    this.config = { ...DEFAULT_DEFIHACKLABS_CONFIG, ...config };
    this.logger = logger.child({ adapter: 'defihacklabs' });
    
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AEGIS/3.0 DeFiHackLabsAdapter',
    };
    
    if (this.config.githubToken !== undefined && this.config.githubToken !== '') {
      headers['Authorization'] = `token ${this.config.githubToken}`;
    }

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.requestTimeoutMs,
      headers,
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Fetch all hack incidents from the DeFiHackLabs README.
   *
   * Flow:
   * 1. HTTP GET → README content via GitHub API
   * 2. Decode base64 content
   * 3. Parse markdown tables → DeFiHackLabsPocEntry[]
   * 4. Transform to HackIncident[]
   * 5. Validate and return
   */
  async fetchAllHacks(): Promise<HackIncident[]> {
    this.logger.info('Starting DeFiHackLabs hacks fetch');

    const pocEntries = await this.fetchPocMappings();
    
    const validIncidents: HackIncident[] = [];
    let invalidCount = 0;

    for (const entry of pocEntries) {
      try {
        const transformed = this.transformRecord(entry);
        const validated = HackIncidentSchema.parse(transformed);
        validIncidents.push(validated);
      } catch (error) {
        invalidCount++;
        this.logger.warn('Skipping invalid DeFiHackLabs record', {
          protocol: entry.protocolName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('DeFiHackLabs hacks fetch complete', {
      total: pocEntries.length,
      valid: validIncidents.length,
      invalid: invalidCount,
    });

    return validIncidents;
  }

  /**
   * Fetch and parse the README directly into POC mappings.
   * Used by the sync orchestrator to cross-reference with DefiLlama data.
   */
  async fetchPocMappings(): Promise<DeFiHackLabsPocEntry[]> {
    const url = `/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.readmePath}`;
    
    try {
      const response = await this.fetchWithRetry(url);
      
      if (!response) {
        // 304 Not Modified
        this.logger.info('DeFiHackLabs README not modified since last sync');
        return [];
      }

      const base64Content = response.content;
      if (base64Content === undefined || base64Content === '') {
        this.logger.warn('Empty content received from GitHub');
        return [];
      }

      // Decode base64 content (GitHub API returns base64 string with newlines)
      const readmeContent = Buffer.from(base64Content, 'base64').toString('utf-8');
      
      const entries = parseReadmeTables(readmeContent);
      this.lastSyncedAt = new Date();
      
      return entries;
    } catch (error) {
      this.logger.error('Failed to fetch POC mappings', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Returns the timestamp of the last successful sync.
   */
  getLastSyncedAt(): Date | null {
    return this.lastSyncedAt;
  }

  // ── Private: HTTP Fetch with Retry ──────────────────────────────────────────

  /**
   * Fetch from GitHub API with retry and rate-limit handling.
   * Returns null if 304 Not Modified.
   */
  private async fetchWithRetry(url: string): Promise<{ content: string } | null> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {};
        if (this.etag !== null && this.etag !== '') {
          headers['If-None-Match'] = this.etag;
        }

        const response = await this.httpClient.get(url, { headers });
        
        const responseHeaders = response.headers as Record<string, unknown>;
        if (typeof responseHeaders['etag'] === 'string' && responseHeaders['etag'] !== '') {
          this.etag = responseHeaders['etag'];
        }

        this.checkRateLimit(responseHeaders);

        return response.data as { content: string };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!axios.isAxiosError(error)) {
          if (attempt >= this.config.maxRetries) break;
          await delay(this.calculateBackoff(error, attempt));
          continue;
        }

        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        // 304 Not Modified - Return null to indicate no changes
        if (status === 304) {
          return null;
        }

        if (!this.shouldRetry(axiosError, attempt)) {
          break;
        }

        const delayMs = this.calculateBackoff(axiosError, attempt);
        this.logger.warn('GitHub API request failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          delayMs,
          status,
          error: lastError.message,
        });

        await delay(delayMs);
      }
    }

    const errorMessage = `GitHub API request failed after ${this.config.maxRetries + 1} attempts`;
    this.logger.error(errorMessage, {
      lastError: lastError?.message,
    });
    throw lastError ?? new Error(errorMessage);
  }

  private shouldRetry(error: AxiosError, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }

    if (error.response === undefined) {
      return true; // Network error
    }

    const status = error.response.status;

    // 403 Forbidden (Rate Limit Exceeded or Secondary Rate Limit)
    if (status === 403) {
      return true;
    }

    // 5xx Server Errors
    if (status >= 500) {
      return true;
    }

    return false;
  }

  private calculateBackoff(error: unknown, attempt: number): number {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      // Check for GitHub rate limit reset header
      const headers = error.response.headers as Record<string, unknown>;
      
      let resetHeader: unknown = undefined;
      if (typeof headers['get'] === 'function') {
        resetHeader = (headers as { get: (name: string) => unknown }).get('x-ratelimit-reset');
      } else {
        resetHeader = headers['x-ratelimit-reset'];
      }
      
      if (resetHeader !== undefined && resetHeader !== null) {
        const resetTimeMs = parseInt(String(resetHeader), 10) * 1000;
        const now = Date.now();
        if (resetTimeMs > now) {
          // Add 1 second buffer
          const waitTime = resetTimeMs - now + 1000;
          if (waitTime > this.config.retryMaxDelayMs) {
            throw new Error(`GitHub Rate Limit Exceeded. Reset time (${Math.ceil(waitTime / 1000)}s) exceeds max retry delay.`);
          }
          return Math.min(waitTime, this.config.retryMaxDelayMs);
        }
      }
      
      // Check for retry-after header (Secondary Rate Limit)
      let retryAfter: unknown = undefined;
      if (typeof headers['get'] === 'function') {
        retryAfter = (headers as { get: (name: string) => unknown }).get('retry-after');
      } else {
        retryAfter = headers['retry-after'];
      }
      
      if (retryAfter !== undefined && retryAfter !== null) {
        const retryAfterMs = parseInt(String(retryAfter), 10) * 1000;
        if (retryAfterMs > this.config.retryMaxDelayMs) {
          throw new Error(`GitHub Secondary Rate Limit. Retry-after (${String(retryAfter)}s) exceeds max retry delay.`);
        }
        return Math.min(retryAfterMs, this.config.retryMaxDelayMs);
      }
    }

    const exponentialDelay = this.config.retryBaseDelayMs * Math.pow(2, attempt);
    return Math.min(exponentialDelay, this.config.retryMaxDelayMs);
  }

  private checkRateLimit(headers: Record<string, unknown>): void {
    const getHeader = (name: string): unknown => {
      if (typeof headers['get'] === 'function') {
        return (headers as { get: (name: string) => unknown }).get(name);
      }
      return headers[name];
    };

    const remainingStr = getHeader('x-ratelimit-remaining');
    if (remainingStr !== undefined && remainingStr !== null) {
      const remaining = parseInt(String(remainingStr), 10);
      if (!isNaN(remaining) && remaining <= this.config.rateLimitThreshold) {
        this.logger.warn('GitHub API rate limit running low', {
          remaining,
          threshold: this.config.rateLimitThreshold,
        });
      }
    }
  }

  // ── Private: Record Transformation ──────────────────────────────────────────

  private transformRecord(entry: DeFiHackLabsPocEntry): Record<string, unknown> {
    const now = new Date();
    
    // Generate deterministic UUID based on protocol + date
    const uniqueString = `${entry.protocolName}-${entry.date.toISOString()}`;
    const id = uuidv5(uniqueString, DEFIHACKLABS_NAMESPACE);

    return {
      id,
      protocolName: entry.protocolName,
      protocolSlug: toSlug(entry.protocolName),
      date: entry.date,
      // Default to UNKNOWN as README doesn't reliably provide chain info
      chain: Chain.UNKNOWN,
      attackVector: classifyAttackVector(entry.vulnerabilityType ?? ''),
      secondaryVectors: [],
      lossUsd: entry.lossUsd,
      fundsReturned: 0,
      txHashes: [],
      transactionRefs: [],
      sources: [],
      description: '',
      hasFoundryPoc: true,
      foundryTestPath: entry.testFilePath,
      targetContracts: [],
      dataSource: this.sourceName,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }
}
