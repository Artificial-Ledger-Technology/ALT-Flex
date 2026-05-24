/**
 * @module github-skills-adapter
 * @description Hexagonal driven adapter that scrapes curated GitHub repositories
 * for AI audit skill files and transforms them into domain entities.
 *
 * Features:
 * - Implements `ISkillSourcePort` interface
 * - Discovers skill files via GitHub Git Trees API (recursive, single call)
 * - Downloads file content via GitHub Contents API
 * - Parses YAML frontmatter using `gray-matter`
 * - Generates SHA-256 content hash for deduplication
 * - Detects platform from file path, frontmatter, or content heuristics
 * - Detects language from frontmatter or content analysis
 * - Handles GitHub API rate limiting with exponential backoff
 * - Retries network errors (configurable, default 3 attempts)
 * - Validates each record with `AISkillFileSchema` (Zod)
 * - Logs invalid records instead of throwing (partial failure tolerance)
 * - New skills indexed with `safetyLabel: 'unanalyzed'`
 *
 * @hexagonal Adapter — Infrastructure Layer (Driven / Secondary)
 * @task P2-ETL-003
 */

import { createHash } from 'node:crypto';
import { v5 as uuidv5 } from 'uuid';
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import {
  AISkillFileSchema,
  SafetyLabel,
  type AISkillFile,
  type ISkillSourcePort,
  type LoggerPort,
  type SkillFileFormat,
} from '@aegis/core';

import {
  DEFAULT_GITHUB_SKILLS_CONFIG,
  type GitHubSkillsAdapterConfig,
  type SkillSource,
} from './github-skills-adapter.config.js';
import { detectPlatform } from './platform-detector.js';
import { detectLanguage } from './language-detector.js';
import { parseFrontmatter, deriveNameFromPath } from './frontmatter-parser.js';

// Stable namespace for GitHub Skills UUIDs (deterministic)
const GITHUB_SKILLS_NAMESPACE = 'a3f8c1d2-7e4b-5f6a-9b0c-2d1e3f4a5b6c';

// ═══════════════════════════════════════════════════════════════════════════════
// GitHub API Response Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Single tree entry from the Git Trees API response */
interface GitTreeEntry {
  readonly path: string;
  readonly mode: string;
  readonly type: 'blob' | 'tree';
  readonly sha: string;
  readonly size?: number;
  readonly url: string;
}

/** Full Git Trees API response */
interface GitTreeResponse {
  readonly sha: string;
  readonly url: string;
  readonly tree: readonly GitTreeEntry[];
  readonly truncated: boolean;
}

