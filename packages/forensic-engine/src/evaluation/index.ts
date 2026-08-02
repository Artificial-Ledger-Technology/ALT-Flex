/**
 * @module evaluation barrel
 * @description Public API for the Pattern Recognition Evaluator.
 * @task P5-EVM-012
 */

export {
  type PatternMetrics,
  type ConfusionMatrix,
  type MisclassificationEntry,
  type ThresholdPoint,
  type EvaluationReport,
  type PatternPrediction,
  type SamplePredictions,
  ALL_PATTERN_IDS,
} from './evaluator-types.js';

export {
  evaluate,
  computePerPatternMetrics,
  computeMacroAverages,
  computeMicroAverages,
  analyzeMisclassifications,
  computeThresholdSensitivity,
} from './pattern-evaluator.js';

export {
  buildConfusionMatrix,
  formatConfusionMatrixMarkdown,
} from './confusion-matrix.js';

export { generateEvaluationReport } from './evaluation-report.js';
