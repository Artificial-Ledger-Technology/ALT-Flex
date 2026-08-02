/**
 * @module logic-error-detector
 * @description Detects logic error exploit patterns in transaction traces.
 *
 * Pattern: Catch-all for exploits that don't match other patterns but
 * show state mutations alongside failed sub-calls or unexpected behavior.
 * This acts as the fallback detector for incorrect conditional branches
 * or missing validation checks.
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
// LogicErrorDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class LogicErrorDetector implements PatternDetector {
  readonly id = 'LOGIC_ERROR' as const;
  readonly name = 'Logic Error';
  readonly description =
    'Detects incorrect conditional branches or missing checks that lead to state exploitation.';

  detect(
    trace: TransactionTraceResult,
    diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const allNodes = flattenCallTree(trace.callTree);
    const minStorageMutations =
      (config.parameters?.['minStorageMutations'] as number) ?? 1;

    // 1. Count storage mutations across all contracts
    const totalStorageMutations = diffs.reduce(
      (sum, d) => sum + d.changes.length,
      0,
    );

    if (totalStorageMutations < minStorageMutations) {
      return null;
    }

    // 2. Check for failed sub-calls that still result in overall success
    const failedSubCalls = allNodes.filter(
      (node) => node.error !== undefined && node.depth > 0,
    );

    // 3. Check for calls with no decoded signature (potential raw/low-level calls)
    const undecodedCalls = allNodes.filter(
      (node) =>
        node.decodedCall === undefined &&
        node.input.length > 10 &&
        node.depth > 0,
    );

    // If there are no suspicious indicators beyond storage mutations, skip
    if (failedSubCalls.length === 0 && undecodedCalls.length < 3) {
      return null;
    }

    // 4. Calculate confidence
    let confidence = 0.0;

    // Base: storage mutations present
    confidence += 0.3;

    // Boost: failed sub-calls with overall tx success
    if (failedSubCalls.length > 0) {
      confidence += 0.25;
    }

    // Boost: many undecoded calls (suggest unusual/custom logic)
    if (undecodedCalls.length >= 3) {
      confidence += 0.15;
    }

    // Boost: significant storage mutations
    if (totalStorageMutations >= 3) {
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
      description: `Logic error detected: ${totalStorageMutations} storage mutation(s) with ${failedSubCalls.length} failed sub-call(s) and ${undecodedCalls.length} undecoded call(s).`,
      evidence: {
        callNodeIds: [
          ...failedSubCalls.map((n) => n.id),
          ...undecodedCalls.map((n) => n.id),
        ],
        storageSlots: diffs.flatMap((d) => d.changes.map((c) => c.slot)),
        eventSignatures: [],
        details: {
          failedSubCallCount: failedSubCalls.length,
          undecodedCallCount: undecodedCalls.length,
          totalStorageMutations,
          failedCallErrors: failedSubCalls.map((n) => n.error ?? 'unknown'),
        },
      },
    };
  }
}
