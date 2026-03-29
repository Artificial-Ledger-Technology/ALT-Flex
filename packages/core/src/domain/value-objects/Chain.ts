/**
 * @module Chain
 * @description Supported blockchain network value object with rich metadata.
 *
 * Designed for chain agnosticism: supports both EVM and Non-EVM chains.
 * Each chain has a unique slug, display name, chain ID (EVM only),
 * native currency symbol, and block explorer URL.
 *
 * @hexagonal Value Object — Domain Layer (zero external dependencies)
 * @academic Supports Thesis 2's multi-chain forensic analysis scope.
 *
 * @see https://chainlist.org/ — EVM chain ID registry
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Chain Enum
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chain — Canonical blockchain network identifiers.
 *
 * Design Rationale:
 * - String values use lowercase slugs for URL-safe query parameters
 * - Ordered by TVL relevance (Ethereum first)
 * - Includes both L1 and L2 networks since exploits span all layers
 * - `MULTI` for exploits spanning multiple chains (e.g., Wormhole bridge)
 * - `UNKNOWN` for data entries where chain is unspecified
 */
export enum Chain {
  // ── EVM L1 Chains ──────────────────────────────────────────────────────────
  /** Ethereum Mainnet — chain ID 1 */
  ETHEREUM = 'ethereum',

  /** BNB Smart Chain — chain ID 56 */
  BSC = 'bsc',

  /** Avalanche C-Chain — chain ID 43114 */
  AVALANCHE = 'avalanche',

  /** Fantom Opera — chain ID 250 */
  FANTOM = 'fantom',

  /** Gnosis Chain (formerly xDai) — chain ID 100 */
  GNOSIS = 'gnosis',

  /** Cronos — chain ID 25 */
  CRONOS = 'cronos',

  // ── EVM L2 / Rollup Chains ─────────────────────────────────────────────────
  /** Polygon PoS — chain ID 137 */
  POLYGON = 'polygon',

  /** Arbitrum One — chain ID 42161 */
  ARBITRUM = 'arbitrum',

  /** Optimism Mainnet — chain ID 10 */
  OPTIMISM = 'optimism',

  /** Base — chain ID 8453 */
  BASE = 'base',

  // ── Non-EVM Chains ─────────────────────────────────────────────────────────
  /** Solana — high-performance PoH/PoS chain */
  SOLANA = 'solana',

  /** Cosmos Hub — IBC-connected PoS chain */
  COSMOS = 'cosmos',

  /** NEAR Protocol — sharded PoS chain */
  NEAR = 'near',

  /** Stellar — federated consensus network */
  STELLAR = 'stellar',

  // ── Meta Categories ────────────────────────────────────────────────────────
  /** Multi-chain exploit (e.g., bridge attacks spanning 2+ chains) */
  MULTI = 'multi',

