/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — AI Skills Explorer API Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify route definitions for the AI Skills Explorer (Engine β).
 * All 11 endpoints are registered with Zod schema validation.
 *
 * IMPORTANT: All handlers return 501 Not Implemented.
 * Business logic will be implemented in Phase 2 (ETL Pipelines).
 *
 * @module routes/skills
 * @hexagonal Infrastructure Layer — Primary Adapter (HTTP)
 * @task P1-ARCH-004
 */

import {
  SkillContentParamsSchema,
  SkillCopyParamsSchema,
  SkillDetailParamsSchema,
  SkillListQuerySchema,
  SkillSafetyParamsSchema,
  SkillScanRequestSchema,
  SkillStarParamsSchema,
  SkillSyncRequestSchema,
  type SkillContentParams,
  type SkillCopyParams,
  type SkillDetailParams,
  type SkillListQuery,
  type SkillSafetyParams,
  type SkillScanRequest,
  type SkillStarParams,
  type SkillSyncRequest,
  createQueueConnection,
  QUEUE_NAMES,
} from '@aegis/core';
import { Queue } from 'bullmq';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireApiKey } from '../middleware/api-key.middleware.js';
import { PostgresSkillRepository, PostgresScanResultRepository } from '@aegis/skills-engine';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const ROUTE_PREFIX = '/api/v1/skills';

