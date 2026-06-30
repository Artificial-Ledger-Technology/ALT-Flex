/**
 * @module defillama-adapter.test
 * @description Unit tests for the DefiLlama API adapter.
 *
 * All HTTP calls are mocked via vitest — no live API calls.
 * Tests cover:
 * - Happy path fetch + transform
 * - Field mapping accuracy
 * - Retry logic on network errors
 * - Rate limiting (HTTP 429) handling
 * - Partial failure tolerance (invalid records skipped)
 * - Edge cases (empty response, null fields)
 * - Zod validation enforcement
 *
 * @task P2-ETL-001
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import axios from 'axios';
import { Chain, AttackVector, HackIncidentSchema, type LoggerPort } from '@aegis/core';
import { DefiLlamaAdapter, type DefiLlamaHack } from '../src/adapters/defillama-adapter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('axios');

/**
 * Create a mock LoggerPort for testing.
 * All methods are vi.fn() — can assert log calls.
 */
function createMockLogger(): LoggerPort {
  const logger: LoggerPort = {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger;
}

/**
 * Create a valid DefiLlama hack record for testing.
 */
function createRawHack(overrides: Partial<DefiLlamaHack> = {}): DefiLlamaHack {
  return {
    id: 1,
    name: 'Euler Finance',
    date: 1678694400, // 2023-03-13T12:00:00Z
    amount: 197000000,
    chains: ['Ethereum'],
    technique: 'Flash Loan Attack',
    bridgeHack: false,
    returnedFunds: 100000000,
    target: 'Euler Finance lending protocol',
    source: 'https://rekt.news/euler-finance-rekt/',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Setup
// ═══════════════════════════════════════════════════════════════════════════════

describe('DefiLlamaAdapter', () => {
  let mockLogger: LoggerPort;
  let adapter: DefiLlamaAdapter;
  let mockCreate: Mock;
  let mockGet: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = createMockLogger();
    mockGet = vi.fn();
    mockCreate = vi.fn().mockReturnValue({ get: mockGet });
    (axios.create as Mock) = mockCreate;
    // Default: axios.isAxiosError returns false
    (axios.isAxiosError as unknown as Mock) = vi.fn().mockReturnValue(false);

    adapter = new DefiLlamaAdapter(mockLogger, {
      retryBaseDelayMs: 1, // Fast retries for tests
      retryMaxDelayMs: 10,
      maxRetries: 2,
    });
  });

  // ── sourceName ────────────────────────────────────────────────────────────

  it('has sourceName "defillama"', () => {
    expect(adapter.sourceName).toBe('defillama');
  });

  // ── Happy Path ────────────────────────────────────────────────────────────

  it('fetches and transforms valid hack records', async () => {
    const rawHacks = [createRawHack()];
    mockGet.mockResolvedValueOnce({ data: rawHacks });

    const result = await adapter.fetchAllHacks();

    expect(result).toHaveLength(1);
    expect(result[0].protocolName).toBe('Euler Finance');
  });

  it('maps all DefiLlama fields to HackIncident correctly', async () => {
    const rawHack = createRawHack({
      id: 42,
      name: 'Ronin Bridge',
      date: 1648425600, // 2022-03-28
      amount: 625000000,
      chains: ['Ethereum'],
      technique: 'Access Control',
      bridgeHack: false,
      returnedFunds: 0,
      target: 'Ronin Network bridge',
      source: 'https://example.com/report',
    });
    mockGet.mockResolvedValueOnce({ data: [rawHack] });

    const result = await adapter.fetchAllHacks();

    expect(result).toHaveLength(1);
    const incident = result[0];
    expect(incident.protocolName).toBe('Ronin Bridge');
    expect(incident.lossUsd).toBe(625000000);
    expect(incident.chain).toBe(Chain.ETHEREUM);
    expect(incident.attackVector).toBe(AttackVector.ACCESS_CONTROL);
    expect(incident.fundsReturned).toBe(0);
    expect(incident.dataSource).toBe('defillama');
    expect(incident.hasFoundryPoc).toBe(false);
    expect(incident.sources).toEqual(['https://example.com/report']);
  });

  it('converts Unix timestamp to Date object', async () => {
    const rawHack = createRawHack({ date: 1678694400 }); // 2023-03-13T12:00:00Z
    mockGet.mockResolvedValueOnce({ data: [rawHack] });

    const result = await adapter.fetchAllHacks();

    expect(result[0].date).toBeInstanceOf(Date);
    expect(result[0].date.getFullYear()).toBe(2023);
  });

  it('generates UUID for each incident', async () => {
    mockGet.mockResolvedValueOnce({ data: [createRawHack()] });

    const result = await adapter.fetchAllHacks();

    expect(result[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generates protocol slug from name', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ name: 'Euler Finance' })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].protocolSlug).toBe('euler-finance');
  });

  // ── Chain Normalization ───────────────────────────────────────────────────

  it('normalizes chain name "Ethereum" → Chain.ETHEREUM', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ chains: ['Ethereum'] })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].chain).toBe(Chain.ETHEREUM);
  });

  it('normalizes chain name "BSC" → Chain.BSC', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ chains: ['BSC'] })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].chain).toBe(Chain.BSC);
  });

  it('falls back to Chain.UNKNOWN for unrecognized chain', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ chains: ['SomeNewChain'] })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].chain).toBe(Chain.UNKNOWN);
  });

  it('handles multi-chain arrays → Chain.MULTI', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ chains: ['Ethereum', 'BSC', 'Polygon'] })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].chain).toBe(Chain.MULTI);
  });

  // ── Attack Vector Classification ──────────────────────────────────────────

  it('classifies "Reentrancy" → REENTRANCY', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ technique: 'Reentrancy' })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].attackVector).toBe(AttackVector.REENTRANCY);
  });

  it('classifies "Flash Loan" → FLASH_LOAN', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ technique: 'Flash Loan' })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].attackVector).toBe(AttackVector.FLASH_LOAN);
  });

  it('bridgeHack=true overrides to BRIDGE_EXPLOIT', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ technique: 'Flash Loan', bridgeHack: true })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].attackVector).toBe(AttackVector.BRIDGE_EXPLOIT);
  });

  it('falls back to AttackVector.OTHER for unknown technique', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ technique: 'Novel Zero-Day' })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].attackVector).toBe(AttackVector.OTHER);
  });

  // ── Retry Logic ───────────────────────────────────────────────────────────

  it('retries on network error (up to maxRetries)', async () => {
    const networkError = new Error('ECONNREFUSED');
    mockGet
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ data: [createRawHack()] });

    const result = await adapter.fetchAllHacks();

    expect(result).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('throws after all retries are exhausted', async () => {
    const networkError = new Error('ETIMEDOUT');
    mockGet
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError);

    await expect(adapter.fetchAllHacks()).rejects.toThrow('ETIMEDOUT');
    expect(mockGet).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('handles HTTP 429 with retry', async () => {
    const rateLimitError = {
      response: { status: 429, headers: {} },
      isAxiosError: true,
    };
    (axios.isAxiosError as unknown as Mock).mockReturnValue(true);

    mockGet
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ data: [createRawHack()] });

    const result = await adapter.fetchAllHacks();

    expect(result).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  // ── Partial Failure Tolerance ─────────────────────────────────────────────

  it('logs invalid records and continues (partial failure)', async () => {
    const validHack = createRawHack({ name: 'Valid Protocol' });
    const invalidHack = createRawHack({
      name: '', // protocolName requires min(1)
    });

    mockGet.mockResolvedValueOnce({ data: [validHack, invalidHack] });

    const result = await adapter.fetchAllHacks();

    // Only valid record should be returned
    expect(result).toHaveLength(1);
    expect(result[0].protocolName).toBe('Valid Protocol');

    // Invalid record should be logged
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Skipping invalid DefiLlama record',
      expect.objectContaining({ rawName: '' }),
    );
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  it('returns empty array when API returns empty response', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    const result = await adapter.fetchAllHacks();

    expect(result).toEqual([]);
  });

  it('handles null returnedFunds gracefully (defaults to 0)', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ returnedFunds: null })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].fundsReturned).toBe(0);
  });

  it('handles missing source URL gracefully', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ source: undefined })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].sources).toEqual([]);
  });

  it('filters out invalid source URLs', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ source: 'not-a-url' })],
    });

    const result = await adapter.fetchAllHacks();

    expect(result[0].sources).toEqual([]);
  });

  it('handles missing chains array gracefully', async () => {
    const rawHack = createRawHack({ chains: undefined as unknown as string[] });
    mockGet.mockResolvedValueOnce({ data: [rawHack] });

    const result = await adapter.fetchAllHacks();

    expect(result[0].chain).toBe(Chain.UNKNOWN);
  });

  // ── Zod Validation ────────────────────────────────────────────────────────

  it('validates output against HackIncidentSchema', async () => {
    mockGet.mockResolvedValueOnce({ data: [createRawHack()] });

    const result = await adapter.fetchAllHacks();

    for (const incident of result) {
      const parsed = HackIncidentSchema.safeParse(incident);
      expect(parsed.success).toBe(true);
    }
  });

  it('rejects records where fundsReturned > lossUsd', async () => {
    mockGet.mockResolvedValueOnce({
      data: [createRawHack({ amount: 100, returnedFunds: 200 })],
    });

    const result = await adapter.fetchAllHacks();

    // Should be filtered out by Zod refinement
    expect(result).toHaveLength(0);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  // ── Non-array response ────────────────────────────────────────────────────

  it('handles non-array API response gracefully', async () => {
    mockGet.mockResolvedValueOnce({ data: { error: 'unexpected format' } });

    const result = await adapter.fetchAllHacks();

    expect(result).toEqual([]);
  });
});
