/**
 * @module defillama-adapter.config
 * @description Configuration interface and defaults for the DefiLlama adapter.
 *
 * All values are overridable via constructor injection for testing
 * and environment-specific tuning.
 *
 * @hexagonal Adapter Configuration — Infrastructure Layer
 * @task P2-ETL-001
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the DefiLlama API adapter.
 *
 * All fields have sensible defaults via `DEFAULT_DEFILLAMA_CONFIG`.
 * Override individual fields for testing or deployment-specific tuning.
 */
export interface DefiLlamaAdapterConfig {
  /** Base URL for the DefiLlama API */
  readonly baseUrl: string;
  /** Endpoint path for hacks data */
  readonly hacksEndpoint: string;
  /** Maximum number of retry attempts on failure */
  readonly maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  readonly retryBaseDelayMs: number;
  /** Maximum delay cap in milliseconds for exponential backoff */
  readonly retryMaxDelayMs: number;
  /** HTTP request timeout in milliseconds */
  readonly requestTimeoutMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default configuration values for the DefiLlama adapter.
 *
 * - 3 retries with 1s base / 32s max exponential backoff
 * - 30s request timeout (DefiLlama can be slow on large responses)
 */
export const DEFAULT_DEFILLAMA_CONFIG: Readonly<DefiLlamaAdapterConfig> = {
  baseUrl: 'https://api.llama.fi',
  hacksEndpoint: '/hacks',
  maxRetries: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 32000,
  requestTimeoutMs: 30000,
} as const;
