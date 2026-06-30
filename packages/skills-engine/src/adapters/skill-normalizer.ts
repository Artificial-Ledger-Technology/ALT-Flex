/**
 * @module skill-normalizer
 * @description Normalizes raw GitHub file data into validated `AISkillFile`
 * domain entities. Sits between raw GitHub API responses and the domain layer.
 *
 * Responsibilities:
 * - YAML frontmatter extraction via `parseFrontmatter`
 * - Platform detection via `detectPlatform`
 * - Language detection via `detectLanguage`
 * - SHA-256 content hash generation for deduplication
 * - Author extraction (frontmatter → repo owner fallback)
 * - File format detection from extension
 * - Deduplication by content hash
 * - Zod validation (every output is schema-valid)
 * - Invalid record logging (never silently dropped)
 *
 * @hexagonal Adapter Utility — Infrastructure Layer
 * @task P2-ETL-007
 */

import { createHash } from 'node:crypto';
import { v5 as uuidv5 } from 'uuid';
import {
  AISkillFileSchema,
  SafetyLabel,
  type AISkillFile,
  type LoggerPort,
  type SkillFileFormat,
} from '@aegis/core';

import { parseFrontmatter, deriveNameFromPath } from './frontmatter-parser.js';
import { detectPlatform } from './platform-detector.js';
import { detectLanguage } from './language-detector.js';

// Stable namespace for GitHub Skills deterministic UUIDs
const GITHUB_SKILLS_NAMESPACE = 'a3f8c1d2-7e4b-5f6a-9b0c-2d1e3f4a5b6c';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Data Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimal file entry from the GitHub Git Trees API.
 */
export interface RawGitHubFileEntry {
  readonly path: string;
  readonly sha: string;
  readonly size?: number;
}

/**
 * Repository context for normalization.
 */
export interface RepoInfo {
  readonly owner: string;
  readonly repo: string;
  readonly defaultPlatform?: string;
}

/**
 * Result of batch skill normalization.
 */
export interface SkillNormalizationResult {
  readonly valid: AISkillFile[];
  readonly invalidCount: number;
  readonly duplicateCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate SHA-256 hash of content.
 */
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Determine file format from extension.
 */
export function detectFileFormat(filePath: string): SkillFileFormat {
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
// Single Record Normalization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a single raw GitHub skill file into a Zod-validated
 * `AISkillFile` domain entity.
 *
 * @param rawContent - Raw file content (UTF-8 string)
 * @param fileEntry - Git tree entry with path and SHA
 * @param repoInfo - Repository owner/name context
 * @returns Validated `AISkillFile`
 * @throws ZodError if the transformed record fails validation
 */
export function normalizeGitHubSkillFile(
  rawContent: string,
  fileEntry: RawGitHubFileEntry,
  repoInfo: RepoInfo,
): AISkillFile {
  const now = new Date();
  const sourceRepo = `${repoInfo.owner}/${repoInfo.repo}`;

  // Parse frontmatter
  const { metadata } = parseFrontmatter(rawContent);

  // Generate deterministic UUID
  const uniqueKey = `${sourceRepo}:${fileEntry.path}`;
  const id = uuidv5(uniqueKey, GITHUB_SKILLS_NAMESPACE);

  // Compute content hash
  const contentHash = generateContentHash(rawContent);

  // Detect platform and language
  const platform = detectPlatform(
    fileEntry.path,
    rawContent,
    metadata.platform,
    repoInfo.defaultPlatform,
  );
  const language = detectLanguage(rawContent, metadata.language);

  // Derive skill name
  const name =
    metadata.name !== undefined && metadata.name !== ''
      ? metadata.name
      : deriveNameFromPath(fileEntry.path);

  const transformed = {
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
    author: metadata.author ?? repoInfo.owner,
    copyCount: 0,
    starCount: 0,
    viewCount: 0,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  return AISkillFileSchema.parse(transformed);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Batch Normalization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a batch of raw GitHub skill files with deduplication
 * and invalid-record logging.
 *
 * Deduplication key: `contentHash` (identical file content across
 * different repos or paths is considered a duplicate).
 *
 * @param files - Array of [content, entry] tuples
 * @param repoInfo - Repository owner/name context
 * @param logger - Logger for reporting invalid/duplicate records
 * @returns Normalization result with valid records and counts
 */
export function normalizeGitHubSkillFiles(
  files: ReadonlyArray<readonly [string, RawGitHubFileEntry]>,
  repoInfo: RepoInfo,
  logger: LoggerPort,
): SkillNormalizationResult {
  const valid: AISkillFile[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;
  const seenHashes = new Set<string>();

  for (const [content, entry] of files) {
    // Deduplication by content hash
    const hash = generateContentHash(content);
    if (seenHashes.has(hash)) {
      duplicateCount++;
      logger.debug('Duplicate skill file skipped (same content hash)', {
        path: entry.path,
        contentHash: hash,
      });
      continue;
    }
    seenHashes.add(hash);

    // Normalize and validate
    try {
      const skill = normalizeGitHubSkillFile(content, entry, repoInfo);
      valid.push(skill);
    } catch (error) {
      invalidCount++;
      logger.warn('Invalid skill file skipped', {
        path: entry.path,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Skill file normalization complete', {
    total: files.length,
    valid: valid.length,
    invalid: invalidCount,
    duplicates: duplicateCount,
  });

  return { valid, invalidCount, duplicateCount };
}
