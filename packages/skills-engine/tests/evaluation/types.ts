import { SafetyLabel, Finding } from '@aegis/core';

export interface LabelMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface AggregateMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  microPrecision: number;
  microRecall: number;
  microF1: number;
}

export type ConfusionMatrix = Record<SafetyLabel, Record<SafetyLabel, number>>;

export interface SampleResult {
  sampleId: string;
  category: string;
  expectedLabel: SafetyLabel;
  predictedLabel: SafetyLabel;
  score: number;
  confidence: number;
  isCorrect: boolean;
  findings: Finding[];
  scanDurationMs: number;
}

export interface ThresholdAnalysis {
  suspiciousThreshold: number;
  maliciousThreshold: number;
  metrics: AggregateMetrics;
}

export interface EvaluationReport {
  totalSamples: number;
  scanDurationMsTotal: number;
  aggregateMetrics: AggregateMetrics;
  labelMetrics: Record<SafetyLabel, LabelMetrics>;
  confusionMatrix: ConfusionMatrix;
  sampleResults: SampleResult[];
  thresholdAnalysis: ThresholdAnalysis[];
}
