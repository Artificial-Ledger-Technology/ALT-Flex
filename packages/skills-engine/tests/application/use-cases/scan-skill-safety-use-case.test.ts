import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScanSkillSafetyUseCase } from '../../../src/application/use-cases/scan-skill-safety-use-case.js';
import {
  SafetyLabel,
  type ISkillDataPort,
  type ISafetyScannerPort,
  type ICachePort,
  type LoggerPort,
  type AISkillFile,
  type ScanVerdict,
} from '@aegis/core';
import type { SkillContentParser } from '../../../src/application/parsers/SkillContentParser.js';
import type { RegexRuleMatcher } from '../../../src/application/scanners/RegexRuleMatcher.js';
import type { ASTCodeAnalyzer } from '../../../src/application/scanners/ASTCodeAnalyzer.js';
import type { SemanticAnalyzer } from '../../../src/application/scanners/SemanticAnalyzer.js';
import type { SafetyScoreCalculator } from '../../../src/application/scanners/SafetyScoreCalculator.js';
import type { SafetyRuleLoader } from '../../../src/infrastructure/safety-rules/rule-loader.js';

describe('ScanSkillSafetyUseCase', () => {
  let useCase: ScanSkillSafetyUseCase;
  let mockSkillRepo: vi.Mocked<ISkillDataPort>;
  let mockScannerPort: vi.Mocked<ISafetyScannerPort>;
  let mockCache: vi.Mocked<ICachePort>;
  let mockRuleLoader: vi.Mocked<SafetyRuleLoader>;
  let mockParser: vi.Mocked<SkillContentParser>;
  let mockRegexMatcher: vi.Mocked<RegexRuleMatcher>;
  let mockAstAnalyzer: vi.Mocked<ASTCodeAnalyzer>;
  let mockSemanticAnalyzer: vi.Mocked<SemanticAnalyzer>;
  let mockScoreCalculator: vi.Mocked<SafetyScoreCalculator>;
  let mockLogger: vi.Mocked<LoggerPort>;

  const mockSkill: AISkillFile = {
    id: 'skill-123',
    name: 'Test Skill',
    description: 'Test',
    category: 'general',
    tags: [],
    sourceRepo: 'test/repo',
    filePath: 'test.md',
    platform: 'generic',
    language: 'multi',
    content: 'raw content',
    format: 'markdown',
    contentHash: 'hash',
    contentSizeBytes: 100,
    safetyLabel: SafetyLabel.UNANALYZED,
    author: 'Test',
    copyCount: 0,
    starCount: 0,
    viewCount: 0,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVerdict: ScanVerdict = {
    label: SafetyLabel.SAFE,
    score: 0,
    confidence: 1.0,
    findings: [],
    metadata: {
      scanDurationMs: 10,
      rulesApplied: 1,
      rulesMatched: 0,
      analyzersUsed: ['regex', 'ast', 'semantic'],
      scannerVersion: '1.0.0',
    },
  };

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  beforeEach(() => {
    mockSkillRepo = {
      findById: vi.fn(),
      updateSafetyLabel: vi.fn(),
    } as unknown as vi.Mocked<ISkillDataPort>;

    mockScannerPort = {
      saveResult: vi.fn().mockResolvedValue({ id: 'scan-res-123' }),
      getVersion: vi.fn().mockReturnValue('1.0.0'),
    } as unknown as vi.Mocked<ISafetyScannerPort>;

    mockCache = {
      delete: vi.fn(),
      deleteByPattern: vi.fn(),
    } as unknown as vi.Mocked<ICachePort>;

    mockRuleLoader = {
      loadRules: vi.fn().mockReturnValue([]),
    } as unknown as vi.Mocked<SafetyRuleLoader>;

    mockParser = {
      parse: vi
        .fn()
        .mockReturnValue({
          rawText: 'raw content',
          instructions: [],
          codeBlocks: [],
          inlineCommands: [],
          metadata: {},
        }),
    } as unknown as vi.Mocked<SkillContentParser>;

    mockRegexMatcher = {
      match: vi.fn().mockReturnValue([]),
    } as unknown as vi.Mocked<RegexRuleMatcher>;

    mockAstAnalyzer = {
      analyze: vi.fn().mockReturnValue([]),
    } as unknown as vi.Mocked<ASTCodeAnalyzer>;

    mockSemanticAnalyzer = {
      scan: vi.fn().mockReturnValue([]),
    } as unknown as vi.Mocked<SemanticAnalyzer>;

    mockScoreCalculator = {
      calculate: vi.fn().mockReturnValue(mockVerdict),
    } as unknown as vi.Mocked<SafetyScoreCalculator>;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as vi.Mocked<LoggerPort>;

    useCase = new ScanSkillSafetyUseCase(
      mockSkillRepo,
      mockScannerPort,
      mockCache,
      mockRuleLoader,
      mockParser,
      mockRegexMatcher,
      mockAstAnalyzer,
      mockSemanticAnalyzer,
      mockScoreCalculator,
      mockLogger,
    );
  });

  it('should return null if skill is not found', async () => {
    mockSkillRepo.findById.mockResolvedValue(null);
    const result = await useCase.execute('missing-id');
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Skill missing-id not found');
  });

  it('should process a valid skill and return the verdict', async () => {
    mockSkillRepo.findById.mockResolvedValue(mockSkill);

    const result = await useCase.execute('skill-123');

    expect(result).toEqual(mockVerdict);
    expect(mockParser.parse).toHaveBeenCalledWith(mockSkill.content, mockSkill.format);
    expect(mockScoreCalculator.calculate).toHaveBeenCalled();
    expect(mockScannerPort.saveResult).toHaveBeenCalled();
    expect(mockSkillRepo.updateSafetyLabel).toHaveBeenCalledWith(
      'skill-123',
      SafetyLabel.SAFE,
      'scan-res-123',
    );
    expect(mockCache.delete).toHaveBeenCalledWith('aegis:skills:skill-123');
  });

  it('should return null and not update label if an error occurs during processing', async () => {
    mockSkillRepo.findById.mockResolvedValue(mockSkill);
    mockParser.parse.mockImplementation(() => {
      throw new Error('Parsing failed');
    });

    const result = await useCase.execute('skill-123');

    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockScannerPort.saveResult).not.toHaveBeenCalled();
    expect(mockSkillRepo.updateSafetyLabel).not.toHaveBeenCalled();
  });
});
