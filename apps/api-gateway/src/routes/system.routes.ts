/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — System & Gateway API Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify route definitions for the API Gateway's own infrastructure endpoints.
 * These 5 endpoints are registered with Zod schema validation and provide:
 *
 * - System health checks (standard + detailed)
 * - System metadata and feature flags
 * - API token generation (future — Phase 3+)
 * - Rate limit bucket status for observability
 *
 * IMPORTANT: Auth token endpoint returns 501 Not Implemented.
 * JWT authentication will be implemented in Phase 3.
 *
 * @module routes/system
 * @hexagonal Infrastructure Layer — Primary Adapter (HTTP)
 * @task P1-ARCH-006
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ZodIssue } from 'zod';
import {
  SystemHealthResponseSchema,
  DetailedHealthResponseSchema,
  SystemMetaResponseSchema,
  AuthTokenRequestSchema,
  RateLimitStatusResponseSchema,
  type AuthTokenRequest,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const API_VERSION = '3.0.0';
const APP_NAME = 'AltFlex AEGIS API Gateway';

/** Process start time — used to compute uptime */
const BOOT_TIME = Date.now();

/**
 * Registered engine modules in the AEGIS platform.
 * Used by the /meta endpoint to report available engines.
 */
const REGISTERED_ENGINES = ['hacks-engine', 'skills-engine', 'forensic-engine'] as const;

/** Standard 501 response for unimplemented endpoints */
function notImplemented(
  _request: FastifyRequest,
  reply: FastifyReply,
): ReturnType<FastifyReply['send']> {
  return reply.status(501).send({
    error: 'NOT_IMPLEMENTED',
    code: 'AEGIS-501-002',
    message: 'This endpoint is not yet implemented. Coming in Phase 3.',
    timestamp: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Health Check Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simulate health check for a named service.
 * Phase 2+: Replace with real connection probes (pg pool, ioredis ping, etc.)
 *
 * @param name - Service identifier
 * @returns Service health result
 */
function checkServiceHealth(name: string): {
  name: string;
  healthy: boolean;
  latencyMs: number;
  message?: string;
} {
  const start = performance.now();

  // Phase 2+: Replace stubs with actual connection health checks
  // e.g., pg.query('SELECT 1'), redis.ping(), etc.
  switch (name) {
    case 'postgresql': {
      // Stub: database health check
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        name,
        healthy: true,
        latencyMs,
        message: 'Connection pool stub — real probe in Phase 2',
      };
    }
    case 'redis': {
      // Stub: cache health check
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        name,
        healthy: true,
        latencyMs,
        message: 'Redis connection stub — real probe in Phase 2',
      };
    }
    case 'hacks-engine':
    case 'skills-engine':
    case 'forensic-engine': {
      // Stub: engine module health check
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        name,
        healthy: true,
        latencyMs,
        message: 'Engine module stub — real probe in Phase 2',
      };
    }
    default: {
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        name,
        healthy: false,
        latencyMs,
        message: `Unknown service: ${name}`,
      };
    }
  }
}

/**
 * Determine aggregate health status from individual service checks.
 *
 * - All healthy → 'healthy'
 * - Some unhealthy → 'degraded'
 * - All unhealthy → 'unhealthy'
 */
