/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Environment Variable Schemas
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Modular Zod schemas for validating environment variables at startup.
 * Each schema corresponds to a service domain and can be composed independently.
 *
 * @module @aegis/core/shared/env
 * @hexagonal Infrastructure Layer — Configuration Port
 */

import { z } from 'zod';

// ── Application ─────────────────────────────────────────────────────────────

export const AppEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development')
    .describe('Runtime environment'),
  APP_VERSION: z.string().default('3.0.0').describe('Application semantic version'),
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info')
    .describe('Logging verbosity level'),
});

export type AppEnv = z.infer<typeof AppEnvSchema>;

// ── Database (PostgreSQL) ───────────────────────────────────────────────────

export const DatabaseEnvSchema = z.object({
  POSTGRES_HOST: z.string().default('localhost').describe('PostgreSQL host'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432).describe('PostgreSQL port'),
  POSTGRES_DB: z.string().default('aegis_dev').describe('PostgreSQL database name'),
  POSTGRES_USER: z.string().default('aegis').describe('PostgreSQL username'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD is required').describe('PostgreSQL password'),
  DATABASE_URL: z
    .string()
    .optional()
    .describe('Full PostgreSQL connection string (overrides individual fields)'),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true')
    .describe('Enable SSL for database connections'),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2).describe('Minimum pool size'),
  DATABASE_POOL_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(10)
    .describe('Maximum pool size'),
});

export type DatabaseEnv = z.infer<typeof DatabaseEnvSchema>;

// ── Cache (Redis) ───────────────────────────────────────────────────────────

export const RedisEnvSchema = z.object({
  REDIS_HOST: z.string().default('localhost').describe('Redis host'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379).describe('Redis port'),
  REDIS_PASSWORD: z.string().optional().default('').describe('Redis password (empty for no auth)'),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0).describe('Redis database index'),
  REDIS_KEY_PREFIX: z.string().default('aegis:').describe('Key namespace prefix'),
});

export type RedisEnv = z.infer<typeof RedisEnvSchema>;

// ── Hacks Engine (Engine α) ─────────────────────────────────────────────────

export const HacksEngineEnvSchema = z.object({
  DEFILLAMA_API_URL: z
    .string()
    .url()
    .default('https://api.llama.fi')
    .describe('DefiLlama Hacks API base URL'),
  DEFI_HACK_LABS_REPO: z
    .string()
    .default('SunWeb3Sec/DeFiHackLabs')
    .describe('DeFiHackLabs GitHub repo (owner/repo)'),
  ETHERSCAN_API_KEY: z.string().optional().default('').describe('Etherscan API key'),
  POLYGONSCAN_API_KEY: z.string().optional().default('').describe('PolygonScan API key'),
  BSCSCAN_API_KEY: z.string().optional().default('').describe('BscScan API key'),
  ARBISCAN_API_KEY: z.string().optional().default('').describe('Arbiscan API key'),
  HACKS_SYNC_CRON: z
    .string()
    .default('0 */6 * * *')
    .describe('Cron expression for hack data sync'),
  HACKS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(100).describe('ETL batch size'),
});

export type HacksEngineEnv = z.infer<typeof HacksEngineEnvSchema>;

// ── Skills Engine (Engine β) ────────────────────────────────────────────────

export const SkillsEngineEnvSchema = z.object({
  GITHUB_TOKEN: z.string().optional().default('').describe('GitHub PAT for repo scraping'),
  SKILLS_SAFETY_SCAN_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true')
    .describe('Enable/disable safety scanner'),
  SKILLS_AUTO_INDEX_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(3_600_000)
    .describe('Auto-index interval in milliseconds'),
  SKILLS_MAX_FILE_SIZE_KB: z.coerce
    .number()
    .int()
    .positive()
    .default(512)
    .describe('Max skill file size in KB'),
});

export type SkillsEngineEnv = z.infer<typeof SkillsEngineEnvSchema>;

// ── Forensic Engine ─────────────────────────────────────────────────────────

