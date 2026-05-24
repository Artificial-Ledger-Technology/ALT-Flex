/**
 * @module readme-parser.test
 * @description Unit tests for the DeFiHackLabs README table parser.
 *
 * Tests cover:
 * - Parsing valid markdown table rows
 * - Different loss amount formats ($197M, ~$1.2B, $500K)
 * - Handling missing or unparseable fields
 * - Ignoring non-table content
 *
 * @task P2-ETL-002
 */

import { describe, it, expect } from 'vitest';
import { parseReadmeTables, parseLossAmount } from '../src/adapters/readme-parser.js';

describe('parseReadmeTables', () => {
  it('parses standard table row format', () => {
    const markdown = `
| Protocol | Date | Loss | Test File |
|----------|------|------|-----------|
| Euler Finance | 2023-03-13 | $197M | [Link](src/test/2023-03/Euler_exp.sol) |
| Ronin | 2022-03-28 | $625M | [Ronin_exp](src/test/2022-03/Ronin_exp.sol) |
    `;

    const result = parseReadmeTables(markdown);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      protocolName: 'Euler Finance',
      date: new Date('2023-03-13'),
      lossUsd: 197000000,
      testFilePath: 'src/test/2023-03/Euler_exp.sol',
    });
    expect(result[1]).toEqual({
      protocolName: 'Ronin',
      date: new Date('2022-03-28'),
      lossUsd: 625000000,
      testFilePath: 'src/test/2022-03/Ronin_exp.sol',
    });
  });

  it('ignores non-table markdown content', () => {
    const markdown = `
# DeFiHackLabs
This is a repository of DeFi hack POCs.

| Protocol | Date | Loss | Test File |
|----------|------|------|-----------|
| Simple | 2021-01-01 | $1M | [Link](src/test/Simple.sol) |

Please see the docs for more info.
    `;

    const result = parseReadmeTables(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].protocolName).toBe('Simple');
  });

  it('handles empty or malformed cells gracefully', () => {
    const markdown = `
| Protocol | Date | Loss | Test File |
|----------|------|------|-----------|
| NoDate | invalid-date | $1M | [Link](src/test/x.sol) |
| NoLink | 2021-01-01 | $1M | No link here |
    `;

    const result = parseReadmeTables(markdown);

    // Both should be skipped due to validation (invalid date, no link match)
    expect(result).toHaveLength(0);
  });
});

describe('parseLossAmount', () => {
  it('parses Millions (M) correctly', () => {
    expect(parseLossAmount('$197M')).toBe(197_000_000);
    expect(parseLossAmount('197m')).toBe(197_000_000);
    expect(parseLossAmount(' $ 1.5 M ')).toBe(1_500_000);
  });

  it('parses Billions (B) correctly', () => {
    expect(parseLossAmount('$1.2B')).toBe(1_200_000_000);
    expect(parseLossAmount('~$3.6B')).toBe(3_600_000_000);
  });

  it('parses Thousands (K) correctly', () => {
    expect(parseLossAmount('$500K')).toBe(500_000);
    expect(parseLossAmount('~$100k')).toBe(100_000);
  });

  it('parses raw numbers correctly', () => {
    expect(parseLossAmount('$500000')).toBe(500_000);
    expect(parseLossAmount('1000')).toBe(1000);
  });

  it('handles approximate indicators (~)', () => {
    expect(parseLossAmount('~$1M')).toBe(1_000_000);
    expect(parseLossAmount('~ $ 2.5B')).toBe(2_500_000_000);
  });

  it('returns 0 for unparseable or empty values', () => {
    expect(parseLossAmount('-')).toBe(0);
    expect(parseLossAmount('N/A')).toBe(0);
    expect(parseLossAmount('')).toBe(0);
    expect(parseLossAmount('Unknown')).toBe(0);
  });
});
