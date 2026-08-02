/**
 * @module arithmetic-overflow-detector
 * @description Detects integer overflow/underflow patterns in transaction traces.
 *
 * Pattern: Integer overflow/underflow in token calculations producing
 * extremely large transfer values or sudden balance jumps in storage diffs.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-005
 */

import type {
  PatternDetector,
  PatternMatch,
  PatternRuleConfig,
} from '../../../domain/pattern-types.js';
import type { TransactionTraceResult, CallTreeNode } from '../../../domain/trace-types.js';
import type { StorageDiff } from '../../../domain/storage-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function flattenCallTree(node: CallTreeNode): readonly CallTreeNode[] {
  const result: CallTreeNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenCallTree(child));
  }
  return result;
}

/** Parse a hex value to bigint, returning 0n on failure. */
function safeParseBigInt(hex: string): bigint {
  if (hex === '' || hex === '0x' || hex === '0x0') return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ArithmeticOverflowDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class ArithmeticOverflowDetector implements PatternDetector {
  readonly id = 'ARITHMETIC_OVERFLOW' as const;
  readonly name = 'Arithmetic Overflow/Underflow';
  readonly description =
    'Detects integer overflow/underflow in token calculations.';

  detect(
    trace: TransactionTraceResult,
    diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const allNodes = flattenCallTree(trace.callTree);
    const overflowThresholdStr =
      (config.parameters?.['overflowThreshold'] as string) ??
      '1461501637330902918203684832716283019655932542975';
    const overflowThreshold = BigInt(overflowThresholdStr);

    // 1. Check for extremely large values in call data (potential overflow results)
    const suspiciousValueNodes = allNodes.filter(
      (node) => node.value > overflowThreshold,
    );

    // 2. Check for extremely large balance jumps in storage diffs
    const balanceJumpRatio =
      (config.parameters?.['balanceJumpRatio'] as number) ?? 1000000;
    const suspiciousStorageChanges = diffs.flatMap((d) =>
      d.changes.filter((c) => {
        const before = safeParseBigInt(c.valueBefore);
        const after = safeParseBigInt(c.valueAfter);
        if (before === 0n) return after > overflowThreshold;
        if (after === 0n) return false;
        const ratio = after > before ? after / (before || 1n) : before / (after || 1n);
        return ratio > BigInt(balanceJumpRatio);
      }),
    );

    if (suspiciousValueNodes.length === 0 && suspiciousStorageChanges.length === 0) {
      return null;
    }

    // 3. Calculate confidence
    let confidence = 0.0;

    if (suspiciousValueNodes.length > 0) {
      confidence += 0.5;
    }

    if (suspiciousStorageChanges.length > 0) {
      confidence += 0.35;
    }

    if (suspiciousValueNodes.length > 0 && suspiciousStorageChanges.length > 0) {
      confidence += 0.15;
    }

    confidence = Math.min(confidence, 1.0);

    if (confidence < config.minConfidence) {
      return null;
    }

    return {
      patternId: this.id,
      patternName: this.name,
      confidence,
      description: `Arithmetic overflow detected: ${suspiciousValueNodes.length} suspicious value transfer(s), ${suspiciousStorageChanges.length} abnormal balance jump(s).`,
      evidence: {
        callNodeIds: suspiciousValueNodes.map((n) => n.id),
        storageSlots: suspiciousStorageChanges.map((c) => c.slot),
        eventSignatures: [],
        details: {
          suspiciousValueCount: suspiciousValueNodes.length,
          suspiciousStorageCount: suspiciousStorageChanges.length,
          overflowThreshold: overflowThresholdStr,
        },
      },
    };
  }
}
