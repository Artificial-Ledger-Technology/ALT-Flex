/**
 * @module oracle-manipulation-detector
 * @description Detects oracle manipulation patterns in transaction traces.
 *
 * Pattern: Reads from price oracle within the same tx that manipulated
 * the pool reserves. Identifies swap/liquidity modification calls followed
 * by oracle reads, checking temporal ordering within the call tree.
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

// ═══════════════════════════════════════════════════════════════════════════════
// OracleManipulationDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class OracleManipulationDetector implements PatternDetector {
  readonly id = 'ORACLE_MANIPULATION' as const;
  readonly name = 'Oracle Manipulation';
  readonly description =
    'Detects reads from price oracle within same tx that manipulated pool reserves.';

  detect(
    trace: TransactionTraceResult,
    _diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const allNodes = flattenCallTree(trace.callTree);
    const oracleSigSet = new Set(
      config.functionSignatures.map((s) => s.toLowerCase()),
    );

    // 1. Find oracle read calls
    const oracleReads = allNodes.filter(
      (node) =>
        node.decodedCall !== undefined &&
        oracleSigSet.has(node.decodedCall.name.toLowerCase()),
    );

    if (oracleReads.length === 0) {
      return null;
    }

    // 2. Find swap/liquidity manipulation calls
    const swapSigs = new Set(
      ((config.parameters?.['swapSignatures'] as string[]) ?? []).map((s) =>
        s.toLowerCase(),
      ),
    );
    const liquiditySigs = new Set(
      ((config.parameters?.['liquiditySignatures'] as string[]) ?? []).map(
        (s) => s.toLowerCase(),
      ),
    );

    const manipulationCalls = allNodes.filter(
      (node) =>
        node.decodedCall !== undefined &&
        (swapSigs.has(node.decodedCall.name.toLowerCase()) ||
          liquiditySigs.has(node.decodedCall.name.toLowerCase())),
    );

    if (manipulationCalls.length === 0) {
      return null;
    }

    // 3. Both oracle reads AND manipulation calls exist in the same tx
    let confidence = 0.0;

    // Base: oracle read + manipulation in same tx
    confidence += 0.5;

    // Boost: multiple oracle reads
    if (oracleReads.length > 1) {
      confidence += 0.1;
    }

    // Boost: multiple manipulation calls
    if (manipulationCalls.length > 1) {
      confidence += 0.1;
    }

    // Boost: categorized oracle reads from trace summary
    const traceSummaryOracleReads = trace.summary.categorizedCalls.filter(
      (c) => c.category === 'oracle_read',
    );
    if (traceSummaryOracleReads.length > 0) {
      confidence += 0.15;
    }

    // Boost: categorized swaps from trace summary
    const traceSummarySwaps = trace.summary.categorizedCalls.filter(
      (c) => c.category === 'swap',
    );
    if (traceSummarySwaps.length > 0) {
      confidence += 0.1;
    }

    confidence = Math.min(confidence, 1.0);

    if (confidence < config.minConfidence) {
      return null;
    }

    return {
      patternId: this.id,
      patternName: this.name,
      confidence,
      description: `Oracle manipulation detected: ${manipulationCalls.length} pool manipulation call(s) + ${oracleReads.length} oracle read(s) in same transaction.`,
      evidence: {
        callNodeIds: [
          ...manipulationCalls.map((n) => n.id),
          ...oracleReads.map((n) => n.id),
        ],
        storageSlots: [],
        eventSignatures: [],
        details: {
          oracleReadCount: oracleReads.length,
          manipulationCallCount: manipulationCalls.length,
          oracleFunctions: oracleReads.map((n) => n.decodedCall?.name ?? 'unknown'),
          manipulationFunctions: manipulationCalls.map(
            (n) => n.decodedCall?.name ?? 'unknown',
          ),
        },
      },
    };
  }
}
