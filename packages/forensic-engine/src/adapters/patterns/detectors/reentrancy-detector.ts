/**
 * @module reentrancy-detector
 * @description Detects reentrancy attack patterns in transaction traces.
 *
 * Pattern: Recursive calls to the same contract before state update.
 * Leverages existing ReentrancyMatch data from the TransactionTraceAnalyzer
 * and cross-references with storage diffs to confirm state was mutated
 * after recursive calls.
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

// ═══════════════════════════════════════════════════════════════════════════════
// ReentrancyDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class ReentrancyDetector implements PatternDetector {
  readonly id = 'REENTRANCY' as const;
  readonly name = 'Reentrancy Attack';
  readonly description =
    'Detects recursive calls to the same contract before state update.';

  detect(
    trace: TransactionTraceResult,
    diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const reentrancyMatches = trace.summary.reentrancyMatches;

    if (reentrancyMatches.length === 0) {
      return null;
    }

    // 1. Calculate recursion depth factor
    const maxRecursionDepth = Math.max(
      ...reentrancyMatches.flatMap((m) => m.depths),
    );
    const minDepthRequired =
      (config.parameters?.['minRecursionDepth'] as number) ?? 2;

    if (maxRecursionDepth < minDepthRequired) {
      return null;
    }

    // 2. Calculate confidence
    let confidence = 0.0;

    // Base: reentrancy detected by trace analyzer
    confidence += 0.5;

    // Boost: deeper recursion = higher confidence
    if (maxRecursionDepth >= 3) {
      confidence += 0.15;
    }

    // Boost: multiple reentrancy targets
    if (reentrancyMatches.length > 1) {
      confidence += 0.1;
    }

    // Boost: storage mutations on the re-entered contract(s)
    const storageMutationBoost =
      (config.parameters?.['storageMutationBoost'] as number) ?? 0.2;
    const reentrancyAddresses = new Set(
      reentrancyMatches.map((m) => m.targetAddress.toLowerCase()),
    );
    const mutatedReentrantContracts = diffs.filter((d) =>
      reentrancyAddresses.has(d.contractAddress.toLowerCase()) &&
      d.changes.length > 0,
    );

    if (mutatedReentrantContracts.length > 0) {
      confidence += storageMutationBoost;
    }

    confidence = Math.min(confidence, 1.0);

    if (confidence < config.minConfidence) {
      return null;
    }

    // Collect all involved node IDs and storage slots
    const allNodeIds = reentrancyMatches.flatMap((m) => [...m.nodeIds]);
    const allStorageSlots = mutatedReentrantContracts.flatMap((d) =>
      d.changes.map((c) => c.slot),
    );

    return {
      patternId: this.id,
      patternName: this.name,
      confidence,
      description: `Reentrancy detected on ${reentrancyMatches.length} contract(s) with max recursion depth ${maxRecursionDepth}.`,
      evidence: {
        callNodeIds: allNodeIds,
        storageSlots: allStorageSlots,
        eventSignatures: [],
        details: {
          reentrancyTargets: reentrancyMatches.map((m) => m.targetAddress),
          maxRecursionDepth,
          mutatedContractCount: mutatedReentrantContracts.length,
        },
      },
    };
  }
}
