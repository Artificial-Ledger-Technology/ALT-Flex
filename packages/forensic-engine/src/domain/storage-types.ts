/**
 * @module storage-types
 * @description Engine-specific domain types for EVM contract storage analysis.
 *
 * Models the difference in contract storage between two specific blocks
 * (pre-exploit vs post-exploit). Used for pinpointing exactly what state
 * was mutated (e.g. balances drained, ownership transferred) during an attack.
 *
 * @hexagonal Domain Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-004
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Storage Diff Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * StorageDiff — Represents the difference in a single contract's state
 * between two blocks.
 */
export interface StorageDiff {
  /** The address of the contract that was mutated */
  readonly contractAddress: string;

  /** Name of the contract (if known/verified) */
  readonly contractName?: string;

  /** Array of specific storage slots that changed */
  readonly changes: readonly StorageChange[];

  /** Human-readable summary of the overall change (e.g. "Attacker drained 1000 USDC") */
  readonly summary: string;
}

/**
 * StorageChange — A single mutated storage slot and its decoded interpretation.
 */
export interface StorageChange {
  /** Raw storage slot index (hex string, 32 bytes) */
  readonly slot: string;

  /** Human-readable label for the slot (e.g., "balanceOf[0xAttacker]") */
  readonly label?: string;

  /** Raw 32-byte hex value at blockBefore */
  readonly valueBefore: string;

  /** Raw 32-byte hex value at blockAfter */
  readonly valueAfter: string;

  /** Decoded representation of valueBefore (e.g., "1000.5 USDC") */
  readonly decodedBefore?: string;

  /** Decoded representation of valueAfter (e.g., "0 USDC") */
  readonly decodedAfter?: string;

  /** Contextual interpretation of the change (e.g., "Balance decreased by 1000.5 USDC") */
  readonly interpretation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Layout Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common EVM storage layout patterns used to decode raw slots.
 */
export type StorageLayoutType = 'mapping' | 'dynamic_array' | 'packed' | 'simple';

/**
 * StorageSlotRequirement — A discovered storage slot that needs to be diffed.
 */
export interface StorageSlotRequirement {
  /** The 32-byte hex slot to query via eth_getStorageAt */
  readonly slot: string;

  /** The known/inferred layout type of this slot */
  readonly layout: StorageLayoutType;

  /** A human-readable label if we successfully derived what this slot represents */
  readonly label?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal Engine Types (Discovery)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Known ERC-20 mapping layout bases.
 * While proxy layouts vary, slot 0 and slot 3 are the most common
 * for balanceOf across major token implementations.
 */
export const KNOWN_BALANCE_SLOTS: readonly number[] = [
  0, // Common for standard OpenZeppelin ERC20
  1,
  2,
  3, // Common for heavily extended ERC20s or proxy implementations
];