/** GitHub Contents API response for a single file */
interface GitHubFileContent {
  readonly name: string;
  readonly path: string;
  readonly sha: string;
  readonly size: number;
  readonly content: string;
  readonly encoding: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Determine file format from extension.
 */
function detectFileFormat(filePath: string): SkillFileFormat {
  const ext = filePath.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'json':
      return 'json';
    case 'toml':
      return 'toml';
    default:
      return 'text';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GitHub Skills Adapter
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GitHubSkillsAdapter — Fetches and indexes AI audit skill files
 * from curated GitHub repositories.
 *
 * Implements the `ISkillSourcePort` driven port interface.
 * All dependencies are constructor-injected for testability.
 *
 * @example
 * ```typescript
 * const adapter = new GitHubSkillsAdapter(logger);
 * const skills = await adapter.fetchAllSkills();
 * // skills: AISkillFile[] — validated, ready for DB upsert
 * ```
 */
export class GitHubSkillsAdapter implements ISkillSourcePort {
  readonly sourceName = 'github-skills' as const;

  private readonly config: GitHubSkillsAdapterConfig;
  private readonly logger: LoggerPort;
  private readonly httpClient: AxiosInstance;

  constructor(logger: LoggerPort, config?: Partial<GitHubSkillsAdapterConfig>) {
    this.config = { ...DEFAULT_GITHUB_SKILLS_CONFIG, ...config };
    this.logger = logger.child({ adapter: 'github-skills' });

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AEGIS/3.0 GitHubSkillsAdapter',
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
   * Fetch all AI skill files from all configured source repositories.
   *
   * Flow per source:
   * 1. Discover files via Git Trees API (recursive)
   * 2. Filter by extension and directory
   * 3. Download each file's content
   * 4. Parse frontmatter, detect platform/language
   * 5. Generate content hash and deterministic UUID
   * 6. Transform to AISkillFile entity
   * 7. Validate with Zod and collect valid records
   */
  async fetchAllSkills(): Promise<AISkillFile[]> {
    this.logger.info('Starting GitHub skills fetch', {
      sourceCount: this.config.skillSources.length,
    });

    const allSkills: AISkillFile[] = [];

    for (const source of this.config.skillSources) {
      try {
        const skills = await this.fetchFromSource(source);
        allSkills.push(...skills);
      } catch (error) {
        this.logger.error('Failed to fetch from source repository', {
          owner: source.owner,
          repo: source.repo,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other sources — partial failure tolerance
      }
    }

    this.logger.info('GitHub skills fetch complete', {
      totalSkills: allSkills.length,
    });

    return allSkills;
  }

  // ── Private: Per-Source Pipeline ─────────────────────────────────────────────

  /**
   * Fetch and process all skill files from a single source repository.
   */
  private async fetchFromSource(source: SkillSource): Promise<AISkillFile[]> {
    const sourceRepo = `${source.owner}/${source.repo}`;
    this.logger.info('Fetching skills from repository', { sourceRepo });

    // 1. Discover files
    const branch = source.branch ?? 'main';
    const filePaths = await this.discoverFiles(source, branch);

    this.logger.info('Discovered skill files', {
      sourceRepo,
      fileCount: filePaths.length,
    });

    // 2. Download, parse, and transform each file
    const validSkills: AISkillFile[] = [];
    let invalidCount = 0;

    for (const fileEntry of filePaths) {
      try {
        const rawContent = await this.downloadFileContent(
          source.owner,
          source.repo,
          fileEntry.path,
        );

        if (rawContent === null) {
          continue;
        }

        const transformed = this.transformRecord(rawContent, fileEntry, source);
        const validated = AISkillFileSchema.parse(transformed);
        validSkills.push(validated);
      } catch (error) {
        invalidCount++;
        this.logger.warn('Skipping invalid skill file', {
          sourceRepo,
          filePath: fileEntry.path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('Source repository processing complete', {
      sourceRepo,
      valid: validSkills.length,
      invalid: invalidCount,
    });

    return validSkills;
  }

  // ── Private: File Discovery ─────────────────────────────────────────────────

  /**
   * Discover skill files in a repository using the Git Trees API.
   * Uses `?recursive=1` for efficient single-call directory traversal.
   */
  private async discoverFiles(
    source: SkillSource,
    branch: string,
  ): Promise<GitTreeEntry[]> {
    const url = `/repos/${source.owner}/${source.repo}/git/trees/${branch}?recursive=1`;

    const response = await this.fetchWithRetry<GitTreeResponse>(url);

    if (response === null) {
      return [];
    }

    if (response.truncated) {
      this.logger.warn('Repository tree was truncated — some files may be missed', {
        owner: source.owner,
        repo: source.repo,
      });
    }

    // Filter to relevant files
    return response.tree.filter((entry) => {
      // Only blobs (files), not trees (directories)
      if (entry.type !== 'blob') return false;

      // Check file extension
      const ext = '.' + (entry.path.split('.').pop() ?? '').toLowerCase();
      if (!this.config.validExtensions.includes(ext)) return false;

      // Check if file is in a valid directory
      const matchesDirectory = source.paths.some((dir) => {
        const normalizedDir = dir.endsWith('/') ? dir : dir + '/';
        return (
          entry.path.startsWith(normalizedDir) ||
          entry.path.includes('/' + normalizedDir) ||
          entry.path === dir // Exact match for files like .cursorrules
        );
      });

      if (!matchesDirectory) {
        // Also check the global validDirectories config
        const matchesGlobal = this.config.validDirectories.some((dir) => {
          return entry.path.startsWith(dir) || entry.path.includes('/' + dir);
        });
        if (!matchesGlobal) return false;
      }

      // Skip files that are too large
      if (entry.size !== undefined && entry.size > this.config.maxFileSizeBytes) {
        this.logger.debug('Skipping large file', {
          path: entry.path,
          size: entry.size,
        });
        return false;
      }

      return true;
    });
  }

  // ── Private: File Content Download ──────────────────────────────────────────

  /**
   * Download file content via the GitHub Contents API.
   * Returns decoded UTF-8 string or null if the file is inaccessible.
   */
  private async downloadFileContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<string | null> {
    const url = `/repos/${owner}/${repo}/contents/${path}`;

    try {
      const response = await this.fetchWithRetry<GitHubFileContent>(url);

      if (response === null || response.content === undefined || response.content === '') {
        return null;
      }

      // GitHub returns base64-encoded content with newlines
      const decoded = Buffer.from(response.content, 'base64').toString('utf-8');
      return decoded;
    } catch (error) {
      this.logger.warn('Failed to download file content', {
        owner,
        repo,
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  // ── Private: HTTP Fetch with Retry ──────────────────────────────────────────

  /**
   * Fetch from GitHub API with retry and rate-limit handling.
   * Returns null if the resource is not found (404).
   */
  private async fetchWithRetry<T>(url: string): Promise<T | null> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.httpClient.get<T>(url);

        this.checkRateLimit(response.headers);

        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!axios.isAxiosError(error)) {
          if (attempt >= this.config.maxRetries) break;
          await delay(this.calculateBackoff(attempt));
          continue;
        }

        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        // 404 Not Found — skip silently
        if (status === 404) {
          return null;
        }

        if (!this.shouldRetry(axiosError, attempt)) {
          break;
        }

        const delayMs = this.calculateBackoff(attempt);
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
    if (attempt >= this.config.maxRetries) return false;
    if (!error.response) return true; // Network error
    const status = error.response.status;
    if (status === 403) return true; // Rate limit
    if (status >= 500) return true; // Server error
    return false;
  }

  private calculateBackoff(attempt: number): number {
    const exponentialDelay = this.config.retryBaseDelayMs * Math.pow(2, attempt);
    return Math.min(exponentialDelay, this.config.retryMaxDelayMs);
  }

  private checkRateLimit(headers: Record<string, unknown>): void {
    const remaining = headers['x-ratelimit-remaining'];
    if (remaining !== undefined && remaining !== null) {
      const remainingNum = parseInt(String(remaining), 10);
      if (!isNaN(remainingNum) && remainingNum <= this.config.rateLimitThreshold) {
        this.logger.warn('GitHub API rate limit running low', {
          remaining: remainingNum,
          threshold: this.config.rateLimitThreshold,
        });
      }
    }
  }

  // ── Private: Record Transformation ──────────────────────────────────────────

  /**
   * Transform a raw file into the AISkillFile entity shape.
   */
  private transformRecord(
    rawContent: string,
    fileEntry: GitTreeEntry,
    source: SkillSource,
  ): Record<string, unknown> {
    const now = new Date();
    const sourceRepo = `${source.owner}/${source.repo}`;

    // Parse frontmatter
    const { metadata, content } = parseFrontmatter(rawContent);

    // Generate deterministic UUID
    const uniqueKey = `${sourceRepo}:${fileEntry.path}`;
    const id = uuidv5(uniqueKey, GITHUB_SKILLS_NAMESPACE);

    // Compute content hash (SHA-256 of the raw content)
    const contentHash = createHash('sha256').update(rawContent, 'utf-8').digest('hex');

    // Detect platform and language
    const platform = detectPlatform(
      fileEntry.path,
      rawContent,
      metadata.platform,
      source.defaultPlatform,
    );
    const language = detectLanguage(rawContent, metadata.language);

    // Derive skill name
    const name =
      metadata.name !== undefined && metadata.name !== ''
        ? metadata.name
        : deriveNameFromPath(fileEntry.path);

    return {
      id,
      name,
      description: metadata.description ?? '',
      category: metadata.category ?? 'general',
      tags: metadata.tags ?? [],
      version: metadata.version,
      sourceRepo,
      filePath: fileEntry.path,
      rawUrl: `https://raw.githubusercontent.com/${sourceRepo}/main/${fileEntry.path}`,
      commitSha: fileEntry.sha,
      platform,
      language,
      content: rawContent,
      format: detectFileFormat(fileEntry.path),
      contentHash,
      contentSizeBytes: Buffer.byteLength(rawContent, 'utf-8'),
      safetyLabel: SafetyLabel.UNANALYZED,
      author: metadata.author ?? 'Unknown',
      copyCount: 0,
      starCount: 0,
      viewCount: 0,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }
}
