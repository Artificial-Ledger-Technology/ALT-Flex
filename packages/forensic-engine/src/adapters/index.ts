/**
 * @module @aegis/forensic-engine/adapters
 *
 * Infrastructure adapters for the Forensic Engine.
 * Concrete implementations of driven ports defined in @aegis/core:
 * - Multi-chain RPC provider for forensic data access
 * - Foundry CLI integration for POC simulation (Phase 5+)
 * - PostgreSQL repository for exploit POCs (Phase 5+)
 *
 * @hexagonal Adapter Layer — Engine γ (Driven/Secondary)
 */

// ── RPC Adapter (P5-EVM-001) ────────────────────────────────────────────────
export {
  ChainRpcProvider,
  ChainNotSupportedError,
  RpcRequestError,
  RateLimiter,
  buildChainConfigs,
  SUPPORTED_CHAINS,
  type ChainRpcConfig,
} from './rpc/index.js';
