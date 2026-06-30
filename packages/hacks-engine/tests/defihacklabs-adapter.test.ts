/**
 * @module defihacklabs-adapter.test
 * @description Unit tests for the DeFiHackLabs adapter.
 *
 * Tests cover:
 * - Happy path fetching and transforming
 * - GitHub API rate limit checking
 * - Incremental sync via 304 Not Modified and ETags
 * - Error retry logic and exponential backoff
 * - Base64 content decoding
 * - Invalid record skipping
 *
 * @task P2-ETL-002
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import axios from 'axios';
import { Chain, AttackVector, HackIncidentSchema, type LoggerPort } from '@aegis/core';
import { DeFiHackLabsAdapter } from '../src/adapters/defihacklabs-adapter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('axios');

function createMockLogger(): LoggerPort {
  return {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

const mockReadmeMarkdown = `
# DeFiHackLabs
| Protocol | Date | Loss | Test File |
|----------|------|------|-----------|
| Euler | 2023-03-13 | $197M | [Link](src/test/2023-03/Euler_exp.sol) |
`;
const mockBase64Content = Buffer.from(mockReadmeMarkdown).toString('base64');

// ═══════════════════════════════════════════════════════════════════════════════
// Test Setup
// ═══════════════════════════════════════════════════════════════════════════════

describe('DeFiHackLabsAdapter', () => {
  let mockLogger: LoggerPort;
  let adapter: DeFiHackLabsAdapter;
  let mockGet: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = createMockLogger();
    mockGet = vi.fn();
    (axios.create as Mock).mockReturnValue({ get: mockGet });
    (axios.isAxiosError as unknown as Mock) = vi.fn().mockReturnValue(false);

    adapter = new DeFiHackLabsAdapter(mockLogger, {
      retryBaseDelayMs: 1, // Fast retries for tests
      retryMaxDelayMs: 10,
      maxRetries: 2,
    });
  });

  // ── Basic Attributes ──────────────────────────────────────────────────────

  it('has sourceName "defihacklabs"', () => {
    expect(adapter.sourceName).toBe('defihacklabs');
  });

  // ── Happy Path ────────────────────────────────────────────────────────────

  it('fetches, decodes, and parses README content', async () => {
    mockGet.mockResolvedValueOnce({
      data: { content: mockBase64Content },
      headers: { etag: '"12345"' },
    });

    const result = await adapter.fetchAllHacks();

    expect(result).toHaveLength(1);
    const incident = result[0];
    expect(incident.protocolName).toBe('Euler');
    expect(incident.lossUsd).toBe(197000000);
    expect(incident.hasFoundryPoc).toBe(true);
    expect(incident.foundryTestPath).toBe('src/test/2023-03/Euler_exp.sol');
    expect(incident.dataSource).toBe('defihacklabs');
    expect(incident.chain).toBe(Chain.UNKNOWN); // Doesn't guess chain
  });

  it('populates valid HackIncident fields', async () => {
    mockGet.mockResolvedValueOnce({
      data: { content: mockBase64Content },
      headers: {},
    });

    const result = await adapter.fetchAllHacks();
    
    // Zod validation should pass and generate ID
    const parsed = HackIncidentSchema.safeParse(result[0]);
    expect(parsed.success).toBe(true);
    expect(result[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(adapter.getLastSyncedAt()).toBeInstanceOf(Date);
  });

  // ── Incremental Sync (304 Not Modified) ───────────────────────────────────

  it('returns empty array and does not update when 304 Not Modified', async () => {
    const notModifiedError = {
      response: { status: 304, headers: {} },
      isAxiosError: true,
    };
    (axios.isAxiosError as unknown as Mock).mockReturnValue(true);
    mockGet.mockRejectedValueOnce(notModifiedError);

    const result = await adapter.fetchAllHacks();

    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      'DeFiHackLabs README not modified since last sync'
    );
  });

  it('includes If-None-Match header in subsequent requests', async () => {
    // First request populates ETag
    mockGet.mockResolvedValueOnce({
      data: { content: mockBase64Content },
      headers: { etag: '"etag123"' },
    });
    await adapter.fetchPocMappings();

    // Second request should use ETag
    mockGet.mockResolvedValueOnce({
      data: { content: mockBase64Content },
      headers: { etag: '"etag123"' },
    });
    await adapter.fetchPocMappings();

    expect(mockGet).toHaveBeenNthCalledWith(2, expect.any(String), {
      headers: expect.objectContaining({ 'If-None-Match': '"etag123"' }),
    });
  });

  // ── Rate Limiting ─────────────────────────────────────────────────────────

  it('logs warning when rate limit remaining is low', async () => {
    mockGet.mockResolvedValueOnce({
      data: { content: mockBase64Content },
      headers: { 'x-ratelimit-remaining': '50' }, // Below default threshold 100
    });

    await adapter.fetchAllHacks();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'GitHub API rate limit running low',
      expect.objectContaining({ remaining: 50 })
    );
  });

  it('retries on 403 Rate Limit Exceeded', async () => {
    const rateLimitError = {
      response: { 
        status: 403, 
        headers: { 'retry-after': '0' } 
      },
      isAxiosError: true,
    };
    (axios.isAxiosError as unknown as Mock).mockReturnValue(true);

    mockGet
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ data: { content: mockBase64Content }, headers: {} });

    const result = await adapter.fetchAllHacks();

    expect(result).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  // ── Error Handling ────────────────────────────────────────────────────────

  it('retries on network errors up to maxRetries', async () => {
    const networkError = new Error('ECONNREFUSED');
    mockGet
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ data: { content: mockBase64Content }, headers: {} });

    const result = await adapter.fetchAllHacks();

    expect(result).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('throws after all retries are exhausted', async () => {
    const networkError = new Error('ETIMEDOUT');
    mockGet.mockRejectedValue(networkError);

    await expect(adapter.fetchAllHacks()).rejects.toThrow('ETIMEDOUT');
    expect(mockGet).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('handles empty content gracefully', async () => {
    mockGet.mockResolvedValueOnce({
      data: { content: '' },
      headers: {},
    });

    const result = await adapter.fetchAllHacks();

    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.warn).toHaveBeenCalledWith('Empty content received from GitHub');
  });

  // ── Partial Failure Tolerance ─────────────────────────────────────────────

  it('skips invalid parsed records but processes valid ones', async () => {
    const markdown = `
| Protocol | Date | Loss | Test File |
|----------|------|------|-----------|
| Euler | 2023-03-13 | $197M | [Link](src/test/Euler.sol) |
|   | 2023-03-14 | $1M | [Link](src/test/Empty.sol) |
    `;
    const base64 = Buffer.from(markdown).toString('base64');
    
    mockGet.mockResolvedValueOnce({
      data: { content: base64 },
      headers: {},
    });

    const result = await adapter.fetchAllHacks();

    // Only the valid Euler record should be returned
    expect(result).toHaveLength(1);
    expect(result[0].protocolName).toBe('Euler');
  });
});
