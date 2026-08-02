/**
 * @module self-destruct-detector
 * @description Detects self-destruct attack patterns in transaction traces.
 *
 * Pattern: Contract destruction via SELFDESTRUCT to alter balance expectations
 * or force-send ETH to a target contract.
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
// SelfDestructDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class SelfDestructDetector implements PatternDetector {
  readonly id = 'SELF_DESTRUCT' as const;
  readonly name = 'Self-Destruct Attack';
  readonly description =
    'Detects contract destruction to alter balance expectations.';

  detect(
    trace: TransactionTraceResult,
    diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const allNodes = flattenCallTree(trace.callTree);

    // 1. Find SELFDESTRUCT calls
    const selfDestructCalls = allNodes.filter(
      (node) => node.type === 'SELFDESTRUCT',
    );

    if (selfDestructCalls.length === 0) {
      return null;
    }

    // 2. Calculate confidence
    let confidence = 0.0;

    // Base: selfdestruct detected
    confidence += 0.55;

    // Boost: ETH value transfer during selfdestruct (force-sending)
    const valueTransfers = selfDestructCalls.filter(
      (node) => node.value > 0n,
    );
    if (valueTransfers.length > 0) {
      confidence += 0.2;
    }

    // Boost: storage mutations on related contracts
    const requireBalanceAnomaly =
      (config.parameters?.['requireBalanceAnomaly'] as boolean) ?? true;
    if (requireBalanceAnomaly && diffs.length > 0) {
      const totalChanges = diffs.reduce(
        (sum, d) => sum + d.changes.length,
        0,
      );
      if (totalChanges > 0) {
        confidence += 0.15;
      }
    }

    // Boost: multiple selfdestructs
    if (selfDestructCalls.length > 1) {
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
      description: `Self-destruct attack detected: ${selfDestructCalls.length} SELFDESTRUCT call(s) with ${valueTransfers.length} forced ETH transfer(s).`,
      evidence: {
        callNodeIds: selfDestructCalls.map((n) => n.id),
        storageSlots: [],
        eventSignatures: [],
        details: {
          selfDestructCount: selfDestructCalls.length,
          forcedEthTransfers: valueTransfers.length,
          destroyedContracts: selfDestructCalls.map((n) => n.from),
        },
      },
    };
  }
}
