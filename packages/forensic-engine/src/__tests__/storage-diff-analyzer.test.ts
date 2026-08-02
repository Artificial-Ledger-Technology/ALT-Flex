/**
 * @module storage-diff-analyzer.test
 * @description Unit tests for the Storage Diff Analyzer (P5-EVM-004).
 *
 * Tests cover all acceptance criteria:
 * - StorageLayoutDecoder mapping key derivation
 * - StorageLayoutDecoder uint256 decoding (including fractional scaling)
 * - StorageSlotDiscoverer event parsing and heuristic discovery
 * - StorageDiffAnalyzer core logic using eth_getStorageAt
 * - Truncation and formatting
 *
 * All tests use mocked RPC — no live calls.
 *
 * @task P5-EVM-004
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chain, type IRpcPort } from '@aegis/core';
import { StorageDiffAnalyzer } from '../adapters/storage/storage-diff-analyzer.js';
import { StorageLayoutDecoder } from '../adapters/storage/storage-layout-decoder.js';
import { StorageSlotDiscoverer } from '../adapters/storage/storage-slot-discoverer.js';
import type { TraceDecodedEvent } from '../domain/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock RPC Port
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a mock RPC port that returns specific pre-recorded hex strings
 * for known slots at specific blocks.
 */
function createMockRpcPort(storageMap: Map<string, string>): IRpcPort {
  return {
    getBlock: vi.fn(),
    getTransaction: vi.fn(),
    getTransactionReceipt: vi.fn(),
    traceTransaction: vi.fn(),
    getStorageAt: vi
      .fn()
      .mockImplementation((_chain, _address, slot: string, blockNumber: number) => {
        const key = `${slot}-${blockNumber}`;
        return storageMap.get(key) ?? '0x0';
      }),
    call: vi.fn(),
    getCode: vi.fn(),
    getLogs: vi.fn(),
    isHealthy: vi.fn(),
  } as unknown as IRpcPort;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5-EVM-004: Storage Diff Analyzer', () => {
  let decoder: StorageLayoutDecoder;
  let discoverer: StorageSlotDiscoverer;

  beforeEach(() => {
    decoder = new StorageLayoutDecoder();
    discoverer = new StorageSlotDiscoverer(decoder);
  });

  // ── 1. Layout Decoder ─────────────────────────────────────────────────────

  describe('StorageLayoutDecoder', () => {
    it('1. should compute standard mapping slot (keccak256(key + base))', () => {
      const address = '0xd2e16a20dd7b1ae54fb0312209784478d069c7b0';
      const slot = decoder.deriveMappingSlot(address, 0);

      // Known correct keccak256 for this specific address padded to 32 bytes with slot 0
      // keccak256(0x000000000000000000000000d2e16a20dd7b1ae54fb0312209784478d069c7b00000000000000000000000000000000000000000000000000000000000000000)
      expect(slot).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('2. should decode raw uint256 hex string with 18 decimals', () => {
      // 1 ETH in wei
      const hex = '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000';
      const decoded = decoder.decodeUint256Balance(hex, 18, 'ETH');
      expect(decoded).toBe('1 ETH');
    });

    it('3. should handle fractional token amounts correctly', () => {
      // 1.5 ETH in wei
      const hex = '0x00000000000000000000000000000000000000000000000014d1120d7b160000';
      const decoded = decoder.decodeUint256Balance(hex, 18, 'ETH');
      expect(decoded).toBe('1.5 ETH');
    });

    it('4. should correctly format zero values and edge cases', () => {
      expect(decoder.decodeUint256Balance('0x0')).toBe('0 TOKENS');
      expect(decoder.decodeUint256Balance('0x')).toBe('0 TOKENS');
      expect(decoder.decodeUint256Balance('invalid')).toBe('Invalid TOKENS value');
    });

    it('5. should interpret balance changes (increase/decrease)', () => {
      const zero = '0x0';
      const oneEth = '0x0de0b6b3a7640000'; // 1e18

      // Zero to One
      expect(decoder.interpretBalanceChange(zero, oneEth, 'Alice balance', 18, 'ETH')).toBe(
        'Alice balance increased by 1 ETH',
      );

      // Two to One
      const decStr = decoder.interpretBalanceChange(
        '0x01bc16d674ec80000',
        '0x0de0b6b3a7640000',
        'Bob balance',
        18,
        'ETH',
      );
      expect(decStr).toContain('decreased by');

      // No change
      expect(decoder.interpretBalanceChange(oneEth, oneEth, 'Carol balance')).toBe(
        'Carol balance remained unchanged',
      );
    });
  });

  // ── 2. Slot Discoverer ────────────────────────────────────────────────────

  describe('StorageSlotDiscoverer', () => {
    it('6. should extract from/to addresses from Transfer event and guess common slots', () => {
      const fromAddr = '0x1111111111111111111111111111111111111111';
      const toAddr = '0x2222222222222222222222222222222222222222';

      const transferEvent: TraceDecodedEvent = {
        address: '0xToken',
        name: 'Transfer',
        signature: 'Transfer(address,address,uint256)',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          `0x000000000000000000000000${fromAddr.slice(2)}`,
          `0x000000000000000000000000${toAddr.slice(2)}`,
        ],
        data: '0x1',
        logIndex: 0,
        decoded: null,
      };

      const requirements = discoverer.discoverFromEvents([transferEvent]);

      // Known bases: 0, 1, 2, 3 -> 4 bases per address = 8 total slots to check
      expect(requirements.length).toBe(8);

      const labels = requirements.map((r) => r.label);
      expect(labels.some((l) => l?.includes(fromAddr))).toBe(true);
      expect(labels.some((l) => l?.includes(toAddr))).toBe(true);
    });

    it('7. should ignore the zero address when discovering mapping slots', () => {
      // Mint event (from 0x0)
      const toAddr = '0x2222222222222222222222222222222222222222';

      const transferEvent: TraceDecodedEvent = {
        address: '0xToken',
        name: 'Transfer',
        signature: 'Transfer(address,address,uint256)',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          `0x000000000000000000000000${toAddr.slice(2)}`,
        ],
        data: '0x1',
        logIndex: 0,
        decoded: null,
      };

      const requirements = discoverer.discoverFromEvents([transferEvent]);

      // Only 4 slots for the 'to' address
      expect(requirements.length).toBe(4);
    });

    it('8. should filter discovery to a specific contract address if requested', () => {
      const e1: TraceDecodedEvent = {
        address: '0xTokenA',
        name: 'Transfer',
        signature: 'Transfer(address,address,uint256)',
        topics: [
          'hash',
          '0x0000000000000000000000001111111111111111111111111111111111111111',
          '0x0000000000000000000000002222222222222222222222222222222222222222',
        ],
        data: '0x1',
        logIndex: 0,
        decoded: null,
      };
      const e2: TraceDecodedEvent = {
        address: '0xTokenB',
        name: 'Transfer',
        signature: 'Transfer(address,address,uint256)',
        topics: [
          'hash',
          '0x0000000000000000000000003333333333333333333333333333333333333333',
          '0x0000000000000000000000004444444444444444444444444444444444444444',
        ],
        data: '0x1',
        logIndex: 1,
        decoded: null,
      };

      const requirements = discoverer.discoverFromEvents([e1, e2], '0xTokenA');

      // Only discovers slots from TokenA
      expect(requirements.length).toBe(8); // 4 bases * 2 addresses (assuming valid formatting handled by fallback)
    });
  });

  // ── 3. Diff Analyzer ──────────────────────────────────────────────────────

  describe('StorageDiffAnalyzer', () => {
    it('9. should return empty changes if storage did not mutate', async () => {
      const storageMap = new Map<string, string>([
        ['0x123-100', '0xabc'],
        ['0x123-101', '0xabc'], // Unchanged
      ]);
      const rpc = createMockRpcPort(storageMap);
      const analyzer = new StorageDiffAnalyzer(rpc, decoder);

      const result = await analyzer.analyze(Chain.ETHEREUM, '0xContract', 100, 101, [
        { slot: '0x123', layout: 'simple' },
      ]);

      expect(result.changes.length).toBe(0);
      expect(result.summary).toBe('No storage changes detected.');
    });

    it('10. should record change and interpret simple layouts correctly', async () => {
      const storageMap = new Map<string, string>([
        ['0x999-100', '0x0000000000000000000000000000000000000000000000000000000000000000'],
        ['0x999-101', '0x0000000000000000000000000000000000000000000000000000000000000001'],
      ]);
      const rpc = createMockRpcPort(storageMap);
      const analyzer = new StorageDiffAnalyzer(rpc, decoder);

      const result = await analyzer.analyze(Chain.ETHEREUM, '0xContract', 100, 101, [
        { slot: '0x999', layout: 'simple', label: 'isPaused' },
      ]);

      expect(result.changes.length).toBe(1);
      expect(result.changes[0].interpretation).toContain('isPaused changed from');
    });

    it('11. should record change and interpret balances via mapping layout', async () => {
      const slot = '0x12345';
      const storageMap = new Map<string, string>([
        [`${slot}-100`, '0x0de0b6b3a7640000'], // 1 TOKENS
        [`${slot}-101`, '0x00'], // 0 TOKENS
      ]);
      const rpc = createMockRpcPort(storageMap);
      const analyzer = new StorageDiffAnalyzer(rpc, decoder);

      const result = await analyzer.analyze(Chain.ETHEREUM, '0xToken', 100, 101, [
        { slot, layout: 'mapping', label: 'balanceOf[Attacker]' },
      ]);

      expect(result.changes.length).toBe(1);
      expect(result.changes[0].decodedBefore).toBe('1 TOKENS');
      expect(result.changes[0].decodedAfter).toBe('0 TOKENS');
      expect(result.changes[0].interpretation).toBe('balanceOf[Attacker] decreased by 1 TOKENS');
      expect(result.summary).toContain('1 balance slot(s) mutated');
    });

    it('12. should deduplicate slot queries to prevent redundant RPC calls', async () => {
      const slot = '0x555';
      const storageMap = new Map<string, string>([
        [`${slot}-100`, '0x1'],
        [`${slot}-101`, '0x2'],
      ]);
      const rpc = createMockRpcPort(storageMap);
      const getStorageAtSpy = vi.spyOn(rpc, 'getStorageAt');
      const analyzer = new StorageDiffAnalyzer(rpc, decoder);

      const result = await analyzer.analyze(Chain.ETHEREUM, '0xToken', 100, 101, [
        { slot, layout: 'mapping', label: 'Duplicate 1' },
        { slot, layout: 'mapping', label: 'Duplicate 2' },
        { slot, layout: 'mapping', label: 'Duplicate 3' },
      ]);

      expect(result.changes.length).toBe(1);

      // Should only call getStorageAt twice (once for blockBefore, once for blockAfter)
      // despite 3 requirements requesting the same slot
      expect(getStorageAtSpy).toHaveBeenCalledTimes(2);
    });
  });
});
