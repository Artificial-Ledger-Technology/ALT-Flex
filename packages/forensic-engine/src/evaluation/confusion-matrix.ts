/**
 * @module confusion-matrix
 * @description Builds a Pattern × Pattern confusion matrix from evaluation results.
 *
 * The confusion matrix tracks co-occurrences between ground-truth labels
 * and predicted labels, enabling visual identification of systematic
 * misclassification tendencies (e.g., ORACLE_MANIPULATION frequently
 * predicted when FLASH_LOAN is the ground truth).
 *
 * @hexagonal Application Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-012
 */

import { type ExploitPatternId } from '../domain/pattern-types.js';
import {
  type ConfusionMatrix,
  type SamplePredictions,
  ALL_PATTERN_IDS,
} from './evaluator-types.js';
import {
  type EvaluationEntry,
} from '../__tests__/fixtures/evaluation-dataset/evaluation-dataset.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Confusion Matrix Builder
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * buildConfusionMatrix — Constructs a 10×10 confusion matrix from predictions.
 *
 * For each sample, maps every ground-truth pattern to every predicted pattern.
 * Multi-label entries contribute to multiple rows/columns.
 *
 * Matrix interpretation:
 * - Row i = ground-truth pattern i
 * - Column j = predicted pattern j
 * - Diagonal = correct predictions
 * - Off-diagonal = misclassifications
 *
 * @param dataset - The labeled evaluation dataset
 * @param predictions - Predictions keyed by entry ID
 * @param threshold - Confidence threshold for counting a prediction as positive
 * @returns The complete confusion matrix
 */
export function buildConfusionMatrix(
  dataset: readonly EvaluationEntry[],
  predictions: ReadonlyMap<string, SamplePredictions>,
  threshold: number,
): ConfusionMatrix {
  const labels = ALL_PATTERN_IDS;
  const size = labels.length;

  // Initialize matrix with zeros
  const matrix: number[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0),
  );

  // Build label-to-index lookup
  const labelIndex = new Map<ExploitPatternId, number>();
  for (let i = 0; i < labels.length; i++) {
    labelIndex.set(labels[i], i);
  }

  for (const entry of dataset) {
    const samplePredictions = predictions.get(entry.id);
    if (!samplePredictions) continue;

    // Get predicted patterns above threshold
    const predictedPatterns = new Set<ExploitPatternId>(
      samplePredictions.predictions
        .filter((p) => p.confidence >= threshold)
        .map((p) => p.patternId),
    );

    // For each ground-truth pattern in this entry
    for (const truthPattern of entry.primaryPatterns) {
      const row = labelIndex.get(truthPattern);
      if (row === undefined) continue;

      if (predictedPatterns.has(truthPattern)) {
        // Correct prediction: increment diagonal
        matrix[row][row]++;
      }

      // Record off-diagonal: predicted but not this truth
      for (const predPattern of predictedPatterns) {
        if (predPattern !== truthPattern) {
          const col = labelIndex.get(predPattern);
          if (col !== undefined) {
            matrix[row][col]++;
          }
        }
      }
    }
  }

  return {
    labels,
    matrix: matrix.map((row) => Object.freeze([...row])),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Confusion Matrix Formatting
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * formatConfusionMatrixMarkdown — Renders the confusion matrix as a markdown table.
 *
 * @param cm - The confusion matrix to format
 * @returns Markdown string suitable for thesis appendix
 */
export function formatConfusionMatrixMarkdown(cm: ConfusionMatrix): string {
  const shortLabels = cm.labels.map((l) => l.substring(0, 8));

  let md = '| Truth \\\\ Pred |';
  for (const label of shortLabels) {
    md += ` ${label} |`;
  }
  md += '\n|---|';
  for (let i = 0; i < shortLabels.length; i++) {
    md += '---:|';
  }
  md += '\n';

  for (let i = 0; i < cm.matrix.length; i++) {
    md += `| **${shortLabels[i]}** |`;
    for (let j = 0; j < cm.matrix[i].length; j++) {
      const val = cm.matrix[i][j];
      // Bold diagonal entries
      if (i === j && val > 0) {
        md += ` **${val}** |`;
      } else {
        md += ` ${val} |`;
      }
    }
    md += '\n';
  }

  return md;
}
