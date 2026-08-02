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

import type { FastifyInstance, FastifyRequest } from 'fastify';
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
  type HackFilters,
  createQueueConnection,
  QUEUE_NAMES,
} from '@aegis/core';
import { Queue } from 'bullmq';
import { PostgresHackRepository } from '@aegis/hacks-engine';
import { PostgresForensicReportRepository } from '@aegis/forensic-engine';
import { requireApiKey } from '../middleware/api-key.middleware.js';

const dbUrl = process.env['DATABASE_URL'] ?? 'postgresql://aegis:changeme@localhost:5432/aegis_dev';
const hackRepo = new PostgresHackRepository({ connectionString: dbUrl });
const reportRepo = new PostgresForensicReportRepository(dbUrl);

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const ROUTE_PREFIX = '/api/v1/hacks';

// (notImplemented helper removed since all endpoints are fully wired)

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
  const connection = createQueueConnection();
  const hacksSyncQueue = new Queue(QUEUE_NAMES.HACKS_SYNC, { connection });
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
            attackVector: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ]
            },
            chain: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ]
            },
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
            additionalProperties: true,
            properties: {
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
              total: { type: 'integer' },
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
          400: { description: 'Validation error', type: 'object', additionalProperties: true },
          429: { description: 'Rate limit exceeded', type: 'object', additionalProperties: true },
          501: { description: 'Not implemented', type: 'object', additionalProperties: true },
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

      // Phase 2: Invoke repository to fetch data
      try {
        const filters = parseResult.data as unknown as HackFilters;
        const result = await hackRepo.findAll(filters);
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch hacks data',
          timestamp: new Date().toISOString(),
        });
      }
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
          200: {
            description: 'Hack incident detail with computed fields',
            type: 'object',
            additionalProperties: true,
          },
          400: { description: 'Invalid UUID format', type: 'object', additionalProperties: true },
          404: {
            description: 'Hack incident not found',
            type: 'object',
            additionalProperties: true,
          },
          501: { description: 'Not implemented', type: 'object', additionalProperties: true },
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

      try {
        const { id } = parseResult.data;
        const incident = await hackRepo.findById(id);

        if (!incident) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            code: 'AEGIS-404-001',
            message: `Hack incident with ID ${id} not found`,
            timestamp: new Date().toISOString(),
          });
        }

        return reply.status(200).send(incident);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch hack incident details',
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // ── 2b. GET /api/v1/hacks/:id/forensics — Hack Incident Forensics ─────────
  server.get(
    `${ROUTE_PREFIX}/:id/forensics`,
    {
      schema: {
        description: 'Get all forensic reports associated with a specific hack incident',
        tags: ['Hacks - List & Filter', 'Forensics - Reports'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'List of forensic reports',
            type: 'array',
            items: { type: 'object', additionalProperties: true },
          },
          400: { description: 'Invalid UUID format', type: 'object', additionalProperties: true },
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
        });
      }

      try {
        const { id } = parseResult.data;
        const reports = await reportRepo.findByHackIncidentId(id);
        return reply.status(200).send(reports);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch forensic reports for hack incident',
        });
      }
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
          200: { description: 'Dashboard statistics', type: 'object', additionalProperties: true },
          500: { description: 'Internal server error', type: 'object', additionalProperties: true },
          501: { description: 'Not implemented', type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      try {
        const stats = await hackRepo.getDashboardStats();
        return reply.status(200).send(stats);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch dashboard statistics',
          timestamp: new Date().toISOString(),
        });
      }
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
          200: {
            description: 'Time-series loss data points',
            type: 'object',
            additionalProperties: true,
          },
          400: { description: 'Validation error', type: 'object', additionalProperties: true },
          501: { description: 'Not implemented', type: 'object', additionalProperties: true },
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

      try {
        const { granularity } = parseResult.data;
        const timeline = await hackRepo.getLossTimeSeries(granularity ?? 'month');
        return reply.status(200).send({ timeline });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch timeline statistics',
          timestamp: new Date().toISOString(),
        });
      }
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
          200: {
            description: 'Attack vector statistics',
            type: 'object',
            additionalProperties: true,
          },
          500: { description: 'Internal server error', type: 'object', additionalProperties: true },
          501: { description: 'Not implemented', type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      try {
        const vectors = await hackRepo.getAttackVectorStats();
        return reply.status(200).send({ vectors });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch attack vector statistics',
          timestamp: new Date().toISOString(),
        });
      }
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
          200: { description: 'Chain statistics', type: 'object', additionalProperties: true },
          500: { description: 'Internal server error', type: 'object', additionalProperties: true },
          501: { description: 'Not implemented', type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      try {
        const chains = await hackRepo.getChainStats();
        return reply.status(200).send({ chains });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch chain statistics',
          timestamp: new Date().toISOString(),
        });
      }
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
          200: {
            description: 'Paginated search results',
            type: 'object',
            additionalProperties: true,
          },
          400: {
            description: 'Validation error (missing search query)',
            type: 'object',
            additionalProperties: true,
          },
          500: { description: 'Internal server error', type: 'object', additionalProperties: true },
          501: { description: 'Not implemented', type: 'object', additionalProperties: true },
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

      try {
        const { search } = parseResult.data;
        const results = await hackRepo.findByProtocol(search);
        return reply.status(200).send({ results });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to search hacks',
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // ── 8. POST /api/v1/hacks/sync — Trigger ETL Sync (Admin Only) ────────────
  server.post(
    `${ROUTE_PREFIX}/sync`,
    {
      preHandler: [requireApiKey],
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
          202: { description: 'ETL sync job queued', type: 'object', additionalProperties: true },
          400: { description: 'Validation error', type: 'object', additionalProperties: true },
          401: {
            description: 'Missing or invalid API key',
            type: 'object',
            additionalProperties: true,
          },
          409: {
            description: 'ETL sync already in progress',
            type: 'object',
            additionalProperties: true,
          },
          501: { description: 'Not implemented', type: 'object', additionalProperties: true },
        },
      },
    },
    async (request: FastifyRequest<{ Body: HackSyncRequest }>, reply) => {
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

      // Check if job already in progress
      const activeCount = await hacksSyncQueue.getJobCounts('active', 'waiting', 'delayed');
      const inProgress =
        (activeCount.active ?? 0) + (activeCount.waiting ?? 0) + (activeCount.delayed ?? 0);
      if (inProgress > 0) {
        return reply.status(409).send({
          error: 'CONFLICT',
          code: 'ETL_SYNC_IN_PROGRESS',
          message: 'Hacks sync job already in progress',
          timestamp: new Date().toISOString(),
        });
      }

      // Enqueue job
      const force = parseResult.data.force ?? false;
      const job = await hacksSyncQueue.add('sync', { force });

      return reply.status(202).send({
        jobId: job.id,
        status: 'queued',
        message: 'Hacks sync job queued successfully',
        timestamp: new Date().toISOString(),
      });
    },
  );

  server.log.info(`🔗 Hacks routes registered: 8 endpoints under ${ROUTE_PREFIX}`);
}
