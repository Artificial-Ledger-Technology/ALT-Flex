import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SafetyLabel } from '@aegis/core';
import { loadDataset } from '../tests/fixtures/evaluation-dataset/dataset-loader.js';
import { ScannerEvaluator } from '../tests/evaluation/ScannerEvaluator.js';
import { SkillContentParser } from '../src/application/parsers/SkillContentParser.js';
import { RegexRuleMatcher } from '../src/application/scanners/RegexRuleMatcher.js';
import { ASTCodeAnalyzer } from '../src/application/scanners/ASTCodeAnalyzer.js';
import { SemanticAnalyzer } from '../src/application/scanners/SemanticAnalyzer.js';
import { SafetyScoreCalculator } from '../src/application/scanners/SafetyScoreCalculator.js';
import { SafetyRuleLoader } from '../src/infrastructure/safety-rules/rule-loader.js';
import type { EvaluationReport, SampleResult } from '../tests/evaluation/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateMarkdownReport(report: EvaluationReport): string {
  const { aggregateMetrics, labelMetrics, confusionMatrix, sampleResults, thresholdAnalysis } = report;

  const toPct = (n: number) => (n * 100).toFixed(2) + '%';

  let md = `# AEGIS Scanner Evaluation Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Total Samples:** ${report.totalSamples}\n`;
  md += `**Total Scan Duration:** ${report.scanDurationMsTotal}ms\n\n`;

  md += `## Aggregate Metrics\n\n`;
  md += `| Metric | Value |\n`;
  md += `|---|---|\n`;
  md += `| Accuracy | **${toPct(aggregateMetrics.accuracy)}** |\n`;
  md += `| Macro Precision | **${toPct(aggregateMetrics.macroPrecision)}** |\n`;
  md += `| Macro Recall | **${toPct(aggregateMetrics.macroRecall)}** |\n`;
  md += `| Macro F1 Score | **${toPct(aggregateMetrics.macroF1)}** |\n`;
  md += `| Micro Precision | **${toPct(aggregateMetrics.microPrecision)}** |\n`;
  md += `| Micro Recall | **${toPct(aggregateMetrics.microRecall)}** |\n`;
  md += `| Micro F1 Score | **${toPct(aggregateMetrics.microF1)}** |\n\n`;

  md += `## Per-Label Metrics\n\n`;
  md += `| Label | Precision | Recall | F1 Score | TP | FP | FN |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  const labels = [SafetyLabel.SAFE, SafetyLabel.SUSPICIOUS, SafetyLabel.MALICIOUS];
  for (const label of labels) {
    const lm = labelMetrics[label];
    md += `| **${label}** | ${toPct(lm.precision)} | ${toPct(lm.recall)} | ${toPct(lm.f1)} | ${lm.truePositives} | ${lm.falsePositives} | ${lm.falseNegatives} |\n`;
  }
  md += `\n`;

  md += `## Confusion Matrix\n\n`;
  md += `Rows: Actual (Ground Truth), Columns: Predicted\n\n`;
  md += `| Actual \\ Predicted | SAFE | SUSPICIOUS | MALICIOUS |\n`;
  md += `|---|---|---|---|\n`;
  for (const actual of labels) {
    md += `| **${actual}** | ${confusionMatrix[actual][SafetyLabel.SAFE]} | ${confusionMatrix[actual][SafetyLabel.SUSPICIOUS]} | ${confusionMatrix[actual][SafetyLabel.MALICIOUS]} |\n`;
  }
  md += `\n`;

  md += `## Threshold Sensitivity Analysis\n\n`;
  md += `| Suspicious Threshold | Malicious Threshold | Accuracy | Macro F1 |\n`;
  md += `|---|---|---|---|\n`;
  for (const t of thresholdAnalysis) {
    md += `| > ${t.suspiciousThreshold} | > ${t.maliciousThreshold} | ${toPct(t.metrics.accuracy)} | ${toPct(t.metrics.macroF1)} |\n`;
  }
  md += `\n`;

  md += `## False Positives & False Negatives\n\n`;
  const errors = sampleResults.filter(r => !r.isCorrect);
  if (errors.length === 0) {
    md += `*No misclassifications found! Perfect accuracy.*\n`;
  } else {
    for (const r of errors) {
      md += `### ${r.sampleId} (${r.category})\n`;
      md += `- **Expected:** ${r.expectedLabel}\n`;
      md += `- **Predicted:** ${r.predictedLabel} (Score: ${r.score})\n`;
      if (r.findings.length > 0) {
        md += `- **Findings:**\n`;
        for (const f of r.findings) {
          md += `  - [${f.severity.toUpperCase()}] ${f.ruleId}: ${f.description}\n`;
        }
      }
      md += `\n`;
    }
  }

  return md;
}

async function run() {
  console.log('Loading dataset...');
  const datasetDir = join(__dirname, '..', 'tests', 'fixtures', 'evaluation-dataset');
  const dataset = loadDataset(datasetDir);
  console.log(`Loaded ${dataset.totalSamples} samples.`);

  const rulesDir = join(__dirname, '..', 'src', 'infrastructure', 'safety-rules');
  const ruleLoader = new SafetyRuleLoader(rulesDir);
  const rules = ruleLoader.loadRules();

  const parser = new SkillContentParser();
  const regexMatcher = new RegexRuleMatcher();
  const astAnalyzer = new ASTCodeAnalyzer();
  const semanticAnalyzer = new SemanticAnalyzer();
  const scoreCalculator = new SafetyScoreCalculator();

  const evaluator = new ScannerEvaluator(
    parser,
    regexMatcher,
    astAnalyzer,
    semanticAnalyzer,
    scoreCalculator,
    rules
  );

  console.log('Running evaluation...');
  const report = evaluator.evaluate(dataset);

  const outDir = join(__dirname, '..', 'docs');
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const reportPath = join(outDir, 'evaluation-report.md');
  const markdown = generateMarkdownReport(report);
  writeFileSync(reportPath, markdown, 'utf-8');

  console.log(`\nEvaluation complete! Report saved to ${reportPath}`);
  console.log(`\n--- SUMMARY ---`);
  console.log(`Accuracy:  ${(report.aggregateMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`Macro F1:  ${(report.aggregateMetrics.macroF1 * 100).toFixed(2)}%`);
  console.log(`Safe F1:   ${(report.labelMetrics[SafetyLabel.SAFE].f1 * 100).toFixed(2)}%`);
  console.log(`Susp F1:   ${(report.labelMetrics[SafetyLabel.SUSPICIOUS].f1 * 100).toFixed(2)}%`);
  console.log(`Malic F1:  ${(report.labelMetrics[SafetyLabel.MALICIOUS].f1 * 100).toFixed(2)}%`);
}

run().catch(console.error);
