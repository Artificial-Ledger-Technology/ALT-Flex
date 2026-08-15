/**
 * @module evaluator-types
 * @description Type definitions for the Pattern Recognition Evaluator.
 *
 * Defines the vocabulary for measuring the Exploit Pattern Recognizer's
 * classification accuracy against the labeled evaluation dataset.
 * All metrics follow standard Information Retrieval definitions
 * (Precision, Recall, F1-score) adapted for multi-label classification.
 *
 * @hexagonal Application Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-012
 */

import { type ExploitPatternId } from '../domain/pattern-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// All 10 Canonical Pattern IDs (constant array for iteration)
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_PATTERN_IDS: readonly ExploitPatternId[] = [
  'FLASH_LOAN',
  'REENTRANCY',
  'ORACLE_MANIPULATION',
  'ACCESS_CONTROL',
  'ARITHMETIC_OVERFLOW',
  'FRONT_RUNNING',
  'DELEGATE_CALL_INJECTION',
  'SELF_DESTRUCT',
  'LOGIC_ERROR',
  'BRIDGE_EXPLOIT',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Per-Pattern Metrics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PatternMetrics — Precision, Recall, and F1 for a single pattern category.
 */
export interface PatternMetrics {
  /** The pattern being evaluated */
  readonly patternId: ExploitPatternId;

  /** True Positives: correctly detected */
  readonly tp: number;

  /** False Positives: incorrectly detected (not in ground truth) */
  readonly fp: number;

  /** False Negatives: missed detections (in ground truth, not detected) */
  readonly fn: number;

  /** True Negatives: correctly not detected */
  readonly tn: number;

  /** Precision = TP / (TP + FP). 0 if TP + FP = 0. */
  readonly precision: number;

  /** Recall = TP / (TP + FN). 0 if TP + FN = 0. */
  readonly recall: number;

  /** F1 = 2 * (Precision * Recall) / (Precision + Recall). 0 if both are 0. */
  readonly f1: number;

  /** Support: total ground-truth positives for this pattern (TP + FN) */
  readonly support: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Confusion Matrix
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ConfusionMatrix — Pattern × Pattern co-occurrence matrix.
 *
 * Cell [i][j] represents how many times pattern j was predicted
 * when pattern i was the ground truth label.
 */
export interface ConfusionMatrix {
  /** Ordered list of pattern labels (row/column headers) */
  readonly labels: readonly ExploitPatternId[];

  /** 2D matrix: matrix[i][j] = count */
  readonly matrix: readonly (readonly number[])[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// False Positive / False Negative Analysis
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * MisclassificationEntry — A single false positive or false negative instance.
 */
export interface MisclassificationEntry {
  /** Dataset entry ID (e.g., "EVD-001") */
  readonly entryId: string;

  /** Protocol name for context */
  readonly protocol: string;

  /** The pattern that was incorrectly detected (FP) or missed (FN) */
  readonly patternId: ExploitPatternId;

  /** 'false_positive' or 'false_negative' */
  readonly type: 'false_positive' | 'false_negative';

  /** Confidence score from the recognizer (0 for FN) */
  readonly confidence: number;

  /** Brief explanation */
  readonly analysis: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Threshold Sensitivity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ThresholdPoint — Metrics at a specific confidence threshold.
 */
export interface ThresholdPoint {
  /** The confidence threshold applied */
  readonly threshold: number;

  /** Macro-averaged precision at this threshold */
  readonly macroPrecision: number;

  /** Macro-averaged recall at this threshold */
  readonly macroRecall: number;

  /** Macro-averaged F1 at this threshold */
  readonly macroF1: number;

  /** Total true positives across all patterns */
  readonly totalTP: number;

  /** Total false positives across all patterns */
  readonly totalFP: number;

  /** Total false negatives across all patterns */
  readonly totalFN: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Full Evaluation Report
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EvaluationReport — Complete output from the Pattern Recognition Evaluator.
 *
 * Contains all metrics, confusion matrix, error analysis, and threshold
 * sensitivity data required for thesis appendix reporting.
 */
export interface EvaluationReport {
  /** ISO 8601 timestamp of when the evaluation was run */
  readonly timestamp: string;

  /** Engine version that produced the predictions */
  readonly engineVersion: string;

  /** Number of dataset entries evaluated */
  readonly totalSamples: number;

  /** Per-pattern precision, recall, F1 */
  readonly perPatternMetrics: readonly PatternMetrics[];

  /** Macro-averaged precision across all 10 patterns */
  readonly macroPrecision: number;

  /** Macro-averaged recall across all 10 patterns */
  readonly macroRecall: number;

  /** Macro-averaged F1 across all 10 patterns */
  readonly macroF1: number;

  /** Micro-averaged precision (pooled TP/FP/FN) */
  readonly microPrecision: number;

  /** Micro-averaged recall (pooled TP/FP/FN) */
  readonly microRecall: number;

  /** Micro-averaged F1 (pooled TP/FP/FN) */
  readonly microF1: number;

  /** Pattern × Pattern confusion matrix */
  readonly confusionMatrix: ConfusionMatrix;

  /** Detailed false positive and false negative analysis */
  readonly misclassifications: readonly MisclassificationEntry[];

  /** Threshold sensitivity analysis at various confidence cutoffs */
  readonly thresholdSensitivity: readonly ThresholdPoint[];

  /** Whether the macro F1 meets the target threshold of 0.80 */
  readonly meetsTarget: boolean;

  /** The confidence threshold used for the primary evaluation */
  readonly primaryThreshold: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Recognizer Prediction Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PatternPrediction — A single prediction from the Exploit Pattern Recognizer.
 *
 * This is the evaluator's input interface — it does not depend on the
 * recognizer's internal implementation.
 */
export interface PatternPrediction {
  /** The predicted pattern */
  readonly patternId: ExploitPatternId;

  /** Confidence score [0.0, 1.0] */
  readonly confidence: number;
}

/**
 * SamplePredictions — All predictions for a single evaluation dataset entry.
 */
export interface SamplePredictions {
  /** Dataset entry ID this prediction corresponds to */
  readonly entryId: string;

  /** All pattern predictions for this sample (may be empty) */
  readonly predictions: readonly PatternPrediction[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Comparative Evaluation (Thesis 1 vs Thesis 2)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ModelComparison — Head-to-head metrics for a single pattern or average.
 */
export interface ModelComparison {
  /** The pattern ID or 'MACRO_AVERAGE' / 'MICRO_AVERAGE' */
  readonly patternId: ExploitPatternId | 'MACRO_AVERAGE' | 'MICRO_AVERAGE';

  /** F1 score from the heuristic detectors */
  readonly heuristicF1: number;

  /** F1 score from the ML model */
  readonly mlF1: number;

  /** Delta: mlF1 - heuristicF1 */
  readonly f1Delta: number;
}

/**
 * ComparativeEvaluationReport — Complete comparison report (Heuristic vs ML).
 */
export interface ComparativeEvaluationReport {
  /** ISO 8601 timestamp of when the evaluation was run */
  readonly timestamp: string;

  /** Number of dataset entries evaluated */
  readonly datasetSize: number;

  /** Full evaluation report using the Heuristic detectors */
  readonly heuristicReport: EvaluationReport;

  /** Full evaluation report using the ML model */
  readonly mlReport: EvaluationReport;

  /** Side-by-side comparison of F1 scores */
  readonly comparisons: readonly ModelComparison[];

  /** True if ML macro F1 > Heuristic macro F1 */
  readonly overallImprovement: boolean;
}
