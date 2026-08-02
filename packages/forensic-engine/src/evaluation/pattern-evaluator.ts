/**
 * @module pattern-evaluator
 * @description Core evaluation engine for the Exploit Pattern Recognizer.
 *
 * Measures classification accuracy against the labeled evaluation dataset
 * by computing per-pattern Precision/Recall/F1, macro/micro averages,
 * confusion matrix, misclassification analysis, and threshold sensitivity.
 *
 * All computations are deterministic given the same dataset and predictions.
 *
 * @hexagonal Application Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-012
 */

import { type ExploitPatternId } from '../domain/pattern-types.js';
import {
  type PatternMetrics,
  type MisclassificationEntry,
  type ThresholdPoint,
  type EvaluationReport,
  type SamplePredictions,
  ALL_PATTERN_IDS,
} from './evaluator-types.js';
import {
  type EvaluationEntry,
  type EvaluationDataset,
} from '../__tests__/fixtures/evaluation-dataset/evaluation-dataset.schema.js';
import { buildConfusionMatrix } from './confusion-matrix.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Default confidence threshold for binary classification */
const DEFAULT_THRESHOLD = 0.30;

/** Target macro F1 score as defined by acceptance criteria */
const TARGET_MACRO_F1 = 0.80;

/** Thresholds to evaluate for sensitivity analysis */
const SENSITIVITY_THRESHOLDS = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90];

// ═══════════════════════════════════════════════════════════════════════════════
// Per-Pattern Metric Computation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * computePerPatternMetrics — Computes TP/FP/FN/TN and derived metrics for each pattern.
 *
 * Uses binary relevance: for each pattern independently, check whether the
 * recognizer detected it (above threshold) vs. whether the ground truth
 * includes it.
 *
 * @param dataset - Labeled ground-truth entries
 * @param predictionsMap - Predictions indexed by entry ID
 * @param threshold - Confidence cutoff for positive classification
 * @returns Array of PatternMetrics, one per pattern category
 */
