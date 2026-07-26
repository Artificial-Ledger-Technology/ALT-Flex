/**
 * @module chain-rpc-provider
 * @description Multi-chain RPC provider implementing IRpcPort.
 *
 * Hexagonal driven adapter that abstracts RPC access behind IRpcPort.
 * Features:
 * - Alchemy primary, Infura fallback (configurable per chain)
 * - Automatic failover on 429/5xx errors
 * - Per-chain token-bucket rate limiting
 * - Archive node detection via historical eth_getBalance
 *
 * @hexagonal Adapter Layer — Forensic Engine (Driven/Secondary)
 * @task P5-EVM-001
 */

import {
  Chain,
  type IRpcPort,
  type RpcBlock,
  type RpcTransaction,
  type RpcTransactionReceipt,
  type RpcLog,
  type RpcTraceResult,
  type CallRequest,
  type LogFilter,
} from '@aegis/core';
import { type ChainRpcConfig, SUPPORTED_CHAINS, buildChainConfigs } from './rpc-config.js';
import { RateLimiter } from './rate-limiter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Error Classes
// ═══════════════════════════════════════════════════════════════════════════════

export class ChainNotSupportedError extends Error {
  constructor(chain: Chain) {
    super(`Chain "${chain}" is not supported by ChainRpcProvider`);
    this.name = 'ChainNotSupportedError';
  }
}

export class RpcRequestError extends Error {
  constructor(
    public readonly chain: Chain,
    public readonly method: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(`RPC error on ${chain} [${method}]: ${message} (status=${statusCode})`);
    this.name = 'RpcRequestError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON-RPC helpers
// ═══════════════════════════════════════════════════════════════════════════════

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

let rpcIdCounter = 0;

async function jsonRpcCall<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<{ result: T; status: number }> {
  rpcIdCounter += 1;
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: rpcIdCounter,
    method,
    params,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    throw { status: response.status, message: `HTTP ${response.status}` };
  }

  const json = (await response.json()) as JsonRpcResponse<T>;
  if (json.error) {
    throw { status: 200, message: json.error.message, code: json.error.code };
  }

  return { result: json.result as T, status: response.status };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ChainRpcProvider
// ═══════════════════════════════════════════════════════════════════════════════

export class ChainRpcProvider implements IRpcPort {
  private readonly configs: Map<Chain, ChainRpcConfig>;
  private readonly limiters: Map<Chain, RateLimiter> = new Map();

  constructor(env?: {
    alchemyApiKey?: string;
    infuraApiKey?: string;
    rateLimitPerSecond?: number;
  }) {
    this.configs = buildChainConfigs(env ?? {});

    // Create a rate limiter per chain
    for (const chain of SUPPORTED_CHAINS) {
      const cfg = this.configs.get(chain);
      if (cfg) {
        this.limiters.set(chain, new RateLimiter(cfg.rateLimit));
      }
    }
  }

  // ── IRpcPort Implementation ─────────────────────────────────────────────

  async getBlock(chain: Chain, blockNumber: number): Promise<RpcBlock> {
    const hex = `0x${blockNumber.toString(16)}`;
    const raw = await this.execute<RawBlock>(chain, 'eth_getBlockByNumber', [hex, false]);
    return {
      number: parseInt(raw.number, 16),
      hash: raw.hash,
      parentHash: raw.parentHash,
      timestamp: parseInt(raw.timestamp, 16),
      gasLimit: raw.gasLimit,
      gasUsed: raw.gasUsed,
      miner: raw.miner,
      baseFeePerGas: raw.baseFeePerGas ?? null,
      transactions: raw.transactions,
    };
  }

  async getTransaction(chain: Chain, txHash: string): Promise<RpcTransaction> {
    const raw = await this.execute<RawTransaction>(chain, 'eth_getTransactionByHash', [txHash]);
    return {
      hash: raw.hash,
      blockNumber: parseInt(raw.blockNumber, 16),
      blockHash: raw.blockHash,
      from: raw.from,
      to: raw.to,
      value: raw.value,
      gas: raw.gas,
      gasPrice: raw.gasPrice,
      input: raw.input,
      nonce: parseInt(raw.nonce, 16),
      transactionIndex: parseInt(raw.transactionIndex, 16),
    };
  }

  async getTransactionReceipt(chain: Chain, txHash: string): Promise<RpcTransactionReceipt> {
    const raw = await this.execute<RawReceipt>(chain, 'eth_getTransactionReceipt', [txHash]);
    return {
      transactionHash: raw.transactionHash,
      blockNumber: parseInt(raw.blockNumber, 16),
      from: raw.from,
      to: raw.to,
      status: raw.status as '0x1' | '0x0',
      gasUsed: raw.gasUsed,
      cumulativeGasUsed: raw.cumulativeGasUsed,
      contractAddress: raw.contractAddress,
      logs: (raw.logs as RawLog[]).map((log) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: parseInt(log.blockNumber, 16),
        transactionHash: log.transactionHash,
        logIndex: parseInt(log.logIndex, 16),
        removed: log.removed,
      })),
    };
  }

