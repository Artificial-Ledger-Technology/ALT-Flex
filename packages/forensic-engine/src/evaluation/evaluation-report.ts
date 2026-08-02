/**
 * @module evaluation-report
 * @description Generates a thesis-appendix-ready markdown evaluation report.
 *
 * Transforms the structured EvaluationReport into a formatted markdown
 * document suitable for inclusion as a thesis appendix. Includes all
 * tables, metrics, confusion matrix, and analysis sections.
 *
 * @hexagonal Application Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-012
 */

import { type EvaluationReport } from './evaluator-types.js';
import { formatConfusionMatrixMarkdown } from './confusion-matrix.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Report Generator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * generateEvaluationReport — Produces a thesis-appendix-ready markdown report.
 *
 * @param report - The complete evaluation report data
 * @returns Formatted markdown string
 */
export function generateEvaluationReport(report: EvaluationReport): string {
  const sections: string[] = [];

  // ─── Header ────────────────────────────────────────────────────────────────
  sections.push(`# Exploit Pattern Recognizer — Evaluation Report`);
  sections.push('');
  sections.push(`> **Generated**: ${report.timestamp}`);
  sections.push(`> **Engine Version**: ${report.engineVersion}`);
  sections.push(`> **Total Samples**: ${report.totalSamples}`);
  sections.push(`> **Confidence Threshold**: ${report.primaryThreshold}`);
  sections.push(`> **Target Macro F1**: ≥ 0.80`);
  sections.push(`> **Result**: ${report.meetsTarget ? '✅ PASS' : '❌ FAIL'} (Macro F1 = ${report.macroF1})`);
  sections.push('');

  // ─── Summary Metrics ──────────────────────────────────────────────────────
  sections.push('## 1. Summary Metrics');
  sections.push('');
  sections.push('| Metric | Macro | Micro |');
  sections.push('|--------|------:|------:|');
  sections.push(`| Precision | ${report.macroPrecision} | ${report.microPrecision} |`);
  sections.push(`| Recall | ${report.macroRecall} | ${report.microRecall} |`);
  sections.push(`| F1 Score | ${report.macroF1} | ${report.microF1} |`);
  sections.push('');

  // ─── Per-Pattern Metrics ──────────────────────────────────────────────────
  sections.push('## 2. Per-Pattern Metrics');
  sections.push('');
  sections.push('| Pattern | TP | FP | FN | TN | Precision | Recall | F1 | Support |');
  sections.push('|---------|---:|---:|---:|---:|----------:|-------:|---:|--------:|');

  for (const m of report.perPatternMetrics) {
    sections.push(
      `| ${m.patternId} | ${m.tp} | ${m.fp} | ${m.fn} | ${m.tn} | ${m.precision} | ${m.recall} | ${m.f1} | ${m.support} |`,
    );
  }
  sections.push('');

  // ─── Confusion Matrix ─────────────────────────────────────────────────────
  sections.push('## 3. Confusion Matrix');
  sections.push('');
  sections.push('Rows = Ground Truth, Columns = Predicted. Diagonal = correct classifications.');
  sections.push('');
  sections.push(formatConfusionMatrixMarkdown(report.confusionMatrix));
  sections.push('');

  // ─── Threshold Sensitivity ────────────────────────────────────────────────
  sections.push('## 4. Threshold Sensitivity Analysis');
  sections.push('');
  sections.push('| Threshold | Macro P | Macro R | Macro F1 | Total TP | Total FP | Total FN |');
  sections.push('|----------:|--------:|--------:|---------:|---------:|---------:|---------:|');

  for (const t of report.thresholdSensitivity) {
    const marker = t.threshold === report.primaryThreshold ? ' ←' : '';
    sections.push(
      `| ${t.threshold}${marker} | ${t.macroPrecision} | ${t.macroRecall} | ${t.macroF1} | ${t.totalTP} | ${t.totalFP} | ${t.totalFN} |`,
    );
  }
  sections.push('');

  // ─── Misclassification Analysis ───────────────────────────────────────────
  sections.push('## 5. Misclassification Analysis');
  sections.push('');

  const fps = report.misclassifications.filter((m) => m.type === 'false_positive');
  const fns = report.misclassifications.filter((m) => m.type === 'false_negative');

  sections.push(`### 5.1 False Positives (${fps.length} total)`);
  sections.push('');
  if (fps.length === 0) {
    sections.push('No false positives detected.');
  } else {
    sections.push('| Entry | Protocol | Pattern | Confidence | Analysis |');
    sections.push('|-------|----------|---------|----------:|----------|');
    for (const fp of fps.slice(0, 50)) {
      sections.push(`| ${fp.entryId} | ${fp.protocol} | ${fp.patternId} | ${fp.confidence} | ${fp.analysis} |`);
    }
    if (fps.length > 50) {
      sections.push(`| ... | ... | ... | ... | (${fps.length - 50} more) |`);
    }
  }
  sections.push('');

  sections.push(`### 5.2 False Negatives (${fns.length} total)`);
  sections.push('');
  if (fns.length === 0) {
    sections.push('No false negatives detected.');
  } else {
    sections.push('| Entry | Protocol | Pattern | Confidence | Analysis |');
    sections.push('|-------|----------|---------|----------:|----------|');
    for (const fn of fns.slice(0, 50)) {
      sections.push(`| ${fn.entryId} | ${fn.protocol} | ${fn.patternId} | ${fn.confidence} | ${fn.analysis} |`);
    }
    if (fns.length > 50) {
      sections.push(`| ... | ... | ... | ... | (${fns.length - 50} more) |`);
    }
  }
  sections.push('');

  // ─── Footer ───────────────────────────────────────────────────────────────
  sections.push('---');
  sections.push('');
  sections.push('*Report generated by AEGIS Pattern Recognition Evaluator (P5-EVM-012).*');
  sections.push('*Deterministic: identical inputs produce identical outputs.*');

  return sections.join('\n');
}
