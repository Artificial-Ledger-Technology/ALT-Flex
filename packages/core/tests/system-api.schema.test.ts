/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * System & Gateway API Schemas — Unit Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive Zod schema unit tests for all schemas exported from
 * packages/core/src/shared/schemas/system-api.schema.ts.
 *
 * Test Strategy (Senior SDET + Senior Security Test Engineer):
 * - Happy path: valid inputs parse successfully
 * - Boundary conditions: edge values at schema limits
 * - Rejection: invalid inputs are correctly rejected
 * - Security: no information leakage, strict enum enforcement
 *
 * @module tests/system-api.schema
 * @task P1-ARCH-006
 */

import { describe, it, expect } from 'vitest';
import {
  HealthStatusSchema,
  ServiceHealthSchema,
  SystemHealthResponseSchema,
  DetailedServiceHealthSchema,
  DetailedHealthResponseSchema,
  FeatureFlagSchema,
  SystemMetaResponseSchema,
  AuthTokenRequestSchema,
  AuthTokenResponseSchema,
  RateLimitStatusResponseSchema,
} from '../src/shared/schemas/system-api.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const NOW_ISO = new Date().toISOString();
const FUTURE_ISO = new Date(Date.now() + 3600_000).toISOString();

const validServiceHealth = {
  name: 'postgresql',
  healthy: true,
  latencyMs: 3.2,
};

const validSystemHealth = {
  status: 'healthy' as const,
  version: '3.0.0',
  uptime: 86400.123,
  timestamp: NOW_ISO,
  services: [
    { name: 'postgresql', healthy: true, latencyMs: 2.1 },
    { name: 'redis', healthy: true, latencyMs: 0.8 },
  ],
};

const validDetailedServiceHealth = {
  name: 'postgresql',
  healthy: true,
  latencyMs: 3.2,
  message: 'Connection pool active',
  lastCheckedAt: NOW_ISO,
  consecutiveFailures: 0,
  metadata: { poolSize: 20, activeConnections: 5 },
};

const validDetailedHealth = {
  status: 'healthy' as const,
  version: '3.0.0',
  uptime: 86400.123,
  timestamp: NOW_ISO,
  environment: 'production',
  services: [validDetailedServiceHealth],
  totalServices: 5,
  healthyServices: 5,
  unhealthyServices: 0,
};

const validFeatureFlag = {
  name: 'etl_auto_sync',
  enabled: false,
  description: 'Automatic ETL sync from data sources',
};

const validSystemMeta = {
  name: 'AltFlex AEGIS API Gateway',
  version: '3.0.0',
  environment: 'production',
  uptime: 86400.123,
  timestamp: NOW_ISO,
  nodeVersion: 'v22.0.0',
  featureFlags: [validFeatureFlag],
  engines: ['hacks-engine', 'skills-engine', 'forensic-engine'],
};

const validAuthTokenRequest = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  scopes: ['read', 'write'] as const,
};

const validAuthTokenResponse = {
  accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
  expiresAt: FUTURE_ISO,
  scopes: ['read', 'write'],
  issuedAt: NOW_ISO,
};

