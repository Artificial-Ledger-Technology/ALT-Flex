/**
 * @module hack-normalizer.test
 * @description Unit tests for the HackNormalizer module.
 *
 * Tests cover:
 * - Single record normalization (field mapping, type coercion)
 * - Chain normalization delegation
 * - Attack vector classification delegation
 * - Loss amount handling (0, negative, large values)
 * - Date normalization (Unix timestamp → Date)
 * - URL validation (valid, invalid, missing)
 * - Slug generation
 * - Funds returned clamping
 * - Batch normalization with deduplication
 * - Invalid record logging (not silently dropped)
 * - Zod validation enforcement
 * - Edge cases (empty strings, missing fields)
 *
 * @task P2-ETL-007
 */

import { describe, it, expect, vi } from 'vitest';
import { AttackVector, Chain, type LoggerPort } from '@aegis/core';
import {
  normalizeDefiLlamaHack,
  normalizeDefiLlamaHacks,
  toSlug,
  type RawDefiLlamaHack,
} from '../src/adapters/hack-normalizer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

function createRawHack(overrides?: Partial<RawDefiLlamaHack>): RawDefiLlamaHack {
  return {
    id: 1,
    name: 'Euler Finance',
    date: 1678838400, // 2023-03-15
    amount: 197000000,
    chains: ['Ethereum'],
    technique: 'Flash Loan Attack',
    bridgeHack: false,
    returnedFunds: 100000000,
    target: 'Euler Finance lending protocol',
    source: 'https://example.com/euler-hack',
    ...overrides,
  };
}

