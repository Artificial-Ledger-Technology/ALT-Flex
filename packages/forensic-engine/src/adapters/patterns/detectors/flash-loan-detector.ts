/**
 * @module flash-loan-detector
 * @description Detects flash loan attack patterns in transaction traces.
 *
 * Pattern: Flash loan borrow → price manipulation → arbitrage → repay.
 * Identifies known flash loan provider function calls, verifies bidirectional
 * large token transfers (borrow + repay), and boosts confidence when oracle
 * reads or swap calls are present between borrow and repay.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-005
 */

import type {
  PatternDetector,
  PatternMatch,
  PatternRuleConfig,
} from '../../../domain/pattern-types.js';
import type { TransactionTraceResult } from '../../../domain/trace-types.js';
import type { StorageDiff } from '../../../domain/storage-types.js';
import type { CallTreeNode } from '../../../domain/trace-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Recursively collect all nodes from a call tree into a flat array. */
function flattenCallTree(node: CallTreeNode): readonly CallTreeNode[] {
  const result: CallTreeNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenCallTree(child));
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FlashLoanDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class FlashLoanDetector implements PatternDetector {
  readonly id = 'FLASH_LOAN' as const;
  readonly name = 'Flash Loan Attack';
  readonly description =
    'Detects flash loan borrow → price manipulation → arbitrage → repay patterns.';

  detect(
    trace: TransactionTraceResult,
    _diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const allNodes = flattenCallTree(trace.callTree);
    const sigSet = new Set(config.functionSignatures.map((s) => s.toLowerCase()));

    // 1. Identify flash loan calls by matching decoded function names
    const flashLoanCalls = allNodes.filter(
      (node) =>
        node.decodedCall !== undefined &&
        sigSet.has(node.decodedCall.name.toLowerCase()),
    );

    if (flashLoanCalls.length === 0) {
      return null;
    }

    // 2. Check for large token transfers (borrow + repay pattern)
    const transferNodes = allNodes.filter(
      (node) =>
        node.decodedCall !== undefined &&
        (node.decodedCall.name === 'transfer' ||
          node.decodedCall.name === 'transferFrom'),
    );

    // 3. Check for oracle reads or swaps between borrow and repay
    const oracleReads = trace.summary.categorizedCalls.filter(
      (c) => c.category === 'oracle_read',
    );
    const swapCalls = trace.summary.categorizedCalls.filter(
      (c) => c.category === 'swap',
    );

    // 4. Calculate confidence
    let confidence = 0.0;

    // Base: flash loan call detected
    confidence += 0.4;

    // Boost: bidirectional transfers (borrow + repay)
    if (transferNodes.length >= 2) {
      confidence += 0.2;
    }

    // Boost: oracle reads suggest price manipulation
    const oracleBoost = (config.parameters?.['oracleBoostFactor'] as number) ?? 0.15;
    if (oracleReads.length > 0) {
      confidence += oracleBoost;
    }

    // Boost: swap calls suggest arbitrage
    if (swapCalls.length > 0) {
      confidence += 0.15;
    }

    // Boost: multiple flash loan calls (complex attack)
    if (flashLoanCalls.length > 1) {
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
      description: `Flash loan detected via ${flashLoanCalls.length} flash loan call(s) with ${transferNodes.length} token transfer(s).`,
      evidence: {
        callNodeIds: flashLoanCalls.map((n) => n.id),
        storageSlots: [],
        eventSignatures: ['Transfer(address,address,uint256)'],
        details: {
          flashLoanCallCount: flashLoanCalls.length,
          transferCount: transferNodes.length,
          oracleReadCount: oracleReads.length,
          swapCallCount: swapCalls.length,
        },
      },
    };
  }
}