export const ForensicEngineEnvSchema = z.object({
  FOUNDRY_BIN_PATH: z
    .string()
    .default('/usr/local/bin/forge')
    .describe('Path to Foundry forge binary'),
  RPC_URL_MAINNET: z.string().url().optional().describe('Ethereum Mainnet RPC URL'),
  RPC_URL_BSC: z
    .string()
    .url()
    .optional()
    .default('https://bsc-dataseed1.binance.org')
    .describe('BSC RPC URL'),
  RPC_URL_POLYGON: z
    .string()
    .url()
    .optional()
    .default('https://polygon-rpc.com')
    .describe('Polygon RPC URL'),
  RPC_URL_ARBITRUM: z
    .string()
    .url()
    .optional()
    .default('https://arb1.arbitrum.io/rpc')
    .describe('Arbitrum RPC URL'),
  RPC_URL_OPTIMISM: z
    .string()
    .url()
    .optional()
    .default('https://mainnet.optimism.io')
    .describe('Optimism RPC URL'),
  RPC_URL_AVALANCHE: z
    .string()
    .url()
    .optional()
    .default('https://api.avax.network/ext/bc/C/rpc')
    .describe('Avalanche C-Chain RPC URL'),
  RPC_URL_BASE: z
    .string()
    .url()
    .optional()
    .default('https://mainnet.base.org')
    .describe('Base RPC URL'),
});

export type ForensicEngineEnv = z.infer<typeof ForensicEngineEnvSchema>;

// ── API Gateway ─────────────────────────────────────────────────────────────

export const ApiGatewayEnvSchema = z.object({
  API_HOST: z.string().default('0.0.0.0').describe('API bind address'),
  API_PORT: z.coerce.number().int().positive().default(4000).describe('API HTTP port'),
  API_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(100)
    .describe('Max requests per rate limit window'),
  API_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000)
    .describe('Rate limit window in milliseconds'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .describe('JWT signing secret'),
  JWT_EXPIRES_IN: z.string().default('7d').describe('JWT token expiry duration'),
  API_KEYS: z
    .string()
    .optional()
    .default('')
    .transform((val) => (val ? val.split(',').map((k) => k.trim()) : []))
    .describe('Comma-separated API keys for service auth'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .describe('Allowed CORS origin(s)'),
});

export type ApiGatewayEnv = z.infer<typeof ApiGatewayEnvSchema>;

// ── Frontend (Next.js) ──────────────────────────────────────────────────────

export const FrontendEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default('http://localhost:4000')
    .describe('Public API URL for frontend'),
  NEXT_PUBLIC_APP_NAME: z.string().default('AltFlex AEGIS').describe('Application display name'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('3.0.0').describe('App version shown in UI'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true')
    .describe('Enable analytics tracking'),
});

export type FrontendEnv = z.infer<typeof FrontendEnvSchema>;

// ── Feature Flags ───────────────────────────────────────────────────────────

export const FeatureFlagsEnvSchema = z.object({
  FEATURE_HACKS_DASHBOARD: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true')
    .describe('Enable Hacks Dashboard'),
  FEATURE_SKILLS_EXPLORER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true')
    .describe('Enable AI Skills Explorer'),
  FEATURE_FORENSIC_ENGINE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true')
    .describe('Enable Forensic Engine'),
  FEATURE_SAFETY_SCANNER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true')
    .describe('Enable Safety Scanner'),
  FEATURE_DARK_MODE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true')
    .describe('Enable dark mode UI toggle'),
});

export type FeatureFlagsEnv = z.infer<typeof FeatureFlagsEnvSchema>;

// ── Composite Schemas ───────────────────────────────────────────────────────

/**
 * Full server-side environment schema.
 * Use this when validating the complete environment at application boot.
 */
export const ServerEnvSchema = AppEnvSchema.merge(DatabaseEnvSchema)
  .merge(RedisEnvSchema)
  .merge(HacksEngineEnvSchema)
  .merge(SkillsEngineEnvSchema)
  .merge(ForensicEngineEnvSchema)
  .merge(ApiGatewayEnvSchema)
  .merge(FeatureFlagsEnvSchema);

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

/**
 * API Gateway-specific environment schema.
 * Composes only the schemas relevant to the gateway service.
 */
export const GatewayEnvSchema = AppEnvSchema.merge(DatabaseEnvSchema)
  .merge(RedisEnvSchema)
  .merge(ApiGatewayEnvSchema)
  .merge(FeatureFlagsEnvSchema);

export type GatewayEnv = z.infer<typeof GatewayEnvSchema>;