  /** Chain not identified or not applicable */
  UNKNOWN = 'unknown',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Zod Schema
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zod schema for runtime validation of Chain values.
 * Use this at API boundaries and ETL ingestion points.
 */
export const ChainSchema = z.nativeEnum(Chain);
export type ChainType = z.infer<typeof ChainSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Chain Metadata
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Consensus mechanism type classification.
 */
export enum ConsensusType {
  PROOF_OF_STAKE = 'pos',
  PROOF_OF_WORK = 'pow',
  DELEGATED_POS = 'dpos',
  PROOF_OF_HISTORY = 'poh',
  FEDERATED = 'federated',
  OPTIMISTIC_ROLLUP = 'optimistic-rollup',
  ZK_ROLLUP = 'zk-rollup',
  OTHER = 'other',
}

/**
 * Rich metadata for each supported chain.
 * Provides context for UI rendering, explorer linking, and analytics.
 */
export interface ChainMetadata {
  /** Human-readable display name */
  readonly displayName: string;
  /** Short abbreviation for compact UI */
  readonly abbreviation: string;
  /** EVM chain ID (null for non-EVM chains) */
  readonly chainId: number | null;
  /** Whether this chain is EVM-compatible */
  readonly isEvm: boolean;
  /** Whether this is a Layer 2 / rollup */
  readonly isL2: boolean;
  /** Native currency symbol */
  readonly nativeCurrency: string;
  /** Block explorer base URL (null for meta categories) */
  readonly explorerUrl: string | null;
  /** Transaction hash URL template (`{hash}` placeholder) */
  readonly txUrlTemplate: string | null;
  /** Address URL template (`{address}` placeholder) */
  readonly addressUrlTemplate: string | null;
  /** Consensus mechanism */
  readonly consensus: ConsensusType;
  /** CSS-friendly hex color for charts (consistent with DeFi convention) */
  readonly brandColor: string;
}

/**
 * Comprehensive chain metadata registry.
 *
 * @note Explorer URLs use mainnet endpoints. Testnet URLs are intentionally
 *       excluded — the domain layer deals only with mainnet exploit data.
 */
export const CHAIN_METADATA: Readonly<Record<Chain, ChainMetadata>> = {
  // ── EVM L1 ────────────────────────────────────────────────────────────────
  [Chain.ETHEREUM]: {
    displayName: 'Ethereum',
    abbreviation: 'ETH',
    chainId: 1,
    isEvm: true,
    isL2: false,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    txUrlTemplate: 'https://etherscan.io/tx/{hash}',
    addressUrlTemplate: 'https://etherscan.io/address/{address}',
    consensus: ConsensusType.PROOF_OF_STAKE,
    brandColor: '#627EEA',
  },
  [Chain.BSC]: {
    displayName: 'BNB Smart Chain',
    abbreviation: 'BSC',
    chainId: 56,
    isEvm: true,
    isL2: false,
    nativeCurrency: 'BNB',
    explorerUrl: 'https://bscscan.com',
    txUrlTemplate: 'https://bscscan.com/tx/{hash}',
    addressUrlTemplate: 'https://bscscan.com/address/{address}',
    consensus: ConsensusType.DELEGATED_POS,
    brandColor: '#F0B90B',
  },
  [Chain.AVALANCHE]: {
    displayName: 'Avalanche',
    abbreviation: 'AVAX',
    chainId: 43114,
    isEvm: true,
    isL2: false,
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://snowtrace.io',
    txUrlTemplate: 'https://snowtrace.io/tx/{hash}',
    addressUrlTemplate: 'https://snowtrace.io/address/{address}',
    consensus: ConsensusType.PROOF_OF_STAKE,
    brandColor: '#E84142',
  },
  [Chain.FANTOM]: {
    displayName: 'Fantom',
    abbreviation: 'FTM',
    chainId: 250,
    isEvm: true,
    isL2: false,
    nativeCurrency: 'FTM',
    explorerUrl: 'https://ftmscan.com',
    txUrlTemplate: 'https://ftmscan.com/tx/{hash}',
    addressUrlTemplate: 'https://ftmscan.com/address/{address}',
    consensus: ConsensusType.PROOF_OF_STAKE,
    brandColor: '#1969FF',
  },
  [Chain.GNOSIS]: {
    displayName: 'Gnosis Chain',
    abbreviation: 'GNO',
    chainId: 100,
    isEvm: true,
    isL2: false,
    nativeCurrency: 'xDAI',
    explorerUrl: 'https://gnosisscan.io',
    txUrlTemplate: 'https://gnosisscan.io/tx/{hash}',
    addressUrlTemplate: 'https://gnosisscan.io/address/{address}',
    consensus: ConsensusType.PROOF_OF_STAKE,
    brandColor: '#04795B',
  },
  [Chain.CRONOS]: {
    displayName: 'Cronos',
    abbreviation: 'CRO',
    chainId: 25,
    isEvm: true,
    isL2: false,
    nativeCurrency: 'CRO',
    explorerUrl: 'https://cronoscan.com',
    txUrlTemplate: 'https://cronoscan.com/tx/{hash}',
    addressUrlTemplate: 'https://cronoscan.com/address/{address}',
    consensus: ConsensusType.PROOF_OF_STAKE,
    brandColor: '#002D74',
  },

  // ── EVM L2 ────────────────────────────────────────────────────────────────
  [Chain.POLYGON]: {
    displayName: 'Polygon',
    abbreviation: 'MATIC',
    chainId: 137,
    isEvm: true,
    isL2: true,
    nativeCurrency: 'POL',
    explorerUrl: 'https://polygonscan.com',
    txUrlTemplate: 'https://polygonscan.com/tx/{hash}',
    addressUrlTemplate: 'https://polygonscan.com/address/{address}',
    consensus: ConsensusType.PROOF_OF_STAKE,
    brandColor: '#8247E5',
  },
  [Chain.ARBITRUM]: {
    displayName: 'Arbitrum One',
    abbreviation: 'ARB',
    chainId: 42161,
    isEvm: true,
    isL2: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    txUrlTemplate: 'https://arbiscan.io/tx/{hash}',
    addressUrlTemplate: 'https://arbiscan.io/address/{address}',
    consensus: ConsensusType.OPTIMISTIC_ROLLUP,
    brandColor: '#28A0F0',
  },
  [Chain.OPTIMISM]: {
    displayName: 'Optimism',
    abbreviation: 'OP',
    chainId: 10,
    isEvm: true,
    isL2: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io',
    txUrlTemplate: 'https://optimistic.etherscan.io/tx/{hash}',
    addressUrlTemplate: 'https://optimistic.etherscan.io/address/{address}',
    consensus: ConsensusType.OPTIMISTIC_ROLLUP,
    brandColor: '#FF0420',
  },
  [Chain.BASE]: {
    displayName: 'Base',
    abbreviation: 'BASE',
    chainId: 8453,
    isEvm: true,
    isL2: true,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://basescan.org',
    txUrlTemplate: 'https://basescan.org/tx/{hash}',
    addressUrlTemplate: 'https://basescan.org/address/{address}',
    consensus: ConsensusType.OPTIMISTIC_ROLLUP,
    brandColor: '#0052FF',
  },

  // ── Non-EVM ───────────────────────────────────────────────────────────────
  [Chain.SOLANA]: {
    displayName: 'Solana',
    abbreviation: 'SOL',
    chainId: null,
    isEvm: false,
    isL2: false,
    nativeCurrency: 'SOL',
    explorerUrl: 'https://explorer.solana.com',
    txUrlTemplate: 'https://explorer.solana.com/tx/{hash}',
    addressUrlTemplate: 'https://explorer.solana.com/address/{address}',
    consensus: ConsensusType.PROOF_OF_HISTORY,
    brandColor: '#9945FF',
  },
  [Chain.COSMOS]: {
    displayName: 'Cosmos Hub',
    abbreviation: 'ATOM',
    chainId: null,
    isEvm: false,
    isL2: false,
    nativeCurrency: 'ATOM',
    explorerUrl: 'https://www.mintscan.io/cosmos',
    txUrlTemplate: 'https://www.mintscan.io/cosmos/tx/{hash}',
    addressUrlTemplate:
      'https://www.mintscan.io/cosmos/account/{address}',
    consensus: ConsensusType.PROOF_OF_STAKE,
    brandColor: '#2E3148',
  },
  [Chain.NEAR]: {
    displayName: 'NEAR Protocol',
    abbreviation: 'NEAR',
    chainId: null,
    isEvm: false,
    isL2: false,
    nativeCurrency: 'NEAR',
    explorerUrl: 'https://nearblocks.io',
    txUrlTemplate: 'https://nearblocks.io/txns/{hash}',
    addressUrlTemplate: 'https://nearblocks.io/address/{address}',
    consensus: ConsensusType.PROOF_OF_STAKE,
    brandColor: '#00EC97',
  },
  [Chain.STELLAR]: {
    displayName: 'Stellar',
    abbreviation: 'XLM',
    chainId: null,
    isEvm: false,
    isL2: false,
    nativeCurrency: 'XLM',
    explorerUrl: 'https://stellarchain.io',
    txUrlTemplate: 'https://stellarchain.io/transactions/{hash}',
    addressUrlTemplate: 'https://stellarchain.io/accounts/{address}',
    consensus: ConsensusType.FEDERATED,
    brandColor: '#000000',
  },

  // ── Meta Categories ───────────────────────────────────────────────────────
  [Chain.MULTI]: {
    displayName: 'Multi-Chain',
    abbreviation: 'MULTI',
    chainId: null,
    isEvm: false,
    isL2: false,
    nativeCurrency: 'N/A',
    explorerUrl: null,
    txUrlTemplate: null,
    addressUrlTemplate: null,
    consensus: ConsensusType.OTHER,
    brandColor: '#6B7280',
  },
  [Chain.UNKNOWN]: {
    displayName: 'Unknown',
    abbreviation: '???',
    chainId: null,
    isEvm: false,
    isL2: false,
    nativeCurrency: 'N/A',
    explorerUrl: null,
    txUrlTemplate: null,
    addressUrlTemplate: null,
    consensus: ConsensusType.OTHER,
    brandColor: '#9CA3AF',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns all chain values as an array.
 */
export function getAllChains(): Chain[] {
  return Object.values(Chain);
}

/**
 * Returns only EVM-compatible chains.
 */
export function getEvmChains(): Chain[] {
  return getAllChains().filter((c) => CHAIN_METADATA[c].isEvm);
}

/**
 * Returns only non-EVM chains (excludes meta categories).
 */
export function getNonEvmChains(): Chain[] {
  return getAllChains().filter(
    (c) =>
      !CHAIN_METADATA[c].isEvm &&
      c !== Chain.MULTI &&
      c !== Chain.UNKNOWN,
  );
}

/**
 * Returns only L2/rollup chains.
 */
export function getL2Chains(): Chain[] {
  return getAllChains().filter((c) => CHAIN_METADATA[c].isL2);
}

/**
 * Retrieves metadata for a given chain.
 */
export function getChainMetadata(chain: Chain): ChainMetadata {
  return CHAIN_METADATA[chain];
}

/**
 * Build a transaction explorer URL for a given chain and tx hash.
 * Returns null if the chain doesn't have an explorer configured.
 */
export function buildTxUrl(chain: Chain, txHash: string): string | null {
  const template = CHAIN_METADATA[chain].txUrlTemplate;
  if (template === null) return null;
  return template.replace('{hash}', txHash);
}

/**
 * Build an address explorer URL for a given chain and address.
 * Returns null if the chain doesn't have an explorer configured.
 */
export function buildAddressUrl(
  chain: Chain,
  address: string,
): string | null {
  const template = CHAIN_METADATA[chain].addressUrlTemplate;
  if (template === null) return null;
  return template.replace('{address}', address);
}

/**
 * Resolve a chain from its EVM chain ID.
 * Returns `Chain.UNKNOWN` if no match is found.
 */
export function chainFromChainId(chainId: number): Chain {
  const entry = Object.entries(CHAIN_METADATA).find(
    ([, meta]) => meta.chainId === chainId,
  );
  return entry !== undefined ? (entry[0] as Chain) : Chain.UNKNOWN;
}
