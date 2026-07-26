/**
 * @module rpc-config
 * @description Per-chain RPC endpoint configuration for the ChainRpcProvider.
 *
 * Defines primary (Alchemy) and fallback (Infura) URL templates for each
 * supported EVM chain. API keys are injected from environment variables.
 *
 * @hexagonal Configuration — Adapter Layer
 * @task P5-EVM-001
 */

import { Chain } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChainRpcConfig {
  readonly chainId: number;
  readonly rateLimit: number;
  readonly supportsArchive: boolean;
  readonly supportsDebugTrace: boolean;
  readonly primaryUrl: string | null;
  readonly fallbackUrl: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Alchemy / Infura Network Slugs
// ═══════════════════════════════════════════════════════════════════════════════

const ALCHEMY_SLUGS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'eth-mainnet',
  [Chain.POLYGON]: 'polygon-mainnet',
  [Chain.ARBITRUM]: 'arb-mainnet',
  [Chain.OPTIMISM]: 'opt-mainnet',
  [Chain.BASE]: 'base-mainnet',
};

const INFURA_SLUGS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'mainnet',
  [Chain.POLYGON]: 'polygon-mainnet',
  [Chain.ARBITRUM]: 'arbitrum-mainnet',
  [Chain.OPTIMISM]: 'optimism-mainnet',
  [Chain.AVALANCHE]: 'avalanche-mainnet',
};

const PUBLIC_RPCS: Partial<Record<Chain, string>> = {
  [Chain.BSC]: 'https://bsc-dataseed1.binance.org',
  [Chain.AVALANCHE]: 'https://api.avax.network/ext/bc/C/rpc',
  [Chain.BASE]: 'https://mainnet.base.org',
};

const CHAIN_IDS: Partial<Record<Chain, number>> = {
  [Chain.ETHEREUM]: 1,
  [Chain.BSC]: 56,
  [Chain.POLYGON]: 137,
  [Chain.ARBITRUM]: 42161,
  [Chain.OPTIMISM]: 10,
  [Chain.AVALANCHE]: 43114,
  [Chain.BASE]: 8453,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Supported Chains
// ═══════════════════════════════════════════════════════════════════════════════

export const SUPPORTED_CHAINS: readonly Chain[] = [
  Chain.ETHEREUM,
  Chain.BSC,
  Chain.POLYGON,
  Chain.ARBITRUM,
  Chain.OPTIMISM,
  Chain.AVALANCHE,
  Chain.BASE,
];

// ═══════════════════════════════════════════════════════════════════════════════
// Build Config
// ═══════════════════════════════════════════════════════════════════════════════

function buildAlchemyUrl(chain: Chain, apiKey: string | undefined): string | null {
  const slug = ALCHEMY_SLUGS[chain];
  if (slug === undefined || apiKey === undefined || apiKey === '') return null;
  return `https://${slug}.g.alchemy.com/v2/${apiKey}`;
}

function buildInfuraUrl(chain: Chain, apiKey: string | undefined): string | null {
  const slug = INFURA_SLUGS[chain];
  if (slug === undefined || apiKey === undefined || apiKey === '') return null;
  return `https://${slug}.infura.io/v3/${apiKey}`;
}

/**
 * Build RPC configuration for all supported chains.
 * Falls back through: Alchemy → Infura → public RPC → null.
 */
export function buildChainConfigs(env: {
  alchemyApiKey?: string;
  infuraApiKey?: string;
  rateLimitPerSecond?: number;
}): Map<Chain, ChainRpcConfig> {
  const configs = new Map<Chain, ChainRpcConfig>();
  const defaultRate = env.rateLimitPerSecond ?? 25;

  for (const chain of SUPPORTED_CHAINS) {
    const alchemyUrl = buildAlchemyUrl(chain, env.alchemyApiKey);
    const infuraUrl = buildInfuraUrl(chain, env.infuraApiKey);
    const publicUrl = PUBLIC_RPCS[chain] ?? null;

    // Primary: Alchemy if available, else public
    // Fallback: Infura if available, else public (if not already primary)
    const primary = alchemyUrl ?? publicUrl;
    const fallback = alchemyUrl !== null ? (infuraUrl ?? publicUrl) : (infuraUrl ?? null);

    configs.set(chain, {
      chainId: CHAIN_IDS[chain] ?? 0,
      rateLimit: defaultRate,
      supportsArchive: alchemyUrl !== null || infuraUrl !== null,
      supportsDebugTrace: alchemyUrl !== null,
      primaryUrl: primary,
      fallbackUrl: fallback !== primary ? fallback : null,
    });
  }

  return configs;
}
