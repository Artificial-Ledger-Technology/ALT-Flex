/**
 * @module AttackVector
 * @description Enumerated vulnerability taxonomy for DeFi exploit classification.
 *
 * Aligned with the SmartContractHacking.com classification system
 * (11 base categories) plus extended categories for AltFlex AEGIS coverage.
 *
 * Each attack vector maps to a well-documented vulnerability class in the
 * smart contract security literature (SWC Registry, DASP Top 10, etc.).
 *
 * @see https://smartcontractshacking.com/tools/web3-hacks-dashboard
 * @see https://swcregistry.io/
 * @academic Thesis 1 — Pattern classification uses this taxonomy as the
 *           dependent variable for exploit categorization.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Attack Vector Enum
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AttackVector — Canonical vulnerability classification for DeFi exploits.
 *
 * Design Rationale:
 * - String values (not numeric) for human-readable JSON serialization
 * - Kebab-case values for URL-safe query parameters (`?vector=flash-loan`)
 * - Extended beyond SCH's 11 categories to cover bridge exploits and logic errors
 * - `OTHER` catch-all for novel attack patterns not yet classified
 */
export enum AttackVector {
  // ── SCH Core Taxonomy (11 categories) ──────────────────────────────────────
  /** Missing/broken access control (e.g., unprotected admin functions) */
  ACCESS_CONTROL = 'access-control',

  /** Integer overflow/underflow or precision loss in arithmetic */
  ARITHMETIC_OVERFLOW = 'arithmetic-overflow',

  /** Malicious delegatecall forwarding to attacker-controlled contract */
  DELEGATECALL_INJECTION = 'delegatecall-injection',

  /** Flash loan-funded price manipulation or liquidity drain */
  FLASH_LOAN = 'flash-loan',

  /** Manipulation of price oracles (Chainlink, TWAP, spot) */
  ORACLE_MANIPULATION = 'oracle-manipulation',

  /** Cross-function or cross-contract reentrancy (incl. read-only) */
  REENTRANCY = 'reentrancy',

  /** Governance proposal manipulation, vote buying, flash loan governance */
  DAO_GOVERNANCE = 'dao-governance',

  /** Front-running, sandwich attacks, MEV extraction */
  FRONTRUNNING = 'frontrunning',

  /** Social engineering, fake token approvals, permit phishing */
  PHISHING = 'phishing',

  /** Denial of service via gas exhaustion, unbounded loops, block stuffing */
  DOS = 'dos',

  /** Transaction or signature replay across chains or contexts */
  REPLAY = 'replay',

  // ── AEGIS Extended Taxonomy ────────────────────────────────────────────────
  /** Self-destruct based attacks (deprecated in EVM but historically significant) */
  SELF_DESTRUCT = 'self-destruct',

  /** Rug pulls, exit scams, and malicious token mechanics */
  RUG_PULL = 'rug-pull',

  /** Cross-chain bridge exploits (message verification, relay attacks) */
  BRIDGE_EXPLOIT = 'bridge-exploit',

  /** Business logic errors (off-by-one, incorrect state transitions, edge cases) */
  LOGIC_ERROR = 'logic-error',

