/**
 * @module system-api.schema
 * @description Zod API contract schemas for the System & Gateway Endpoints.
 *
 * These schemas define the request/response contracts for the API Gateway's
 * own infrastructure endpoints — health checks, system metadata, authentication,
 * and rate limit status. They are the single source of truth for:
 * - Fastify route validation (via Zod type providers)
 * - OpenAPI 3.1 specification generation
 * - Frontend TypeScript types (shared via @aegis/core)
 *
 * Design Principles:
 * 1. Health endpoints surface real runtime diagnostics (uptime, service liveness)
 * 2. Error responses reuse StandardErrorResponseSchema from common.schema
 * 3. Auth token endpoint is a future placeholder (Phase 3+)
 * 4. Rate limit status exposes the current bucket state for observability
 *
 * @hexagonal Shared Kernel — API Contract Layer
 * @task P1-ARCH-006
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Service Health Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Health status enum for individual services and the overall system.
 *
 * - `healthy`: Service is fully operational
 * - `degraded`: Service is operational but not at full capacity
 * - `unhealthy`: Service is non-operational or unreachable
 */
export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy'], {
  errorMap: () => ({ message: 'Health status must be one of: healthy, degraded, unhealthy' }),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/**
 * Individual service health check result.
 * Each monitored service (DB, Redis, engines) reports its own liveness.
 *
 * @example
 * ```json
 * {
 *   "name": "postgresql",
 *   "healthy": true,
 *   "latencyMs": 3.2,
 *   "message": "Connection pool active (5/20 connections)"
 * }
 * ```
 */
export const ServiceHealthSchema = z.object({
  /** Human-readable service identifier */
  name: z.string(),

  /** Whether the service is currently healthy */
  healthy: z.boolean(),

  /** Latency of the health check probe in milliseconds */
  latencyMs: z.number().nonnegative(),

  /** Optional diagnostic message with additional context */
  message: z.string().optional(),
});

export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/health — System Health (Standard)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard health check response.
 * Used by Docker healthchecks, load balancers, and monitoring systems.
 *
 * Reports aggregate system status with minimal overhead.
 * For per-service breakdown, use the detailed health endpoint.
 *
 * @example
 * ```json
 * {
 *   "status": "healthy",
 *   "version": "3.0.0",
 *   "uptime": 86400.123,
 *   "timestamp": "2026-04-12T14:30:00.000Z",
 *   "services": [
 *     { "name": "postgresql", "healthy": true, "latencyMs": 2.1 },
 *     { "name": "redis", "healthy": true, "latencyMs": 0.8 }
 *   ]
 * }
 * ```
 */
export const SystemHealthResponseSchema = z.object({
  /** Aggregate system status — derived from all service checks */
  status: HealthStatusSchema,

  /** Application semantic version */
  version: z.string(),

  /** Process uptime in seconds */
  uptime: z.number().nonnegative(),

  /** ISO 8601 timestamp of the health check */
  timestamp: z.string().datetime(),

  /** Summary health of each monitored service */
  services: z.array(ServiceHealthSchema),
});

export type SystemHealthResponse = z.infer<typeof SystemHealthResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/health/detailed — Per-Service Health Breakdown
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detailed service health entry with extended diagnostics.
 * Includes metadata not exposed in the standard health endpoint.
 *
 * @example
 * ```json
 * {
 *   "name": "postgresql",
 *   "healthy": true,
 *   "latencyMs": 3.2,
 *   "message": "Connection pool: 5/20 active",
 *   "lastCheckedAt": "2026-04-12T14:30:00.000Z",
 *   "consecutiveFailures": 0,
 *   "metadata": {
 *     "poolSize": 20,
 *     "activeConnections": 5,
 *     "version": "16.2"
 *   }
 * }
 * ```
 */
