/**
 * @module chain-normalizer.test
 * @description Unit tests for the chain name normalization module.
 *
 * Tests cover:
 * - Exact chain name matching
 * - Case-insensitive matching
 * - Common alias resolution
 * - Multi-chain array handling
 * - Unknown chain fallback
 * - Edge cases (empty, whitespace)
 *
 * @task P2-ETL-001
 */

import { describe, it, expect } from 'vitest';
import { Chain } from '@aegis/core';
import { normalizeChainName, normalizeChains } from '../src/adapters/chain-normalizer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeChainName
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeChainName', () => {
  it('normalizes "Ethereum" → Chain.ETHEREUM', () => {
    expect(normalizeChainName('Ethereum')).toBe(Chain.ETHEREUM);
  });

  it('normalizes "BSC" → Chain.BSC', () => {
    expect(normalizeChainName('BSC')).toBe(Chain.BSC);
  });

  it('normalizes "Polygon" → Chain.POLYGON', () => {
    expect(normalizeChainName('Polygon')).toBe(Chain.POLYGON);
  });

  it('normalizes "Arbitrum" → Chain.ARBITRUM', () => {
    expect(normalizeChainName('Arbitrum')).toBe(Chain.ARBITRUM);
  });

  it('normalizes "Optimism" → Chain.OPTIMISM', () => {
    expect(normalizeChainName('Optimism')).toBe(Chain.OPTIMISM);
  });

  it('normalizes "Avalanche" → Chain.AVALANCHE', () => {
    expect(normalizeChainName('Avalanche')).toBe(Chain.AVALANCHE);
  });

  it('normalizes "Solana" → Chain.SOLANA', () => {
    expect(normalizeChainName('Solana')).toBe(Chain.SOLANA);
  });

  it('is case-insensitive ("ETHEREUM" → Chain.ETHEREUM)', () => {
    expect(normalizeChainName('ETHEREUM')).toBe(Chain.ETHEREUM);
  });

  it('handles common alias "Binance" → Chain.BSC', () => {
    expect(normalizeChainName('Binance')).toBe(Chain.BSC);
  });

  it('handles alias "Matic" → Chain.POLYGON', () => {
    expect(normalizeChainName('Matic')).toBe(Chain.POLYGON);
  });

  it('handles alias "xDai" → Chain.GNOSIS', () => {
    expect(normalizeChainName('xDai')).toBe(Chain.GNOSIS);
  });

  it('trims whitespace from input', () => {
    expect(normalizeChainName('  Ethereum  ')).toBe(Chain.ETHEREUM);
  });

  it('returns Chain.UNKNOWN for unrecognized chain names', () => {
    expect(normalizeChainName('SomeRandomChain')).toBe(Chain.UNKNOWN);
  });

  it('returns Chain.UNKNOWN for empty string', () => {
    expect(normalizeChainName('')).toBe(Chain.UNKNOWN);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeChains
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeChains', () => {
  it('returns Chain.UNKNOWN for empty array', () => {
    expect(normalizeChains([])).toBe(Chain.UNKNOWN);
  });

  it('normalizes single-element array', () => {
    expect(normalizeChains(['Ethereum'])).toBe(Chain.ETHEREUM);
  });

  it('returns Chain.MULTI for multi-element array', () => {
    expect(normalizeChains(['Ethereum', 'BSC'])).toBe(Chain.MULTI);
  });

  it('returns Chain.MULTI for 3+ element array', () => {
    expect(normalizeChains(['Ethereum', 'Polygon', 'Arbitrum'])).toBe(Chain.MULTI);
  });

  it('handles single unknown chain in array', () => {
    expect(normalizeChains(['UnknownChain'])).toBe(Chain.UNKNOWN);
  });

  it('handles non-array input gracefully', () => {
    expect(normalizeChains(null as unknown as string[])).toBe(Chain.UNKNOWN);
  });
});
