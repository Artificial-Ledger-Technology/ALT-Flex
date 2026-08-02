/**
 * @module front-running-detector
 * @description Detects front-running (sandwich attack) patterns in transaction traces.
 *
 * Pattern: Sandwich pattern where the same address executes buy → victim tx → sell,
 * extracting profit from the price impact of the victim's swap.
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
// FrontRunningDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class FrontRunningDetector implements PatternDetector {
  readonly id = 'FRONT_RUNNING' as const;
  readonly name = 'Front-Running / Sandwich Attack';
  readonly description =
    'Detects sandwich pattern: buy → victim tx → sell from same address.';

  detect(
    trace: TransactionTraceResult,
    _diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const allNodes = flattenCallTree(trace.callTree);
    const swapSigSet = new Set(
      config.functionSignatures.map((s) => s.toLowerCase()),
    );

    // 1. Find all swap calls
    const swapCalls = allNodes.filter(
      (node) =>
        node.decodedCall !== undefined &&
        swapSigSet.has(node.decodedCall.name.toLowerCase()),
    );

    const minSwapPairs =
      (config.parameters?.['minSwapPairs'] as number) ?? 2;

    if (swapCalls.length < minSwapPairs) {
      return null;
    }

    // 2. Check for same-address swap pairs (sandwich pattern)
    const swapsByAddress = new Map<string, CallTreeNode[]>();
    for (const swap of swapCalls) {
      const addr = swap.from.toLowerCase();
      const existing = swapsByAddress.get(addr) ?? [];
      existing.push(swap);
      swapsByAddress.set(addr, existing);
    }

    // Find addresses with multiple swaps (potential sandwichers)
    const sandwichCandidates = [...swapsByAddress.entries()].filter(
      ([, swaps]) => swaps.length >= minSwapPairs,
    );

    if (sandwichCandidates.length === 0) {
      return null;
    }

    // 3. Calculate confidence
    let confidence = 0.0;

    // Base: multiple swaps from same address
    confidence += 0.5;

    // Boost: more swap pairs increase confidence
    const maxPairs = Math.max(
      ...sandwichCandidates.map(([, s]) => s.length),
    );
    if (maxPairs >= 3) {
      confidence += 0.2;
    }

    // Boost: categorized swaps from trace summary confirm
    const categorizedSwaps = trace.summary.categorizedCalls.filter(
      (c) => c.category === 'swap',
    );
    if (categorizedSwaps.length >= minSwapPairs) {
      confidence += 0.15;
    }

    confidence = Math.min(confidence, 1.0);

    if (confidence < config.minConfidence) {
      return null;
    }

    const allSandwichNodeIds = sandwichCandidates.flatMap(([, swaps]) =>
      swaps.map((s) => s.id),
    );

    return {
      patternId: this.id,
      patternName: this.name,
      confidence,
      description: `Front-running detected: ${sandwichCandidates.length} address(es) with ${swapCalls.length} swap call(s) indicating sandwich pattern.`,
      evidence: {
        callNodeIds: allSandwichNodeIds,
        storageSlots: [],
        eventSignatures: ['Swap(address,uint256,uint256,uint256,uint256,address)'],
        details: {
          swapCallCount: swapCalls.length,
          sandwichAddresses: sandwichCandidates.map(([addr]) => addr),
          maxSwapPairsPerAddress: maxPairs,
        },
      },
    };
  }
}
