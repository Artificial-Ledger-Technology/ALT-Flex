/**
 * @module poc-downloader
 * @description Downloads POC .sol files from DeFiHackLabs via GitHub raw content API.
 *
 * Implements a two-tier acquisition strategy:
 * 1. Check local cache directory first (avoids redundant downloads)
 * 2. Fall back to GitHub raw content API if not cached
 *
 * Cache directory: `os.tmpdir()/aegis-poc-cache/`
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-002
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { PocDownloadError } from './foundry-errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Base URL for raw GitHub content from DeFiHackLabs repository. */
const DEFIHACKLABS_RAW_BASE =
  'https://raw.githubusercontent.com/SunWeb3Sec/DeFiHackLabs/main';

/** Local cache directory for downloaded POC files. */
const CACHE_DIR = path.join(os.tmpdir(), 'aegis-poc-cache');

/** Maximum number of download retry attempts. */
const MAX_RETRIES = 3;

/** Delay between retry attempts in milliseconds. */
const RETRY_DELAY_MS = 1000;

/** Maximum allowed POC file size (5MB). */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════════════════
// PocDownloader
// ═══════════════════════════════════════════════════════════════════════════════

export class PocDownloader {
  private readonly cacheDir: string;
  private readonly baseUrl: string;

  constructor(options?: {
    cacheDir?: string;
    baseUrl?: string;
  }) {
    this.cacheDir = options?.cacheDir ?? CACHE_DIR;
    this.baseUrl = options?.baseUrl ?? DEFIHACKLABS_RAW_BASE;
  }

  /**
   * Acquire a POC file — checks cache first, then downloads from GitHub.
   *
   * @param filePath - Relative path within the DeFiHackLabs repo
   *                   (e.g., "src/test/2023-03/Euler_exp.t.sol")
   * @returns The Solidity source code of the POC file
   * @throws {PocDownloadError} if download fails after retries
   */
  async acquire(filePath: string): Promise<string> {
    // 1. Check local cache
    const cached = await this.getFromCache(filePath);
    if (cached !== null) {
      return cached;
    }

    // 2. Download from GitHub
    const content = await this.downloadFromGitHub(filePath);

    // 3. Save to cache for future use
    await this.saveToCache(filePath, content);

    return content;
  }

  /**
   * Download a POC file from the DeFiHackLabs GitHub repository.
   *
   * @param filePath - Relative file path in the DeFiHackLabs repo
   * @returns Raw Solidity source code
   * @throws {PocDownloadError} if all retry attempts fail
   */
  async downloadFromGitHub(filePath: string): Promise<string> {
    const url = `${this.baseUrl}/${filePath}`;

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          // Don't retry on 404 — file genuinely doesn't exist
          if (response.status === 404) {
            throw new PocDownloadError(filePath, response.status);
          }

          // Retry on rate limit (429) and server errors (5xx)
          if (response.status === 429 || response.status >= 500) {
            lastError = new PocDownloadError(filePath, response.status);
            await this.delay(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }

          throw new PocDownloadError(filePath, response.status);
        }

        const content = await response.text();

        // Validate content size
        if (content.length > MAX_FILE_SIZE_BYTES) {
          throw new PocDownloadError(
            filePath,
            undefined,
            new Error(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES} bytes`),
          );
        }

        // Basic validation: should look like Solidity
        if (!content.includes('pragma solidity') && !content.includes('// SPDX-License-Identifier')) {
          throw new PocDownloadError(
            filePath,
            undefined,
            new Error('Downloaded content does not appear to be a Solidity file'),
          );
        }

        return content;
      } catch (err) {
        if (err instanceof PocDownloadError) {
          throw err;
        }
        lastError = err;
        if (attempt < MAX_RETRIES - 1) {
          await this.delay(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    throw new PocDownloadError(filePath, undefined, lastError);
  }

  /**
   * Check the local cache for a previously downloaded POC file.
   *
   * @param filePath - Relative file path (used as cache key)
   * @returns File content if cached, null otherwise
   */
  async getFromCache(filePath: string): Promise<string | null> {
    const cachePath = this.getCachePath(filePath);
    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Save a downloaded POC file to the local cache.
   *
   * @param filePath - Relative file path (used as cache key)
   * @param content - Solidity source code to cache
   */
  async saveToCache(filePath: string, content: string): Promise<void> {
    const cachePath = this.getCachePath(filePath);
    const cacheDir = path.dirname(cachePath);

    try {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(cachePath, content, 'utf-8');
    } catch {
      // Cache write failures are non-fatal — log but don't throw
    }
  }

  /**
   * Clear all cached POC files.
   */
  async clearCache(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
    } catch {
      // Cache clear failures are non-fatal
    }
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Compute the local cache file path for a given POC file path.
   * Preserves the directory structure from the repo.
   */
  private getCachePath(filePath: string): string {
    // Normalize path separators for cross-platform compatibility
    const normalized = filePath.replace(/\\/g, '/');
    return path.join(this.cacheDir, normalized);
  }

  /** Async delay helper. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
