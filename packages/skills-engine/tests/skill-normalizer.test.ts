/**
 * @module skill-normalizer.test
 * @description Unit tests for the SkillNormalizer module.
 *
 * Tests cover:
 * - Single record normalization (field mapping, defaults)
 * - Frontmatter extraction delegation
 * - Platform detection delegation
 * - Language detection delegation
 * - Content hash generation (SHA-256)
 * - Author extraction (frontmatter vs repo owner fallback)
 * - File format detection
 * - Batch normalization with content-hash deduplication
 * - Invalid record logging (not silently dropped)
 * - Zod validation enforcement
 * - Edge cases (missing frontmatter, no default platform)
 *
 * @task P2-ETL-007
 */

import { describe, it, expect, vi } from 'vitest';
import { SafetyLabel, type LoggerPort } from '@aegis/core';
import {
  normalizeGitHubSkillFile,
  normalizeGitHubSkillFiles,
  generateContentHash,
  detectFileFormat,
  type RawGitHubFileEntry,
  type RepoInfo,
} from '../src/adapters/skill-normalizer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const mockRepoInfo: RepoInfo = {
  owner: 'SunWeb3Sec',
  repo: 'DeFiHackLabs',
  defaultPlatform: 'claude',
};

function createMockEntry(path: string = 'skills/reentrancy.md'): RawGitHubFileEntry {
  return {
    path,
    sha: 'a1b2c3d4e5f6',
    size: 1024,
  };
}

function createMockLogger(): LoggerPort {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

const validFrontmatterContent = `---
name: Solidity Reentrancy Checker
description: Detects reentrancy vulnerabilities
platform: claude
language: solidity
category: vulnerability-detection
tags:
  - reentrancy
  - evm
version: 1.0.0
author: Pashov
---
Check for reentrancy using the Checks-Effects-Interactions pattern.
`;

const noFrontmatterContent = `Check for reentrancy using the Checks-Effects-Interactions pattern.`;

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateContentHash', () => {
  it('generates a consistent SHA-256 hex string', () => {
    const hash1 = generateContentHash('test content');
    const hash2 = generateContentHash('test content');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates different hashes for different content', () => {
    expect(generateContentHash('A')).not.toBe(generateContentHash('B'));
  });
});

