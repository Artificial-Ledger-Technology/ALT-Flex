/**
 * @module @aegis/hacks-engine/adapters
 *
 * Infrastructure adapters for the Hacks Engine.
 * Concrete implementations of driven ports defined in @aegis/core:
 * - PostgreSQL repository for hack incidents
 * - Redis cache adapter
 * - DefiLlama API client
 * - DeFiHackLabs GitHub client
 *
 * @hexagonal Adapter Layer — Engine α (Driven/Secondary)
 */

export { PostgresHackRepository } from './postgres-hack.repository.js';

// ── DefiLlama ETL Adapter (P2-ETL-001) ──────────────────────────────────────
export { DefiLlamaAdapter } from './defillama-adapter.js';
export type { DefiLlamaHack } from './defillama-adapter.js';
export {
  DEFAULT_DEFILLAMA_CONFIG,
  type DefiLlamaAdapterConfig,
} from './defillama-adapter.config.js';
export { normalizeChainName, normalizeChains } from './chain-normalizer.js';
export { classifyAttackVector } from './attack-vector-classifier.js';
