import { type Chain } from '@aegis/core';
import { type ForgeLog } from './forge-types.js';
import { type CallTreeNode, type DecodedEvent } from './trace-types.js';
import { type StorageDiff } from './storage-types.js';
import { type PatternMatch } from './pattern-types.js';

export interface ForensicReport {
  id: string;
  hackIncidentId: string;
  analysisMode: 'simulation' | 'trace';
  chain: Chain;
  txHash?: string;
  simulation?: {
    pocFilePath: string;
    success: boolean;
    gasUsed: bigint;
    duration: number;
    logs: ForgeLog[];
  };
  trace: {
    callTree: CallTreeNode;
    totalCalls: number;
    uniqueContracts: string[];
    gasBreakdown: Record<string, bigint>;
    events: DecodedEvent[];
  };
  storageDiff: {
    contracts: StorageDiff[];
    totalChanges: number;
    summary: string;
  };
  patterns: {
    detected: PatternMatch[];
    primaryPattern: string;
    confidence: number;
  };
  metadata: {
    analysisDuration: number;
    rpcCalls: number;
    timestamp: Date;
    engineVersion: string;
  };
}
