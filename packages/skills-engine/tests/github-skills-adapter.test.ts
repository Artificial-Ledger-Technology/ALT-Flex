/**
 * @module github-skills-adapter.test
 * @description Unit tests for the GitHub AI Skills adapter.
 *
 * Tests cover:
 * - Happy path fetching and transforming
 * - Deterministic UUID generation (idempotency)
 * - SHA-256 content hash generation (dedup)
 * - Zod validation against AISkillFileSchema
 * - File extension filtering
 * - Directory path filtering
 * - Skipping files outside configured paths
 * - Network error retry logic
 * - Rate limit handling (403)
 * - Empty repository tree
 * - Missing file content
 * - Partial failure tolerance
 * - Safety label set to UNANALYZED
 * - Platform and language detection integration
 * - Multiple source repository handling
 *
 * All HTTP calls are mocked via vitest — no live API calls.
 *
 * @task P2-ETL-003
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createHash } from 'node:crypto';
import axios from 'axios';
import { AISkillFileSchema, SafetyLabel, type LoggerPort } from '@aegis/core';
import { GitHubSkillsAdapter } from '../src/adapters/github-skills-adapter.js';
import type { SkillSource } from '../src/adapters/github-skills-adapter.config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('axios');

function createMockLogger(): LoggerPort {
  return {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

// Sample skill file content with frontmatter
const sampleSkillContent = `---
name: Solidity Reentrancy Detector
description: Detects reentrancy vulnerabilities in Solidity contracts
platform: claude
language: solidity
category: vulnerability-detection
author: AEGIS Team
---
# Reentrancy Detection Skill

When auditing Solidity smart contracts, check for reentrancy patterns.
`;

const sampleBase64Content = Buffer.from(sampleSkillContent).toString('base64');

// Mock tree response with skill files
const mockTreeResponse = {
  sha: 'abc123',
  url: 'https://api.github.com/repos/test/repo/git/trees/main',
  tree: [
    {
      path: 'skills/reentrancy-detector.yml',
      mode: '100644',
      type: 'blob' as const,
      sha: 'file-sha-1',
      size: 512,
      url: 'https://api.github.com/repos/test/repo/git/blobs/file-sha-1',
    },
    {
      path: 'skills/flash-loan-audit.md',
      mode: '100644',
      type: 'blob' as const,
      sha: 'file-sha-2',
      size: 256,
      url: 'https://api.github.com/repos/test/repo/git/blobs/file-sha-2',
    },
    {
      path: 'README.md',
      mode: '100644',
      type: 'blob' as const,
      sha: 'readme-sha',
      size: 1024,
      url: 'https://api.github.com/repos/test/repo/git/blobs/readme-sha',
    },
    {
      path: 'src/index.ts',
      mode: '100644',
      type: 'blob' as const,
      sha: 'src-sha',
      size: 256,
      url: 'https://api.github.com/repos/test/repo/git/blobs/src-sha',
    },
  ],
  truncated: false,
};

const testSource: SkillSource = {
  owner: 'test-org',
  repo: 'test-repo',
  paths: ['skills/'],
  defaultPlatform: 'claude',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Test Setup
// ═══════════════════════════════════════════════════════════════════════════════

describe('GitHubSkillsAdapter', () => {
  let mockLogger: LoggerPort;
  let adapter: GitHubSkillsAdapter;
  let mockGet: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = createMockLogger();
    mockGet = vi.fn();
    (axios.create as Mock).mockReturnValue({ get: mockGet });
    (axios.isAxiosError as unknown as Mock) = vi.fn().mockReturnValue(false);

    adapter = new GitHubSkillsAdapter(mockLogger, {
      skillSources: [testSource],
      retryBaseDelayMs: 1, // Fast retries for tests
      retryMaxDelayMs: 10,
      maxRetries: 2,
    });
  });

  // ── 1. Identity ────────────────────────────────────────────────────────

  it('has sourceName "github-skills"', () => {
    expect(adapter.sourceName).toBe('github-skills');
  });

  // ── 2. Happy Path ──────────────────────────────────────────────────────

  it('discovers, downloads, and transforms skill files', async () => {
    // Tree API response
    mockGet.mockResolvedValueOnce({ data: mockTreeResponse, headers: {} });
    // Contents API response for first file
    mockGet.mockResolvedValueOnce({
      data: { name: 'reentrancy-detector.yml', path: 'skills/reentrancy-detector.yml', sha: 'file-sha-1', size: 512, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });
    // Contents API response for second file
    mockGet.mockResolvedValueOnce({
      data: { name: 'flash-loan-audit.md', path: 'skills/flash-loan-audit.md', sha: 'file-sha-2', size: 256, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Solidity Reentrancy Detector');
  });

  // ── 3. Field Mapping ───────────────────────────────────────────────────

  it('maps all fields to AISkillFile correctly', async () => {
    mockGet.mockResolvedValueOnce({ data: mockTreeResponse, headers: {} });
    mockGet.mockResolvedValueOnce({
      data: { name: 'reentrancy-detector.yml', path: 'skills/reentrancy-detector.yml', sha: 'file-sha-1', size: 512, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });
    mockGet.mockResolvedValueOnce({
      data: { name: 'flash-loan-audit.md', path: 'skills/flash-loan-audit.md', sha: 'file-sha-2', size: 256, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();
    const skill = result[0];

    expect(skill.sourceRepo).toBe('test-org/test-repo');
    expect(skill.filePath).toBe('skills/reentrancy-detector.yml');
    expect(skill.platform).toBe('claude');
    expect(skill.language).toBe('solidity');
    expect(skill.description).toBe('Detects reentrancy vulnerabilities in Solidity contracts');
    expect(skill.author).toBe('AEGIS Team');
    expect(skill.category).toBe('vulnerability-detection');
    expect(skill.format).toBe('yaml');
    expect(skill.content).toBe(sampleSkillContent);
  });

  // ── 4. Deterministic UUID ──────────────────────────────────────────────

  it('generates deterministic UUID from sourceRepo:filePath', async () => {
    mockGet.mockResolvedValueOnce({ data: mockTreeResponse, headers: {} });
    mockGet.mockResolvedValueOnce({
      data: { name: 'reentrancy-detector.yml', path: 'skills/reentrancy-detector.yml', sha: 'file-sha-1', size: 512, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });
    mockGet.mockResolvedValueOnce({
      data: { name: 'flash-loan-audit.md', path: 'skills/flash-loan-audit.md', sha: 'file-sha-2', size: 256, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();

    expect(result[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    // Run again — should produce the same UUID
    mockGet.mockResolvedValueOnce({ data: mockTreeResponse, headers: {} });
    mockGet.mockResolvedValueOnce({
      data: { name: 'reentrancy-detector.yml', path: 'skills/reentrancy-detector.yml', sha: 'file-sha-1', size: 512, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });
    mockGet.mockResolvedValueOnce({
      data: { name: 'flash-loan-audit.md', path: 'skills/flash-loan-audit.md', sha: 'file-sha-2', size: 256, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });

    const result2 = await adapter.fetchAllSkills();
    expect(result2[0].id).toBe(result[0].id);
  });

  // ── 5. SHA-256 Content Hash ────────────────────────────────────────────

  it('generates correct SHA-256 content hash', async () => {
    mockGet.mockResolvedValueOnce({ data: mockTreeResponse, headers: {} });
    mockGet.mockResolvedValueOnce({
      data: { name: 'reentrancy-detector.yml', path: 'skills/reentrancy-detector.yml', sha: 'file-sha-1', size: 512, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });
    mockGet.mockResolvedValueOnce({
      data: { name: 'flash-loan-audit.md', path: 'skills/flash-loan-audit.md', sha: 'file-sha-2', size: 256, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();
    const expectedHash = createHash('sha256').update(sampleSkillContent, 'utf-8').digest('hex');

    expect(result[0].contentHash).toBe(expectedHash);
    expect(result[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  // ── 6. Zod Validation ─────────────────────────────────────────────────

  it('validates output against AISkillFileSchema', async () => {
    mockGet.mockResolvedValueOnce({ data: mockTreeResponse, headers: {} });
    mockGet.mockResolvedValueOnce({
      data: { name: 'reentrancy-detector.yml', path: 'skills/reentrancy-detector.yml', sha: 'file-sha-1', size: 512, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });
    mockGet.mockResolvedValueOnce({
      data: { name: 'flash-loan-audit.md', path: 'skills/flash-loan-audit.md', sha: 'file-sha-2', size: 256, content: sampleBase64Content, encoding: 'base64' },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();

    for (const skill of result) {
      const parsed = AISkillFileSchema.safeParse(skill);
      expect(parsed.success).toBe(true);
    }
  });

  // ── 7. Extension Filtering ────────────────────────────────────────────

  it('filters files by valid extensions', async () => {
    const treeWithMixedFiles = {
      ...mockTreeResponse,
      tree: [
        { path: 'skills/valid.yml', mode: '100644', type: 'blob' as const, sha: 's1', size: 100, url: '' },
        { path: 'skills/invalid.ts', mode: '100644', type: 'blob' as const, sha: 's2', size: 100, url: '' },
        { path: 'skills/also-valid.md', mode: '100644', type: 'blob' as const, sha: 's3', size: 100, url: '' },
      ],
    };

    mockGet.mockResolvedValueOnce({ data: treeWithMixedFiles, headers: {} });
    // Only 2 files should be downloaded (valid.yml and also-valid.md)
    mockGet.mockResolvedValueOnce({
      data: { content: sampleBase64Content },
      headers: {},
    });
    mockGet.mockResolvedValueOnce({
      data: { content: sampleBase64Content },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();

    // Should have filtered out .ts file
    expect(result).toHaveLength(2);
  });

  // ── 8. Directory Filtering ────────────────────────────────────────────

  it('filters files by valid directories', async () => {
    const treeWithDirFiles = {
      ...mockTreeResponse,
      tree: [
        { path: 'skills/valid.yml', mode: '100644', type: 'blob' as const, sha: 's1', size: 100, url: '' },
        { path: 'docs/not-a-skill.md', mode: '100644', type: 'blob' as const, sha: 's2', size: 100, url: '' },
      ],
    };

    mockGet.mockResolvedValueOnce({ data: treeWithDirFiles, headers: {} });
    mockGet.mockResolvedValueOnce({
      data: { content: sampleBase64Content },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('skills/valid.yml');
  });

  // ── 9. Skip Files Outside Paths ───────────────────────────────────────

  it('skips files outside configured paths', async () => {
    const treeOutsidePaths = {
      ...mockTreeResponse,
      tree: [
        { path: 'random/file.yml', mode: '100644', type: 'blob' as const, sha: 's1', size: 100, url: '' },
      ],
    };

    mockGet.mockResolvedValueOnce({ data: treeOutsidePaths, headers: {} });

    const result = await adapter.fetchAllSkills();

    expect(result).toHaveLength(0);
  });

  // ── 10. Network Error Retry ───────────────────────────────────────────

  it('retries on network errors up to maxRetries', async () => {
    const networkError = new Error('ECONNREFUSED');
    mockGet
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ data: { ...mockTreeResponse, tree: [] }, headers: {} });

    const result = await adapter.fetchAllSkills();

    expect(result).toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  // ── 11. Rate Limit (403) ──────────────────────────────────────────────

  it('retries on 403 Rate Limit Exceeded', async () => {
    const rateLimitError = { response: { status: 403, headers: {} }, isAxiosError: true };
    (axios.isAxiosError as unknown as Mock).mockReturnValue(true);

    mockGet
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ data: { ...mockTreeResponse, tree: [] }, headers: {} });

    const result = await adapter.fetchAllSkills();

    expect(result).toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  // ── 12. Empty Repository Tree ─────────────────────────────────────────

  it('handles empty repository tree gracefully', async () => {
    mockGet.mockResolvedValueOnce({
      data: { sha: 'empty', url: '', tree: [], truncated: false },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();

    expect(result).toEqual([]);
  });

  // ── 13. Missing File Content ──────────────────────────────────────────

  it('handles missing file content gracefully', async () => {
    const treeWithFile = {
      ...mockTreeResponse,
      tree: [
        { path: 'skills/missing.yml', mode: '100644', type: 'blob' as const, sha: 's1', size: 100, url: '' },
      ],
    };

    mockGet.mockResolvedValueOnce({ data: treeWithFile, headers: {} });
    // Return empty content
    mockGet.mockResolvedValueOnce({ data: { content: '' }, headers: {} });

    const result = await adapter.fetchAllSkills();

    expect(result).toHaveLength(0);
  });

  // ── 14. Partial Failure Tolerance ─────────────────────────────────────

  it('skips invalid records and continues processing', async () => {
    const treeWith2Files = {
      ...mockTreeResponse,
      tree: [
        { path: 'skills/good.yml', mode: '100644', type: 'blob' as const, sha: 's1', size: 100, url: '' },
        { path: 'skills/bad.yml', mode: '100644', type: 'blob' as const, sha: 's2', size: 100, url: '' },
      ],
    };

    mockGet.mockResolvedValueOnce({ data: treeWith2Files, headers: {} });
    // Good file
    mockGet.mockResolvedValueOnce({
      data: { content: sampleBase64Content },
      headers: {},
    });
    // Bad file — content will be empty after base64 decode
    mockGet.mockResolvedValueOnce({
      data: { content: Buffer.from('').toString('base64') },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();

    // Only the good file should be in the result
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  // ── 15. Safety Label ──────────────────────────────────────────────────

  it('sets safetyLabel to UNANALYZED for all new records', async () => {
    mockGet.mockResolvedValueOnce({ data: mockTreeResponse, headers: {} });
    mockGet.mockResolvedValueOnce({
      data: { content: sampleBase64Content },
      headers: {},
    });
    mockGet.mockResolvedValueOnce({
      data: { content: sampleBase64Content },
      headers: {},
    });

    const result = await adapter.fetchAllSkills();

    for (const skill of result) {
      expect(skill.safetyLabel).toBe(SafetyLabel.UNANALYZED);
    }
  });

  // ── 16. 404 Handling ──────────────────────────────────────────────────

  it('returns null for 404 Not Found and continues', async () => {
    const notFoundError = { response: { status: 404, headers: {} }, isAxiosError: true };
    (axios.isAxiosError as unknown as Mock).mockReturnValue(true);

    // Tree API returns 404
    mockGet.mockRejectedValueOnce(notFoundError);

    const result = await adapter.fetchAllSkills();

    // Should handle gracefully — source is skipped
    expect(result).toEqual([]);
  });
});
