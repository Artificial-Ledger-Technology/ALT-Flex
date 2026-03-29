/**
 * @module @aegis/core
 *
 * AltFlex AEGIS v3.0 — Shared Kernel
 * Barrel export for all core domain models, utilities, and infrastructure.
 *
 * This is the single entry point for the @aegis/core package. All engines
 * (hacks-engine, skills-engine, forensic-engine) and applications
 * (api-gateway, web) import domain types from here.
 *
 * Architecture: Hexagonal (Ports & Adapters)
 * - Domain entities with Zod runtime validation
 * - Value objects with rich metadata
 * - Port interfaces for dependency inversion
 */

// ── Domain Layer ────────────────────────────────────────────────────────────
// Entities, Value Objects, and Port interfaces (framework-agnostic nucleus)
export * from './domain/index.js';

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
} from './shared/env/index.js';

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
} from './shared/env/index.js';