function deriveAggregateStatus(
  services: Array<{ healthy: boolean }>,
): 'healthy' | 'degraded' | 'unhealthy' {
  const healthyCount = services.filter((s) => s.healthy).length;

  if (healthyCount === services.length) {
    return 'healthy';
  }
  if (healthyCount === 0) {
    return 'unhealthy';
  }
  return 'degraded';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register all System & Gateway routes on the Fastify instance.
 *
 * Endpoint Summary:
 * ┌─────┬────────┬───────────────────────────────┬──────────────────────────────┐
 * │  #  │ Method │ Path                          │ Description                  │
 * ├─────┼────────┼───────────────────────────────┼──────────────────────────────┤
 * │  1  │ GET    │ /health                       │ Docker/LB health check       │
 * │  2  │ GET    │ /api/v1/health                │ System health (all services) │
 * │  3  │ GET    │ /api/v1/health/detailed       │ Per-service health breakdown │
 * │  4  │ GET    │ /api/v1/meta                  │ System metadata + flags      │
 * │  5  │ POST   │ /api/v1/auth/token            │ Generate API token (future)  │
 * │  6  │ GET    │ /api/v1/rate-limit/status      │ Rate limit bucket state      │
 * │  7  │ GET    │ /                             │ Root service info            │
 * └─────┴────────┴───────────────────────────────┴──────────────────────────────┘
 */
// eslint-disable-next-line @typescript-eslint/require-await -- Fastify plugin signature requires async
export async function systemRoutes(server: FastifyInstance): Promise<void> {
  // ── Monitored services list ────────────────────────────────────────────────
  const MONITORED_SERVICES = [
    'postgresql',
    'redis',
    'hacks-engine',
    'skills-engine',
    'forensic-engine',
  ];

  // ── 1. GET /health — Docker/Load Balancer Health Check ─────────────────────
  server.get(
    '/health',
    {
      schema: {
        description:
          'Lightweight health check for Docker healthcheck and load balancer probes. ' +
          'Returns minimal status without probing downstream services.',
        tags: ['System - Health'],
        response: {
          200: {
            description: 'Service is alive',
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              version: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number' },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return {
        status: 'ok',
        service: 'aegis-api-gateway',
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  );

  // ── 2. GET /api/v1/health — System Health (All Services + DB + Redis) ──────
  server.get(
    '/api/v1/health',
    {
      schema: {
        description:
          'System health check with service-level liveness probes. ' +
          'Reports aggregate health status across PostgreSQL, Redis, and all engine modules. ' +
          'Used by monitoring dashboards and alerting systems.',
        tags: ['System - Health'],
        response: {
          200: {
            description: 'System health report',
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
              version: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
              services: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    healthy: { type: 'boolean' },
                    latencyMs: { type: 'number' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          503: { description: 'System unhealthy', type: 'object' },
        },
      },
    },
    async (_request, reply) => {
      // Probe all monitored services
      const serviceResults = MONITORED_SERVICES.map((name) => checkServiceHealth(name));

      const aggregateStatus = deriveAggregateStatus(serviceResults);

      // Validate response against Zod schema
      const response = {
        status: aggregateStatus,
        version: API_VERSION,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: serviceResults,
      };

      const parseResult = SystemHealthResponseSchema.safeParse(response);
      if (!parseResult.success) {
        server.log.error(
          { errors: parseResult.error.issues },
          'Health response schema validation failed',
        );
      }

      // Return 503 if any service is unhealthy
      if (aggregateStatus === 'unhealthy') {
        return reply.status(503).send(response);
      }

      return response;
    },
  );

  // ── 3. GET /api/v1/health/detailed — Per-Service Health Breakdown ──────────
  server.get(
    '/api/v1/health/detailed',
    {
      schema: {
        description:
          'Detailed per-service health breakdown with extended diagnostics. ' +
          'Includes consecutive failure counts, last check timestamps, ' +
          'and service-specific metadata. Intended for operations dashboards.',
        tags: ['System - Health'],
        response: {
          200: {
            description: 'Detailed health breakdown',
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
              version: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
              environment: { type: 'string' },
              services: { type: 'array', items: { type: 'object' } },
              totalServices: { type: 'integer' },
              healthyServices: { type: 'integer' },
              unhealthyServices: { type: 'integer' },
            },
          },
          503: { description: 'System unhealthy', type: 'object' },
        },
      },
    },
    async (_request, reply) => {
      const now = new Date().toISOString();

      // Probe all monitored services with extended diagnostics
      const serviceResults = MONITORED_SERVICES.map((name) => {
        const health = checkServiceHealth(name);
        return {
          ...health,
          lastCheckedAt: now,
          consecutiveFailures: 0, // Phase 2: Track via circuit breaker
          metadata: {
            bootedAt: new Date(BOOT_TIME).toISOString(),
          },
        };
      });

      const aggregateStatus = deriveAggregateStatus(serviceResults);
      const healthyCount = serviceResults.filter((s) => s.healthy).length;

      const response = {
        status: aggregateStatus,
        version: API_VERSION,
        uptime: process.uptime(),
        timestamp: now,
        environment: process.env['NODE_ENV'] ?? 'development',
        services: serviceResults,
        totalServices: serviceResults.length,
        healthyServices: healthyCount,
        unhealthyServices: serviceResults.length - healthyCount,
      };

      const parseResult = DetailedHealthResponseSchema.safeParse(response);
      if (!parseResult.success) {
        server.log.error(
          { errors: parseResult.error.issues },
          'Detailed health response schema validation failed',
        );
      }

      if (aggregateStatus === 'unhealthy') {
        return reply.status(503).send(response);
      }

      return response;
    },
  );

  // ── 4. GET /api/v1/meta — System Metadata ─────────────────────────────────
  server.get(
    '/api/v1/meta',
    {
      schema: {
        description:
          'System metadata including version, uptime, Node.js runtime info, ' +
          'feature flags, and registered engine modules. ' +
          'Used by the frontend for conditional feature rendering.',
        tags: ['System - Meta'],
        response: {
          200: {
            description: 'System metadata',
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              environment: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
              nodeVersion: { type: 'string' },
              featureFlags: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    enabled: { type: 'boolean' },
                    description: { type: 'string' },
                  },
                },
              },
              engines: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      // Feature flags — Phase 2+: Source from database or config service
      const featureFlags = [
        {
          name: 'etl_auto_sync',
          enabled: false,
          description: 'Automatic ETL sync from data sources (Phase 2)',
        },
        {
          name: 'forensic_engine',
          enabled: false,
          description: 'Forensic Engine EVM trace analysis (Phase 3)',
        },
        {
          name: 'skills_ai_recommendations',
          enabled: false,
          description: 'AI-powered skill recommendations (Phase 3)',
        },
        {
          name: 'jwt_authentication',
          enabled: false,
          description: 'JWT-based API authentication (Phase 3)',
        },
      ];

      const response = {
        name: APP_NAME,
        version: API_VERSION,
        environment: process.env['NODE_ENV'] ?? 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        featureFlags,
        engines: [...REGISTERED_ENGINES],
      };

      const parseResult = SystemMetaResponseSchema.safeParse(response);
      if (!parseResult.success) {
        server.log.error(
          { errors: parseResult.error.issues },
          'Meta response schema validation failed',
        );
      }

      return response;
    },
  );

  // ── 5. POST /api/v1/auth/token — Generate API Access Token (Future) ───────
  server.post(
    '/api/v1/auth/token',
    {
      schema: {
        description:
          'Generate a JWT API access token with scoped permissions. ' +
          'NOT YET IMPLEMENTED — will be available in Phase 3 with full JWT authentication.',
        tags: ['System - Auth'],
        body: {
          type: 'object',
          properties: {
            clientId: { type: 'string', minLength: 1 },
            clientSecret: { type: 'string', minLength: 1 },
            scopes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['read', 'write', 'admin', 'etl:sync', 'forensic:analyze'],
              },
              minItems: 1,
              default: ['read'],
            },
          },
          required: ['clientId', 'clientSecret'],
        },
        response: {
          200: {
            description: 'JWT access token (future)',
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              tokenType: { type: 'string' },
              expiresIn: { type: 'integer' },
              expiresAt: { type: 'string', format: 'date-time' },
              scopes: { type: 'array', items: { type: 'string' } },
              issuedAt: { type: 'string', format: 'date-time' },
            },
          },
          400: { description: 'Validation error', type: 'object' },
          401: { description: 'Invalid credentials', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: AuthTokenRequest }>, reply) => {
      // Validate request body with Zod
      const parseResult = AuthTokenRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-010',
          message: 'Invalid token request body',
          details: parseResult.error.issues.map((issue: ZodIssue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      // Phase 3+: Implement JWT token generation
      return notImplemented(request, reply);
    },
  );

  // ── 6. GET /api/v1/rate-limit/status — Current Rate Limit Bucket State ─────
  server.get(
    '/api/v1/rate-limit/status',
    {
      schema: {
        description:
          'Returns the current rate limit bucket state for the requesting client. ' +
          'Useful for monitoring and debugging rate limit behavior. ' +
          'Client is identified by IP address or API key.',
        tags: ['System - Rate Limit'],
        response: {
          200: {
            description: 'Current rate limit status',
            type: 'object',
            properties: {
              limit: { type: 'integer' },
              remaining: { type: 'integer' },
              reset: { type: 'string', format: 'date-time' },
              retryAfterMs: { type: 'integer' },
              windowMs: { type: 'integer' },
              currentUsage: { type: 'integer' },
              clientIdentifier: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, _reply) => {
      // Extract rate limit configuration from Fastify
      const maxRequests = parseInt(process.env['API_RATE_LIMIT_MAX'] ?? '100', 10);
      const windowMs = parseInt(process.env['API_RATE_LIMIT_WINDOW_MS'] ?? '60000', 10);

      // Client identifier (IP-based for now, API key in Phase 3)
      const clientIp = request.ip ?? 'unknown';

      // Phase 2+: Query actual rate-limiter state from Redis
      // For now, return the configured limits with stub usage data
      const windowResetTime = new Date(Math.ceil(Date.now() / windowMs) * windowMs).toISOString();

      const response = {
        limit: maxRequests,
        remaining: maxRequests, // Stub: Phase 2 will query actual remaining
        reset: windowResetTime,
        retryAfterMs: 0,
        windowMs,
        currentUsage: 0, // Stub: Phase 2 will query actual usage from Redis
        clientIdentifier: clientIp,
        timestamp: new Date().toISOString(),
      };

      const parseResult = RateLimitStatusResponseSchema.safeParse(response);
      if (!parseResult.success) {
        server.log.error(
          { errors: parseResult.error.issues },
          'Rate limit status response schema validation failed',
        );
      }

      return response;
    },
  );

  // ── 7. GET / — Root Service Info ───────────────────────────────────────────
  server.get(
    '/',
    {
      schema: {
        description:
          'Root endpoint returning basic service identification ' +
          'and links to documentation and health endpoints.',
        tags: ['System - Meta'],
        response: {
          200: {
            description: 'Service identification',
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string' },
              docs: { type: 'string' },
              health: { type: 'string' },
              meta: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return {
        name: APP_NAME,
        version: API_VERSION,
        description:
          'Backend-for-Frontend API Gateway for the AltFlex AEGIS v3.0 platform. ' +
          'Provides unified access to Hacks Dashboard, AI Skills Explorer, and Forensic Engine.',
        docs: '/documentation',
        health: '/api/v1/health',
        meta: '/api/v1/meta',
      };
    },
  );

  server.log.info(
    '🛡️  System routes registered: 7 endpoints (health, meta, auth, rate-limit, root)',
  );
}
