import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ISkillDataPort, ICachePort, LoggerPort, AISkillFile, SafetyScanJobData, SafetyScanJobResult } from '@aegis/core';
import type { Queue } from 'bullmq';

import { IndexSkillsUseCase, type SkillNormalizerPort } from '../src/application/use-cases/index-skills-use-case.js';
import type { GitHubSkillsAdapter } from '../src/adapters/github-skills-adapter.js';
import type { SkillSource } from '../src/adapters/github-skills-adapter.config.js';
import type { GitTreeEntry } from '../src/adapters/github-skills-adapter.js'; // Note: Might need to adjust import if not exported

// Mock the enqueueSafetyScan to prevent actual queue operations in tests
vi.mock('../src/infrastructure/safety-scan-queue.js', () => ({
  enqueueSafetyScan: vi.fn().mockResolvedValue('job-id'),
}));

import { enqueueSafetyScan } from '../src/infrastructure/safety-scan-queue.js';

describe('IndexSkillsUseCase', () => {
  let useCase: IndexSkillsUseCase;
  let mockAdapter: ReturnType<typeof createMockAdapter>;
  let mockSkillRepo: ReturnType<typeof createMockSkillRepo>;
  let mockQueue: Queue<SafetyScanJobData, SafetyScanJobResult, string>;
  let mockNormalizer: ReturnType<typeof createMockNormalizer>;
  let mockCache: ReturnType<typeof createMockCache>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  const mockSource: SkillSource = { owner: 'test-owner', repo: 'test-repo', paths: ['/'] };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = createMockAdapter([mockSource]);
    mockSkillRepo = createMockSkillRepo();
    mockQueue = {} as Queue<SafetyScanJobData, SafetyScanJobResult, string>;
    mockNormalizer = createMockNormalizer();
    mockCache = createMockCache();
    mockLogger = createMockLogger();

    useCase = new IndexSkillsUseCase(
      mockAdapter as unknown as GitHubSkillsAdapter,
      mockSkillRepo as unknown as ISkillDataPort,
      mockQueue,
      mockNormalizer,
      mockCache as unknown as ICachePort,
      mockLogger as unknown as LoggerPort,
    );
  });

  // ── Tests ──────────────────────────────────────────────────────────────────

  it('1. Orchestrates successful index flow for new files', async () => {
    mockAdapter.discoverSkillFiles.mockResolvedValue([
      { path: 'test.md', sha: 'sha1' } as any,
    ]);
    mockAdapter.downloadFileContent.mockResolvedValue('raw-content');
    
    const mockSkill = { id: 'skill-1', contentHash: 'hash-1' } as AISkillFile;
    mockNormalizer.normalizeGitHubSkillFiles.mockReturnValue({
      valid: [mockSkill],
      invalidCount: 0,
      duplicateCount: 0,
    });

    const result = await useCase.execute();

    expect(result).toEqual(expect.objectContaining({
      added: 1,
      updated: 0,
      skipped: 0,
      errored: 0,
    }));

    expect(mockSkillRepo.saveBatch).toHaveBeenCalledWith([mockSkill]);
    expect(enqueueSafetyScan).toHaveBeenCalledWith(mockQueue, 'skill-1', 'hash-1');
    expect(mockCache.deleteByPattern).toHaveBeenCalledWith('aegis:skills:*');
  });

  it('2. Skips files with unchanged contentHash (deduplication)', async () => {
    mockAdapter.discoverSkillFiles.mockResolvedValue([
      { path: 'test.md', sha: 'sha1' } as any,
    ]);
    mockAdapter.downloadFileContent.mockResolvedValue('raw-content');
    
    const mockSkill = { id: 'skill-1', contentHash: 'hash-1' } as AISkillFile;
    mockNormalizer.normalizeGitHubSkillFiles.mockReturnValue({
      valid: [mockSkill],
      invalidCount: 0,
      duplicateCount: 0,
    });

    // Mock DB returning same skill
    mockSkillRepo.findById.mockResolvedValue(mockSkill);

    const result = await useCase.execute();

    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockSkillRepo.saveBatch).not.toHaveBeenCalled();
    expect(enqueueSafetyScan).not.toHaveBeenCalled();
  });

  it('3. Upserts and enqueues scans for changed files (different hash)', async () => {
    mockAdapter.discoverSkillFiles.mockResolvedValue([
      { path: 'test.md', sha: 'sha1' } as any,
    ]);
    mockAdapter.downloadFileContent.mockResolvedValue('raw-content');
    
    const mockSkill = { id: 'skill-1', contentHash: 'hash-new' } as AISkillFile;
    mockNormalizer.normalizeGitHubSkillFiles.mockReturnValue({
      valid: [mockSkill],
      invalidCount: 0,
      duplicateCount: 0,
    });

    // Mock DB returning old skill
    mockSkillRepo.findById.mockResolvedValue({ id: 'skill-1', contentHash: 'hash-old' } as AISkillFile);

    const result = await useCase.execute();

    expect(result.updated).toBe(1);
    expect(mockSkillRepo.saveBatch).toHaveBeenCalledWith([mockSkill]);
    expect(enqueueSafetyScan).toHaveBeenCalledWith(mockQueue, 'skill-1', 'hash-new');
  });

  it('4. Reports errored downloads and invalid files', async () => {
    mockAdapter.discoverSkillFiles.mockResolvedValue([
      { path: 'good.md', sha: 'sha1' } as any,
      { path: 'bad.md', sha: 'sha2' } as any, // Download fails
    ]);
    
    mockAdapter.downloadFileContent.mockImplementation((owner, repo, path) => 
      path === 'good.md' ? Promise.resolve('raw-content') : Promise.resolve(null)
    );
    
    mockNormalizer.normalizeGitHubSkillFiles.mockReturnValue({
      valid: [],
      invalidCount: 1, // Another file fails validation
      duplicateCount: 0,
    });

    const result = await useCase.execute();

    expect(result.errored).toBe(2); // 1 download fail + 1 validation fail
  });

  it('5. Handles adapter discovery errors gracefully', async () => {
    mockAdapter.discoverSkillFiles.mockRejectedValue(new Error('GitHub API Error'));

    const result = await useCase.execute();

    expect(result.added).toBe(0);
    expect(result.errored).toBe(0);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process source'),
      expect.any(Object)
    );
  });

  it('6. Iterates over multiple sources', async () => {
    mockAdapter.skillSources = [
      { owner: 'o1', repo: 'r1', paths: ['/'] },
      { owner: 'o2', repo: 'r2', paths: ['/'] },
    ];
    mockAdapter.discoverSkillFiles.mockResolvedValue([]);

    await useCase.execute();

    expect(mockAdapter.discoverSkillFiles).toHaveBeenCalledTimes(2);
  });

  it('7. Calls progress callback', async () => {
    mockAdapter.discoverSkillFiles.mockResolvedValue([]);
    const onProgress = vi.fn().mockResolvedValue(undefined);

    await useCase.execute({ onProgress });

    expect(onProgress).toHaveBeenCalledWith(0, 'fetching');
    expect(onProgress).toHaveBeenCalledWith(80, 'upserting');
    expect(onProgress).toHaveBeenCalledWith(90, 'cache-invalidation');
    expect(onProgress).toHaveBeenCalledWith(100, 'complete');
  });

  it('8. Queue enqueue failure does not crash pipeline', async () => {
    mockAdapter.discoverSkillFiles.mockResolvedValue([{ path: 'test.md', sha: 'sha1' } as any]);
    mockAdapter.downloadFileContent.mockResolvedValue('raw-content');
    
    const mockSkill = { id: 'skill-1', contentHash: 'hash-1' } as AISkillFile;
    mockNormalizer.normalizeGitHubSkillFiles.mockReturnValue({
      valid: [mockSkill],
      invalidCount: 0,
      duplicateCount: 0,
    });

    vi.mocked(enqueueSafetyScan).mockRejectedValueOnce(new Error('Redis Timeout'));

    const result = await useCase.execute();

    expect(result.added).toBe(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to enqueue safety scan'),
      expect.any(Object)
    );
  });

  it('9. Handles DB saveBatch failure gracefully per source', async () => {
    mockAdapter.discoverSkillFiles.mockResolvedValue([{ path: 'test.md', sha: 'sha1' } as any]);
    mockAdapter.downloadFileContent.mockResolvedValue('raw-content');
    
    const mockSkill = { id: 'skill-1', contentHash: 'hash-1' } as AISkillFile;
    mockNormalizer.normalizeGitHubSkillFiles.mockReturnValue({
      valid: [mockSkill],
      invalidCount: 0,
      duplicateCount: 0,
    });

    mockSkillRepo.saveBatch.mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.added).toBe(0);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process source'),
      expect.any(Object)
    );
  });

  it('10. Cache invalidation failure does not fail the sync', async () => {
    mockAdapter.discoverSkillFiles.mockResolvedValue([]);
    mockCache.deleteByPattern.mockRejectedValue(new Error('Redis Error'));

    const result = await useCase.execute();

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Cache invalidation failed'),
      expect.any(Object)
    );
  });
});

// ── Mock Factories ───────────────────────────────────────────────────────────

function createMockAdapter(sources: SkillSource[]) {
  return {
    skillSources: sources,
    discoverSkillFiles: vi.fn(),
    downloadFileContent: vi.fn(),
  };
}

function createMockSkillRepo() {
  return {
    findById: vi.fn().mockResolvedValue(null),
    saveBatch: vi.fn().mockResolvedValue(1),
  };
}

function createMockNormalizer() {
  return {
    normalizeGitHubSkillFiles: vi.fn().mockReturnValue({ valid: [], invalidCount: 0, duplicateCount: 0 }),
  };
}

function createMockCache() {
  return {
    deleteByPattern: vi.fn().mockResolvedValue(1),
  };
}

function createMockLogger() {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger;
}
