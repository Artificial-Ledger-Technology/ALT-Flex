/**
 * @module delegate-call-injection-detector
 * @description Detects delegate call injection patterns in transaction traces.
 *
 * Pattern: DELEGATECALL to user-controlled implementation contract.
 * Leverages existing DelegateCallMatch data from the TransactionTraceAnalyzer
 * and checks if the implementation address characteristics are suspicious.
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
// DelegateCallInjectionDetector
// ═══════════════════════════════════════════════════════════════════════════════

export class DelegateCallInjectionDetector implements PatternDetector {
  readonly id = 'DELEGATE_CALL_INJECTION' as const;
  readonly name = 'Delegate Call Injection';
  readonly description =
    'Detects DELEGATECALL to user-controlled implementation contracts.';

  detect(
    trace: TransactionTraceResult,
    diffs: readonly StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null {
    const delegateCallMatches = trace.summary.delegateCallMatches;

    if (delegateCallMatches.length === 0) {
      return null;
    }

    // 1. Calculate confidence
    let confidence = 0.0;

    // Base: delegate call detected
    confidence += 0.45;

    // Boost: multiple delegate calls
    if (delegateCallMatches.length > 1) {
      confidence += 0.15;
    }

    // Boost: storage mutations on the proxy contract suggest state was manipulated
    const proxyAddresses = new Set(
      delegateCallMatches.map((m) => m.proxyAddress.toLowerCase()),
    );
    const proxyMutations = diffs.filter(
      (d) =>
        proxyAddresses.has(d.contractAddress.toLowerCase()) &&
        d.changes.length > 0,
    );
    if (proxyMutations.length > 0) {
      confidence += 0.25;
    }

    // Boost: implementation address differs from a known safe set
    // (heuristic — if no known addresses in config, any delegate call is suspicious)
    if (config.knownAddresses.length === 0) {
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
      description: `Delegate call injection detected: ${delegateCallMatches.length} DELEGATECALL(s) to external implementation(s).`,
      evidence: {
        callNodeIds: delegateCallMatches.map((m) => m.nodeId),
        storageSlots: proxyMutations.flatMap((d) =>
          d.changes.map((c) => c.slot),
        ),
        eventSignatures: [],
        details: {
          delegateCallCount: delegateCallMatches.length,
          proxies: delegateCallMatches.map((m) => ({
            proxy: m.proxyAddress,
            implementation: m.implementationAddress,
          })),
          proxyMutationCount: proxyMutations.length,
        },
      },
    };
  }
}
