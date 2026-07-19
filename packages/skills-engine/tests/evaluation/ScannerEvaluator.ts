import { SafetyLabel, SafetyRule } from '@aegis/core';
import type { SkillContentParser } from '../../src/application/parsers/SkillContentParser.js';
import type { RegexRuleMatcher } from '../../src/application/scanners/RegexRuleMatcher.js';
import type { ASTCodeAnalyzer } from '../../src/application/scanners/ASTCodeAnalyzer.js';
import type { SemanticAnalyzer } from '../../src/application/scanners/SemanticAnalyzer.js';
import type { SafetyScoreCalculator } from '../../src/application/scanners/SafetyScoreCalculator.js';
import type { EvaluationDataset } from '../fixtures/evaluation-dataset/dataset-loader.js';
import type {
  EvaluationReport,
  SampleResult,
  ConfusionMatrix,
  LabelMetrics,
  AggregateMetrics,
  ThresholdAnalysis,
} from './types.js';

export class ScannerEvaluator {
  constructor(
    private readonly parser: SkillContentParser,
    private readonly regexMatcher: RegexRuleMatcher,
    private readonly astAnalyzer: ASTCodeAnalyzer,
    private readonly semanticAnalyzer: SemanticAnalyzer,
    private readonly scoreCalculator: SafetyScoreCalculator,
    private readonly rules: SafetyRule[],
  ) {}

  public evaluate(dataset: EvaluationDataset): EvaluationReport {
    const sampleResults: SampleResult[] = [];
    let scanDurationMsTotal = 0;

    for (const sample of dataset.samples) {
      const startMs = Date.now();

      // 1. Parse content
      const parsedContent = this.parser.parse(sample.content, sample.format);

      // 2. Run analyzers
      const ruleFindings = this.regexMatcher.match(parsedContent, this.rules);
      const astFindings = this.astAnalyzer.analyze(parsedContent);
      const semanticFindings = this.semanticAnalyzer.scan(parsedContent);

      // 3. Calculate score with default thresholds
      const scanDurationMs = Date.now() - startMs;
      scanDurationMsTotal += scanDurationMs;

      const verdict = this.scoreCalculator.calculate({
        ruleFindings,
        astFindings,
        semanticFindings,
        scanDurationMs,
        analyzersUsed: ['regex', 'ast', 'semantic'],
      });

      sampleResults.push({
        sampleId: sample.id,
        category: sample.category,
        expectedLabel: sample.groundTruthLabel,
        predictedLabel: verdict.label,
        score: verdict.score,
        confidence: verdict.confidence,
        isCorrect: verdict.label === sample.groundTruthLabel,
        findings: verdict.findings,
        scanDurationMs,
      });
    }

    const confusionMatrix = this.computeConfusionMatrix(sampleResults);
    const labelMetrics = this.computeLabelMetrics(confusionMatrix);
    const aggregateMetrics = this.computeAggregateMetrics(labelMetrics, sampleResults);
    const thresholdAnalysis = this.performThresholdAnalysis(sampleResults);

    return {
      totalSamples: dataset.totalSamples,
      scanDurationMsTotal,
      aggregateMetrics,
      labelMetrics,
      confusionMatrix,
      sampleResults,
      thresholdAnalysis,
    };
  }

  public computeConfusionMatrix(results: SampleResult[]): ConfusionMatrix {
    const matrix: ConfusionMatrix = {
      [SafetyLabel.SAFE]: { [SafetyLabel.SAFE]: 0, [SafetyLabel.SUSPICIOUS]: 0, [SafetyLabel.MALICIOUS]: 0, [SafetyLabel.UNANALYZED]: 0 },
      [SafetyLabel.SUSPICIOUS]: { [SafetyLabel.SAFE]: 0, [SafetyLabel.SUSPICIOUS]: 0, [SafetyLabel.MALICIOUS]: 0, [SafetyLabel.UNANALYZED]: 0 },
      [SafetyLabel.MALICIOUS]: { [SafetyLabel.SAFE]: 0, [SafetyLabel.SUSPICIOUS]: 0, [SafetyLabel.MALICIOUS]: 0, [SafetyLabel.UNANALYZED]: 0 },
      [SafetyLabel.UNANALYZED]: { [SafetyLabel.SAFE]: 0, [SafetyLabel.SUSPICIOUS]: 0, [SafetyLabel.MALICIOUS]: 0, [SafetyLabel.UNANALYZED]: 0 },
    };

    for (const r of results) {
      matrix[r.expectedLabel][r.predictedLabel]++;
    }

    return matrix;
  }

