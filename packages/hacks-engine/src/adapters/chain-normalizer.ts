/**
 * @module chain-normalizer
 * @description Normalizes raw chain name strings from external APIs
 * to the canonical `Chain` enum values used in the AEGIS domain model.
 *
 * Handles:
 * - Case-insensitive matching ("ethereum" → ETHEREUM)
 * - Common aliases ("Binance" → BSC, "Matic" → POLYGON)
 * - Multi-chain arrays (2+ elements → MULTI)
 * - Unknown chains → UNKNOWN with logged warning
 *
 * This module is reusable across all ETL adapters (DefiLlama, DeFiHackLabs, etc.).
 *
 * @hexagonal Adapter Utility — Infrastructure Layer
 * @task P2-ETL-001
 */

import { Chain } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Chain Normalization Map
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps raw chain name strings (lowercase) to canonical `Chain` enum values.
 *
 * Sources for these mappings:
 * - DefiLlama API response `chains[]` field values
 * - DeFiHackLabs README chain labels
 * - Common industry aliases
 */
const CHAIN_NORMALIZATION: Readonly<Record<string, Chain>> = {
  // ── Exact matches (lowercase) ─────────────────────────────────────────────
  ethereum: Chain.ETHEREUM,
  bsc: Chain.BSC,
  polygon: Chain.POLYGON,
  arbitrum: Chain.ARBITRUM,
  optimism: Chain.OPTIMISM,
  avalanche: Chain.AVALANCHE,
  base: Chain.BASE,
  fantom: Chain.FANTOM,
  gnosis: Chain.GNOSIS,
  cronos: Chain.CRONOS,
  solana: Chain.SOLANA,
  cosmos: Chain.COSMOS,
  near: Chain.NEAR,
  stellar: Chain.STELLAR,

  // ── Common aliases ────────────────────────────────────────────────────────
  binance: Chain.BSC,
  'binance smart chain': Chain.BSC,
  'bnb chain': Chain.BSC,
  'bnb smart chain': Chain.BSC,
  matic: Chain.POLYGON,
  'polygon pos': Chain.POLYGON,
  avax: Chain.AVALANCHE,
  'avalanche c-chain': Chain.AVALANCHE,
  ftm: Chain.FANTOM,
  'fantom opera': Chain.FANTOM,
  xdai: Chain.GNOSIS,
  'gnosis chain': Chain.GNOSIS,
  op: Chain.OPTIMISM,
  'op mainnet': Chain.OPTIMISM,
  arb: Chain.ARBITRUM,
  'arbitrum one': Chain.ARBITRUM,
  eth: Chain.ETHEREUM,
  sol: Chain.SOLANA,
  cro: Chain.CRONOS,
  atom: Chain.COSMOS,
  'cosmos hub': Chain.COSMOS,

  // ── Multi-chain labels ────────────────────────────────────────────────────
  multichain: Chain.MULTI,
  'multi-chain': Chain.MULTI,
  various: Chain.MULTI,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Normalizer Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a single chain name string to a `Chain` enum value.
 *
 * @param rawChainName - Raw chain name from external API
 * @returns Canonical `Chain` enum value, or `Chain.UNKNOWN` if unrecognized
 */
export function normalizeChainName(rawChainName: string): Chain {
  const normalized = rawChainName.trim().toLowerCase();
  return CHAIN_NORMALIZATION[normalized] ?? Chain.UNKNOWN;
}

/**
 * Normalize a chain names array (as returned by DefiLlama) to a single `Chain` value.
 *
 * Rules:
 * 1. Empty array → `Chain.UNKNOWN`
 * 2. Single element → normalize that element
 * 3. Multiple elements → `Chain.MULTI` (cross-chain exploit)
 *
 * @param chains - Array of raw chain names from DefiLlama API
 * @returns Canonical `Chain` enum value
 */
export function normalizeChains(chains: string[]): Chain {
  if (!Array.isArray(chains) || chains.length === 0) {
    return Chain.UNKNOWN;
  }

  if (chains.length === 1) {
    const first = chains[0];
    return first !== undefined ? normalizeChainName(first) : Chain.UNKNOWN;
  }

  // Multiple chains → cross-chain exploit
  return Chain.MULTI;
}
