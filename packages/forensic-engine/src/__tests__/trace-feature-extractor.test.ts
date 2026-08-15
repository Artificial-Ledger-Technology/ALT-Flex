import { describe, it, expect } from 'vitest';
import { TraceFeatureExtractor, FEATURE_NAMES } from '../adapters/ml/trace-feature-extractor.js';
import type { TransactionTraceResult, CallTreeNode } from '../domain/trace-types.js';
import type { StorageDiff } from '../domain/storage-types.js';

describe('TraceFeatureExtractor', () => {
  const extractor = new TraceFeatureExtractor();

  // Helper to create a minimal call tree node
  const createMockNode = (overrides: Partial<CallTreeNode> = {}): CallTreeNode => ({
    id: '0-0',
    depth: 0,
    type: 'CALL',
    from: '0xFrom',
    to: '0xTo',
    value: 0n,
    gasUsed: 0n,
    input: '0x',
    output: '0x',
    children: [],
    ...overrides,
  });

  // Helper to create a minimal trace result
  const createMockTrace = (
    rootNode: CallTreeNode,
    summaryOverrides: any = {},
    gasOverrides: any = {},
  ): TransactionTraceResult => ({
    txHash: '0x123',
    chain: 'ethereum',
    callTree: rootNode,
    events: [],
    valueFlow: [],
    gasBreakdown: {
      byContract: new Map(),
      totalGas: 100000n,
      ...gasOverrides,
    },
    summary: {
      totalCalls: 5,
      uniqueContracts: 3,
      maxDepth: 2,
      hasReentrancy: false,
      hasDelegateCalls: false,
      valueTransfers: 0,
      totalValueTransferred: 0n,
      reentrancyMatches: [],
      delegateCallMatches: [],
      categorizedCalls: [],
      ...summaryOverrides,
    },
  });

  const defaultMetadata = {
    chainId: 1,
    lossUsd: 1000000,
    preAuditStatus: false,
  };

  it('1. should extract exactly 28 features in the correct order', () => {
    const trace = createMockTrace(createMockNode());
    const result = extractor.extract(trace, [], defaultMetadata);

    expect(result).toBeInstanceOf(Float64Array);
    expect(result.length).toBe(28);
    expect(result.length).toBe(FEATURE_NAMES.length);
  });

  it('2. should correctly extract base summary and metadata properties', () => {
    const trace = createMockTrace(createMockNode(), {
      totalCalls: 10,
      uniqueContracts: 4,
      maxDepth: 3,
      totalValueTransferred: 5000000000000000000n, // 5 ETH
    });

    const result = extractor.extract(trace, [], {
      chainId: 56,
      lossUsd: 10000,
      preAuditStatus: true,
    });

    expect(result[FEATURE_NAMES.indexOf('total_internal_txns')]).toBe(10);
    expect(result[FEATURE_NAMES.indexOf('unique_addresses_called')]).toBe(4);
    expect(result[FEATURE_NAMES.indexOf('max_call_depth')]).toBe(3);
    expect(result[FEATURE_NAMES.indexOf('call_value_total')]).toBe(5.0);

    expect(result[FEATURE_NAMES.indexOf('chain_id')]).toBe(56);
    expect(result[FEATURE_NAMES.indexOf('pre_audit_status')]).toBe(1.0);
    expect(result[FEATURE_NAMES.indexOf('loss_amount_log')]).toBeCloseTo(4.0, 2); // log10(10000)
  });

  it('3. should properly count specific call types and errors', () => {
    const root = createMockNode({
      children: [
        createMockNode({ type: 'DELEGATECALL' }),
        createMockNode({ type: 'DELEGATECALL' }),
        createMockNode({ type: 'CREATE2' }),
        createMockNode({ type: 'SELFDESTRUCT', error: 'Reverted' }),
        createMockNode({ error: 'Out of gas' }),
      ],
    });

    const trace = createMockTrace(root);
    const result = extractor.extract(trace, [], defaultMetadata);

    expect(result[FEATURE_NAMES.indexOf('delegatecall_count')]).toBe(2);
    expect(result[FEATURE_NAMES.indexOf('create_create2_count')]).toBe(1);
    expect(result[FEATURE_NAMES.indexOf('selfdestruct_count')]).toBe(1);
    expect(result[FEATURE_NAMES.indexOf('reverted_calls_count')]).toBe(2);
  });

  it('4. should extract flash loan and oracle manipulation specific features', () => {
    const root = createMockNode({
      input: '0xab9c4b5d0000', // Flash loan sig
      children: [
        createMockNode({ input: '0x38ed1739' }), // Swap sig
        createMockNode({ input: '0x50d25bcd' }), // Oracle read sig
      ],
    });

    const trace = createMockTrace(root, {
      totalValueTransferred: 15000000000000000000n, // 15 ETH (> 10 ETH threshold)
    });

    const result = extractor.extract(trace, [], defaultMetadata);

    expect(result[FEATURE_NAMES.indexOf('flash_loan_sig_count')]).toBe(1);
    expect(result[FEATURE_NAMES.indexOf('swap_sig_count')]).toBe(1);
    expect(result[FEATURE_NAMES.indexOf('oracle_read_sig_count')]).toBe(1);

    // Heuristic flags should trigger
    expect(result[FEATURE_NAMES.indexOf('has_large_borrow_repay')]).toBe(1.0);
    expect(result[FEATURE_NAMES.indexOf('has_price_oracle_before_swap')]).toBe(1.0);
  });

  it('5. should map storage diffs to sstore and mutation counts', () => {
    const trace = createMockTrace(createMockNode());

    const diffs: StorageDiff[] = [
      {
        contractAddress: '0xA',
        changes: [{ slot: '0x1', valueBefore: '0x0', valueAfter: '0x1', interpretation: '' }],
        summary: '',
      },
      {
        contractAddress: '0xB',
        changes: [
          { slot: '0x2', valueBefore: '0x0', valueAfter: '0x1', interpretation: '' },
          { slot: '0x3', valueBefore: '0x0', valueAfter: '0x1', interpretation: '' },
        ],
        summary: '',
      },
    ];

    const result = extractor.extract(trace, diffs, defaultMetadata);

    expect(result[FEATURE_NAMES.indexOf('storage_slots_mutated')]).toBe(3);
    expect(result[FEATURE_NAMES.indexOf('sstore_count')]).toBe(3);
  });
});
