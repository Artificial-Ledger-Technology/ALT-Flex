/**
 * @module selector-resolver
 * @description Resolves 4-byte function selectors to human-readable signatures.
 *
 * Uses an in-memory cache pre-loaded with well-known selectors (ERC-20,
 * flash loan providers, DEX routers, oracles) and falls back to the
 * 4byte.directory API for unknown selectors. Never throws on failure —
 * this is a best-effort enrichment layer.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-003
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Well-Known Selectors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-loaded map of common function selectors found in DeFi exploits.
 * Avoids unnecessary API calls for the most frequently encountered functions.
 */
const WELL_KNOWN_SELECTORS: ReadonlyMap<string, string> = new Map([
  // ── ERC-20 ──────────────────────────────────────────────────────────────
  ['0xa9059cbb', 'transfer(address,uint256)'],
  ['0x23b872dd', 'transferFrom(address,address,uint256)'],
  ['0x095ea7b3', 'approve(address,uint256)'],
  ['0x70a08231', 'balanceOf(address)'],
  ['0x18160ddd', 'totalSupply()'],
  ['0xdd62ed3e', 'allowance(address,address)'],

  // ── Flash Loan Providers ────────────────────────────────────────────────
  ['0x5cffe9de', 'flashLoan(address,address,uint256,bytes)'],
  ['0xab9c4b5d', 'flashLoan(address,address[],uint256[],uint256[],address,bytes,uint16)'],
  ['0xc1a8b2e0', 'flashLoan(uint256,bytes)'],
  ['0x490e6cbc', 'flash(address,uint256,uint256,bytes)'],

  // ── DEX / Swap ──────────────────────────────────────────────────────────
  ['0x38ed1739', 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)'],
  ['0x8803dbee', 'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)'],
  ['0x7ff36ab5', 'swapExactETHForTokens(uint256,address[],address,uint256)'],
  ['0x128acb08', 'swap(address,bool,int256,uint160,bytes)'],
  ['0x022c0d9f', 'swap(uint256,uint256,address,bytes)'],
  ['0xd78ad95f', 'Swap(address,uint256,uint256,uint256,uint256,address)'],

  // ── Oracle ──────────────────────────────────────────────────────────────
  ['0x50d25bcd', 'latestAnswer()'],
  ['0xfeaf968c', 'latestRoundData()'],
  ['0x9a6fc8f5', 'getRoundData(uint80)'],
  ['0x0dfe1681', 'token0()'],
  ['0xd21220a7', 'token1()'],
  ['0x0902f1ac', 'getReserves()'],

  // ── Admin / Governance ──────────────────────────────────────────────────
  ['0xf2fde38b', 'transferOwnership(address)'],
  ['0x715018a6', 'renounceOwnership()'],
  ['0x8da5cb5b', 'owner()'],
  ['0x5c975abb', 'paused()'],
  ['0x8456cb59', 'pause()'],
  ['0x3f4ba83a', 'unpause()'],

  // ── Proxy / Upgrade ─────────────────────────────────────────────────────
  ['0x3659cfe6', 'upgradeTo(address)'],
  ['0x4f1ef286', 'upgradeToAndCall(address,bytes)'],
  ['0x5c60da1b', 'implementation()'],

  // ── Common DeFi ─────────────────────────────────────────────────────────
  ['0xb6b55f25', 'deposit(uint256)'],
  ['0x2e1a7d4d', 'withdraw(uint256)'],
  ['0xe2bbb158', 'deposit(uint256,uint256)'],
  ['0x441a3e70', 'withdraw(uint256,uint256)'],
  ['0xa0712d68', 'mint(uint256)'],
  ['0x42966c68', 'burn(uint256)'],
  ['0xf340fa01', 'deposit(address)'],
  ['0x00f714ce', 'withdraw(uint256,address)'],
]);

// ═══════════════════════════════════════════════════════════════════════════════
// SelectorResolver
// ═══════════════════════════════════════════════════════════════════════════════

export class SelectorResolver {
  /** Runtime cache: selector → signature. Includes well-known + API-resolved. */
  private readonly cache: Map<string, string>;

  /** Set of selectors we already tried to resolve via API (avoid retries). */
  private readonly attempted: Set<string> = new Set();

  constructor() {
    this.cache = new Map(WELL_KNOWN_SELECTORS);
  }

  /**
   * Resolve a 4-byte function selector to a human-readable signature.
   *
   * Resolution order:
   * 1. In-memory cache (well-known + previously resolved)
   * 2. 4byte.directory API lookup
   * 3. Returns null if unresolvable
   *
   * @param selector - The 4-byte selector hex (e.g., "0xa9059cbb")
   * @returns The function signature or null
   */
  async resolve(selector: string): Promise<string | null> {
    const normalized = selector.toLowerCase().slice(0, 10);

    // Check cache first
    const cached = this.cache.get(normalized);
    if (cached !== undefined) {
      return cached;
    }

    // Don't retry selectors we already looked up
    if (this.attempted.has(normalized)) {
      return null;
    }

    // Fetch from 4byte.directory API
    this.attempted.add(normalized);
    return this.fetchFromDirectory(normalized);
  }

  /**
   * Check if a selector is in the cache (synchronous, no API call).
   */
  getCached(selector: string): string | null {
    const normalized = selector.toLowerCase().slice(0, 10);
    return this.cache.get(normalized) ?? null;
  }

  /**
   * Get the current cache size (for diagnostics).
   */
  get cacheSize(): number {
    return this.cache.size;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Fetch a function signature from the 4byte.directory API.
   * Returns null on any failure — never throws.
   */
  private async fetchFromDirectory(selector: string): Promise<string | null> {
    try {
      const url = `https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}&format=json`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as FourByteResponse;

      if (data.count > 0 && data.results.length > 0) {
        // Take the most popular result (first in the list, sorted by ID)
        const firstResult = data.results[0];
        if (firstResult !== undefined) {
          const signature = firstResult.text_signature;
          this.cache.set(selector, signature);
          return signature;
        }
      }

      return null;
    } catch {
      // Network error, timeout, parse error — all non-fatal
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4byte.directory API Response Shape
// ═══════════════════════════════════════════════════════════════════════════════

interface FourByteResult {
  readonly id: number;
  readonly text_signature: string;
  readonly hex_signature: string;
}

interface FourByteResponse {
  readonly count: number;
  readonly results: readonly FourByteResult[];
}
