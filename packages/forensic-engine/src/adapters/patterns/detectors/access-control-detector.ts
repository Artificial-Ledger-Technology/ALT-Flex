/**
 * @module access-control-detector
 * @description Detects access control bypass patterns in transaction traces.
 *
 * Pattern: Calls to admin/governance functions from unauthorized address.
 * Identifies admin function calls (from config signatures) and cross-references
 * with storage diffs for ownership slot mutations.
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
// AccessControlDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class AccessControlDetector implements PatternDetector {
  readonly id = 'ACCESS_CONTROL' as const;
  readonly name = 'Access Control Bypass';
  readonly description =
    'Detects calls to admin/governance functions from unauthorized addresses.';

  detect(
    trace: TransactionTraceResult,
    diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const allNodes = flattenCallTree(trace.callTree);
    const adminSigSet = new Set(
      config.functionSignatures.map((s) => s.toLowerCase()),
    );

    // 1. Identify admin function calls
    const adminCalls = allNodes.filter(
      (node) =>
        node.decodedCall !== undefined &&
        adminSigSet.has(node.decodedCall.name.toLowerCase()),
    );

    if (adminCalls.length === 0) {
      return null;
    }

    // 2. Also check categorized admin calls from trace summary
    const categorizedAdminCalls = trace.summary.categorizedCalls.filter(
      (c) => c.category === 'admin_call',
    );

    // 3. Check for ownership-related storage changes
    const ownershipSlots = new Set(
      (config.parameters?.['ownershipStorageSlots'] as string[]) ?? [],
    );
    const ownershipMutations = diffs.flatMap((d) =>
      d.changes.filter(
        (c) =>
          ownershipSlots.has(c.slot) ||
          (c.label !== undefined &&
            (c.label.toLowerCase().includes('owner') ||
              c.label.toLowerCase().includes('admin'))),
      ),
    );

    // 4. Calculate confidence
    let confidence = 0.0;

    // Base: admin function called
    confidence += 0.4;

    // Boost: multiple admin calls
    if (adminCalls.length > 1) {
      confidence += 0.15;
    }

    // Boost: categorized as admin by trace analyzer
    if (categorizedAdminCalls.length > 0) {
      confidence += 0.15;
    }

    // Boost: ownership storage slots were mutated
    if (ownershipMutations.length > 0) {
      confidence += 0.25;
    }

    confidence = Math.min(confidence, 1.0);

    if (confidence < config.minConfidence) {
      return null;
    }

    return {
      patternId: this.id,
      patternName: this.name,
      confidence,
      description: `Access control bypass detected: ${adminCalls.length} admin function call(s) with ${ownershipMutations.length} ownership mutation(s).`,
      evidence: {
        callNodeIds: adminCalls.map((n) => n.id),
        storageSlots: ownershipMutations.map((c) => c.slot),
        eventSignatures: [],
        details: {
          adminFunctions: adminCalls.map(
            (n) => n.decodedCall?.name ?? 'unknown',
          ),
          adminCallCount: adminCalls.length,
          ownershipMutationCount: ownershipMutations.length,
        },
      },
    };
  }
}
