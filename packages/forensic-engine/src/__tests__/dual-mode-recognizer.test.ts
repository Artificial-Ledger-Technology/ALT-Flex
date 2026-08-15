/**
 * @module dual-mode-recognizer.test
 * @description Integration tests for the dual-mode ExploitPatternRecognizer.
 *
 * Tests cover:
 * - Heuristic-only mode (backward compatibility)
 * - ML mode with mock classifier
 * - Auto mode switching between ML and heuristic
 * - Mode indicator in analysis metadata
 *
 * @task P7-ML-003
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExploitPatternRecognizer } from '../adapters/patterns/exploit-pattern-recognizer.js';
import type { OnnxExploitClassifier } from '../adapters/ml/onnx-classifier.js';
import type { TransactionTraceResult, CallTreeNode, TraceSummary } from '../domain/trace-types.js';
import type { StorageDiff } from '../domain/storage-types.js';
import type { PatternMatch } from '../domain/pattern-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Factories
// ═══════════════════════════════════════════════════════════════════════════════

function createMockTrace(
  overrides: Partial<TransactionTraceResult> = {},
  summaryOverrides: Partial<TraceSummary> = {},
  callTreeOverrides: Partial<CallTreeNode> = {},
): TransactionTraceResult {
  const rootNode: CallTreeNode = {
    id: '0-0',
    depth: 0,
    type: 'CALL',
    from: '0xattacker',
    to: '0xtarget',
    value: 0n,
    gas: 1000000n,
    gasUsed: 500000n,
    input: '0x',
    output: '0x',
    children: [],
    ...callTreeOverrides,
  };

  const summary: TraceSummary = {
    totalCalls: 1,
    maxDepth: 0,
    uniqueContracts: 2,
    totalValueTransferred: 0n,
    valueTransfers: 0,
    hasReentrancy: false,
    hasDelegateCalls: false,
    reentrancyMatches: [],
    delegateCallMatches: [],
    categorizedCalls: [],
    ...summaryOverrides,
  };

  return {
    txHash: '0xabc123',
    chain: 'ethereum',
    callTree: rootNode,
    events: [],
    valueFlow: [],
    gasBreakdown: {
      byContract: new Map(),
      totalGas: 100000n,
    },
    summary,
    ...overrides,
  } as TransactionTraceResult;
}

function createMockClassifier(opts: {
  ready: boolean;
  predictions?: PatternMatch[];
}): OnnxExploitClassifier {
  return {
    isReady: vi.fn().mockReturnValue(opts.ready),
    predict: vi.fn().mockResolvedValue(opts.predictions ?? []),
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    getManifest: vi.fn().mockReturnValue(null),
  } as unknown as OnnxExploitClassifier;
}

const defaultMetadata = {
  chainId: 1,
  lossUsd: 1000000,
  preAuditStatus: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('ExploitPatternRecognizer — Dual-Mode', () => {
  let trace: TransactionTraceResult;
  const diffs: StorageDiff[] = [];

  beforeEach(() => {
    trace = createMockTrace();
  });

  // ── Backward Compatibility ──────────────────────────────────────────────────

  describe('heuristic mode (backward-compatible)', () => {
    it('should work with no constructor arguments (original API)', () => {
      const recognizer = new ExploitPatternRecognizer();

      const result = recognizer.analyze(trace, diffs);

      expect(result).toBeDefined();
      expect(result.analysisMetadata).toBeDefined();
      expect(result.analysisMetadata.patternsEvaluated).toBe(10);
      expect(typeof result.analysisMetadata.detectionDurationMs).toBe('number');
    });

    it('should work with legacy custom config argument', () => {
      const recognizer = new ExploitPatternRecognizer({
        FLASH_LOAN: { minConfidence: 0.9 },
      } as any);

      const result = recognizer.analyze(trace, diffs);
      expect(result).toBeDefined();
    });

    it('should report heuristic mode as default', () => {
      const recognizer = new ExploitPatternRecognizer();
      expect(recognizer.operatingMode).toBe('heuristic');
    });

    it('should maintain all 10 registered detectors', () => {
      const recognizer = new ExploitPatternRecognizer();
      expect(recognizer.registeredDetectors).toHaveLength(10);
      expect(recognizer.registeredDetectors).toContain('FLASH_LOAN');
      expect(recognizer.registeredDetectors).toContain('BRIDGE_EXPLOIT');
    });
  });

  // ── ML Mode ─────────────────────────────────────────────────────────────────

  describe('ML mode', () => {
    it('should return ML predictions via analyzeWithMl', async () => {
      const mlPredictions: PatternMatch[] = [
        {
          patternId: 'REENTRANCY',
          patternName: 'Reentrancy',
          confidence: 0.92,
          description: 'ML model detected Reentrancy pattern with 92.0% confidence',
          evidence: {
            callNodeIds: [],
            storageSlots: [],
            eventSignatures: [],
            details: { source: 'ml_onnx_inference', modelType: 'xgboost_ovr', rawConfidence: 0.92 },
          },
        },
      ];

      const classifier = createMockClassifier({
        ready: true,
        predictions: mlPredictions,
      });

      const recognizer = new ExploitPatternRecognizer({
        mode: 'ml',
        mlClassifier: classifier,
      });

      const result = await recognizer.analyzeWithMl(trace, diffs, defaultMetadata);

      expect(result.patterns).toHaveLength(1);
      expect(result.primaryPattern).toBe('REENTRANCY');
      expect(result.overallConfidence).toBe(0.92);
      expect(result.analysisMetadata.patternsEvaluated).toBe(10);
    });

    it('should throw if ML classifier is not provided', async () => {
      const recognizer = new ExploitPatternRecognizer({ mode: 'ml' });

      await expect(
        recognizer.analyzeWithMl(trace, diffs, defaultMetadata),
      ).rejects.toThrow('ML classifier is not available');
    });

    it('should throw if ML classifier is not ready', async () => {
      const classifier = createMockClassifier({ ready: false });
      const recognizer = new ExploitPatternRecognizer({
        mode: 'ml',
        mlClassifier: classifier,
      });

      await expect(
        recognizer.analyzeWithMl(trace, diffs, defaultMetadata),
      ).rejects.toThrow('ML classifier is not available');
    });
  });

  // ── Auto Mode ───────────────────────────────────────────────────────────────

  describe('auto mode', () => {
    it('should use ML when classifier is ready', async () => {
      const mlPredictions: PatternMatch[] = [
        {
          patternId: 'FLASH_LOAN',
          patternName: 'Flash Loan',
          confidence: 0.88,
          description: 'ML model detected Flash Loan pattern with 88.0% confidence',
          evidence: {
            callNodeIds: [],
            storageSlots: [],
            eventSignatures: [],
            details: { source: 'ml_onnx_inference', modelType: 'xgboost_ovr', rawConfidence: 0.88 },
          },
        },
      ];

      const classifier = createMockClassifier({
        ready: true,
        predictions: mlPredictions,
      });

      const recognizer = new ExploitPatternRecognizer({
        mode: 'auto',
        mlClassifier: classifier,
      });

      const result = await recognizer.analyzeAuto(trace, diffs, defaultMetadata);

      expect(result.primaryPattern).toBe('FLASH_LOAN');
      expect(result.overallConfidence).toBe(0.88);
      // Verify classifier.predict was called
      expect(classifier.predict).toHaveBeenCalled();
    });

    it('should fall back to heuristic when classifier is not ready', async () => {
      const classifier = createMockClassifier({ ready: false });

      const recognizer = new ExploitPatternRecognizer({
        mode: 'auto',
        mlClassifier: classifier,
      });

      const result = await recognizer.analyzeAuto(trace, diffs, defaultMetadata);

      expect(result).toBeDefined();
      expect(result.analysisMetadata.patternsEvaluated).toBe(10);
      // Verify classifier.predict was NOT called
      expect(classifier.predict).not.toHaveBeenCalled();
    });

    it('should fall back to heuristic when no classifier is provided', async () => {
      const recognizer = new ExploitPatternRecognizer({ mode: 'auto' });

      const result = await recognizer.analyzeAuto(trace, diffs, defaultMetadata);

      expect(result).toBeDefined();
      expect(result.analysisMetadata.patternsEvaluated).toBe(10);
    });

    it('should fall back to heuristic when metadata is not provided', async () => {
      const classifier = createMockClassifier({ ready: true });
      const recognizer = new ExploitPatternRecognizer({
        mode: 'auto',
        mlClassifier: classifier,
      });

      const result = await recognizer.analyzeAuto(trace, diffs);

      expect(result).toBeDefined();
      // Without metadata, cannot run ML — falls back to heuristic
      expect(classifier.predict).not.toHaveBeenCalled();
    });
  });

  // ── Result Format Consistency ───────────────────────────────────────────────

  describe('result format consistency', () => {
    it('should return null primaryPattern when ML finds no matches', async () => {
      const classifier = createMockClassifier({
        ready: true,
        predictions: [],
      });

      const recognizer = new ExploitPatternRecognizer({
        mode: 'ml',
        mlClassifier: classifier,
      });

      const result = await recognizer.analyzeWithMl(trace, diffs, defaultMetadata);

      expect(result.primaryPattern).toBeNull();
      expect(result.overallConfidence).toBe(0.0);
      expect(result.patterns).toHaveLength(0);
    });

    it('should return consistent PatternDetectionResult shape for both modes', async () => {
      // Heuristic result
      const heuristicRecognizer = new ExploitPatternRecognizer();
      const heuristicResult = heuristicRecognizer.analyze(trace, diffs);

      // ML result
      const classifier = createMockClassifier({ ready: true, predictions: [] });
      const mlRecognizer = new ExploitPatternRecognizer({
        mode: 'ml',
        mlClassifier: classifier,
      });
      const mlResult = await mlRecognizer.analyzeWithMl(trace, diffs, defaultMetadata);

      // Both should have the same shape
      expect(Object.keys(heuristicResult)).toEqual(Object.keys(mlResult));
      expect(Object.keys(heuristicResult.analysisMetadata)).toEqual(
        Object.keys(mlResult.analysisMetadata),
      );
    });
  });
});
