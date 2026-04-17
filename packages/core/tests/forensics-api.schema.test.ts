/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Forensic Engine API Schema — Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates all Zod schemas exported from forensics-api.schema.ts.
 * Each describe block covers both valid (happy-path) and invalid
 * (rejection) inputs to ensure runtime contracts are airtight.
 *
 * @module tests/forensics-api.schema
 * @task P1-ARCH-005
 */

import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  FORENSIC_POC_SORT_FIELDS,
  ForensicPocSortQuerySchema,
  ForensicJobStatusSchema,
  ForensicJobProgressSchema,
  ForensicPocListQuerySchema,
  ForensicPocDetailParamsSchema,
  ForensicSimulateRequestSchema,
  ForensicSimulateResponseSchema,
  ForensicSimulateJobParamsSchema,
  SimulationResultSchema,
  ForensicSimulateJobResponseSchema,
  ForensicTraceRequestSchema,
  ForensicTraceResponseSchema,
  ForensicTraceJobParamsSchema,
  TraceResultSchema,
  ForensicTraceJobResponseSchema,
  StorageDiffSchema,
  CallTreeNodeSchema,
  DecodedEventLogSchema,
} from '../src/shared/schemas/forensics-api.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = randomUUID();
const VALID_TX_HASH = '0x' + 'a'.repeat(64);
const NOW_ISO = new Date().toISOString();

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicPocSortQuerySchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicPocSortQuerySchema', () => {
  it('applies defaults when no input is provided', () => {
    const result = ForensicPocSortQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe('exploitDate');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('accepts all valid sort fields', () => {
    for (const field of FORENSIC_POC_SORT_FIELDS) {
      const result = ForensicPocSortQuerySchema.safeParse({ sortBy: field, sortOrder: 'asc' });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid sort field', () => {
    const result = ForensicPocSortQuerySchema.safeParse({ sortBy: 'invalidField' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sort order', () => {
    const result = ForensicPocSortQuerySchema.safeParse({ sortOrder: 'sideways' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicJobStatusSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicJobStatusSchema', () => {
  const VALID_STATUSES = ['queued', 'active', 'completed', 'failed', 'cancelled'] as const;

  it('accepts all five valid status values', () => {
    for (const status of VALID_STATUSES) {
      const result = ForensicJobStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid status string', () => {
    const result = ForensicJobStatusSchema.safeParse('pending');
    expect(result.success).toBe(false);
  });

  it('rejects a numeric value', () => {
    const result = ForensicJobStatusSchema.safeParse(1);
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicJobProgressSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicJobProgressSchema', () => {
  it('accepts valid progress data', () => {
    const result = ForensicJobProgressSchema.safeParse({ percentage: 50, stage: 'Compiling contracts' });
    expect(result.success).toBe(true);
  });

  it('accepts boundary values (0 and 100)', () => {
    expect(ForensicJobProgressSchema.safeParse({ percentage: 0, stage: 'Starting' }).success).toBe(true);
    expect(ForensicJobProgressSchema.safeParse({ percentage: 100, stage: 'Done' }).success).toBe(true);
  });

  it('rejects percentage below 0', () => {
    const result = ForensicJobProgressSchema.safeParse({ percentage: -1, stage: 'Invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects percentage above 100', () => {
    const result = ForensicJobProgressSchema.safeParse({ percentage: 101, stage: 'Invalid' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ForensicPocListQuerySchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicPocListQuerySchema', () => {
  it('applies defaults when given an empty object', () => {
    const result = ForensicPocListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.sortBy).toBe('exploitDate');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('accepts a fully populated query with all filters', () => {
    const result = ForensicPocListQuerySchema.safeParse({
      page: 2,
      pageSize: 50,
      sortBy: 'estimatedLossUsd',
      sortOrder: 'asc',
      chain: 'ethereum',
      source: 'defihacklabs',
      complexity: 'advanced',
      executionStatus: 'passing',
      vulnerabilityClass: 'flash-loan',
      search: 'Euler',
    });
    expect(result.success).toBe(true);
  });

  it('coerces string page/pageSize from query params', () => {
    const result = ForensicPocListQuerySchema.safeParse({ page: '3', pageSize: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('rejects page = 0', () => {
    const result = ForensicPocListQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative page', () => {
    const result = ForensicPocListQuerySchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize > 100', () => {
    const result = ForensicPocListQuerySchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid chain value', () => {
    const result = ForensicPocListQuerySchema.safeParse({ chain: 'dogecoin' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid source value', () => {
    const result = ForensicPocListQuerySchema.safeParse({ source: 'github-random' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid complexity value', () => {
    const result = ForensicPocListQuerySchema.safeParse({ complexity: 'impossible' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid executionStatus value', () => {
    const result = ForensicPocListQuerySchema.safeParse({ executionStatus: 'running' });
    expect(result.success).toBe(false);
  });

  it('rejects search query longer than 200 characters', () => {
    const result = ForensicPocListQuerySchema.safeParse({ search: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects empty search string', () => {
    // After trim, empty string violates min(1)
    const result = ForensicPocListQuerySchema.safeParse({ search: '   ' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ForensicPocDetailParamsSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicPocDetailParamsSchema', () => {
  it('accepts a valid UUID', () => {
    const result = ForensicPocDetailParamsSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    const result = ForensicPocDetailParamsSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty string', () => {
    const result = ForensicPocDetailParamsSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id field', () => {
    const result = ForensicPocDetailParamsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ForensicSimulateRequestSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicSimulateRequestSchema', () => {
  it('accepts minimal request with just pocId', () => {
    const result = ForensicSimulateRequestSchema.safeParse({ pocId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('accepts full request with all overrides', () => {
    const result = ForensicSimulateRequestSchema.safeParse({
      pocId: VALID_UUID,
      overrides: {
        rpcUrlEnvVar: 'RPC_URL_ETH',
        forkBlockNumber: 18500000,
        gasLimit: 30000000,
        blockTimestamp: 1700000000,
        additionalFlags: ['--via-ir'],
        verbosity: 5,
      },
    });
    expect(result.success).toBe(true);
  });

  it('applies verbosity default of 3 when overrides provided without verbosity', () => {
    const result = ForensicSimulateRequestSchema.safeParse({
      pocId: VALID_UUID,
      overrides: {
        forkBlockNumber: 18500000,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overrides?.verbosity).toBe(3);
    }
  });

  it('rejects missing pocId', () => {
    const result = ForensicSimulateRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid pocId format', () => {
    const result = ForensicSimulateRequestSchema.safeParse({ pocId: 'abc-123' });
    expect(result.success).toBe(false);
  });

  it('rejects verbosity = 0 (below min 1)', () => {
    const result = ForensicSimulateRequestSchema.safeParse({
      pocId: VALID_UUID,
      overrides: { verbosity: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects verbosity = 6 (above max 5)', () => {
    const result = ForensicSimulateRequestSchema.safeParse({
      pocId: VALID_UUID,
      overrides: { verbosity: 6 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative forkBlockNumber', () => {
    const result = ForensicSimulateRequestSchema.safeParse({
      pocId: VALID_UUID,
      overrides: { forkBlockNumber: -1 },
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicSimulateResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicSimulateResponseSchema', () => {
  it('accepts valid simulate response', () => {
    const result = ForensicSimulateResponseSchema.safeParse({
      jobId: 'job-12345',
      status: 'queued',
      message: 'Simulation queued',
      timestamp: NOW_ISO,
      pocId: VALID_UUID,
      protocol: 'Euler Finance',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing pocId', () => {
    const result = ForensicSimulateResponseSchema.safeParse({
      jobId: 'job-12345',
      status: 'queued',
      message: 'Simulation queued',
      timestamp: NOW_ISO,
      protocol: 'Euler Finance',
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicSimulateJobParamsSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicSimulateJobParamsSchema', () => {
  it('accepts valid jobId string', () => {
    const result = ForensicSimulateJobParamsSchema.safeParse({ jobId: 'bullmq-job-123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty jobId', () => {
    const result = ForensicSimulateJobParamsSchema.safeParse({ jobId: '' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SimulationResultSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('SimulationResultSchema', () => {
  const validSimResult = {
    success: true,
    output: 'Running 1 test...',
    stderr: '',
    gasUsed: '500000',
    executionTimeMs: 12500,
    forgeCommand: 'forge test --match-path src/test/Euler.t.sol -vvv',
    forkBlockNumber: 18500000,
    chain: 'ethereum',
    assertionsPassed: 3,
    assertionsFailed: 0,
    traces: ['CALL EulerPool.deposit()', 'CALL EulerPool.borrow()'],
  };

  it('accepts a valid complete simulation result', () => {
    const result = SimulationResultSchema.safeParse(validSimResult);
    expect(result.success).toBe(true);
  });

  it('applies defaults for optional fields (stderr, traces)', () => {
    const { stderr, traces, ...minimal } = validSimResult;
    const result = SimulationResultSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stderr).toBe('');
      expect(result.data.traces).toEqual([]);
    }
  });

  it('rejects missing required fields', () => {
    const result = SimulationResultSchema.safeParse({ success: true });
    expect(result.success).toBe(false);
  });

  it('rejects negative executionTimeMs', () => {
    const result = SimulationResultSchema.safeParse({ ...validSimResult, executionTimeMs: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid chain enum value', () => {
    const result = SimulationResultSchema.safeParse({ ...validSimResult, chain: 'dogecoin' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicSimulateJobResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicSimulateJobResponseSchema', () => {
  it('accepts completed job with result', () => {
    const result = ForensicSimulateJobResponseSchema.safeParse({
      jobId: 'job-1',
      status: 'completed',
      result: {
        success: true,
        output: 'Test pass',
        gasUsed: '50000',
        executionTimeMs: 8000,
        forgeCommand: 'forge test',
        forkBlockNumber: 18500000,
        chain: 'ethereum',
        assertionsPassed: 1,
        assertionsFailed: 0,
      },
      error: null,
      progress: null,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    expect(result.success).toBe(true);
  });

  it('accepts queued job with null result/error', () => {
    const result = ForensicSimulateJobResponseSchema.safeParse({
      jobId: 'job-2',
      status: 'queued',
      result: null,
      error: null,
      progress: { percentage: 0, stage: 'Waiting in queue' },
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    expect(result.success).toBe(true);
  });

  it('accepts failed job with error details', () => {
    const result = ForensicSimulateJobResponseSchema.safeParse({
      jobId: 'job-3',
      status: 'failed',
      result: null,
      error: {
        code: 'FORGE_COMPILATION_ERROR',
        message: 'Compilation failed due to missing imports',
      },
      progress: null,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid job status', () => {
    const result = ForensicSimulateJobResponseSchema.safeParse({
      jobId: 'job-4',
      status: 'pending',
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing timestamps', () => {
    const result = ForensicSimulateJobResponseSchema.safeParse({
      jobId: 'job-5',
      status: 'active',
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ForensicTraceRequestSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicTraceRequestSchema', () => {
  it('accepts valid minimal trace request', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: VALID_TX_HASH,
      chain: 'ethereum',
    });
    expect(result.success).toBe(true);
  });

  it('applies defaults for boolean options', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: VALID_TX_HASH,
      chain: 'bsc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeStorageDiffs).toBe(true);
      expect(result.data.includeDecodedLogs).toBe(true);
    }
  });

  it('accepts full request with all optional fields', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: VALID_TX_HASH,
      chain: 'polygon',
      includeStorageDiffs: false,
      includeDecodedLogs: false,
      maxDepth: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid tx hash — too short', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: '0xabc',
      chain: 'ethereum',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid tx hash — missing 0x prefix', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: 'a'.repeat(64),
      chain: 'ethereum',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid tx hash — non-hex characters', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: '0x' + 'g'.repeat(64),
      chain: 'ethereum',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid chain value', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: VALID_TX_HASH,
      chain: 'bitcoin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects maxDepth = 0 (must be positive)', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: VALID_TX_HASH,
      chain: 'ethereum',
      maxDepth: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative maxDepth', () => {
    const result = ForensicTraceRequestSchema.safeParse({
      txHash: VALID_TX_HASH,
      chain: 'ethereum',
      maxDepth: -5,
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicTraceResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicTraceResponseSchema', () => {
  it('accepts valid trace response', () => {
    const result = ForensicTraceResponseSchema.safeParse({
      jobId: 'trace-job-1',
      status: 'queued',
      message: 'Trace job queued',
      timestamp: NOW_ISO,
      txHash: VALID_TX_HASH,
      chain: 'ethereum',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing txHash', () => {
    const result = ForensicTraceResponseSchema.safeParse({
      jobId: 'trace-job-1',
      status: 'queued',
      message: 'Trace job queued',
      timestamp: NOW_ISO,
      chain: 'ethereum',
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicTraceJobParamsSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicTraceJobParamsSchema', () => {
  it('accepts valid jobId string', () => {
    const result = ForensicTraceJobParamsSchema.safeParse({ jobId: 'trace-abc-789' });
    expect(result.success).toBe(true);
  });

  it('rejects empty jobId', () => {
    const result = ForensicTraceJobParamsSchema.safeParse({ jobId: '' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// StorageDiffSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('StorageDiffSchema', () => {
  it('accepts valid storage diff', () => {
    const result = StorageDiffSchema.safeParse({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      slot: '0x0000000000000000000000000000000000000000000000000000000000000001',
      previousValue: '0x00',
      newValue: '0xff',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const result = StorageDiffSchema.safeParse({ address: '0x123' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CallTreeNodeSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('CallTreeNodeSchema', () => {
  const validNode = {
    type: 'call' as const,
    from: '0xAAA',
    to: '0xBBB',
    value: '0',
    gasUsed: '21000',
    input: '0x',
    output: '0x',
    error: null,
    depth: 0,
    children: [],
  };

  it('accepts a valid leaf node (no children)', () => {
    const result = CallTreeNodeSchema.safeParse(validNode);
    expect(result.success).toBe(true);
  });

  it('accepts all valid call types', () => {
    const types = ['call', 'delegatecall', 'staticcall', 'create', 'create2', 'selfdestruct'] as const;
    for (const type of types) {
      const result = CallTreeNodeSchema.safeParse({ ...validNode, type });
      expect(result.success).toBe(true);
    }
  });

  it('accepts nested children (recursive structure)', () => {
    const result = CallTreeNodeSchema.safeParse({
      ...validNode,
      children: [
        { ...validNode, depth: 1, children: [{ ...validNode, depth: 2 }] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid call type', () => {
    const result = CallTreeNodeSchema.safeParse({ ...validNode, type: 'jump' });
    expect(result.success).toBe(false);
  });

  it('rejects negative depth', () => {
    const result = CallTreeNodeSchema.safeParse({ ...validNode, depth: -1 });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DecodedEventLogSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('DecodedEventLogSchema', () => {
  it('accepts a valid decoded event log', () => {
    const result = DecodedEventLogSchema.safeParse({
      address: '0xTokenContract',
      name: 'Transfer',
      signature: 'Transfer(address,address,uint256)',
      topics: ['0xddf...', '0xfrom...', '0xto...'],
      data: '0x0000...amount',
      logIndex: 0,
      decoded: { from: '0xAAA', to: '0xBBB', amount: '1000000' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for decoded (ABI not available)', () => {
    const result = DecodedEventLogSchema.safeParse({
      address: '0xContract',
      name: 'Unknown',
      signature: 'Unknown()',
      topics: [],
      data: '0x',
      logIndex: 0,
      decoded: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative logIndex', () => {
    const result = DecodedEventLogSchema.safeParse({
      address: '0x',
      name: 'X',
      signature: 'X()',
      topics: [],
      data: '0x',
      logIndex: -1,
      decoded: null,
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TraceResultSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('TraceResultSchema', () => {
  const validCallTree = {
    type: 'call' as const,
    from: '0xAttacker',
    to: '0xVictimProtocol',
    value: '0',
    gasUsed: '2000000',
    input: '0x12345678',
    output: '0x',
    error: null,
    depth: 0,
    children: [],
  };

  const validTraceResult = {
    txHash: VALID_TX_HASH,
    chain: 'ethereum',
    blockNumber: 18500000,
    blockTimestamp: NOW_ISO,
    from: '0xAttacker',
    to: '0xVictimProtocol',
    value: '0',
    gasUsed: '2000000',
    txStatus: 'success' as const,
    callTree: validCallTree,
    totalInternalCalls: 15,
    maxDepthReached: 4,
    storageDiffs: [],
    decodedLogs: [],
    traceTimeMs: 5000,
  };

  it('accepts a valid complete trace result', () => {
    const result = TraceResultSchema.safeParse(validTraceResult);
    expect(result.success).toBe(true);
  });

  it('accepts trace with null to (contract creation)', () => {
    const result = TraceResultSchema.safeParse({ ...validTraceResult, to: null });
    expect(result.success).toBe(true);
  });

  it('accepts trace with storage diffs and decoded logs', () => {
    const result = TraceResultSchema.safeParse({
      ...validTraceResult,
      storageDiffs: [{
        address: '0xContract',
        slot: '0x01',
        previousValue: '0x00',
        newValue: '0xff',
      }],
      decodedLogs: [{
        address: '0xToken',
        name: 'Transfer',
        signature: 'Transfer(address,address,uint256)',
        topics: ['0xtopic'],
        data: '0xdata',
        logIndex: 0,
        decoded: null,
      }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts txStatus = failure', () => {
    const result = TraceResultSchema.safeParse({ ...validTraceResult, txStatus: 'failure' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid txStatus', () => {
    const result = TraceResultSchema.safeParse({ ...validTraceResult, txStatus: 'reverted' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid chain', () => {
    const result = TraceResultSchema.safeParse({ ...validTraceResult, chain: 'bitcoin' });
    expect(result.success).toBe(false);
  });

  it('rejects negative blockNumber', () => {
    const result = TraceResultSchema.safeParse({ ...validTraceResult, blockNumber: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative traceTimeMs', () => {
    const result = TraceResultSchema.safeParse({ ...validTraceResult, traceTimeMs: -500 });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForensicTraceJobResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForensicTraceJobResponseSchema', () => {
  it('accepts completed trace job with result', () => {
    const result = ForensicTraceJobResponseSchema.safeParse({
      jobId: 'trace-1',
      status: 'completed',
      result: {
        txHash: VALID_TX_HASH,
        chain: 'ethereum',
        blockNumber: 18500000,
        blockTimestamp: NOW_ISO,
        from: '0xAttacker',
        to: '0xProtocol',
        value: '0',
        gasUsed: '500000',
        txStatus: 'success',
        callTree: {
          type: 'call',
          from: '0xA',
          to: '0xB',
          value: '0',
          gasUsed: '500000',
          input: '0x',
          output: '0x',
          error: null,
          depth: 0,
          children: [],
        },
        totalInternalCalls: 5,
        maxDepthReached: 2,
        storageDiffs: [],
        decodedLogs: [],
        traceTimeMs: 3000,
      },
      error: null,
      progress: null,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    expect(result.success).toBe(true);
  });

  it('accepts queued trace job with null result', () => {
    const result = ForensicTraceJobResponseSchema.safeParse({
      jobId: 'trace-2',
      status: 'queued',
      result: null,
      error: null,
      progress: { percentage: 0, stage: 'Initializing RPC connection' },
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    expect(result.success).toBe(true);
  });

  it('accepts failed trace job with error', () => {
    const result = ForensicTraceJobResponseSchema.safeParse({
      jobId: 'trace-3',
      status: 'failed',
      result: null,
      error: {
        code: 'RPC_TIMEOUT',
        message: 'Archive node did not respond within 30s',
        stack: 'Error: timeout at ...',
      },
      progress: null,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = ForensicTraceJobResponseSchema.safeParse({
      jobId: 'trace-4',
      status: 'processing',
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    expect(result.success).toBe(false);
  });
});
