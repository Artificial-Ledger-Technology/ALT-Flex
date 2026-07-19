import { describe, it, expect } from 'vitest';
import { SafetyLabel } from '@aegis/core';
import { ScannerEvaluator } from './ScannerEvaluator.js';
import type { SampleResult } from './types.js';

describe('ScannerEvaluator', () => {
  // Using null as dependencies since we are only testing the pure math functions
  const evaluator = new ScannerEvaluator(null as any, null as any, null as any, null as any, null as any, null as any);

  it('computes correct confusion matrix', () => {
    const mockResults: Partial<SampleResult>[] = [
      { expectedLabel: SafetyLabel.SAFE, predictedLabel: SafetyLabel.SAFE },
      { expectedLabel: SafetyLabel.SAFE, predictedLabel: SafetyLabel.SUSPICIOUS }, // FP
      { expectedLabel: SafetyLabel.SUSPICIOUS, predictedLabel: SafetyLabel.SUSPICIOUS },
      { expectedLabel: SafetyLabel.MALICIOUS, predictedLabel: SafetyLabel.SAFE }, // FN
      { expectedLabel: SafetyLabel.MALICIOUS, predictedLabel: SafetyLabel.MALICIOUS },
      { expectedLabel: SafetyLabel.MALICIOUS, predictedLabel: SafetyLabel.MALICIOUS },
    ];

    const cm = evaluator.computeConfusionMatrix(mockResults as SampleResult[]);
    
    expect(cm[SafetyLabel.SAFE][SafetyLabel.SAFE]).toBe(1);
    expect(cm[SafetyLabel.SAFE][SafetyLabel.SUSPICIOUS]).toBe(1);
    expect(cm[SafetyLabel.SUSPICIOUS][SafetyLabel.SUSPICIOUS]).toBe(1);
    expect(cm[SafetyLabel.MALICIOUS][SafetyLabel.SAFE]).toBe(1);
    expect(cm[SafetyLabel.MALICIOUS][SafetyLabel.MALICIOUS]).toBe(2);
  });

  it('computes correct precision, recall, and f1', () => {
    // 2 TP, 1 FP, 1 FN
    const cm = {
      [SafetyLabel.SAFE]: { [SafetyLabel.SAFE]: 2, [SafetyLabel.SUSPICIOUS]: 0, [SafetyLabel.MALICIOUS]: 1, [SafetyLabel.UNANALYZED]: 0 },
      [SafetyLabel.SUSPICIOUS]: { [SafetyLabel.SAFE]: 1, [SafetyLabel.SUSPICIOUS]: 0, [SafetyLabel.MALICIOUS]: 0, [SafetyLabel.UNANALYZED]: 0 }, // FN for SAFE is 1
      [SafetyLabel.MALICIOUS]: { [SafetyLabel.SAFE]: 0, [SafetyLabel.SUSPICIOUS]: 0, [SafetyLabel.MALICIOUS]: 0, [SafetyLabel.UNANALYZED]: 0 },
      [SafetyLabel.UNANALYZED]: { [SafetyLabel.SAFE]: 0, [SafetyLabel.SUSPICIOUS]: 0, [SafetyLabel.MALICIOUS]: 0, [SafetyLabel.UNANALYZED]: 0 },
    };

    // For SAFE: TP = 2, FP = 1 (from SUSP->SAFE), FN = 1 (from SAFE->MAL)
    const metrics = evaluator.computeLabelMetrics(cm);

    expect(metrics[SafetyLabel.SAFE].truePositives).toBe(2);
    expect(metrics[SafetyLabel.SAFE].falsePositives).toBe(1);
    expect(metrics[SafetyLabel.SAFE].falseNegatives).toBe(1);
    
    // Precision = 2 / (2 + 1) = 0.666...
    expect(metrics[SafetyLabel.SAFE].precision).toBeCloseTo(0.666, 2);
    // Recall = 2 / (2 + 1) = 0.666...
    expect(metrics[SafetyLabel.SAFE].recall).toBeCloseTo(0.666, 2);
    // F1 = 2 * (0.666 * 0.666) / (0.666 + 0.666) = 0.666...
    expect(metrics[SafetyLabel.SAFE].f1).toBeCloseTo(0.666, 2);
  });
});
