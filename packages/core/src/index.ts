/**
 * @module @aegis/core
 *
 * AltFlex AEGIS v3.0 — Shared Kernel
 * Barrel export for all core domain models, utilities, and infrastructure.
 */

// ── Environment Configuration ───────────────────────────────────────────────
export {
  // Schemas
  AppEnvSchema,
  DatabaseEnvSchema,
  RedisEnvSchema,
  HacksEngineEnvSchema,
  SkillsEngineEnvSchema,
  ForensicEngineEnvSchema,
  ApiGatewayEnvSchema,
  FrontendEnvSchema,
  FeatureFlagsEnvSchema,
  ServerEnvSchema,
  GatewayEnvSchema,
  // Validators
  validateEnv,
  validateEnvSafe,
} from './shared/env';

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
} from './shared/env';
