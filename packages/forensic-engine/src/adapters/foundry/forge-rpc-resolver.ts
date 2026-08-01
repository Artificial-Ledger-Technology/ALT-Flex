/**
 * @module forge-rpc-resolver
 * @description Resolves RPC URLs for Foundry fork configuration.
 *
 * Maps Chain enum values to concrete RPC endpoint URLs using the
 * same Alchemy/Infura API keys as the ChainRpcProvider. Falls back
 * to public RPCs if no API key is configured.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-002
 */

import { Chain } from '@aegis/core';
import { ForkUnavailableError } from './foundry-errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Alchemy / Infura Network Mappings
// ═══════════════════════════════════════════════════════════════════════════════

/** Alchemy network slugs for constructing RPC URLs. */
const ALCHEMY_NETWORK_SLUGS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'eth-mainnet',
  [Chain.POLYGON]: 'polygon-mainnet',
  [Chain.ARBITRUM]: 'arb-mainnet',
  [Chain.OPTIMISM]: 'opt-mainnet',
  [Chain.BASE]: 'base-mainnet',
};

/** Infura network slugs for constructing RPC URLs. */
const INFURA_NETWORK_SLUGS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'mainnet',
  [Chain.POLYGON]: 'polygon-mainnet',
  [Chain.ARBITRUM]: 'arbitrum-mainnet',
  [Chain.OPTIMISM]: 'optimism-mainnet',
  [Chain.AVALANCHE]: 'avalanche-mainnet',
};

/** Public RPC endpoints as last-resort fallbacks. */
const PUBLIC_RPCS: Partial<Record<Chain, string>> = {
  [Chain.ETHEREUM]: 'https://eth.llamarpc.com',
  [Chain.BSC]: 'https://bsc-dataseed1.binance.org',
  [Chain.POLYGON]: 'https://polygon-rpc.com',
  [Chain.AVALANCHE]: 'https://api.avax.network/ext/bc/C/rpc',
  [Chain.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
  [Chain.OPTIMISM]: 'https://mainnet.optimism.io',
  [Chain.BASE]: 'https://mainnet.base.org',
  [Chain.FANTOM]: 'https://rpc.ftm.tools',
  [Chain.GNOSIS]: 'https://rpc.gnosischain.com',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ForgeRpcResolver
// ═══════════════════════════════════════════════════════════════════════════════

export class ForgeRpcResolver {
  private readonly alchemyApiKey: string | undefined;
  private readonly infuraApiKey: string | undefined;

  constructor(env?: {
    alchemyApiKey?: string;
    infuraApiKey?: string;
  }) {
    this.alchemyApiKey = env?.alchemyApiKey ?? process.env['ALCHEMY_API_KEY'];
    this.infuraApiKey = env?.infuraApiKey ?? process.env['INFURA_API_KEY'];
  }

  /**
   * Resolve the best available RPC URL for a given chain.
   *
   * Priority order:
   * 1. Alchemy (if API key and chain slug available)
   * 2. Infura (if API key and chain slug available)
   * 3. Public RPC (no authentication needed)
   *
   * @param chain - Target blockchain network
   * @returns RPC endpoint URL suitable for `foundry.toml` eth_rpc_url
   * @throws {ForkUnavailableError} if no RPC URL can be resolved
   */
  resolve(chain: Chain): string {
    // Try Alchemy first
    if (this.alchemyApiKey !== undefined) {
      const slug = ALCHEMY_NETWORK_SLUGS[chain];
      if (slug !== undefined) {
        return `https://${slug}.g.alchemy.com/v2/${this.alchemyApiKey}`;
      }
    }

    // Try Infura
    if (this.infuraApiKey !== undefined) {
      const slug = INFURA_NETWORK_SLUGS[chain];
      if (slug !== undefined) {
        return `https://${slug}.infura.io/v3/${this.infuraApiKey}`;
      }
    }

    // Fall back to public RPC
    const publicRpc = PUBLIC_RPCS[chain];
    if (publicRpc !== undefined) {
      return publicRpc;
    }

    throw new ForkUnavailableError(
      `No RPC endpoint available for chain '${chain}'. ` +
      `Configure ALCHEMY_API_KEY or INFURA_API_KEY environment variable.`,
    );
  }

  /**
   * Check if a chain has any RPC endpoint available.
   *
   * @param chain - Target blockchain network
   * @returns true if at least one RPC URL can be resolved
   */
  isSupported(chain: Chain): boolean {
    try {
      this.resolve(chain);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all chains that have RPC endpoints available.
   *
   * @returns Array of supported Chain values
   */
  getSupportedChains(): Chain[] {
    return Object.values(Chain).filter((chain) => this.isSupported(chain));
  }
}