const validRateLimitStatus = {
  limit: 100,
  remaining: 87,
  reset: FUTURE_ISO,
  retryAfterMs: 0,
  windowMs: 60000,
  currentUsage: 13,
  clientIdentifier: '192.168.1.100',
  timestamp: NOW_ISO,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HealthStatusSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('HealthStatusSchema', () => {
  it('accepts "healthy"', () => {
    expect(HealthStatusSchema.safeParse('healthy').success).toBe(true);
  });

  it('accepts "degraded"', () => {
    expect(HealthStatusSchema.safeParse('degraded').success).toBe(true);
  });

  it('accepts "unhealthy"', () => {
    expect(HealthStatusSchema.safeParse('unhealthy').success).toBe(true);
  });

  it('rejects invalid string', () => {
    expect(HealthStatusSchema.safeParse('offline').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(HealthStatusSchema.safeParse('').success).toBe(false);
  });

  it('rejects number', () => {
    expect(HealthStatusSchema.safeParse(1).success).toBe(false);
  });

  it('rejects null', () => {
    expect(HealthStatusSchema.safeParse(null).success).toBe(false);
  });

  it('rejects undefined', () => {
    expect(HealthStatusSchema.safeParse(undefined).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ServiceHealthSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('ServiceHealthSchema', () => {
  it('accepts valid service health with message', () => {
    const result = ServiceHealthSchema.safeParse({
      ...validServiceHealth,
      message: 'Pool ready',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid service health without message (optional)', () => {
    const result = ServiceHealthSchema.safeParse(validServiceHealth);
    expect(result.success).toBe(true);
  });

  it('accepts latencyMs = 0 (non-negative boundary)', () => {
    const result = ServiceHealthSchema.safeParse({
      ...validServiceHealth,
      latencyMs: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative latencyMs', () => {
    const result = ServiceHealthSchema.safeParse({
      ...validServiceHealth,
      latencyMs: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validServiceHealth;
    expect(ServiceHealthSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing healthy', () => {
    const { healthy: _, ...rest } = validServiceHealth;
    expect(ServiceHealthSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing latencyMs', () => {
    const { latencyMs: _, ...rest } = validServiceHealth;
    expect(ServiceHealthSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-boolean healthy', () => {
    const result = ServiceHealthSchema.safeParse({
      ...validServiceHealth,
      healthy: 'yes',
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SystemHealthResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('SystemHealthResponseSchema', () => {
  it('accepts valid health response with services', () => {
    const result = SystemHealthResponseSchema.safeParse(validSystemHealth);
    expect(result.success).toBe(true);
  });

  it('accepts with empty services array', () => {
    const result = SystemHealthResponseSchema.safeParse({
      ...validSystemHealth,
      services: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts status = degraded', () => {
    const result = SystemHealthResponseSchema.safeParse({
      ...validSystemHealth,
      status: 'degraded',
    });
    expect(result.success).toBe(true);
  });

  it('accepts status = unhealthy', () => {
    const result = SystemHealthResponseSchema.safeParse({
      ...validSystemHealth,
      status: 'unhealthy',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status enum', () => {
    const result = SystemHealthResponseSchema.safeParse({
      ...validSystemHealth,
      status: 'offline',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative uptime', () => {
    const result = SystemHealthResponseSchema.safeParse({
      ...validSystemHealth,
      uptime: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts uptime = 0 (freshly started)', () => {
    const result = SystemHealthResponseSchema.safeParse({
      ...validSystemHealth,
      uptime: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-datetime timestamp', () => {
    const result = SystemHealthResponseSchema.safeParse({
      ...validSystemHealth,
      timestamp: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing services', () => {
    const { services: _, ...rest } = validSystemHealth;
    expect(SystemHealthResponseSchema.safeParse(rest).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DetailedServiceHealthSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('DetailedServiceHealthSchema', () => {
  it('accepts valid detailed service health with metadata', () => {
    const result = DetailedServiceHealthSchema.safeParse(validDetailedServiceHealth);
    expect(result.success).toBe(true);
  });

  it('accepts without optional metadata', () => {
    const { metadata: _, ...rest } = validDetailedServiceHealth;
    const result = DetailedServiceHealthSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('accepts without optional message', () => {
    const { message: _, ...rest } = validDetailedServiceHealth;
    const result = DetailedServiceHealthSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('accepts consecutiveFailures = 0 (boundary)', () => {
    const result = DetailedServiceHealthSchema.safeParse({
      ...validDetailedServiceHealth,
      consecutiveFailures: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts high consecutiveFailures', () => {
    const result = DetailedServiceHealthSchema.safeParse({
      ...validDetailedServiceHealth,
      consecutiveFailures: 999,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative consecutiveFailures', () => {
    const result = DetailedServiceHealthSchema.safeParse({
      ...validDetailedServiceHealth,
      consecutiveFailures: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer consecutiveFailures', () => {
    const result = DetailedServiceHealthSchema.safeParse({
      ...validDetailedServiceHealth,
      consecutiveFailures: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-datetime lastCheckedAt', () => {
    const result = DetailedServiceHealthSchema.safeParse({
      ...validDetailedServiceHealth,
      lastCheckedAt: 'yesterday',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing lastCheckedAt', () => {
    const { lastCheckedAt: _, ...rest } = validDetailedServiceHealth;
    expect(DetailedServiceHealthSchema.safeParse(rest).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DetailedHealthResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('DetailedHealthResponseSchema', () => {
  it('accepts valid detailed health response', () => {
    const result = DetailedHealthResponseSchema.safeParse(validDetailedHealth);
    expect(result.success).toBe(true);
  });

  it('accepts with all services unhealthy', () => {
    const result = DetailedHealthResponseSchema.safeParse({
      ...validDetailedHealth,
      status: 'unhealthy',
      healthyServices: 0,
      unhealthyServices: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts degraded status', () => {
    const result = DetailedHealthResponseSchema.safeParse({
      ...validDetailedHealth,
      status: 'degraded',
      healthyServices: 3,
      unhealthyServices: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative totalServices', () => {
    const result = DetailedHealthResponseSchema.safeParse({
      ...validDetailedHealth,
      totalServices: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative unhealthyServices', () => {
    const result = DetailedHealthResponseSchema.safeParse({
      ...validDetailedHealth,
      unhealthyServices: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative healthyServices', () => {
    const result = DetailedHealthResponseSchema.safeParse({
      ...validDetailedHealth,
      healthyServices: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer totalServices', () => {
    const result = DetailedHealthResponseSchema.safeParse({
      ...validDetailedHealth,
      totalServices: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it('validates environment is a string', () => {
    const result = DetailedHealthResponseSchema.safeParse({
      ...validDetailedHealth,
      environment: 'staging',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-string environment', () => {
    const result = DetailedHealthResponseSchema.safeParse({
      ...validDetailedHealth,
      environment: 123,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing environment', () => {
    const { environment: _, ...rest } = validDetailedHealth;
    expect(DetailedHealthResponseSchema.safeParse(rest).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FeatureFlagSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('FeatureFlagSchema', () => {
  it('accepts valid feature flag with description', () => {
    const result = FeatureFlagSchema.safeParse(validFeatureFlag);
    expect(result.success).toBe(true);
  });

  it('accepts feature flag without description (optional)', () => {
    const result = FeatureFlagSchema.safeParse({
      name: 'dark_mode',
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts enabled = true', () => {
    const result = FeatureFlagSchema.safeParse({
      ...validFeatureFlag,
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validFeatureFlag;
    expect(FeatureFlagSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing enabled', () => {
    const { enabled: _, ...rest } = validFeatureFlag;
    expect(FeatureFlagSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-boolean enabled', () => {
    const result = FeatureFlagSchema.safeParse({
      ...validFeatureFlag,
      enabled: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string name', () => {
    const result = FeatureFlagSchema.safeParse({
      ...validFeatureFlag,
      name: 42,
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SystemMetaResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('SystemMetaResponseSchema', () => {
  it('accepts valid system metadata response', () => {
    const result = SystemMetaResponseSchema.safeParse(validSystemMeta);
    expect(result.success).toBe(true);
  });

  it('accepts with empty featureFlags array', () => {
    const result = SystemMetaResponseSchema.safeParse({
      ...validSystemMeta,
      featureFlags: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts with empty engines array', () => {
    const result = SystemMetaResponseSchema.safeParse({
      ...validSystemMeta,
      engines: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts with multiple feature flags', () => {
    const result = SystemMetaResponseSchema.safeParse({
      ...validSystemMeta,
      featureFlags: [
        { name: 'flag1', enabled: true },
        { name: 'flag2', enabled: false, description: 'Test' },
        { name: 'flag3', enabled: true, description: 'Another' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative uptime', () => {
    const result = SystemMetaResponseSchema.safeParse({
      ...validSystemMeta,
      uptime: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-datetime timestamp', () => {
    const result = SystemMetaResponseSchema.safeParse({
      ...validSystemMeta,
      timestamp: 'last-tuesday',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = validSystemMeta;
    expect(SystemMetaResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing version', () => {
    const { version: _, ...rest } = validSystemMeta;
    expect(SystemMetaResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing nodeVersion', () => {
    const { nodeVersion: _, ...rest } = validSystemMeta;
    expect(SystemMetaResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing engines', () => {
    const { engines: _, ...rest } = validSystemMeta;
    expect(SystemMetaResponseSchema.safeParse(rest).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AuthTokenRequestSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('AuthTokenRequestSchema', () => {
  it('accepts valid request with explicit scopes', () => {
    const result = AuthTokenRequestSchema.safeParse(validAuthTokenRequest);
    expect(result.success).toBe(true);
  });

  it('applies default scopes when omitted', () => {
    const result = AuthTokenRequestSchema.safeParse({
      clientId: 'client-1',
      clientSecret: 'secret-1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scopes).toEqual(['read']);
    }
  });

  it('accepts all valid scope enums', () => {
    const allScopes = ['read', 'write', 'admin', 'etl:sync', 'forensic:analyze'] as const;
    const result = AuthTokenRequestSchema.safeParse({
      clientId: 'client',
      clientSecret: 'secret',
      scopes: [...allScopes],
    });
    expect(result.success).toBe(true);
  });

  it('accepts single scope', () => {
    const result = AuthTokenRequestSchema.safeParse({
      clientId: 'client',
      clientSecret: 'secret',
      scopes: ['admin'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty clientId', () => {
    const result = AuthTokenRequestSchema.safeParse({
      ...validAuthTokenRequest,
      clientId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty clientSecret', () => {
    const result = AuthTokenRequestSchema.safeParse({
      ...validAuthTokenRequest,
      clientSecret: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing clientId', () => {
    const { clientId: _, ...rest } = validAuthTokenRequest;
    expect(AuthTokenRequestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing clientSecret', () => {
    const { clientSecret: _, ...rest } = validAuthTokenRequest;
    expect(AuthTokenRequestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid scope enum value', () => {
    const result = AuthTokenRequestSchema.safeParse({
      ...validAuthTokenRequest,
      scopes: ['read', 'superadmin'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty scopes array', () => {
    const result = AuthTokenRequestSchema.safeParse({
      ...validAuthTokenRequest,
      scopes: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-array scopes', () => {
    const result = AuthTokenRequestSchema.safeParse({
      ...validAuthTokenRequest,
      scopes: 'read',
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AuthTokenResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('AuthTokenResponseSchema', () => {
  it('accepts valid token response', () => {
    const result = AuthTokenResponseSchema.safeParse(validAuthTokenResponse);
    expect(result.success).toBe(true);
  });

  it('accepts with single scope', () => {
    const result = AuthTokenResponseSchema.safeParse({
      ...validAuthTokenResponse,
      scopes: ['read'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-positive expiresIn', () => {
    const result = AuthTokenResponseSchema.safeParse({
      ...validAuthTokenResponse,
      expiresIn: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative expiresIn', () => {
    const result = AuthTokenResponseSchema.safeParse({
      ...validAuthTokenResponse,
      expiresIn: -3600,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer expiresIn', () => {
    const result = AuthTokenResponseSchema.safeParse({
      ...validAuthTokenResponse,
      expiresIn: 3600.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-datetime expiresAt', () => {
    const result = AuthTokenResponseSchema.safeParse({
      ...validAuthTokenResponse,
      expiresAt: 'tomorrow',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-datetime issuedAt', () => {
    const result = AuthTokenResponseSchema.safeParse({
      ...validAuthTokenResponse,
      issuedAt: 'now',
    });
    expect(result.success).toBe(false);
  });

  it('rejects tokenType other than Bearer', () => {
    const result = AuthTokenResponseSchema.safeParse({
      ...validAuthTokenResponse,
      tokenType: 'Basic',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing accessToken', () => {
    const { accessToken: _, ...rest } = validAuthTokenResponse;
    expect(AuthTokenResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing scopes', () => {
    const { scopes: _, ...rest } = validAuthTokenResponse;
    expect(AuthTokenResponseSchema.safeParse(rest).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RateLimitStatusResponseSchema
// ═══════════════════════════════════════════════════════════════════════════════

describe('RateLimitStatusResponseSchema', () => {
  it('accepts valid rate limit status', () => {
    const result = RateLimitStatusResponseSchema.safeParse(validRateLimitStatus);
    expect(result.success).toBe(true);
  });

  it('accepts remaining = 0 (fully consumed)', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      remaining: 0,
      currentUsage: 100,
    });
    expect(result.success).toBe(true);
  });

  it('accepts retryAfterMs > 0 (rate limited)', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      remaining: 0,
      retryAfterMs: 30000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-positive limit (must be > 0)', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      limit: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative limit', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      limit: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative remaining', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      remaining: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative retryAfterMs', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      retryAfterMs: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive windowMs', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      windowMs: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative windowMs', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      windowMs: -60000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative currentUsage', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      currentUsage: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer limit', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      limit: 100.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-datetime reset', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      reset: 'in-five-minutes',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-datetime timestamp', () => {
    const result = RateLimitStatusResponseSchema.safeParse({
      ...validRateLimitStatus,
      timestamp: 'now',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing clientIdentifier', () => {
    const { clientIdentifier: _, ...rest } = validRateLimitStatus;
    expect(RateLimitStatusResponseSchema.safeParse(rest).success).toBe(false);
  });
});
