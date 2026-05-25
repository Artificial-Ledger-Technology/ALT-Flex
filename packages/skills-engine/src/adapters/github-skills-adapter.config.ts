/**
 * @module github-skills-adapter.config
 * @description Configuration interface and defaults for the GitHub AI Skills adapter.
 *
 * All values are overridable via constructor injection for testing
 * and environment-specific tuning.
 *
 * GitHub API rate limits:
 * - Unauthenticated: 60 requests/hour
 * - Authenticated (PAT): 5,000 requests/hour
 *
 * @hexagonal Adapter Configuration — Infrastructure Layer
 * @task P2-ETL-003
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Source Type
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Defines a curated GitHub repository to scrape for AI skill files.
 */
export interface SkillSource {
  /** GitHub repository owner */
  readonly owner: string;
  /** GitHub repository name */
  readonly repo: string;
  /** Directories to scan for skill files (relative to repo root) */
  readonly paths: readonly string[];
  /** Default AI platform for files in this repository */
  readonly defaultPlatform: string;
  /** Default branch to scan (usually 'main') */
  readonly branch?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the GitHub AI Skills adapter.
 *
 * All fields have sensible defaults via `DEFAULT_GITHUB_SKILLS_CONFIG`.
 * Override individual fields for testing or deployment-specific tuning.
 */
export interface GitHubSkillsAdapterConfig {
  /** Base URL for the GitHub API */
  readonly baseUrl: string;
  /** GitHub Personal Access Token for authenticated API access (5,000 req/hr) */
  readonly githubToken?: string;
  /** List of curated repositories to scrape */
  readonly skillSources: readonly SkillSource[];
  /** File extensions to include in discovery */
  readonly validExtensions: readonly string[];
  /** Directory prefixes to filter discovery results */
  readonly validDirectories: readonly string[];
  /** Maximum number of retry attempts on failure */
  readonly maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  readonly retryBaseDelayMs: number;
  /** Maximum delay cap in milliseconds for exponential backoff */
  readonly retryMaxDelayMs: number;
  /** HTTP request timeout in milliseconds */
  readonly requestTimeoutMs: number;
  /** Pause API calls when X-RateLimit-Remaining falls below this threshold */
  readonly rateLimitThreshold: number;
  /** Maximum file size in bytes to download (skip very large files) */
  readonly maxFileSizeBytes: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Skill Sources
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Curated list of GitHub repositories containing AI audit skill files.
 *
 * These repositories are known to contain structured prompts, rules,
 * and skill definitions used for smart contract security auditing.
 */
export const DEFAULT_SKILL_SOURCES: readonly SkillSource[] = [
  {
    owner: 'anthropics',
    repo: 'anthropic-cookbook',
    paths: ['misc/', 'tool_use/'],
    defaultPlatform: 'claude',
  },
  {
    owner: 'AquaSecure',
    repo: 'ai-audit-skills',
    paths: ['skills/', 'prompts/'],
    defaultPlatform: 'claude',
  },
  {
    owner: 'PatrickAlpworworworlds',
    repo: 'cursor-security-rules',
    paths: ['.cursorrules', 'rules/'],
    defaultPlatform: 'cursor',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default configuration values for the GitHub Skills adapter.
 *
 * - Scans curated repositories for AI audit skill files
 * - 3 retries with 1s base / 32s max exponential backoff
 * - 30s request timeout
 * - Rate limit threshold at 100 remaining requests
 * - Max file size 512 KB (skip large binary or generated files)
 */
export const DEFAULT_GITHUB_SKILLS_CONFIG: Readonly<
  Omit<GitHubSkillsAdapterConfig, 'githubToken'>
> = {
  baseUrl: 'https://api.github.com',
  skillSources: DEFAULT_SKILL_SOURCES,
  validExtensions: ['.yml', '.yaml', '.md', '.json', '.toml'],
  validDirectories: ['skills/', 'prompts/', 'agents/', '.cursorrules', '.claude', 'rules/'],
  maxRetries: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 32000,
  requestTimeoutMs: 30000,
  rateLimitThreshold: 100,
  maxFileSizeBytes: 512 * 1024, // 512 KB
} as const;
