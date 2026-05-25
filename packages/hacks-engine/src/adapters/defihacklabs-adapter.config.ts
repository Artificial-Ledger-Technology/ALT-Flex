/**
 * @module defihacklabs-adapter.config
 * @description Configuration interface and defaults for the DeFiHackLabs adapter.
 *
 * All values are overridable via constructor injection for testing
 * and environment-specific tuning.
 *
 * GitHub API rate limits:
 * - Unauthenticated: 60 requests/hour
 * - Authenticated (PAT): 5,000 requests/hour
 *
 * @hexagonal Adapter Configuration — Infrastructure Layer
 * @task P2-ETL-002
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the DeFiHackLabs GitHub API adapter.
 *
 * All fields have sensible defaults via `DEFAULT_DEFIHACKLABS_CONFIG`.
 * Override individual fields for testing or deployment-specific tuning.
 */
export interface DeFiHackLabsAdapterConfig {
  /** GitHub repository owner */
  readonly owner: string;
  /** GitHub repository name */
  readonly repo: string;
  /** Base URL for the GitHub API */
  readonly baseUrl: string;
  /** Path to the README file in the repository */
  readonly readmePath: string;
  /** Path to the test directory in the repository */
  readonly testDirectory: string;
  /** GitHub Personal Access Token for authenticated API access (5,000 req/hr) */
  readonly githubToken?: string;
  /** Maximum number of retry attempts on failure */
  readonly maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  readonly retryBaseDelayMs: number;
  /** Maximum delay cap in milliseconds for exponential backoff */
  readonly retryMaxDelayMs: number;
  /** HTTP request timeout in milliseconds */
  readonly requestTimeoutMs: number;
  /**
   * Pause API calls when X-RateLimit-Remaining falls below this threshold.
   * Prevents hitting the hard limit and getting blocked.
   */
  readonly rateLimitThreshold: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default configuration values for the DeFiHackLabs adapter.
 *
 * - Targets the SunWeb3Sec/DeFiHackLabs repository
 * - 3 retries with 1s base / 32s max exponential backoff
 * - 30s request timeout
 * - Rate limit threshold at 100 remaining requests
 */
export const DEFAULT_DEFIHACKLABS_CONFIG: Readonly<Omit<DeFiHackLabsAdapterConfig, 'githubToken'>> =
  {
    owner: 'SunWeb3Sec',
    repo: 'DeFiHackLabs',
    baseUrl: 'https://api.github.com',
    readmePath: 'README.md',
    testDirectory: 'src/test',
    maxRetries: 3,
    retryBaseDelayMs: 1000,
    retryMaxDelayMs: 32000,
    requestTimeoutMs: 30000,
    rateLimitThreshold: 100,
  } as const;