  public computeLabelMetrics(matrix: ConfusionMatrix): Record<SafetyLabel, LabelMetrics> {
    const labels = [SafetyLabel.SAFE, SafetyLabel.SUSPICIOUS, SafetyLabel.MALICIOUS, SafetyLabel.UNANALYZED];
    const metrics: Partial<Record<SafetyLabel, LabelMetrics>> = {};

    for (const label of labels) {
      const tp = matrix[label][label];
      
      let fp = 0;
      for (const other of labels) {
        if (other !== label) {
          fp += matrix[other][label];
        }
      }

      let fn = 0;
      for (const other of labels) {
        if (other !== label) {
          fn += matrix[label][other];
        }
      }

      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

      metrics[label] = {
        truePositives: tp,
        falsePositives: fp,
        falseNegatives: fn,
        precision,
        recall,
        f1,
      };
    }

    return metrics as Record<SafetyLabel, LabelMetrics>;
  }

  public computeAggregateMetrics(labelMetrics: Record<SafetyLabel, LabelMetrics>, results: SampleResult[]): AggregateMetrics {
    const activeLabels = [SafetyLabel.SAFE, SafetyLabel.SUSPICIOUS, SafetyLabel.MALICIOUS]; // exclude UNANALYZED
    
    let totalCorrect = 0;
    for (const label of activeLabels) {
      totalCorrect += labelMetrics[label].truePositives;
    }
    const accuracy = results.length > 0 ? totalCorrect / results.length : 0;

    let macroPrecision = 0;
    let macroRecall = 0;
    let macroF1 = 0;

    for (const label of activeLabels) {
      macroPrecision += labelMetrics[label].precision;
      macroRecall += labelMetrics[label].recall;
      macroF1 += labelMetrics[label].f1;
    }

    macroPrecision /= activeLabels.length;
    macroRecall /= activeLabels.length;
    macroF1 /= activeLabels.length;

    let totalTp = 0;
    let totalFp = 0;
    let totalFn = 0;

    for (const label of activeLabels) {
      totalTp += labelMetrics[label].truePositives;
      totalFp += labelMetrics[label].falsePositives;
      totalFn += labelMetrics[label].falseNegatives;
    }

    const microPrecision = totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : 0;
    const microRecall = totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : 0;
    const microF1 = microPrecision + microRecall > 0 ? 2 * (microPrecision * microRecall) / (microPrecision + microRecall) : 0;

    return {
      accuracy,
      macroPrecision,
      macroRecall,
      macroF1,
      microPrecision,
      microRecall,
      microF1,
    };
  }

  public performThresholdAnalysis(results: SampleResult[]): ThresholdAnalysis[] {
    const configurations = [
      { suspicious: 0, malicious: 10 },
      { suspicious: 2, malicious: 10 },
      { suspicious: 5, malicious: 15 },
      { suspicious: 0, malicious: 5 },
    ];

    return configurations.map((config) => {
      const simulatedResults = results.map((r) => {
        let simLabel = SafetyLabel.SAFE;
        if (r.score > config.malicious) {
          simLabel = SafetyLabel.MALICIOUS;
        } else if (r.score > config.suspicious) {
          simLabel = SafetyLabel.SUSPICIOUS;
        }
        return {
          ...r,
          predictedLabel: simLabel,
          isCorrect: simLabel === r.expectedLabel,
        };
      });

      const cm = this.computeConfusionMatrix(simulatedResults);
      const lm = this.computeLabelMetrics(cm);
      const am = this.computeAggregateMetrics(lm, simulatedResults);

      return {
        suspiciousThreshold: config.suspicious,
        maliciousThreshold: config.malicious,
        metrics: am,
      };
    });
  }
}