function createMockLogger(): LoggerPort {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// toSlug
// ═══════════════════════════════════════════════════════════════════════════════

describe('toSlug', () => {
  it('converts "Euler Finance" → "euler-finance"', () => {
    expect(toSlug('Euler Finance')).toBe('euler-finance');
  });

  it('strips special characters', () => {
    expect(toSlug('Beanstalk (Governance)')).toBe('beanstalk-governance');
  });

  it('handles single-word names', () => {
    expect(toSlug('Ronin')).toBe('ronin');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeDefiLlamaHack (single record)
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeDefiLlamaHack', () => {
  // ── Field Mapping ─────────────────────────────────────────────────────────

  it('maps protocolName from raw name', () => {
    const result = normalizeDefiLlamaHack(createRawHack());
    expect(result.protocolName).toBe('Euler Finance');
  });

  it('maps protocolSlug from raw name', () => {
    const result = normalizeDefiLlamaHack(createRawHack());
    expect(result.protocolSlug).toBe('euler-finance');
  });

  it('generates a deterministic UUID id', () => {
    const a = normalizeDefiLlamaHack(createRawHack({ id: 42 }));
    const b = normalizeDefiLlamaHack(createRawHack({ id: 42 }));
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('generates different UUIDs for different raw ids', () => {
    const a = normalizeDefiLlamaHack(createRawHack({ id: 1 }));
    const b = normalizeDefiLlamaHack(createRawHack({ id: 2 }));
    expect(a.id).not.toBe(b.id);
  });

  it('sets dataSource to "defillama"', () => {
    const result = normalizeDefiLlamaHack(createRawHack());
    expect(result.dataSource).toBe('defillama');
  });

  it('maps description from raw target', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ target: 'Euler lending protocol' }),
    );
    expect(result.description).toBe('Euler lending protocol');
  });

  // ── Date Normalization ────────────────────────────────────────────────────

  it('converts Unix timestamp to Date', () => {
    const result = normalizeDefiLlamaHack(createRawHack({ date: 1678838400 }));
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.toISOString()).toContain('2023-03-15');
  });

  it('handles date=0 gracefully', () => {
    const result = normalizeDefiLlamaHack(createRawHack({ date: 0 }));
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.getTime()).toBe(0);
  });

  // ── Loss Amount ───────────────────────────────────────────────────────────

  it('maps amount to lossUsd', () => {
    const result = normalizeDefiLlamaHack(createRawHack({ amount: 197000000 }));
    expect(result.lossUsd).toBe(197000000);
  });

  it('clamps negative amount to 0', () => {
    const result = normalizeDefiLlamaHack(createRawHack({ amount: -500 }));
    expect(result.lossUsd).toBe(0);
  });

  it('handles zero amount', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ amount: 0, returnedFunds: 0 }),
    );
    expect(result.lossUsd).toBe(0);
  });

  // ── Funds Returned ────────────────────────────────────────────────────────

  it('maps returnedFunds to fundsReturned', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ returnedFunds: 50000000 }),
    );
    expect(result.fundsReturned).toBe(50000000);
  });

  it('handles null returnedFunds as 0', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ returnedFunds: null }),
    );
    expect(result.fundsReturned).toBe(0);
  });

  it('clamps fundsReturned to lossUsd when it exceeds', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ amount: 100, returnedFunds: 999 }),
    );
    expect(result.fundsReturned).toBeLessThanOrEqual(result.lossUsd);
  });

  // ── Chain Normalization ───────────────────────────────────────────────────

  it('normalizes chain via normalizeChains', () => {
    const result = normalizeDefiLlamaHack(createRawHack({ chains: ['Ethereum'] }));
    expect(result.chain).toBe(Chain.ETHEREUM);
  });

  it('normalizes multi-chain to MULTI', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ chains: ['Ethereum', 'BSC'] }),
    );
    expect(result.chain).toBe(Chain.MULTI);
  });

  it('handles empty chains array as UNKNOWN', () => {
    const result = normalizeDefiLlamaHack(createRawHack({ chains: [] }));
    expect(result.chain).toBe(Chain.UNKNOWN);
  });

  // ── Attack Vector Classification ──────────────────────────────────────────

  it('classifies technique via classifyAttackVector', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ technique: 'Reentrancy' }),
    );
    expect(result.attackVector).toBe(AttackVector.REENTRANCY);
  });

  it('overrides to BRIDGE_EXPLOIT when bridgeHack=true', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ bridgeHack: true, technique: 'Flash Loan' }),
    );
    expect(result.attackVector).toBe(AttackVector.BRIDGE_EXPLOIT);
  });

  it('falls back to OTHER for empty technique', () => {
    const result = normalizeDefiLlamaHack(createRawHack({ technique: '' }));
    expect(result.attackVector).toBe(AttackVector.OTHER);
  });

  // ── Source URL Validation ─────────────────────────────────────────────────

  it('includes valid source URLs', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ source: 'https://rekt.news/euler-hack' }),
    );
    expect(result.sources).toEqual(['https://rekt.news/euler-hack']);
  });

  it('excludes invalid source URLs', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ source: 'not-a-url' }),
    );
    expect(result.sources).toEqual([]);
  });

  it('handles undefined source', () => {
    const result = normalizeDefiLlamaHack(
      createRawHack({ source: undefined }),
    );
    expect(result.sources).toEqual([]);
  });

  it('handles empty string source', () => {
    const result = normalizeDefiLlamaHack(createRawHack({ source: '' }));
    expect(result.sources).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeDefiLlamaHacks (batch with deduplication)
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeDefiLlamaHacks', () => {
  it('normalizes a batch of valid records', () => {
    const logger = createMockLogger();
    const result = normalizeDefiLlamaHacks(
      [createRawHack({ id: 1 }), createRawHack({ id: 2, name: 'Curve' })],
      logger,
    );
    expect(result.valid).toHaveLength(2);
    expect(result.invalidCount).toBe(0);
  });

  it('deduplicates by protocolName + date', () => {
    const logger = createMockLogger();
    const result = normalizeDefiLlamaHacks(
      [
        createRawHack({ id: 1, name: 'Euler Finance', date: 1678838400 }),
        createRawHack({ id: 2, name: 'Euler Finance', date: 1678838400 }),
      ],
      logger,
    );
    expect(result.valid).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });

  it('does not deduplicate different dates', () => {
    const logger = createMockLogger();
    const result = normalizeDefiLlamaHacks(
      [
        createRawHack({ id: 1, name: 'Euler Finance', date: 1678838400 }),
        createRawHack({ id: 2, name: 'Euler Finance', date: 1678924800 }),
      ],
      logger,
    );
    expect(result.valid).toHaveLength(2);
    expect(result.duplicateCount).toBe(0);
  });

  it('logs invalid records without crashing', () => {
    const logger = createMockLogger();
    // Force invalid: protocolName is required (min 1 char)
    const result = normalizeDefiLlamaHacks(
      [createRawHack(), createRawHack({ id: 2, name: '' })],
      logger,
    );
    expect(result.valid).toHaveLength(1);
    expect(result.invalidCount).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid DefiLlama record skipped'),
      expect.any(Object)
    );
  });

  it('logs summary info', () => {
    const logger = createMockLogger();
    normalizeDefiLlamaHacks([createRawHack()], logger);
    expect(logger.info).toHaveBeenCalledWith(
      'DefiLlama normalization complete',
      expect.objectContaining({ total: 1, valid: 1 }),
    );
  });

  it('returns empty result for empty input', () => {
    const logger = createMockLogger();
    const result = normalizeDefiLlamaHacks([], logger);
    expect(result.valid).toHaveLength(0);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
  });
});