export const DetailedServiceHealthSchema = ServiceHealthSchema.extend({
  /** ISO 8601 timestamp of the last health probe */
  lastCheckedAt: z.string().datetime(),

  /** Number of consecutive failed health checks (0 = currently healthy) */
  consecutiveFailures: z.number().int().nonnegative(),

  /** Service-specific diagnostic metadata (free-form) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DetailedServiceHealth = z.infer<typeof DetailedServiceHealthSchema>;

/**
 * Detailed health check response with per-service breakdown.
 * Provides comprehensive diagnostics for operations dashboards.
 *
 * @example
 * ```json
 * {
 *   "status": "healthy",
 *   "version": "3.0.0",
 *   "uptime": 86400.123,
 *   "timestamp": "2026-04-12T14:30:00.000Z",
 *   "environment": "production",
 *   "services": [ ... ],
 *   "totalServices": 4,
 *   "healthyServices": 4,
 *   "unhealthyServices": 0
 * }
 * ```
 */
export const DetailedHealthResponseSchema = z.object({
  /** Aggregate system status */
  status: HealthStatusSchema,

  /** Application semantic version */
  version: z.string(),

  /** Process uptime in seconds */
  uptime: z.number().nonnegative(),

  /** ISO 8601 timestamp of the health check */
  timestamp: z.string().datetime(),

  /** Current deployment environment */
  environment: z.string(),

  /** Per-service detailed health entries */
  services: z.array(DetailedServiceHealthSchema),

  /** Total number of monitored services */
  totalServices: z.number().int().nonnegative(),

  /** Number of services currently healthy */
  healthyServices: z.number().int().nonnegative(),

  /** Number of services currently unhealthy or degraded */
  unhealthyServices: z.number().int().nonnegative(),
});

export type DetailedHealthResponse = z.infer<typeof DetailedHealthResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/v1/meta — System Metadata
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Feature flag entry for the system metadata response.
 */
export const FeatureFlagSchema = z.object({
  /** Feature flag name (e.g., "etl_auto_sync", "forensic_engine") */
  name: z.string(),

  /** Whether the feature is currently enabled */
  enabled: z.boolean(),

  /** Optional human-readable description */
  description: z.string().optional(),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

/**
 * System metadata response.
 * Exposes version, uptime, environment info, and feature flags.
 * Consumed by the frontend for conditional feature rendering.
 *
 * @example
 * ```json
 * {
 *   "name": "AltFlex AEGIS API Gateway",
 *   "version": "3.0.0",
 *   "environment": "production",
 *   "uptime": 86400.123,
 *   "timestamp": "2026-04-12T14:30:00.000Z",
 *   "nodeVersion": "v22.0.0",
 *   "featureFlags": [
 *     { "name": "etl_auto_sync", "enabled": true, "description": "Automatic ETL sync" }
 *   ],
 *   "engines": ["hacks-engine", "skills-engine", "forensic-engine"]
 * }
 * ```
 */
export const SystemMetaResponseSchema = z.object({
  /** Application display name */
  name: z.string(),

  /** Application semantic version */
  version: z.string(),

  /** Current deployment environment (development, staging, production) */
  environment: z.string(),

  /** Process uptime in seconds */
  uptime: z.number().nonnegative(),

  /** ISO 8601 timestamp */
  timestamp: z.string().datetime(),

  /** Node.js runtime version */
  nodeVersion: z.string(),

  /** Active feature flags */
  featureFlags: z.array(FeatureFlagSchema),

  /** Registered engine modules */
  engines: z.array(z.string()),
});

export type SystemMetaResponse = z.infer<typeof SystemMetaResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. POST /api/v1/auth/token — Generate API Access Token (Future)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request body for generating an API access token.
 *
 * Phase 1: Returns 501 Not Implemented.
 * Phase 3+: Will implement JWT-based token generation with scopes.
 */
export const AuthTokenRequestSchema = z.object({
  /** Client identifier (API key, service account ID) */
  clientId: z.string().min(1, 'Client ID is required'),

  /** Client secret or API key */
  clientSecret: z.string().min(1, 'Client secret is required'),

  /** Requested token scopes */
  scopes: z
    .array(
      z.enum(['read', 'write', 'admin', 'etl:sync', 'forensic:analyze'], {
        errorMap: () => ({
          message: 'Scope must be one of: read, write, admin, etl:sync, forensic:analyze',
        }),
      }),
    )
    .min(1, 'At least one scope is required')
    .default(['read']),
});

export type AuthTokenRequest = z.infer<typeof AuthTokenRequestSchema>;

/**
 * Response after successful token generation.
 */
export const AuthTokenResponseSchema = z.object({
  /** JWT access token */
  accessToken: z.string(),

  /** Token type (always "Bearer") */
  tokenType: z.literal('Bearer'),

  /** Token expiration time in seconds */
  expiresIn: z.number().int().positive(),

  /** ISO 8601 expiration timestamp */
  expiresAt: z.string().datetime(),

  /** Granted scopes (may differ from requested scopes) */
  scopes: z.array(z.string()),

  /** ISO 8601 timestamp of token issuance */
  issuedAt: z.string().datetime(),
});

export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GET /api/v1/rate-limit/status — Current Rate Limit Bucket State
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limit bucket status for a single client/IP.
 * Exposes the current state of the rate limiter for observability.
 *
 * @example
 * ```json
 * {
 *   "limit": 100,
 *   "remaining": 87,
 *   "reset": "2026-04-12T14:31:00.000Z",
 *   "retryAfterMs": 0,
 *   "windowMs": 60000,
 *   "currentUsage": 13,
 *   "clientIdentifier": "192.168.1.100",
 *   "timestamp": "2026-04-12T14:30:00.000Z"
 * }
 * ```
 */
export const RateLimitStatusResponseSchema = z.object({
  /** Maximum requests allowed per window */
  limit: z.number().int().positive(),

  /** Remaining requests in the current window */
  remaining: z.number().int().nonnegative(),

  /** ISO 8601 timestamp when the rate limit window resets */
  reset: z.string().datetime(),

  /** Milliseconds until requests can be made again (0 if not limited) */
  retryAfterMs: z.number().int().nonnegative(),

  /** Rate limit window duration in milliseconds */
  windowMs: z.number().int().positive(),

  /** Number of requests consumed in the current window */
  currentUsage: z.number().int().nonnegative(),

  /** Client identifier used for rate limiting (IP or API key) */
  clientIdentifier: z.string(),

  /** ISO 8601 timestamp */
  timestamp: z.string().datetime(),
});

export type RateLimitStatusResponse = z.infer<typeof RateLimitStatusResponseSchema>;