/** Standard 501 response for unimplemented endpoints */
function notImplemented(_request: FastifyRequest, reply: FastifyReply): FastifyReply {
  return reply.status(501).send({
    error: 'NOT_IMPLEMENTED',
    code: 'AEGIS-501-002',
    message: 'This endpoint is not yet implemented. Coming in Phase 2.',
    timestamp: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register all AI Skills Explorer routes on the Fastify instance.
 *
 * Endpoint Summary:
 * ┌─────┬────────┬─────────────────────────────────┬──────────────────────────────────────┐
 * │  #  │ Method │ Path                            │ Description                          │
 * ├─────┼────────┼─────────────────────────────────┼──────────────────────────────────────┤
 * │  1  │ GET    │ /api/v1/skills                  │ Paginated list + filters             │
 * │  2  │ GET    │ /api/v1/skills/stats            │ Aggregate statistics                 │
 * │  3  │ GET    │ /api/v1/skills/platforms        │ Platform breakdown                   │
 * │  4  │ GET    │ /api/v1/skills/languages        │ Language breakdown                   │
 * │  5  │ POST   │ /api/v1/skills/scan             │ Trigger safety scan (admin)          │
 * │  6  │ POST   │ /api/v1/skills/sync             │ Trigger GitHub scraper sync (admin)  │
 * │  7  │ GET    │ /api/v1/skills/:id              │ Single skill detail                  │
 * │  8  │ GET    │ /api/v1/skills/:id/content      │ Raw skill content for copy           │
 * │  9  │ GET    │ /api/v1/skills/:id/safety       │ Safety scan results                  │
 * │ 10  │ POST   │ /api/v1/skills/:id/copy         │ Increment copy count                 │
 * │ 11  │ POST   │ /api/v1/skills/:id/star         │ Increment star count                 │
 * └─────┴────────┴─────────────────────────────────┴──────────────────────────────────────┘
 *
 * NOTE: Static routes (/stats, /platforms, /languages, /scan, /sync) are registered
 * BEFORE parametric routes (/:id) to avoid Fastify path conflict.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function skillsRoutes(server: FastifyInstance): Promise<void> {
  const connection = createQueueConnection();
  const skillsIndexQueue = new Queue(QUEUE_NAMES.SKILLS_INDEX, { connection });
  const safetyScanQueue = new Queue(QUEUE_NAMES.SAFETY_SCAN, { connection });
  
  const dbUrl = process.env['DATABASE_URL'] ?? 'postgresql://aegis:changeme@localhost:5432/aegis_dev';
  const skillRepo = new PostgresSkillRepository({ connectionString: dbUrl });
  const scanRepo = new PostgresScanResultRepository({ connectionString: dbUrl });
  // ── 1. GET /api/v1/skills — Paginated List with Filters ────────────────────
  server.get(
    ROUTE_PREFIX,
    {
      schema: {
        description:
          'List AI skill files with pagination, filtering, and sorting. ' +
          'Supports platform, language, safety label, author, format, category, and text search filters.',
        tags: ['Skills - List & Filter'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1, minimum: 1 },
            pageSize: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            sortBy: {
              type: 'string',
              enum: ['name', 'copyCount', 'starCount', 'createdAt'],
              default: 'createdAt',
            },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            platform: {
              type: 'string',
              enum: ['claude', 'cursor', 'mcp', 'copilot', 'gemini', 'windsurf', 'generic'],
            },
            language: {
              type: 'string',
              enum: ['solidity', 'vyper', 'rust', 'move', 'cairo', 'multi'],
            },
            safetyLabel: {
              type: 'string',
              enum: ['safe', 'unanalyzed', 'suspicious', 'malicious'],
            },
            author: { type: 'string', minLength: 1, maxLength: 100 },
            format: { type: 'string', enum: ['yaml', 'markdown', 'json', 'toml', 'text'] },
            category: { type: 'string' },
            search: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
        response: {
          200: {
            description: 'Paginated list of AI skill files',
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
    async (request: FastifyRequest<{ Querystring: SkillListQuery }>, reply) => {
      // Validate query params with Zod
      const parseResult = SkillListQuerySchema.safeParse(request.query);
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

      const result = await skillRepo.findAll(parseResult.data as any);
      return reply.status(200).send({
        data: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      });
    },
  );

  // ── 2. GET /api/v1/skills/stats — Aggregate Statistics ────────────────────
  server.get(
    `${ROUTE_PREFIX}/stats`,
    {
      schema: {
        description:
          'Get aggregate Skills Explorer statistics: total skills, repositories, ' +
          'authors, safety distribution, copies, and stars.',
        tags: ['Skills - Statistics'],
        response: {
          200: { description: 'Skills Explorer dashboard statistics', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request, reply) => {
      const stats = await skillRepo.getDashboardStats();
      return reply.status(200).send(stats);
    },
  );

  // ── 3. GET /api/v1/skills/platforms — Platform Breakdown ──────────────────
  server.get(
    `${ROUTE_PREFIX}/platforms`,
    {
      schema: {
        description:
          'Get AI platform distribution with skill counts and safety label breakdown per platform. ' +
          'Used for platform distribution charts and filter options.',
        tags: ['Skills - Statistics'],
        response: {
          200: { description: 'Platform statistics with safety breakdown', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request, reply) => {
      return notImplemented(request, reply);
    },
  );

  // ── 4. GET /api/v1/skills/languages — Language Breakdown ──────────────────
  server.get(
    `${ROUTE_PREFIX}/languages`,
    {
      schema: {
        description:
          'Get smart contract language distribution with skill counts. ' +
          'Used for language filter options and distribution charts.',
        tags: ['Skills - Statistics'],
        response: {
          200: { description: 'Language statistics', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request, reply) => {
      return notImplemented(request, reply);
    },
  );

  // ── 5. POST /api/v1/skills/scan — Trigger Safety Scan (Admin Only) ───────
  server.post(
    `${ROUTE_PREFIX}/scan`,
    {
      schema: {
        description:
          'Trigger a safety scan for a specific AI skill file using the AEGIS Safety Scanner. ' +
          'Admin-only endpoint — requires API key authentication. Returns an async job ID.',
        tags: ['Skills - Admin'],
        body: {
          type: 'object',
          properties: {
            skillId: { type: 'string', format: 'uuid' },
            skillIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            all: { type: 'boolean' },
            force: { type: 'boolean', default: false },
          },
        },
        response: {
          202: { description: 'Safety scan job queued', type: 'object' },
          400: { description: 'Validation error', type: 'object' },
          401: { description: 'Missing or invalid API key', type: 'object' },
          404: { description: 'Skill file not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SkillScanRequest }>, reply) => {
      // Admin API key check (Phase 3: replace with proper auth middleware)
      const apiKey = request.headers['x-api-key'] as string | undefined;
      const validKeys = (process.env['API_KEYS'] ?? '').split(',').filter(Boolean);

      if (typeof apiKey !== 'string' || !validKeys.includes(apiKey)) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          code: 'AEGIS-401-002',
          message: 'Missing or invalid API key. Admin access required.',
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = SkillScanRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-011',
          message: 'Invalid scan request body',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      const { skillId, skillIds, all, force } = parseResult.data;
      let targetSkills: any[] = [];

      if (all) {
        const res = await skillRepo.findAll({ page: 1, pageSize: 10000, sortBy: 'createdAt', sortOrder: 'desc' } as any);
        targetSkills = [...res.data];
      } else if (skillIds && skillIds.length > 0) {
        const skills = await Promise.all(skillIds.map(id => skillRepo.findById(id)));
        targetSkills = skills.filter(s => s !== null);
      } else if (skillId) {
        const s = await skillRepo.findById(skillId);
        if (s) targetSkills.push(s);
      }

      if (targetSkills.length === 0) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          code: 'AEGIS-404-002',
          message: 'Skill file(s) not found',
          timestamp: new Date().toISOString(),
        });
      }

      const jobs = targetSkills.map(skill => ({
        name: 'scan',
        data: {
          skillId: skill.id,
          contentHash: skill.contentHash,
          force
        }
      }));

      await safetyScanQueue.addBulk(jobs);

      return reply.status(202).send({
        jobId: targetSkills.length === 1 && skillId ? skillId : 'batch',
        status: 'queued',
        message: `Safety scan job(s) queued successfully for ${targetSkills.length} skill(s)`,
        timestamp: new Date().toISOString(),
        skillId: targetSkills.length === 1 && skillId ? skillId : undefined,
        force: force ?? false
      });
    },
  );

  // ── 6. POST /api/v1/skills/sync — Trigger GitHub Scraper Sync (Admin) ────
  server.post(
    `${ROUTE_PREFIX}/sync`,
    {
      preHandler: [requireApiKey],
      schema: {
        description:
          'Trigger a GitHub scraper sync to index new AI skill files from configured repositories. ' +
          'Admin-only endpoint — requires API key authentication. Returns an async job ID.',
        tags: ['Skills - Admin'],
        body: {
          type: 'object',
          properties: {
            force: { type: 'boolean', default: false },
            repositories: {
              type: 'array',
              items: { type: 'string', pattern: '^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$' },
            },
          },
        },
        response: {
          202: { description: 'GitHub sync job queued', type: 'object' },
          400: { description: 'Validation error', type: 'object' },
          401: { description: 'Missing or invalid API key', type: 'object' },
          409: { description: 'Sync already in progress', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SkillSyncRequest }>, reply) => {
      const parseResult = SkillSyncRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-012',
          message: 'Invalid sync request body',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      // Check if job already in progress
      const activeCount = await skillsIndexQueue.getJobCounts('active', 'waiting', 'delayed');
      const inProgress =
        (activeCount.active ?? 0) + (activeCount.waiting ?? 0) + (activeCount.delayed ?? 0);
      if (inProgress > 0) {
        return reply.status(409).send({
          error: 'CONFLICT',
          code: 'ETL_SYNC_IN_PROGRESS',
          message: 'Skills sync job already in progress',
          timestamp: new Date().toISOString(),
        });
      }

      // Enqueue job
      const force = parseResult.data.force ?? false;
      const job = await skillsIndexQueue.add('sync', { force });

      return reply.status(202).send({
        jobId: job.id,
        status: 'queued',
        message: 'Skills sync job queued successfully',
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── 7. GET /api/v1/skills/:id — Single Skill Detail ──────────────────────
  server.get(
    `${ROUTE_PREFIX}/:id`,
    {
      schema: {
        description:
          'Get detailed information about a single AI skill file, ' +
          'including raw content, safety label, engagement metrics, and computed fields.',
        tags: ['Skills - List & Filter'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { description: 'Skill file detail with computed fields', type: 'object' },
          400: { description: 'Invalid UUID format', type: 'object' },
          404: { description: 'Skill file not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: SkillDetailParams }>, reply) => {
      const parseResult = SkillDetailParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-013',
          message: 'Invalid skill file ID',
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

  // ── 8. GET /api/v1/skills/:id/content — Raw Skill Content for Copy ───────
  server.get(
    `${ROUTE_PREFIX}/:id/content`,
    {
      schema: {
        description:
          'Get the raw content of a skill file for one-click copy functionality. ' +
          'Returns the content, format (for syntax highlighting), and metadata.',
        tags: ['Skills - List & Filter'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { description: 'Raw skill file content with metadata', type: 'object' },
          400: { description: 'Invalid UUID format', type: 'object' },
          404: { description: 'Skill file not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: SkillContentParams }>, reply) => {
      const parseResult = SkillContentParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-014',
          message: 'Invalid skill file ID',
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

  // ── 9. GET /api/v1/skills/:id/safety — Safety Scan Results ───────────────
  server.get(
    `${ROUTE_PREFIX}/:id/safety`,
    {
      schema: {
        description:
          'Get safety scan results for a specific skill file, including the current ' +
          'safety label, latest scan summary, and full scan history.',
        tags: ['Skills - Safety'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { description: 'Safety scan results with history', type: 'object' },
          400: { description: 'Invalid UUID format', type: 'object' },
          404: { description: 'Skill file not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: SkillSafetyParams }>, reply) => {
      const parseResult = SkillSafetyParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-015',
          message: 'Invalid skill file ID',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      const skillId = parseResult.data.id;
      const [skill, latestScan, scanHistory] = await Promise.all([
        skillRepo.findById(skillId),
        scanRepo.getLatestResult(skillId),
        scanRepo.getSkillSafetyHistory(skillId)
      ]);

      if (!skill) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          code: 'AEGIS-404-002',
          message: 'Skill file not found',
          timestamp: new Date().toISOString(),
        });
      }

      return reply.status(200).send({
        skillId: skill.id,
        currentLabel: skill.safetyLabel,
        hasBeenScanned: latestScan !== null,
        latestScan: latestScan ?? undefined,
        scanHistory,
        totalScans: scanHistory.length
      });
    },
  );

  // ── 10. POST /api/v1/skills/:id/copy — Increment Copy Count ──────────────
  server.post(
    `${ROUTE_PREFIX}/:id/copy`,
    {
      schema: {
        description:
          'Increment the copy count for a skill file. Called when a user copies ' +
          'the skill content via the one-click copy button.',
        tags: ['Skills - Engagement'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { description: 'Updated copy count', type: 'object' },
          400: { description: 'Invalid UUID format', type: 'object' },
          404: { description: 'Skill file not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: SkillCopyParams }>, reply) => {
      const parseResult = SkillCopyParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-016',
          message: 'Invalid skill file ID',
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

  // ── 11. POST /api/v1/skills/:id/star — Increment Star Count ──────────────
  server.post(
    `${ROUTE_PREFIX}/:id/star`,
    {
      schema: {
        description:
          'Increment the star count for a skill file. Called when a user stars ' +
          'the skill via the star button.',
        tags: ['Skills - Engagement'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { description: 'Updated star count', type: 'object' },
          400: { description: 'Invalid UUID format', type: 'object' },
          404: { description: 'Skill file not found', type: 'object' },
          501: { description: 'Not implemented', type: 'object' },
        },
      },
    },
    async (request: FastifyRequest<{ Params: SkillStarParams }>, reply) => {
      const parseResult = SkillStarParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          code: 'AEGIS-400-017',
          message: 'Invalid skill file ID',
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

  server.log.info(`🔗 Skills routes registered: 11 endpoints under ${ROUTE_PREFIX}`);
}
