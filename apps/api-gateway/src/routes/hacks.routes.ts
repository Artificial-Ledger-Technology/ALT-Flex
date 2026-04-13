/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Hacks Dashboard API Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify route definitions for the Hacks Dashboard (Engine α).
 * All 8 endpoints are registered with Zod schema validation.
 *
 * IMPORTANT: All handlers return 501 Not Implemented.
 * Business logic will be implemented in Phase 2 (ETL Pipelines).
 *
 * @module routes/hacks
 * @hexagonal Infrastructure Layer — Primary Adapter (HTTP)
 * @task P1-ARCH-003
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  HackListQuerySchema,
  HackDetailParamsSchema,
  HackTimelineQuerySchema,
  HackSearchQuerySchema,
  HackSyncRequestSchema,
  type HackListQuery,
  type HackDetailParams,
  type HackTimelineQuery,
  type HackSearchQuery,
  type HackSyncRequest,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const ROUTE_PREFIX = '/api/v1/hacks';

/** Standard 501 response for unimplemented endpoints */
function notImplemented(_request: FastifyRequest, reply: FastifyReply): FastifyReply {
  return reply.status(501).send({
    error: 'NOT_IMPLEMENTED',
    code: 'AEGIS-501-001',
    message: 'This endpoint is not yet implemented. Coming in Phase 2.',
    timestamp: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register all Hacks Dashboard routes on the Fastify instance.
 *
 * Endpoint Summary:
 * ┌─────┬────────┬───────────────────────────────┬──────────────────────────────┐
 * │  #  │ Method │ Path                          │ Description                  │
 * ├─────┼────────┼───────────────────────────────┼──────────────────────────────┤
 * │  1  │ GET    │ /api/v1/hacks                 │ Paginated list + filters     │
 * │  2  │ GET    │ /api/v1/hacks/:id             │ Single incident detail       │
 * │  3  │ GET    │ /api/v1/hacks/stats           │ Aggregate statistics         │
 * │  4  │ GET    │ /api/v1/hacks/stats/timeline  │ Time-series loss data        │
 * │  5  │ GET    │ /api/v1/hacks/vectors         │ Attack vector breakdown      │
 * │  6  │ GET    │ /api/v1/hacks/chains          │ Chain breakdown              │
 * │  7  │ GET    │ /api/v1/hacks/search          │ Full-text protocol search    │
 * │  8  │ POST   │ /api/v1/hacks/sync            │ Trigger ETL sync (admin)     │
 * └─────┴────────┴───────────────────────────────┴──────────────────────────────┘
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function hacksRoutes(server: FastifyInstance): Promise<void> {
  // ── 1. GET /api/v1/hacks — Paginated List with Filters ─────────────────────
  server.get(
    ROUTE_PREFIX,
    {
      schema: {
        description:
          'List hack incidents with pagination, filtering, and sorting. ' +
          'Supports attack vector, chain, date range, loss range, POC availability, and text search filters.',
        tags: ['Hacks - List & Filter'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1, minimum: 1 },
            pageSize: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            sortBy: { type: 'string', enum: ['date', 'lossUsd', 'protocolName'], default: 'date' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            attackVector: { type: 'string' },
            chain: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
            minLossUsd: { type: 'number', minimum: 0 },
            maxLossUsd: { type: 'number', minimum: 0 },
            hasFoundryPoc: { type: 'boolean' },
            search: { type: 'string', minLength: 1, maxLength: 200 },
            dataSource: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Paginated list of hack incidents',
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object' } },
              total: { type: 'integer' },
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
          400: { description: 'Validation error', type: 'object' },
          429: { description: 'Rate limit exceeded', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: HackListQuery }>, reply) => {
      // Validate query params with Zod
      const parseResult = HackListQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-001',
          message: 'Invalid query parameters',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      // Phase 2: Replace with actual ListHacksUseCase invocation
      return notImplemented(request, reply);
    },
  );

  // ── 2. GET /api/v1/hacks/:id — Single Hack Detail ─────────────────────────
  server.get(
    `${ROUTE_PREFIX}/:id`,
    {
      schema: {
        description:
          'Get detailed information about a single hack incident, ' +
          'including computed fields like net loss, recovery rate, and all attack vectors.',
        tags: ['Hacks - List & Filter'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { description: 'Hack incident detail with computed fields', type: 'object' },
          400: { description: 'Invalid UUID format', type: 'object' },
          404: { description: 'Hack incident not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: HackDetailParams }>, reply) => {
      const parseResult = HackDetailParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-002',
          message: 'Invalid hack incident ID',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      return notImplemented(request, reply);
    },
  );

  // ── 3. GET /api/v1/hacks/stats — Aggregate Statistics ─────────────────────
  server.get(
    `${ROUTE_PREFIX}/stats`,
    {
      schema: {
        description:
          'Get aggregate dashboard statistics: total incidents, total loss, ' +
          'recovery rate, POC coverage, unique protocols and chains.',
        tags: ['Hacks - Statistics'],
        response: {
          200: { description: 'Dashboard statistics', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request, reply) => {
      return notImplemented(request, reply);
    },
  );

  // ── 4. GET /api/v1/hacks/stats/timeline — Time-Series Loss Data ───────────
  server.get(
    `${ROUTE_PREFIX}/stats/timeline`,
    {
      schema: {
        description:
          'Get time-series loss data for charts. Supports day, week, month, ' +
          'and year granularity with optional date range filtering.',
        tags: ['Hacks - Statistics'],
        querystring: {
          type: 'object',
          properties: {
            granularity: {
              type: 'string',
              enum: ['day', 'week', 'month', 'year'],
              default: 'month',
            },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
          },
        },
        response: {
          200: { description: 'Time-series loss data points', type: 'object' },
          400: { description: 'Validation error', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: HackTimelineQuery }>, reply) => {
      const parseResult = HackTimelineQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-003',
          message: 'Invalid timeline query parameters',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      return notImplemented(request, reply);
    },
  );

  // ── 5. GET /api/v1/hacks/vectors — Attack Vector Breakdown ─────────────────
  server.get(
    `${ROUTE_PREFIX}/vectors`,
    {
      schema: {
        description:
          'Get attack vector taxonomy with incident counts and total loss per vector. ' +
          'Used for pie charts and breakdown tables.',
        tags: ['Hacks - Statistics'],
        response: {
          200: { description: 'Attack vector statistics', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request, reply) => {
      return notImplemented(request, reply);
    },
  );

  // ── 6. GET /api/v1/hacks/chains — Chain Breakdown ─────────────────────────
  server.get(
    `${ROUTE_PREFIX}/chains`,
    {
      schema: {
        description:
          'Get blockchain chain breakdown with incident counts and total loss per chain. ' +
          'Used for chain distribution charts.',
        tags: ['Hacks - Statistics'],
        response: {
          200: { description: 'Chain statistics', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request, reply) => {
      return notImplemented(request, reply);
    },
  );

  // ── 7. GET /api/v1/hacks/search — Full-Text Protocol Search ───────────────
  server.get(
    `${ROUTE_PREFIX}/search`,
    {
      schema: {
        description:
          'Full-text search across protocol names and descriptions. ' +
          'Returns paginated results sorted by relevance.',
        tags: ['Hacks - List & Filter'],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', minLength: 1, maxLength: 200 },
            page: { type: 'integer', default: 1, minimum: 1 },
            pageSize: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
          required: ['search'],
        },
        response: {
          200: { description: 'Paginated search results', type: 'object' },
          400: { description: 'Validation error (missing search query)', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: HackSearchQuery }>, reply) => {
      const parseResult = HackSearchQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-004',
          message: 'Invalid search parameters',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      return notImplemented(request, reply);
    },
  );

  // ── 8. POST /api/v1/hacks/sync — Trigger ETL Sync (Admin Only) ────────────
  server.post(
    `${ROUTE_PREFIX}/sync`,
    {
      schema: {
        description:
          'Trigger an ETL sync from external data sources (DefiLlama, DeFiHackLabs). ' +
          'Admin-only endpoint — requires API key authentication.',
        tags: ['Hacks - Admin'],
        body: {
          type: 'object',
          properties: {
            source: { type: 'string', enum: ['defillama', 'defihacklabs', 'manual', 'rekt-news'] },
            force: { type: 'boolean', default: false },
          },
        },
        response: {
          202: { description: 'ETL sync job queued', type: 'object' },
          400: { description: 'Validation error', type: 'object' },
          401: { description: 'Missing or invalid API key', type: 'object' },
          409: { description: 'ETL sync already in progress', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: HackSyncRequest }>, reply) => {
      // Admin API key check (Phase 3: replace with proper auth middleware)
      const apiKey = request.headers['x-api-key'] as string | undefined;
      const validKeys = (process.env['API_KEYS'] ?? '').split(',').filter(Boolean);

      if (typeof apiKey !== 'string' || !validKeys.includes(apiKey)) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          code: 'AEGIS-401-001',
          message: 'Missing or invalid API key. Admin access required.',
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = HackSyncRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-005',
          message: 'Invalid sync request body',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      return notImplemented(request, reply);
    },
  );

  server.log.info(`🔗 Hacks routes registered: 8 endpoints under ${ROUTE_PREFIX}`);
}
