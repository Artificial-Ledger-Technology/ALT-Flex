/**
 * @module attack-vector-classifier
 * @description Classifies free-text technique descriptions from external APIs
 * to canonical `AttackVector` enum values used in the AEGIS domain model.
 *
 * Classification strategy:
 * 1. `bridgeHack: true` → immediate override to BRIDGE_EXPLOIT
 * 2. Keyword-based matching against technique string (case-insensitive)
 * 3. First match wins (keywords ordered by specificity)
 * 4. Fallback to AttackVector.OTHER for unrecognized patterns
 *
 * This module is reusable across all ETL adapters.
 *
 * @hexagonal Adapter Utility — Infrastructure Layer
 * @task P2-ETL-001
 */

import { AttackVector } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Attack Vector Keyword Map
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps attack vector enum values to arrays of keyword patterns.
 *
 * Keywords are matched case-insensitively against the raw `technique` string.
 * Order matters — more specific keywords are checked first to prevent
 * false positives (e.g., "flash loan" before "loan").
 *
 * Source: CODE_REVIEW_PHASE2.md P2-ETL-007 specification.
 */
const VECTOR_KEYWORDS: ReadonlyArray<readonly [AttackVector, readonly string[]]> = [
  [
    AttackVector.ACCESS_CONTROL,
    [
      'access control',
      'private key',
      'admin',
      'privilege',
      'unauthorized',
      'private key compromised',
      'private key leaked',
      'compromised',
    ],
  ],
  [AttackVector.FLASH_LOAN, ['flash loan', 'flashloan', 'flash-loan']],
  [AttackVector.ORACLE_MANIPULATION, ['oracle', 'price manipulation', 'price oracle', 'twap']],
  [AttackVector.REENTRANCY, ['reentrancy', 're-entrancy', 'reentrant', 'read-only reentrancy']],
  [AttackVector.PHISHING, ['phishing', 'social engineering', 'fake']],
  [AttackVector.RUG_PULL, ['rug pull', 'rugpull', 'exit scam', 'rug-pull']],
  [AttackVector.FRONTRUNNING, ['frontrun', 'sandwich', 'mev', 'front-run', 'front run']],
  [AttackVector.DAO_GOVERNANCE, ['governance', 'dao', 'voting']],
  [AttackVector.ARITHMETIC_OVERFLOW, ['overflow', 'underflow', 'integer', 'rounding']],
  [AttackVector.DELEGATECALL_INJECTION, ['delegatecall', 'proxy', 'call injection']],
  [AttackVector.DOS, ['dos', 'denial of service', 'griefing']],
  [AttackVector.REPLAY, ['replay', 'signature replay']],
  [AttackVector.SELF_DESTRUCT, ['selfdestruct', 'self-destruct', 'suicide']],
  [AttackVector.BRIDGE_EXPLOIT, ['bridge', 'cross-chain', 'cross chain']],
  [AttackVector.LOGIC_ERROR, ['logic', 'bug', 'implementation error', 'misconfiguration']],
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Classifier Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify a raw technique description into an `AttackVector` enum value.
 *
 * @param technique - Raw technique string from external API (e.g., "Flash Loan Attack")
 * @param isBridgeHack - Whether the source flagged this as a bridge hack (overrides classification)
 * @returns Classified `AttackVector` enum value
 */
export function classifyAttackVector(technique: string, isBridgeHack = false): AttackVector {
  // Bridge hack flag takes precedence over keyword matching
  if (isBridgeHack) {
    return AttackVector.BRIDGE_EXPLOIT;
  }

  // Empty or missing technique → fallback
  if (!technique || technique.trim().length === 0) {
    return AttackVector.OTHER;
  }

  const lowerTechnique = technique.toLowerCase();

  for (const [vector, keywords] of VECTOR_KEYWORDS) {
    for (const keyword of keywords) {
      if (lowerTechnique.includes(keyword)) {
        return vector;
      }
    }
  }

  // No keyword match → unclassified
  return AttackVector.OTHER;
}
