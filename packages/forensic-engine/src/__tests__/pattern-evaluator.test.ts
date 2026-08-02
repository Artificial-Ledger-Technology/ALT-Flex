/**
 * @module pattern-evaluator.test
 * @description Unit tests for the Pattern Recognition Evaluator (P5-EVM-012).
 *
 * Verifies:
 * - Per-pattern Precision/Recall/F1 computation
 * - Macro and micro averaging
 * - Multi-label support
 * - Confusion matrix construction
 * - False positive / false negative analysis
 * - Threshold sensitivity analysis
 * - Full evaluation pipeline determinism
 * - Report generation
 *
 * @task P5-EVM-012
 */

import { describe, it, expect } from 'vitest';
import {
  computePerPatternMetrics,
  computeMacroAverages,
  computeMicroAverages,
  analyzeMisclassifications,
  computeThresholdSensitivity,
  evaluate,
} from '../evaluation/pattern-evaluator.js';
import { buildConfusionMatrix, formatConfusionMatrixMarkdown } from '../evaluation/confusion-matrix.js';
import { generateEvaluationReport } from '../evaluation/evaluation-report.js';
import { type SamplePredictions } from '../evaluation/evaluator-types.js';
import { type EvaluationEntry } from '../__tests__/fixtures/evaluation-dataset/evaluation-dataset.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const makeEntry = (
  id: string,
  patterns: string[],
): EvaluationEntry => ({
  id,
  txHash: '0x' + '0'.repeat(64),
  chain: 'ethereum',
  blockNumber: 1000000,
  protocol: `Protocol-${id}`,
  date: '2023-01-01',
  lossUSD: 1000000,
  primaryPatterns: patterns as any,
  expectedDetections: patterns.map((p) => ({
    patternId: p as any,
    confidenceRange: [0.8, 1.0] as [number, number],
  })),
  narrative: `Test narrative for ${id}`,
});

const makePrediction = (
  entryId: string,
  predictions: Array<{ patternId: string; confidence: number }>,
): SamplePredictions => ({
  entryId,
  predictions: predictions as any,
});

// ═══════════════════════════════════════════════════════════════════════════════
// Minimal dataset for controlled testing
// ═══════════════════════════════════════════════════════════════════════════════

const MINI_DATASET: EvaluationEntry[] = [
  makeEntry('EVD-T1', ['FLASH_LOAN', 'ORACLE_MANIPULATION']),
  makeEntry('EVD-T2', ['REENTRANCY']),
  makeEntry('EVD-T3', ['FLASH_LOAN']),
  makeEntry('EVD-T4', ['ACCESS_CONTROL']),
  makeEntry('EVD-T5', ['REENTRANCY', 'FLASH_LOAN']),
];

// Perfect predictions for mini dataset
const PERFECT_PREDICTIONS: SamplePredictions[] = [
  makePrediction('EVD-T1', [
    { patternId: 'FLASH_LOAN', confidence: 0.95 },
    { patternId: 'ORACLE_MANIPULATION', confidence: 0.90 },
  ]),
  makePrediction('EVD-T2', [
    { patternId: 'REENTRANCY', confidence: 0.92 },
  ]),
  makePrediction('EVD-T3', [
    { patternId: 'FLASH_LOAN', confidence: 0.88 },
  ]),
  makePrediction('EVD-T4', [
    { patternId: 'ACCESS_CONTROL', confidence: 0.96 },
  ]),
  makePrediction('EVD-T5', [
    { patternId: 'REENTRANCY', confidence: 0.85 },
    { patternId: 'FLASH_LOAN', confidence: 0.91 },
  ]),
];