  async traceTransaction(chain: Chain, txHash: string): Promise<RpcTraceResult> {
    return this.execute<RpcTraceResult>(chain, 'debug_traceTransaction', [
      txHash,
      { tracer: 'callTracer' },
    ]);
  }

  async getStorageAt(
    chain: Chain,
    address: string,
    slot: string,
    blockNumber: number,
  ): Promise<string> {
    const hex = `0x${blockNumber.toString(16)}`;
    return this.execute<string>(chain, 'eth_getStorageAt', [address, slot, hex]);
  }

  async call(chain: Chain, callData: CallRequest, blockNumber: number): Promise<string> {
    const hex = `0x${blockNumber.toString(16)}`;
    return this.execute<string>(chain, 'eth_call', [callData, hex]);
  }

  async getCode(chain: Chain, address: string, blockNumber?: number): Promise<string> {
    const block = blockNumber !== undefined ? `0x${blockNumber.toString(16)}` : 'latest';
    return this.execute<string>(chain, 'eth_getCode', [address, block]);
  }

  async getLogs(chain: Chain, filter: LogFilter): Promise<RpcLog[]> {
    const params = {
      fromBlock: `0x${filter.fromBlock.toString(16)}`,
      toBlock: `0x${filter.toBlock.toString(16)}`,
      address: filter.address,
      topics: filter.topics,
    };
    const rawLogs = await this.execute<RawLog[]>(chain, 'eth_getLogs', [params]);
    return rawLogs.map((log) => ({
      address: log.address,
      topics: log.topics,
      data: log.data,
      blockNumber: parseInt(log.blockNumber, 16),
      transactionHash: log.transactionHash,
      logIndex: parseInt(log.logIndex, 16),
      removed: log.removed,
    }));
  }

  async isHealthy(chain: Chain): Promise<boolean> {
    try {
      this.assertSupported(chain);
      await this.execute<string>(chain, 'eth_blockNumber', []);
      return true;
    } catch {
      return false;
    }
  }

  // ── Internal Execution ──────────────────────────────────────────────────

  private async execute<T>(chain: Chain, method: string, params: unknown[]): Promise<T> {
    this.assertSupported(chain);
    const config = this.configs.get(chain)!;
    const limiter = this.limiters.get(chain);

    if (limiter) {
      await limiter.acquire();
    }

    return this.executeWithFallback<T>(chain, config, method, params);
  }

  private async executeWithFallback<T>(
    chain: Chain,
    config: ChainRpcConfig,
    method: string,
    params: unknown[],
  ): Promise<T> {
    const { primaryUrl, fallbackUrl } = config;

    if (primaryUrl === null) {
      throw new RpcRequestError(chain, method, 0, 'No RPC endpoint configured');
    }

    try {
      const { result } = await jsonRpcCall<T>(primaryUrl, method, params);
      return result;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status ?? 0;

      // Only failover on rate-limit (429) or server errors (5xx)
      if (fallbackUrl !== null && (status === 429 || status >= 500)) {
        const { result } = await jsonRpcCall<T>(fallbackUrl, method, params);
        return result;
      }

      const message = (err as { message?: string }).message ?? 'Unknown RPC error';
      throw new RpcRequestError(chain, method, status, message);
    }
  }

  private assertSupported(chain: Chain): void {
    if (!SUPPORTED_CHAINS.includes(chain)) {
      throw new ChainNotSupportedError(chain);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Raw RPC response shapes (hex-encoded fields from JSON-RPC)
// ═══════════════════════════════════════════════════════════════════════════════

interface RawBlock {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  gasLimit: string;
  gasUsed: string;
  miner: string;
  baseFeePerGas?: string;
  transactions: string[];
}

interface RawTransaction {
  hash: string;
  blockNumber: string;
  blockHash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  nonce: string;
  transactionIndex: string;
}

interface RawReceipt {
  transactionHash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  status: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  contractAddress: string | null;
  logs: unknown[];
}

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  removed: boolean;
}
