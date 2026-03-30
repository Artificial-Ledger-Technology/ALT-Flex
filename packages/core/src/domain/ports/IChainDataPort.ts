/**
 * @module IChainDataPort
 * @description Abstract interface for blockchain data access.
 *
 * Hexagonal Port for chain-agnostic blockchain interactions.
 * Supports both EVM and non-EVM chains through a unified interface.
 *
 * Implementations:
 * - `EthereumChainDataAdapter` (packages/forensic-engine/src/adapters/rpc/)
 * - `BscChainDataAdapter`
 * - `SolanaChainDataAdapter` (Phase 5)
 * - `MockChainDataAdapter` (test utility)
 *
 * @hexagonal Port — Domain Layer
 * @academic Supports Thesis 2's multi-chain forensic analysis
 */

import type { Chain } from '../value-objects/Chain.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Chain Data Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalized transaction data across all supported chains.
 */
export interface TransactionData {
  readonly hash: string;
  readonly chain: Chain;
  readonly blockNumber: number;
  readonly blockTimestamp: Date;
  readonly from: string;
  readonly to: string | null;
  readonly value: string;
  readonly gasUsed: string;
  readonly gasPrice: string;
  readonly input: string;
  readonly status: 'success' | 'failure' | 'pending';
  readonly nonce: number;
}

/**
 * Decoded transaction trace (EVM-specific but normalized).
 */
export interface TransactionTrace {
  readonly hash: string;
  readonly chain: Chain;
  /** Nested internal calls */
  readonly calls: readonly InternalCall[];
  /** Total gas consumed */
  readonly totalGasUsed: string;
  /** Decoded events emitted */
  readonly events: readonly DecodedEvent[];
}

/**
 * A single internal call within a transaction trace.
 */
export interface InternalCall {
  readonly type: 'call' | 'delegatecall' | 'staticcall' | 'create' | 'create2' | 'selfdestruct';
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly gasUsed: string;
  readonly input: string;
  readonly output: string;
  readonly error: string | null;
  readonly children: readonly InternalCall[];
  /** Depth in the call tree (0 = top-level) */
  readonly depth: number;
}

/**
 * A decoded event log from a transaction.
 */
export interface DecodedEvent {
  readonly address: string;
  readonly name: string;
  readonly signature: string;
  readonly topics: readonly string[];
  readonly data: string;
  readonly logIndex: number;
  readonly decoded: Record<string, unknown> | null;
}

/**
 * Block data for fork point resolution.
 */
export interface BlockData {
  readonly number: number;
  readonly hash: string;
  readonly timestamp: Date;
  readonly chain: Chain;
  readonly transactionCount: number;
}

/**
 * Contract information.
 */
export interface ContractInfo {
  readonly address: string;
  readonly chain: Chain;
  readonly name: string | null;
  readonly isVerified: boolean;
  readonly sourceCode: string | null;
  readonly abi: unknown[] | null;
  readonly compiler: string | null;
  readonly creationTxHash: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Port Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IChainDataPort — Abstract interface for blockchain data access.
 *
 * @hexagonal Port — Domain Layer
 */
export interface IChainDataPort {
  // ── Chain Information ───────────────────────────────────────────────────
  /**
   * Get the chain this adapter is configured for.
   */
  getChain(): Chain;

  /**
   * Check if the RPC connection is healthy.
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get the latest block number.
   */
  getLatestBlockNumber(): Promise<number>;

  // ── Transaction Data ────────────────────────────────────────────────────
  /**
   * Fetch transaction data by hash.
   */
  getTransaction(txHash: string): Promise<TransactionData | null>;

  /**
   * Fetch transaction receipt and status.
   */
  getTransactionTrace(txHash: string): Promise<TransactionTrace | null>;

  /**
   * Get multiple transactions (batched for efficiency).
   */
  getTransactions(txHashes: readonly string[]): Promise<TransactionData[]>;

  // ── Block Data ──────────────────────────────────────────────────────────
  /**
   * Fetch block data by number.
   */
  getBlock(blockNumber: number): Promise<BlockData | null>;

  /**
   * Find the block number closest to a given timestamp.
   * Used to determine fork points for exploit simulation.
   */
  getBlockByTimestamp(timestamp: Date): Promise<BlockData | null>;

  // ── Contract Data ───────────────────────────────────────────────────────
  /**
   * Fetch contract information and source code (if verified).
   */
  getContractInfo(address: string): Promise<ContractInfo | null>;

  /**
   * Check if an address is a contract (vs. EOA).
   */
  isContract(address: string): Promise<boolean>;

  // ── Balance & Token Data ────────────────────────────────────────────────
  /**
   * Get native currency balance at a specific block.
   */
  getBalance(address: string, blockNumber?: number): Promise<string>;
}