  /** Unclassified or novel attack vector not fitting existing taxonomy */
  OTHER = 'other',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Zod Schema
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zod schema for runtime validation of AttackVector values.
 * Use this at API boundaries and ETL ingestion points.
 */
export const AttackVectorSchema = z.nativeEnum(AttackVector);
export type AttackVectorType = z.infer<typeof AttackVectorSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Attack Vector Metadata
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Severity level for attack vector risk classification.
 * Aligned with smart contract audit severity standards.
 */
export enum AttackSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Rich metadata for each attack vector.
 * Used in the frontend for tooltips, documentation, and academic references.
 */
export interface AttackVectorMetadata {
  /** Human-readable display name */
  readonly displayName: string;
  /** Short description for UI tooltips */
  readonly description: string;
  /** Default severity when this attack vector is exploited */
  readonly defaultSeverity: AttackSeverity;
  /** SWC Registry ID (if applicable) */
  readonly swcId: string | null;
  /** Whether this vector is specific to EVM chains */
  readonly evmSpecific: boolean;
  /** Common mitigation strategies (for educational content) */
  readonly mitigations: readonly string[];
}

/**
 * Comprehensive metadata map for all attack vectors.
 * Provides enrichment data beyond the enum value itself.
 *
 * @academic This metadata supports Thesis 1's pattern classification
 *           by providing structured context for each vulnerability class.
 */
export const ATTACK_VECTOR_METADATA: Readonly<
  Record<AttackVector, AttackVectorMetadata>
> = {
  [AttackVector.ACCESS_CONTROL]: {
    displayName: 'Access Control',
    description:
      'Missing or improperly implemented authorization checks allowing unauthorized function execution.',
    defaultSeverity: AttackSeverity.CRITICAL,
    swcId: 'SWC-105',
    evmSpecific: false,
    mitigations: [
      'OpenZeppelin AccessControl or Ownable2Step',
      'Role-based permission system',
      'Multi-sig for privileged operations',
    ],
  },
  [AttackVector.ARITHMETIC_OVERFLOW]: {
    displayName: 'Arithmetic Overflow',
    description:
      'Integer overflow/underflow or precision loss leading to incorrect calculations.',
    defaultSeverity: AttackSeverity.HIGH,
    swcId: 'SWC-101',
    evmSpecific: true,
    mitigations: [
      'Solidity 0.8.x built-in overflow checks',
      'SafeMath library (pre-0.8)',
      'Careful precision handling with fixed-point math',
    ],
  },
  [AttackVector.DELEGATECALL_INJECTION]: {
    displayName: 'Delegatecall Injection',
    description:
      'Exploiting delegatecall to execute malicious code in the context of the victim contract.',
    defaultSeverity: AttackSeverity.CRITICAL,
    swcId: 'SWC-112',
    evmSpecific: true,
    mitigations: [
      'Whitelist delegatecall targets',
      'Avoid delegatecall with user-supplied addresses',
      'Use well-audited proxy patterns (UUPS, Transparent)',
    ],
  },
  [AttackVector.FLASH_LOAN]: {
    displayName: 'Flash Loan',
    description:
      'Leveraging uncollateralized flash loans to manipulate protocol state within a single transaction.',
    defaultSeverity: AttackSeverity.CRITICAL,
    swcId: null,
    evmSpecific: false,
    mitigations: [
      'TWAP oracles instead of spot prices',
      'Multi-block price verification',
      'Flash loan-resistant accounting',
    ],
  },
  [AttackVector.ORACLE_MANIPULATION]: {
    displayName: 'Oracle Manipulation',
    description:
      'Corrupting price feed data to exploit protocol pricing assumptions.',
    defaultSeverity: AttackSeverity.CRITICAL,
    swcId: null,
    evmSpecific: false,
    mitigations: [
      'Chainlink decentralized oracles',
      'Multiple oracle sources with median',
      'Circuit breakers on extreme price movements',
    ],
  },
  [AttackVector.REENTRANCY]: {
    displayName: 'Reentrancy',
    description:
      'Recursive callback exploitation allowing repeated state modifications before completion.',
    defaultSeverity: AttackSeverity.CRITICAL,
    swcId: 'SWC-107',
    evmSpecific: true,
    mitigations: [
      'Checks-Effects-Interactions pattern',
      'ReentrancyGuard (OpenZeppelin)',
      'Transient storage locks (EIP-1153)',
    ],
  },
  [AttackVector.DAO_GOVERNANCE]: {
    displayName: 'DAO / Governance',
    description:
      'Manipulation of governance mechanisms including proposal hijacking and vote buying.',
    defaultSeverity: AttackSeverity.HIGH,
    swcId: null,
    evmSpecific: false,
    mitigations: [
      'Timelock on governance actions',
      'Snapshot-based voting (prevent flash loan voting)',
      'Quorum requirements and vote delegation limits',
    ],
  },
  [AttackVector.FRONTRUNNING]: {
    displayName: 'Front-running / MEV',
    description:
      'Transaction ordering exploitation including sandwich attacks and MEV extraction.',
    defaultSeverity: AttackSeverity.MEDIUM,
    swcId: 'SWC-114',
    evmSpecific: false,
    mitigations: [
      'Commit-reveal schemes',
      'MEV-protected RPC (Flashbots Protect)',
      'Slippage limits and deadline parameters',
    ],
  },
  [AttackVector.PHISHING]: {
    displayName: 'Phishing',
    description:
      'Social engineering attacks including fake token approvals and malicious permit signatures.',
    defaultSeverity: AttackSeverity.HIGH,
    swcId: null,
    evmSpecific: false,
    mitigations: [
      'Transaction simulation before signing',
      'Hardware wallet verification',
      'Allowance monitoring and revocation tools',
    ],
  },
  [AttackVector.DOS]: {
    displayName: 'Denial of Service',
    description:
      'Rendering contracts unusable through gas exhaustion, block stuffing, or griefing.',
    defaultSeverity: AttackSeverity.MEDIUM,
    swcId: 'SWC-128',
    evmSpecific: false,
    mitigations: [
      'Pull-over-push payment pattern',
      'Gas-bounded iteration',
      'Rate limiting and circuit breakers',
    ],
  },
  [AttackVector.REPLAY]: {
    displayName: 'Replay Attack',
    description:
      'Reuse of valid transactions or signatures across chains or protocol versions.',
    defaultSeverity: AttackSeverity.HIGH,
    swcId: 'SWC-121',
    evmSpecific: false,
    mitigations: [
      'EIP-155 chain ID in transaction signing',
      'EIP-712 typed data with domain separator',
      'Nonce-based replay protection',
    ],
  },
  [AttackVector.SELF_DESTRUCT]: {
    displayName: 'Self-Destruct',
    description:
      'Exploiting selfdestruct opcode to force-send ETH or destroy contract state.',
    defaultSeverity: AttackSeverity.MEDIUM,
    swcId: 'SWC-106',
    evmSpecific: true,
    mitigations: [
      'Do not rely on address.balance for logic',
      'Note: SELFDESTRUCT deprecated post-Dencun (EIP-6780)',
      'Use withdrawal patterns instead of balance checks',
    ],
  },
  [AttackVector.RUG_PULL]: {
    displayName: 'Rug Pull',
    description:
      'Malicious token mechanics, exit scams, or hidden admin withdrawal functions.',
    defaultSeverity: AttackSeverity.CRITICAL,
    swcId: null,
    evmSpecific: false,
    mitigations: [
      'Liquidity lock verification',
      'Contract audit and ownership renouncement',
      'Token sniffer tools and community due diligence',
    ],
  },
  [AttackVector.BRIDGE_EXPLOIT]: {
    displayName: 'Bridge Exploit',
    description:
      'Cross-chain bridge vulnerabilities including message verification bypass and relay attacks.',
    defaultSeverity: AttackSeverity.CRITICAL,
    swcId: null,
    evmSpecific: false,
    mitigations: [
      'Multi-validator message verification',
      'Optimistic verification with fraud proofs',
      'Rate-limited bridge transfers',
    ],
  },
  [AttackVector.LOGIC_ERROR]: {
    displayName: 'Logic Error',
    description:
      'Business logic flaws including incorrect state transitions, off-by-one errors, and edge cases.',
    defaultSeverity: AttackSeverity.HIGH,
    swcId: null,
    evmSpecific: false,
    mitigations: [
      'Comprehensive unit and integration testing',
      'Formal verification of critical invariants',
      'Fuzz testing with Echidna/Medusa',
    ],
  },
  [AttackVector.OTHER]: {
    displayName: 'Other',
    description:
      'Novel or unclassified attack vector not fitting the current taxonomy.',
    defaultSeverity: AttackSeverity.MEDIUM,
    swcId: null,
    evmSpecific: false,
    mitigations: [
      'Defense-in-depth strategy',
      'Regular security audits',
      'Bug bounty programs',
    ],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns all attack vector values as an array.
 * Useful for iteration, dropdown population, and filter generation.
 */
export function getAllAttackVectors(): AttackVector[] {
  return Object.values(AttackVector);
}

/**
 * Retrieves metadata for a given attack vector.
 * Throws if vector is not a valid enum member (should never happen with Zod validation).
 */
export function getAttackVectorMetadata(
  vector: AttackVector,
): AttackVectorMetadata {
  return ATTACK_VECTOR_METADATA[vector];
}

/**
 * Returns attack vectors filtered by severity.
 */
export function getAttackVectorsBySeverity(
  severity: AttackSeverity,
): AttackVector[] {
  return getAllAttackVectors().filter(
    (v) => ATTACK_VECTOR_METADATA[v].defaultSeverity === severity,
  );
}

/**
 * Returns only EVM-specific attack vectors.
 * Useful for filtering when analyzing non-EVM chains.
 */
export function getEvmSpecificAttackVectors(): AttackVector[] {
  return getAllAttackVectors().filter(
    (v) => ATTACK_VECTOR_METADATA[v].evmSpecific,
  );
}
