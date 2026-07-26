/**
 * @module @aegis/forensic-engine/adapters/rpc
 *
 * Multi-chain RPC adapter barrel export.
 * Exposes ChainRpcProvider, rate limiter, and configuration utilities.
 *
 * @hexagonal Adapter Layer — Forensic Engine (Driven/Secondary)
 * @task P5-EVM-001
 */

export { ChainRpcProvider, ChainNotSupportedError, RpcRequestError } from './chain-rpc-provider.js';
export { RateLimiter } from './rate-limiter.js';
export { buildChainConfigs, SUPPORTED_CHAINS, type ChainRpcConfig } from './rpc-config.js';
