/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Forensic Engine API Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify route definitions for the Forensic Engine (Engine γ).
 * All 6 endpoints are registered with Zod schema validation.
 *
 * IMPORTANT: All handlers return 501 Not Implemented.
 * Business logic will be implemented in Phase 5 (Foundry Integration).
 *
 * Key Difference from Hacks/Skills:
 * Endpoints 3–6 use the async job pattern (BullMQ). Simulate and trace
 * operations are long-running and return a jobId for polling.
 *
 * @module routes/forensics
 * @hexagonal Infrastructure Layer — Primary Adapter (HTTP)
 * @task P1-ARCH-005
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  ForensicPocListQuerySchema,
  ForensicPocDetailParamsSchema,
  ForensicSimulateRequestSchema,
  ForensicSimulateJobParamsSchema,
  ForensicTraceRequestSchema,
  ForensicTraceJobParamsSchema,
  type ForensicPocListQuery,
  type ForensicPocDetailParams,
  type ForensicSimulateRequest,
  type ForensicSimulateJobParams,
  type ForensicTraceRequest,
  type ForensicTraceJobParams,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const ROUTE_PREFIX = '/api/v1/forensics';

/** Standard 501 response for unimplemented endpoints */
function notImplemented(
  _request: FastifyRequest,
  reply: FastifyReply,
): ReturnType<typeof reply.send> {
  return reply.status(501).send({
    error: 'NOT_IMPLEMENTED',
    code: 'AEGIS-501-003',
    message: 'This endpoint is not yet implemented. Coming in Phase 5.',
    timestamp: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register all Forensic Engine routes on the Fastify instance.
 *
 * Endpoint Summary:
 * ┌─────┬────────┬────────────────────────────────────────┬────────────────────────────────┐
 * │  #  │ Method │ Path                                   │ Description                    │
 * ├─────┼────────┼────────────────────────────────────────┼────────────────────────────────┤
 * │  1  │ GET    │ /api/v1/forensics/pocs                 │ List available Foundry POCs     │
 * │  2  │ GET    │ /api/v1/forensics/pocs/:id             │ POC detail + Solidity source    │
 * │  3  │ POST   │ /api/v1/forensics/simulate             │ Trigger Foundry simulation      │
 * │  4  │ GET    │ /api/v1/forensics/simulate/:jobId      │ Simulation status & results     │
 * │  5  │ POST   │ /api/v1/forensics/trace                │ Trace tx on a given chain       │
 * │  6  │ GET    │ /api/v1/forensics/trace/:jobId         │ Trace results (call tree, diffs)│
 * └─────┴────────┴────────────────────────────────────────┴────────────────────────────────┘
 */
// eslint-disable-next-line @typescript-eslint/require-await -- Fastify plugin registration requires async; actual awaits added in Phase 5
export async function forensicsRoutes(server: FastifyInstance): Promise<void> {
  // ── 1. GET /api/v1/forensics/pocs — List Available Foundry POCs ──────────
  server.get(
    `${ROUTE_PREFIX}/pocs`,
    {
      schema: {
        description:
          'List available Foundry exploit POCs with pagination, filtering, and sorting. ' +
          'Supports chain, source, complexity, execution status, vulnerability class, and text search filters.',
        tags: ['Forensics - POCs'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1, minimum: 1 },
            pageSize: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            sortBy: {
              type: 'string',
              enum: ['exploitDate', 'estimatedLossUsd', 'protocol', 'complexity'],
              default: 'exploitDate',
            },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            chain: { type: 'string' },
            source: { type: 'string', enum: ['defihacklabs', 'aegis-custom', 'external'] },
            complexity: { type: 'string', enum: ['basic', 'intermediate', 'advanced', 'expert'] },
            executionStatus: {
              type: 'string',
              enum: ['untested', 'passing', 'failing', 'flaky', 'deprecated'],
            },
            vulnerabilityClass: { type: 'string' },
            search: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
        response: {
          200: {
            description: 'Paginated list of Foundry exploit POCs',
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
    async (request: FastifyRequest<{ Querystring: ForensicPocListQuery }>, reply) => {
      // Validate query params with Zod
      const parseResult = ForensicPocListQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-010',
          message: 'Invalid query parameters',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      // Phase 5: Replace with actual ListPOCsUseCase invocation
      return notImplemented(request, reply);
    },
  );

  // ── 2. GET /api/v1/forensics/pocs/:id — POC Detail with Solidity Source ──
  server.get(
    `${ROUTE_PREFIX}/pocs/:id`,
    {
      schema: {
        description:
          'Get detailed information about a single exploit POC, including Solidity source path, ' +
          'fork parameters, target contracts, and computed fields (forge command, GitHub URL, executable status).',
        tags: ['Forensics - POCs'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'POC detail with computed fields and Solidity source',
            type: 'object',
          },
          400: { description: 'Invalid UUID format', type: 'object' },
          404: { description: 'POC not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: ForensicPocDetailParams }>, reply) => {
      const parseResult = ForensicPocDetailParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-011',
          message: 'Invalid POC ID',
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

  // ── 3. POST /api/v1/forensics/simulate — Trigger Foundry Simulation ──────
  server.post(
    `${ROUTE_PREFIX}/simulate`,
    {
      schema: {
        description:
          'Trigger a Foundry simulation of an exploit POC. Runs `forge test` against a mainnet fork ' +
          'at the configured block number. Returns a job ID for polling simulation status and results. ' +
          'Admin-only endpoint — requires API key authentication.',
        tags: ['Forensics - Simulation'],
        body: {
          type: 'object',
          properties: {
            pocId: { type: 'string', format: 'uuid' },
            overrides: {
              type: 'object',
              properties: {
                rpcUrlEnvVar: { type: 'string' },
                forkBlockNumber: { type: 'integer', minimum: 0 },
                gasLimit: { type: 'integer', minimum: 0 },
                blockTimestamp: { type: 'integer', minimum: 0 },
                additionalFlags: { type: 'array', items: { type: 'string' } },
                verbosity: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
              },
            },
          },
          required: ['pocId'],
        },
        response: {
          202: { description: 'Simulation job queued', type: 'object' },
          400: { description: 'Validation error', type: 'object' },
          401: { description: 'Missing or invalid API key', type: 'object' },
          404: { description: 'POC not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ForensicSimulateRequest }>, reply) => {
      // Admin API key check (Phase 5: replace with proper auth middleware)
      const apiKey = request.headers['x-api-key'] as string | undefined;
      const validKeys = (process.env['API_KEYS'] ?? '').split(',').filter(Boolean);

      if (apiKey === undefined || apiKey === '' || !validKeys.includes(apiKey)) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          code: 'AEGIS-401-002',
          message: 'Missing or invalid API key. Admin access required for simulations.',
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = ForensicSimulateRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-012',
          message: 'Invalid simulation request body',
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

  // ── 4. GET /api/v1/forensics/simulate/:jobId — Simulation Status ─────────
  server.get(
    `${ROUTE_PREFIX}/simulate/:jobId`,
    {
      schema: {
        description:
          'Get the status and results of a Foundry simulation job. Poll this endpoint ' +
          'after triggering a simulation. When status is "completed", the result field ' +
          'contains execution output, gas metrics, assertions, and trace logs.',
        tags: ['Forensics - Simulation'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string', minLength: 1 },
          },
          required: ['jobId'],
        },
        response: {
          200: {
            description: 'Simulation job status with optional result/error/progress',
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: {
                type: 'string',
                enum: ['queued', 'active', 'completed', 'failed', 'cancelled'],
              },
              result: { type: 'object', nullable: true },
              error: { type: 'object', nullable: true },
              progress: { type: 'object', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          400: { description: 'Invalid job ID', type: 'object' },
          404: { description: 'Job not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: ForensicSimulateJobParams }>, reply) => {
      const parseResult = ForensicSimulateJobParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-013',
          message: 'Invalid simulation job ID',
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

  // ── 5. POST /api/v1/forensics/trace — Trace a Transaction ────────────────
  server.post(
    `${ROUTE_PREFIX}/trace`,
    {
      schema: {
        description:
          'Trace a transaction on a given chain using debug_traceTransaction (EVM) or equivalent. ' +
          'Reconstructs the complete call tree, storage diffs, and decoded event logs. ' +
          'Returns a job ID for polling trace results. ' +
          'Admin-only endpoint — requires API key authentication.',
        tags: ['Forensics - Trace'],
        body: {
          type: 'object',
          properties: {
            txHash: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
            chain: { type: 'string' },
            includeStorageDiffs: { type: 'boolean', default: true },
            includeDecodedLogs: { type: 'boolean', default: true },
            maxDepth: { type: 'integer', minimum: 1 },
          },
          required: ['txHash', 'chain'],
        },
        response: {
          202: { description: 'Trace job queued', type: 'object' },
          400: { description: 'Validation error', type: 'object' },
          401: { description: 'Missing or invalid API key', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ForensicTraceRequest }>, reply) => {
      // Admin API key check (Phase 5: replace with proper auth middleware)
      const apiKey = request.headers['x-api-key'] as string | undefined;
      const validKeys = (process.env['API_KEYS'] ?? '').split(',').filter(Boolean);

      if (apiKey === undefined || apiKey === '' || !validKeys.includes(apiKey)) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          code: 'AEGIS-401-003',
          message: 'Missing or invalid API key. Admin access required for trace operations.',
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = ForensicTraceRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-014',
          message: 'Invalid trace request body',
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

  // ── 6. GET /api/v1/forensics/trace/:jobId — Trace Results ────────────────
  server.get(
    `${ROUTE_PREFIX}/trace/:jobId`,
    {
      schema: {
        description:
          'Get the status and results of a transaction trace job. Poll this endpoint ' +
          'after triggering a trace. When status is "completed", the result field ' +
          'contains the full call tree, storage diffs, decoded events, and tx metadata.',
        tags: ['Forensics - Trace'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string', minLength: 1 },
          },
          required: ['jobId'],
        },
        response: {
          200: {
            description: 'Trace job status with optional result/error/progress',
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: {
                type: 'string',
                enum: ['queued', 'active', 'completed', 'failed', 'cancelled'],
              },
              result: { type: 'object', nullable: true },
              error: { type: 'object', nullable: true },
              progress: { type: 'object', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          400: { description: 'Invalid job ID', type: 'object' },
          404: { description: 'Job not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: ForensicTraceJobParams }>, reply) => {
      const parseResult = ForensicTraceJobParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-015',
          message: 'Invalid trace job ID',
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

  server.log.info(`🔗 Forensics routes registered: 6 endpoints under ${ROUTE_PREFIX}`);
}
