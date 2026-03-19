/**
 * @module @aegis/core/shared/env
 *
 * Environment variable validation module.
 * Re-exports all schemas, types, and validation utilities.
 */

// ── Schemas & Types ─────────────────────────────────────────────────────────
export {
  // Individual domain schemas
  AppEnvSchema,
  DatabaseEnvSchema,
  RedisEnvSchema,
  HacksEngineEnvSchema,
  SkillsEngineEnvSchema,
  ForensicEngineEnvSchema,
  ApiGatewayEnvSchema,
  FrontendEnvSchema,
  FeatureFlagsEnvSchema,
  // Composite schemas
  ServerEnvSchema,
  GatewayEnvSchema,
} from './env.schema';

export type {
  AppEnv,
  DatabaseEnv,
  RedisEnv,
  HacksEngineEnv,
  SkillsEngineEnv,
  ForensicEngineEnv,
  ApiGatewayEnv,
  FrontendEnv,
  FeatureFlagsEnv,
  ServerEnv,
  GatewayEnv,
} from './env.schema';

// ── Validators ──────────────────────────────────────────────────────────────
export { validateEnv, validateEnvSafe } from './env.validator';