export function computePerPatternMetrics(
  dataset: EvaluationDataset,
  predictionsMap: ReadonlyMap<string, SamplePredictions>,
  threshold: number = DEFAULT_THRESHOLD,
): PatternMetrics[] {
  return ALL_PATTERN_IDS.map((patternId) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;

    for (const entry of dataset) {
      const groundTruth = new Set(entry.primaryPatterns);
      const isPositiveGT = groundTruth.has(patternId);

      const sample = predictionsMap.get(entry.id);
      const prediction = sample?.predictions.find((p) => p.patternId === patternId);
      const isPositivePred = prediction !== undefined && prediction.confidence >= threshold;

      if (isPositiveGT && isPositivePred) tp++;
      else if (!isPositiveGT && isPositivePred) fp++;
      else if (isPositiveGT && !isPositivePred) fn++;
      else tn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      patternId,
      tp,
      fp,
      fn,
      tn,
      precision: round4(precision),
      recall: round4(recall),
      f1: round4(f1),
      support: tp + fn,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Macro & Micro Averages
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * computeMacroAverages — Computes unweighted averages of per-pattern metrics.
 */
export function computeMacroAverages(
  metrics: readonly PatternMetrics[],
): { macroPrecision: number; macroRecall: number; macroF1: number } {
  const n = metrics.length;
  if (n === 0) return { macroPrecision: 0, macroRecall: 0, macroF1: 0 };

  const sumP = metrics.reduce((s, m) => s + m.precision, 0);
  const sumR = metrics.reduce((s, m) => s + m.recall, 0);
  const sumF = metrics.reduce((s, m) => s + m.f1, 0);

  return {
    macroPrecision: round4(sumP / n),
    macroRecall: round4(sumR / n),
    macroF1: round4(sumF / n),
  };
}

/**
 * computeMicroAverages — Computes pooled TP/FP/FN metrics across all patterns.
 */
export function computeMicroAverages(
  metrics: readonly PatternMetrics[],
): { microPrecision: number; microRecall: number; microF1: number } {
  const totalTP = metrics.reduce((s, m) => s + m.tp, 0);
  const totalFP = metrics.reduce((s, m) => s + m.fp, 0);
  const totalFN = metrics.reduce((s, m) => s + m.fn, 0);

  const microPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const microRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const microF1 =
    microPrecision + microRecall > 0
      ? (2 * microPrecision * microRecall) / (microPrecision + microRecall)
      : 0;

  return {
    microPrecision: round4(microPrecision),
    microRecall: round4(microRecall),
    microF1: round4(microF1),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Misclassification Analysis
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * analyzeMisclassifications — Identifies all false positives and false negatives.
 */
export function analyzeMisclassifications(
  dataset: EvaluationDataset,
  predictionsMap: ReadonlyMap<string, SamplePredictions>,
  threshold: number = DEFAULT_THRESHOLD,
): MisclassificationEntry[] {
  const results: MisclassificationEntry[] = [];

  for (const entry of dataset) {
    const groundTruth = new Set(entry.primaryPatterns);
    const sample = predictionsMap.get(entry.id);
    if (!sample) {
      // All ground-truth patterns are false negatives
      for (const pattern of entry.primaryPatterns) {
        results.push({
          entryId: entry.id,
          protocol: entry.protocol,
          patternId: pattern,
          type: 'false_negative',
          confidence: 0,
          analysis: `No predictions available for ${entry.protocol}; pattern ${pattern} missed entirely.`,
        });
      }
      continue;
    }

    // Check for false negatives: ground truth patterns not predicted above threshold
    for (const truthPattern of entry.primaryPatterns) {
      const pred = sample.predictions.find((p) => p.patternId === truthPattern);
      if (!pred || pred.confidence < threshold) {
        results.push({
          entryId: entry.id,
          protocol: entry.protocol,
          patternId: truthPattern,
          type: 'false_negative',
          confidence: pred?.confidence ?? 0,
          analysis: pred
            ? `Pattern ${truthPattern} detected with confidence ${round4(pred.confidence)} but below threshold ${threshold}.`
            : `Pattern ${truthPattern} not detected at all for ${entry.protocol}.`,
        });
      }
    }

    // Check for false positives: predicted patterns not in ground truth
    for (const pred of sample.predictions) {
      if (pred.confidence >= threshold && !groundTruth.has(pred.patternId)) {
        results.push({
          entryId: entry.id,
          protocol: entry.protocol,
          patternId: pred.patternId,
          type: 'false_positive',
          confidence: pred.confidence,
          analysis: `Pattern ${pred.patternId} incorrectly detected with confidence ${round4(pred.confidence)} for ${entry.protocol}.`,
        });
      }
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Threshold Sensitivity Analysis
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * computeThresholdSensitivity — Evaluates metrics at multiple confidence thresholds.
 */
export function computeThresholdSensitivity(
  dataset: EvaluationDataset,
  predictionsMap: ReadonlyMap<string, SamplePredictions>,
  thresholds: readonly number[] = SENSITIVITY_THRESHOLDS,
): ThresholdPoint[] {
  return thresholds.map((threshold) => {
    const perPattern = computePerPatternMetrics(dataset, predictionsMap, threshold);
    const macro = computeMacroAverages(perPattern);

    const totalTP = perPattern.reduce((s, m) => s + m.tp, 0);
    const totalFP = perPattern.reduce((s, m) => s + m.fp, 0);
    const totalFN = perPattern.reduce((s, m) => s + m.fn, 0);

    return {
      threshold,
      macroPrecision: macro.macroPrecision,
      macroRecall: macro.macroRecall,
      macroF1: macro.macroF1,
      totalTP,
      totalFP,
      totalFN,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Full Evaluation Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * evaluate — Runs the complete evaluation pipeline and produces a full report.
 *
 * This is the primary entry point for the Pattern Recognition Evaluator.
 * It is deterministic: given the same dataset and predictions, it will
 * always produce the same report.
 *
 * @param dataset - The labeled evaluation dataset
 * @param predictions - Array of predictions for each dataset entry
 * @param options - Optional configuration
 * @returns Complete EvaluationReport
 */
export function evaluate(
  dataset: EvaluationDataset,
  predictions: readonly SamplePredictions[],
  options: {
    threshold?: number;
    engineVersion?: string;
  } = {},
): EvaluationReport {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const engineVersion = options.engineVersion ?? '3.1.0-alpha';

  // Build lookup map
  const predictionsMap = new Map<string, SamplePredictions>();
  for (const sample of predictions) {
    predictionsMap.set(sample.entryId, sample);
  }

  // Compute all metrics
  const perPatternMetrics = computePerPatternMetrics(dataset, predictionsMap, threshold);
  const macro = computeMacroAverages(perPatternMetrics);
  const micro = computeMicroAverages(perPatternMetrics);
  const confusionMatrix = buildConfusionMatrix(dataset, predictionsMap, threshold);
  const misclassifications = analyzeMisclassifications(dataset, predictionsMap, threshold);
  const thresholdSensitivity = computeThresholdSensitivity(dataset, predictionsMap);

  return {
    timestamp: new Date().toISOString(),
    engineVersion,
    totalSamples: dataset.length,
    perPatternMetrics,
    macroPrecision: macro.macroPrecision,
    macroRecall: macro.macroRecall,
    macroF1: macro.macroF1,
    microPrecision: micro.microPrecision,
    microRecall: micro.microRecall,
    microF1: micro.microF1,
    confusionMatrix,
    misclassifications,
    thresholdSensitivity,
    meetsTarget: macro.macroF1 >= TARGET_MACRO_F1,
    primaryThreshold: threshold,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/** Round to 4 decimal places for deterministic output */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