// Predictions with some errors
const IMPERFECT_PREDICTIONS: SamplePredictions[] = [
  makePrediction('EVD-T1', [
    { patternId: 'FLASH_LOAN', confidence: 0.95 },
    // Missing ORACLE_MANIPULATION → false negative
    { patternId: 'REENTRANCY', confidence: 0.60 },  // false positive
  ]),
  makePrediction('EVD-T2', [
    { patternId: 'REENTRANCY', confidence: 0.92 },
  ]),
  makePrediction('EVD-T3', [
    { patternId: 'FLASH_LOAN', confidence: 0.20 },  // below threshold → false negative
  ]),
  makePrediction('EVD-T4', [
    { patternId: 'ACCESS_CONTROL', confidence: 0.96 },
  ]),
  makePrediction('EVD-T5', [
    { patternId: 'REENTRANCY', confidence: 0.85 },
    // Missing FLASH_LOAN → false negative
  ]),
];

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('PatternEvaluator', () => {
  // ─── Per-Pattern Metrics ──────────────────────────────────────────────────

  describe('computePerPatternMetrics', () => {
    it('should compute perfect scores for perfect predictions', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const metrics = computePerPatternMetrics(MINI_DATASET, map, 0.30);

      const flashLoan = metrics.find((m) => m.patternId === 'FLASH_LOAN')!;
      expect(flashLoan.tp).toBe(3);
      expect(flashLoan.fp).toBe(0);
      expect(flashLoan.fn).toBe(0);
      expect(flashLoan.precision).toBe(1.0);
      expect(flashLoan.recall).toBe(1.0);
      expect(flashLoan.f1).toBe(1.0);
    });

    it('should detect false negatives when patterns are missed', () => {
      const map = new Map(IMPERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const metrics = computePerPatternMetrics(MINI_DATASET, map, 0.30);

      const flashLoan = metrics.find((m) => m.patternId === 'FLASH_LOAN')!;
      // T1 detected, T3 below threshold (FN), T5 missing (FN) → TP=1, FN=2
      expect(flashLoan.tp).toBe(1);
      expect(flashLoan.fn).toBe(2);
      expect(flashLoan.recall).toBeLessThan(1.0);
    });

    it('should detect false positives when wrong patterns are predicted', () => {
      const map = new Map(IMPERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const metrics = computePerPatternMetrics(MINI_DATASET, map, 0.30);

      const reentrancy = metrics.find((m) => m.patternId === 'REENTRANCY')!;
      // T2 correct, T5 correct, T1 is FP → TP=2, FP=1
      expect(reentrancy.tp).toBe(2);
      expect(reentrancy.fp).toBe(1);
      expect(reentrancy.precision).toBeLessThan(1.0);
    });

    it('should return zero metrics for patterns with no ground truth and no predictions', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const metrics = computePerPatternMetrics(MINI_DATASET, map, 0.30);

      const selfDestruct = metrics.find((m) => m.patternId === 'SELF_DESTRUCT')!;
      expect(selfDestruct.tp).toBe(0);
      expect(selfDestruct.fp).toBe(0);
      expect(selfDestruct.fn).toBe(0);
      expect(selfDestruct.support).toBe(0);
      // Precision and recall are 0 when TP+FP=0 and TP+FN=0
      expect(selfDestruct.precision).toBe(0);
      expect(selfDestruct.recall).toBe(0);
      expect(selfDestruct.f1).toBe(0);
    });

    it('should return metrics for all 10 pattern categories', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const metrics = computePerPatternMetrics(MINI_DATASET, map, 0.30);

      expect(metrics).toHaveLength(10);
      const ids = metrics.map((m) => m.patternId);
      expect(ids).toContain('FLASH_LOAN');
      expect(ids).toContain('SELF_DESTRUCT');
      expect(ids).toContain('BRIDGE_EXPLOIT');
    });
  });

  // ─── Macro Averages ───────────────────────────────────────────────────────

  describe('computeMacroAverages', () => {
    it('should compute macro F1 = 1.0 for perfect predictions', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const metrics = computePerPatternMetrics(MINI_DATASET, map, 0.30);
      const macro = computeMacroAverages(metrics);

      // Only 4 patterns have support (FLASH_LOAN, REENTRANCY, ORACLE_MANIPULATION, ACCESS_CONTROL)
      // The other 6 have P=R=F1=0 but are still averaged
      // So macro F1 < 1.0 because 6/10 patterns contribute 0
      expect(macro.macroF1).toBeGreaterThan(0);
      expect(macro.macroF1).toBeLessThanOrEqual(1.0);
    });

    it('should return 0 for empty metrics array', () => {
      const macro = computeMacroAverages([]);
      expect(macro.macroPrecision).toBe(0);
      expect(macro.macroRecall).toBe(0);
      expect(macro.macroF1).toBe(0);
    });
  });

  // ─── Micro Averages ───────────────────────────────────────────────────────

  describe('computeMicroAverages', () => {
    it('should compute pooled micro metrics', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const metrics = computePerPatternMetrics(MINI_DATASET, map, 0.30);
      const micro = computeMicroAverages(metrics);

      // With perfect predictions, micro precision and recall should be 1.0
      expect(micro.microPrecision).toBe(1.0);
      expect(micro.microRecall).toBe(1.0);
      expect(micro.microF1).toBe(1.0);
    });

    it('should reflect errors in micro metrics', () => {
      const map = new Map(IMPERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const metrics = computePerPatternMetrics(MINI_DATASET, map, 0.30);
      const micro = computeMicroAverages(metrics);

      expect(micro.microF1).toBeLessThan(1.0);
      expect(micro.microF1).toBeGreaterThan(0);
    });
  });

  // ─── Confusion Matrix ─────────────────────────────────────────────────────

  describe('buildConfusionMatrix', () => {
    it('should build a 10x10 matrix', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const cm = buildConfusionMatrix(MINI_DATASET, map, 0.30);

      expect(cm.labels).toHaveLength(10);
      expect(cm.matrix).toHaveLength(10);
      expect(cm.matrix[0]).toHaveLength(10);
    });

    it('should have non-zero diagonal for correct predictions', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const cm = buildConfusionMatrix(MINI_DATASET, map, 0.30);

      // FLASH_LOAN is index 0, should have 3 on diagonal
      const flashIdx = cm.labels.indexOf('FLASH_LOAN');
      expect(cm.matrix[flashIdx][flashIdx]).toBe(3);
    });

    it('should format as markdown table', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const cm = buildConfusionMatrix(MINI_DATASET, map, 0.30);
      const md = formatConfusionMatrixMarkdown(cm);

      expect(md).toContain('Truth \\\\ Pred');
      expect(md).toContain('FLASH_LO');
      expect(md).toContain('|');
    });
  });

  // ─── Misclassification Analysis ───────────────────────────────────────────

  describe('analyzeMisclassifications', () => {
    it('should return no misclassifications for perfect predictions', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const misses = analyzeMisclassifications(MINI_DATASET, map, 0.30);
      expect(misses).toHaveLength(0);
    });

    it('should detect false negatives', () => {
      const map = new Map(IMPERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const misses = analyzeMisclassifications(MINI_DATASET, map, 0.30);

      const fns = misses.filter((m) => m.type === 'false_negative');
      expect(fns.length).toBeGreaterThan(0);

      // ORACLE_MANIPULATION is missing from T1
      const oracleF = fns.find(
        (f) => f.entryId === 'EVD-T1' && f.patternId === 'ORACLE_MANIPULATION',
      );
      expect(oracleF).toBeDefined();
    });

    it('should detect false positives', () => {
      const map = new Map(IMPERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const misses = analyzeMisclassifications(MINI_DATASET, map, 0.30);

      const fps = misses.filter((m) => m.type === 'false_positive');
      expect(fps.length).toBeGreaterThan(0);

      // REENTRANCY is falsely predicted for T1
      const reentrancyFP = fps.find(
        (f) => f.entryId === 'EVD-T1' && f.patternId === 'REENTRANCY',
      );
      expect(reentrancyFP).toBeDefined();
      expect(reentrancyFP!.confidence).toBe(0.60);
    });

    it('should handle missing predictions as false negatives', () => {
      const map = new Map<string, SamplePredictions>();
      // Only provide prediction for T1, rest are missing
      map.set('EVD-T1', PERFECT_PREDICTIONS[0]);

      const misses = analyzeMisclassifications(MINI_DATASET, map, 0.30);
      const fns = misses.filter((m) => m.type === 'false_negative');

      // T2, T3, T4, T5 all have missing predictions
      expect(fns.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ─── Threshold Sensitivity ────────────────────────────────────────────────

  describe('computeThresholdSensitivity', () => {
    it('should produce metrics at each requested threshold', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const thresholds = [0.30, 0.50, 0.80, 0.99];
      const sensitivity = computeThresholdSensitivity(MINI_DATASET, map, thresholds);

      expect(sensitivity).toHaveLength(4);
      expect(sensitivity[0].threshold).toBe(0.30);
      expect(sensitivity[3].threshold).toBe(0.99);
    });

    it('should show lower recall at higher thresholds', () => {
      const map = new Map(PERFECT_PREDICTIONS.map((p) => [p.entryId, p]));
      const sensitivity = computeThresholdSensitivity(MINI_DATASET, map, [0.30, 0.99]);

      // At threshold 0.99, most predictions will be below threshold → lower recall
      expect(sensitivity[1].macroRecall).toBeLessThanOrEqual(sensitivity[0].macroRecall);
    });
  });

  // ─── Full Evaluation Pipeline ─────────────────────────────────────────────

  describe('evaluate', () => {
    it('should produce a complete EvaluationReport', () => {
      const report = evaluate(MINI_DATASET, PERFECT_PREDICTIONS, {
        threshold: 0.30,
        engineVersion: '3.1.0-test',
      });

      expect(report.totalSamples).toBe(5);
      expect(report.engineVersion).toBe('3.1.0-test');
      expect(report.primaryThreshold).toBe(0.30);
      expect(report.perPatternMetrics).toHaveLength(10);
      expect(report.confusionMatrix.labels).toHaveLength(10);
      expect(report.thresholdSensitivity.length).toBeGreaterThan(0);
      expect(typeof report.meetsTarget).toBe('boolean');
    });

    it('should be deterministic given same inputs', () => {
      const r1 = evaluate(MINI_DATASET, PERFECT_PREDICTIONS, { threshold: 0.30 });
      const r2 = evaluate(MINI_DATASET, PERFECT_PREDICTIONS, { threshold: 0.30 });

      // All numeric metrics should be identical
      expect(r1.macroF1).toBe(r2.macroF1);
      expect(r1.microF1).toBe(r2.microF1);
      expect(r1.perPatternMetrics).toEqual(r2.perPatternMetrics);
      expect(r1.confusionMatrix.matrix).toEqual(r2.confusionMatrix.matrix);
    });

    it('should detect that perfect predictions miss the target when patterns have no support', () => {
      // Since 6/10 patterns have no support in MINI_DATASET,
      // their F1=0 drags down macro F1 below 0.80
      const report = evaluate(MINI_DATASET, PERFECT_PREDICTIONS, { threshold: 0.30 });
      // 4 patterns at F1=1.0, 6 at F1=0.0 → macro F1 = 0.4
      expect(report.macroF1).toBe(0.4);
      expect(report.meetsTarget).toBe(false);
    });
  });

  // ─── Report Generation ────────────────────────────────────────────────────

  describe('generateEvaluationReport', () => {
    it('should produce a valid markdown report', () => {
      const report = evaluate(MINI_DATASET, PERFECT_PREDICTIONS, { threshold: 0.30 });
      const markdown = generateEvaluationReport(report);

      expect(markdown).toContain('# Exploit Pattern Recognizer — Evaluation Report');
      expect(markdown).toContain('## 1. Summary Metrics');
      expect(markdown).toContain('## 2. Per-Pattern Metrics');
      expect(markdown).toContain('## 3. Confusion Matrix');
      expect(markdown).toContain('## 4. Threshold Sensitivity Analysis');
      expect(markdown).toContain('## 5. Misclassification Analysis');
      expect(markdown).toContain('P5-EVM-012');
    });

    it('should include the pass/fail indicator', () => {
      const report = evaluate(MINI_DATASET, IMPERFECT_PREDICTIONS, { threshold: 0.30 });
      const markdown = generateEvaluationReport(report);

      expect(markdown).toContain('❌ FAIL');
    });
  });
});
