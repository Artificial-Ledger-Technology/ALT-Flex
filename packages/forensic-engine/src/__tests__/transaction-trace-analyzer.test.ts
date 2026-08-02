/**
 * @module transaction-trace-analyzer.test
 * @description Unit tests for the Transaction Trace Analyzer (P5-EVM-003).
 *
 * Tests cover all acceptance criteria:
 * - Hierarchical call tree building from RpcTraceResult
 * - Function selector decoding (cache + 4byte.directory fallback)
 * - Reentrancy detection
 * - Delegate call detection
 * - Call category identification (flash loan, transfer, oracle, admin)
 * - Gas breakdown computation
 * - Value flow extraction
 * - Summary generation
 * - Error handling (trace not available, trace too large)
 *
 * All tests use pre-recorded fixtures and mocked RPC — no live calls.
 *
 * @task P5-EVM-003
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Chain, type IRpcPort, type RpcTraceResult } from '@aegis/core';
import { TransactionTraceAnalyzer } from '../adapters/tracing/transaction-trace-analyzer.js';
import { SelectorResolver } from '../adapters/tracing/selector-resolver.js';
import {
  TraceNotAvailableError,
  TraceTooLargeError,
  TraceDepthExceededError,
} from '../adapters/tracing/trace-errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

async function loadTraceFixture(filename: string): Promise<RpcTraceResult> {
  const raw = await fs.readFile(path.join(FIXTURES_DIR, filename), 'utf-8');
  return JSON.parse(raw) as RpcTraceResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock RPC Port
// ═══════════════════════════════════════════════════════════════════════════════

function createMockRpcPort(traceResult: RpcTraceResult | Error): IRpcPort {
  return {
    getBlock: vi.fn(),
    getTransaction: vi.fn(),
    getTransactionReceipt: vi.fn(),
    traceTransaction: vi.fn().mockImplementation(() => {
      if (traceResult instanceof Error) throw traceResult;
      return traceResult;
    }),
    getStorageAt: vi.fn(),
    call: vi.fn(),
    getCode: vi.fn(),
    getLogs: vi.fn(),
    isHealthy: vi.fn(),
  } as unknown as IRpcPort;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5-EVM-003: Transaction Trace Analyzer', () => {
  const TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  // ── 1. Tree Building ──────────────────────────────────────────────────────

  describe('Call Tree Building', () => {
    it('1. should build hierarchical CallTreeNode from nested RpcTraceResult', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // Root node
      expect(result.callTree.depth).toBe(0);
      expect(result.callTree.type).toBe('CALL');
      expect(result.callTree.from).toBe('0xd2e16a20dd7b1ae54fb0312209784478d069c7b0');
      expect(result.callTree.to).toBe('0x27182842e098f60e3d576794a5bffb0777e025d3');

      // Root has 3 direct children (transfer, callback, transferFrom)
      expect(result.callTree.children.length).toBe(3);

      // Callback child (index 1) has 4 sub-calls
      expect(result.callTree.children[1].children.length).toBe(4);
    });

    it('2. should assign unique IDs and correct depth to each node', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // Root ID
      expect(result.callTree.id).toBe('0-0');
      expect(result.callTree.depth).toBe(0);

      // First child
      expect(result.callTree.children[0].id).toBe('1-1');
      expect(result.callTree.children[0].depth).toBe(1);

      // All IDs should be unique
      const allIds = new Set<string>();
      const collectIds = (node: typeof result.callTree): void => {
        allIds.add(node.id);
        for (const child of node.children) collectIds(child);
      };
      collectIds(result.callTree);

      // Euler fixture has 9 nodes total (root + 3 + 4 + 1 delegatecall)
      expect(allIds.size).toBe(9);
    });

    it('3. should handle simple trace with no children', async () => {
      const fixture = await loadTraceFixture('trace-simple-transfer.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      expect(result.callTree.children.length).toBe(0);
      expect(result.callTree.type).toBe('CALL');
      expect(result.callTree.value).toBe(1000000000000000000n); // 1 ETH
    });

    it('4. should count total nodes correctly for size validation', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);
      expect(result.summary.totalCalls).toBe(9);
    });
  });

  // ── 2. Selector Decoding ──────────────────────────────────────────────────

  describe('Selector Decoding', () => {
    it('5. should decode well-known selectors from preloaded cache', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // First child is a transfer (0xa9059cbb)
      const transferNode = result.callTree.children[0];
      expect(transferNode.decodedCall).toBeDefined();
      expect(transferNode.decodedCall?.name).toBe('transfer');
      expect(transferNode.decodedCall?.selector).toBe('0xa9059cbb');
    });

    it('6. should return null for unknown selectors without throwing', () => {
      const resolver = new SelectorResolver();
      const result = resolver.getCached('0xdeadbeef');
      expect(result).toBeNull();
    });

    it('7. should cache resolved selectors', () => {
      const resolver = new SelectorResolver();

      // Well-known should be cached
      const cached = resolver.getCached('0xa9059cbb');
      expect(cached).toBe('transfer(address,uint256)');

      // Cache size should include all well-known selectors
      expect(resolver.cacheSize).toBeGreaterThan(30);
    });
  });

  // ── 3. Pattern Detection ──────────────────────────────────────────────────

  describe('Pattern Detection', () => {
    it('8. should detect reentrancy — same address called at multiple depths', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // 0x27182842... is called at depth 0 (root target) AND at depth 2 (re-entry)
      expect(result.summary.hasReentrancy).toBe(true);
      expect(result.summary.reentrancyMatches.length).toBeGreaterThan(0);

      const eulerReentry = result.summary.reentrancyMatches.find(
        (m) => m.targetAddress === '0x27182842e098f60e3d576794a5bffb0777e025d3',
      );
      expect(eulerReentry).toBeDefined();
      expect(eulerReentry!.depths.length).toBeGreaterThan(1);
    });

    it('9. should detect delegate calls — DELEGATECALL type', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      expect(result.summary.hasDelegateCalls).toBe(true);
      expect(result.summary.delegateCallMatches.length).toBe(1);
      expect(result.summary.delegateCallMatches[0].proxyAddress).toBe(
        '0x27182842e098f60e3d576794a5bffb0777e025d3',
      );
      expect(result.summary.delegateCallMatches[0].implementationAddress).toBe(
        '0x1234567890abcdef1234567890abcdef12345678',
      );
    });

    it('10. should identify flash loan calls via decoded selectors', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // Root call is flashLoan (0x5cffe9de)
      const flashLoanCalls = result.summary.categorizedCalls.filter(
        (c) => c.category === 'flash_loan',
      );
      expect(flashLoanCalls.length).toBeGreaterThan(0);
      expect(flashLoanCalls[0].functionName).toBe('flashLoan');
    });

    it('11. should identify token transfers and oracle reads', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      const transfers = result.summary.categorizedCalls.filter(
        (c) => c.category === 'token_transfer',
      );
      expect(transfers.length).toBeGreaterThan(0);

      const oracleReads = result.summary.categorizedCalls.filter(
        (c) => c.category === 'oracle_read',
      );
      expect(oracleReads.length).toBeGreaterThan(0);
    });
  });

  // ── 4. Gas & Value Analysis ───────────────────────────────────────────────

  describe('Gas & Value Analysis', () => {
    it('12. should compute gas breakdown aggregated by contract', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      expect(result.gasBreakdown.totalGas).toBeGreaterThan(0n);
      expect(result.gasBreakdown.byContract.size).toBeGreaterThan(0);

      // The DAI contract (0x6b175...) should have gas entries
      const daiGas = result.gasBreakdown.byContract.get(
        '0x6b175474e89094c44da98b954eedeac495271d0f',
      );
      expect(daiGas).toBeDefined();
      expect(daiGas).toBeGreaterThan(0n);
    });

    it('13. should compute value flow for ETH transfers', async () => {
      const fixture = await loadTraceFixture('trace-simple-transfer.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      expect(result.valueFlow.length).toBe(1);
      expect(result.valueFlow[0].value).toBe(1000000000000000000n);
      expect(result.valueFlow[0].from).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      expect(result.valueFlow[0].to).toBe('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    });

    it('14. should handle traces with no value transfers', async () => {
      const noValueTrace: RpcTraceResult = {
        type: 'CALL',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: '0x0',
        gas: '0x5208',
        gasUsed: '0x5208',
        input: '0x',
        output: '0x',
      };
      const rpc = createMockRpcPort(noValueTrace);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      expect(result.valueFlow.length).toBe(0);
      expect(result.summary.totalValueTransferred).toBe(0n);
    });
  });

  // ── 5. Full Orchestration ─────────────────────────────────────────────────

  describe('Full Orchestration', () => {
    it('15. should return complete TransactionTraceResult with all fields', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // Top-level fields
      expect(result.txHash).toBe(TX_HASH);
      expect(result.chain).toBe(Chain.ETHEREUM);

      // Call tree
      expect(result.callTree).toBeDefined();
      expect(result.callTree.id).toBe('0-0');

      // Gas breakdown
      expect(result.gasBreakdown).toBeDefined();
      expect(result.gasBreakdown.totalGas).toBeGreaterThan(0n);

      // Summary
      expect(result.summary.totalCalls).toBeGreaterThan(0);
      expect(result.summary.uniqueContracts).toBeGreaterThan(0);
      expect(result.summary.maxDepth).toBeGreaterThan(0);
    });

    it('16. should throw TraceNotAvailableError when RPC fails', async () => {
      const rpc = createMockRpcPort(new Error('debug_traceTransaction not supported'));
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      await expect(analyzer.analyze(Chain.ETHEREUM, TX_HASH)).rejects.toThrow(
        TraceNotAvailableError,
      );
    });

    it('17. should handle Euler fixture with reentrancy + delegate call + flash loan', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // All three patterns should be detected
      expect(result.summary.hasReentrancy).toBe(true);
      expect(result.summary.hasDelegateCalls).toBe(true);

      const hasFlashLoan = result.summary.categorizedCalls.some((c) => c.category === 'flash_loan');
      expect(hasFlashLoan).toBe(true);

      const hasOracleRead = result.summary.categorizedCalls.some(
        (c) => c.category === 'oracle_read',
      );
      expect(hasOracleRead).toBe(true);
    });
  });

  // ── 6. Error Classes ──────────────────────────────────────────────────────

  describe('Error Classes', () => {
    it('18. should create TraceNotAvailableError with context', () => {
      const err = new TraceNotAvailableError('0xabc', 'ethereum', new Error('RPC fail'));
      expect(err.name).toBe('TraceNotAvailableError');
      expect(err.txHash).toBe('0xabc');
      expect(err.chain).toBe('ethereum');
      expect(err.message).toContain('debug_traceTransaction');
      expect(err.cause).toBeDefined();
    });

    it('19. should create TraceTooLargeError with counts', () => {
      const err = new TraceTooLargeError('0xdef', 60000, 50000);
      expect(err.name).toBe('TraceTooLargeError');
      expect(err.nodeCount).toBe(60000);
      expect(err.maxNodes).toBe(50000);
      expect(err.message).toContain('60000');
    });

    it('20. should create TraceDepthExceededError with depth', () => {
      const err = new TraceDepthExceededError('0xghi', 500);
      expect(err.name).toBe('TraceDepthExceededError');
      expect(err.maxDepth).toBe(500);
      expect(err.message).toContain('500');
    });
  });

  // ── 7. Summary Generation ─────────────────────────────────────────────────

  describe('Summary Generation', () => {
    it('21. should count unique contracts correctly', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // The Euler fixture involves multiple unique contracts
      expect(result.summary.uniqueContracts).toBeGreaterThanOrEqual(5);
    });

    it('22. should compute max depth correctly', async () => {
      const fixture = await loadTraceFixture('trace-euler-2023.json');
      const rpc = createMockRpcPort(fixture);
      const resolver = new SelectorResolver();
      const analyzer = new TransactionTraceAnalyzer(rpc, resolver);

      const result = await analyzer.analyze(Chain.ETHEREUM, TX_HASH);

      // Euler fixture has depth 0 → 1 → 2 → 3 (delegate call inside re-entry)
      expect(result.summary.maxDepth).toBe(3);
    });
  });
});