describe('detectFileFormat', () => {
  it('detects yaml format', () => {
    expect(detectFileFormat('test.yml')).toBe('yaml');
    expect(detectFileFormat('test.yaml')).toBe('yaml');
    expect(detectFileFormat('TEST.YAML')).toBe('yaml'); // Case insensitive
  });

  it('detects markdown format', () => {
    expect(detectFileFormat('test.md')).toBe('markdown');
    expect(detectFileFormat('test.markdown')).toBe('markdown');
  });

  it('detects json format', () => {
    expect(detectFileFormat('test.json')).toBe('json');
  });

  it('detects toml format', () => {
    expect(detectFileFormat('test.toml')).toBe('toml');
  });

  it('defaults to text for unknown formats', () => {
    expect(detectFileFormat('test.txt')).toBe('text');
    expect(detectFileFormat('.cursorrules')).toBe('text');
    expect(detectFileFormat('Makefile')).toBe('text');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeGitHubSkillFile (single record)
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeGitHubSkillFile', () => {
  // ── Frontmatter Extraction ────────────────────────────────────────────────

  it('extracts metadata from valid frontmatter', () => {
    const result = normalizeGitHubSkillFile(validFrontmatterContent, createMockEntry(), mockRepoInfo);
    
    expect(result.name).toBe('Solidity Reentrancy Checker');
    expect(result.description).toBe('Detects reentrancy vulnerabilities');
    expect(result.platform).toBe('claude');
    expect(result.language).toBe('solidity');
    expect(result.category).toBe('vulnerability-detection');
    expect(result.tags).toEqual(['reentrancy', 'evm']);
    expect(result.version).toBe('1.0.0');
    expect(result.author).toBe('Pashov');
  });

  it('falls back to derivation and defaults when no frontmatter', () => {
    const entry = createMockEntry('skills/reentrancy-detector.md');
    const result = normalizeGitHubSkillFile(noFrontmatterContent, entry, mockRepoInfo);
    
    expect(result.name).toBe('Reentrancy Detector'); // Derived from path
    expect(result.description).toBe('');
    expect(result.category).toBe('general');
    expect(result.tags).toEqual([]);
    expect(result.author).toBe('SunWeb3Sec'); // Fallback to repo owner
  });

  // ── Deterministic Identity & Hash ─────────────────────────────────────────

  it('generates a deterministic UUID based on repo and path', () => {
    const entry = createMockEntry();
    const result1 = normalizeGitHubSkillFile(validFrontmatterContent, entry, mockRepoInfo);
    const result2 = normalizeGitHubSkillFile(validFrontmatterContent, entry, mockRepoInfo);
    
    expect(result1.id).toBe(result2.id);
    expect(result1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generates contentHash and size correctly', () => {
    const result = normalizeGitHubSkillFile(noFrontmatterContent, createMockEntry(), mockRepoInfo);
    
    expect(result.contentHash).toBe(generateContentHash(noFrontmatterContent));
    expect(result.contentSizeBytes).toBe(Buffer.byteLength(noFrontmatterContent, 'utf-8'));
    expect(result.content).toBe(noFrontmatterContent);
  });

  // ── Source Mapping ────────────────────────────────────────────────────────

  it('maps source metadata correctly', () => {
    const entry = createMockEntry('skills/test.md');
    const result = normalizeGitHubSkillFile(validFrontmatterContent, entry, mockRepoInfo);
    
    expect(result.sourceRepo).toBe('SunWeb3Sec/DeFiHackLabs');
    expect(result.filePath).toBe('skills/test.md');
    expect(result.rawUrl).toBe('https://raw.githubusercontent.com/SunWeb3Sec/DeFiHackLabs/main/skills/test.md');
    expect(result.commitSha).toBe('a1b2c3d4e5f6');
  });

  // ── Safety & Engagement Defaults ──────────────────────────────────────────

  it('initializes with UNANALYZED safety label and 0 engagement metrics', () => {
    const result = normalizeGitHubSkillFile(validFrontmatterContent, createMockEntry(), mockRepoInfo);
    
    expect(result.safetyLabel).toBe(SafetyLabel.UNANALYZED);
    expect(result.copyCount).toBe(0);
    expect(result.starCount).toBe(0);
    expect(result.viewCount).toBe(0);
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  it('throws ZodError for invalid empty content', () => {
    expect(() => {
      normalizeGitHubSkillFile('', createMockEntry(), mockRepoInfo);
    }).toThrow(); // Zod min(1) validation on content
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeGitHubSkillFiles (batch with deduplication)
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeGitHubSkillFiles', () => {
  it('normalizes a batch of valid records', () => {
    const logger = createMockLogger();
    const files = [
      [validFrontmatterContent, createMockEntry('skills/1.md')] as const,
      [noFrontmatterContent, createMockEntry('skills/2.md')] as const,
    ];
    
    const result = normalizeGitHubSkillFiles(files, mockRepoInfo, logger);
    
    expect(result.valid).toHaveLength(2);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
  });

  it('deduplicates by content hash', () => {
    const logger = createMockLogger();
    // Same content, different paths
    const files = [
      [noFrontmatterContent, createMockEntry('skills/1.md')] as const,
      [noFrontmatterContent, createMockEntry('skills/2.md')] as const,
    ];
    
    const result = normalizeGitHubSkillFiles(files, mockRepoInfo, logger);
    
    expect(result.valid).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate skill file skipped'),
      expect.any(Object)
    );
  });

  it('logs invalid records without crashing', () => {
    const logger = createMockLogger();
    const files = [
      [validFrontmatterContent, createMockEntry('skills/1.md')] as const,
      ['', createMockEntry('skills/empty.md')] as const, // Invalid empty content
    ];
    
    const result = normalizeGitHubSkillFiles(files, mockRepoInfo, logger);
    
    expect(result.valid).toHaveLength(1);
    expect(result.invalidCount).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid skill file skipped'),
      expect.any(Object)
    );
  });

  it('logs summary info', () => {
    const logger = createMockLogger();
    const files = [[validFrontmatterContent, createMockEntry('skills/1.md')] as const];
    
    normalizeGitHubSkillFiles(files, mockRepoInfo, logger);
    
    expect(logger.info).toHaveBeenCalledWith(
      'Skill file normalization complete',
      expect.objectContaining({ total: 1, valid: 1 })
    );
  });
});
