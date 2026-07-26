/**
 * @module IRpcPort
 * @description Abstract interface for low-level JSON-RPC blockchain access.
 *
 * Hexagonal Port for multi-chain RPC interactions. Unlike IChainDataPort
 * (which provides normalized, high-level domain data), IRpcPort exposes
 * raw EVM primitives: blocks, transactions, receipts, traces, storage,
 * and logs — the foundation for forensic analysis.
 *
 * Implementations:
 * - `ChainRpcProvider` (packages/forensic-engine/src/adapters/rpc/)
 * - `MockRpcProvider` (test utility)
 *
 * @hexagonal Port — Domain Layer
 * @academic Supports Thesis 2's forensic replay and trace analysis
 * @task P5-EVM-001
 */

import type { Chain } from '../value-objects/Chain.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RPC Data Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Raw block data from an EVM-compatible chain. */
export interface RpcBlock {
  readonly number: number;
  readonly hash: string;
  readonly parentHash: string;
  readonly timestamp: number;
  readonly gasLimit: string;
  readonly gasUsed: string;
  readonly miner: string;
  readonly baseFeePerGas: string | null;
  readonly transactions: readonly string[];
}

/** Raw transaction data from an EVM-compatible chain. */
export interface RpcTransaction {
  readonly hash: string;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly from: string;
  readonly to: string | null;
  readonly value: string;
  readonly gas: string;
  readonly gasPrice: string;
  readonly input: string;
  readonly nonce: number;
  readonly transactionIndex: number;
}

/** Transaction receipt with execution results. */
export interface RpcTransactionReceipt {
  readonly transactionHash: string;
  readonly blockNumber: number;
  readonly from: string;
  readonly to: string | null;
  readonly status: '0x1' | '0x0';
  readonly gasUsed: string;
  readonly cumulativeGasUsed: string;
  readonly contractAddress: string | null;
  readonly logs: readonly RpcLog[];
}

/** A single log entry from a transaction receipt. */
export interface RpcLog {
  readonly address: string;
  readonly topics: readonly string[];
  readonly data: string;
  readonly blockNumber: number;
  readonly transactionHash: string;
  readonly logIndex: number;
  readonly removed: boolean;
}

/** Structured trace output from debug_traceTransaction with callTracer. */
export interface RpcTraceResult {
  readonly type: string;
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly gas: string;
  readonly gasUsed: string;
  readonly input: string;
  readonly output: string;
  readonly error?: string;
  readonly calls?: readonly RpcTraceResult[];
}

/** Parameters for an eth_call request. */
export interface CallRequest {
  readonly from?: string;
  readonly to: string;
  readonly data: string;
  readonly value?: string;
  readonly gas?: string;
}

/** Filter parameters for eth_getLogs. */
export interface LogFilter {
  readonly fromBlock: number;
  readonly toBlock: number;
  readonly address?: string | readonly string[];
  readonly topics?: ReadonlyArray<string | readonly string[] | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Port Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IRpcPort — Abstract interface for low-level multi-chain RPC access.
 *
 * Designed for forensic analysis: every method accepts a `Chain` parameter
 * so a single provider instance can serve all supported chains.
 *
 * @hexagonal Port — Domain Layer
 */
export interface IRpcPort {
  /** Fetch a block by number. */
  getBlock(chain: Chain, blockNumber: number): Promise<RpcBlock>;

  /** Fetch a transaction by hash. */
  getTransaction(chain: Chain, txHash: string): Promise<RpcTransaction>;

  /** Fetch a transaction receipt by hash. */
  getTransactionReceipt(chain: Chain, txHash: string): Promise<RpcTransactionReceipt>;

  /** Execute debug_traceTransaction with callTracer. Requires archive node. */
  traceTransaction(chain: Chain, txHash: string): Promise<RpcTraceResult>;

  /** Read a storage slot at a specific block height. */
  getStorageAt(chain: Chain, address: string, slot: string, blockNumber: number): Promise<string>;

  /** Execute a read-only eth_call at a specific block height. */
  call(chain: Chain, callData: CallRequest, blockNumber: number): Promise<string>;

  /** Fetch deployed bytecode for a contract address. */
  getCode(chain: Chain, address: string, blockNumber?: number): Promise<string>;

  /** Fetch logs matching a filter. */
  getLogs(chain: Chain, filter: LogFilter): Promise<RpcLog[]>;

  /** Check if the provider can reach the RPC endpoint for a given chain. */
  isHealthy(chain: Chain): Promise<boolean>;
}
