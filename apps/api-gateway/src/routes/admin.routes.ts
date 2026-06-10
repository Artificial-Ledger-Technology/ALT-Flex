/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Admin Job Queue Dashboard Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify route definitions for the Admin Job Queue Dashboard.
 * Provides read-only queue status endpoints for monitoring ETL jobs.
 *
 * Endpoints:
 *  - GET  /api/v1/admin/jobs       — Aggregate queue statistics for all 3 queues
 *  - GET  /api/v1/admin/jobs/:jobId — Individual job status by ID
 *
 * All endpoints are protected by API key authentication.
 *
 * @module routes/admin
 * @hexagonal Infrastructure Layer — Primary Adapter (HTTP)
 * @task P2-ETL-006
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Queue } from 'bullmq';
import { createQueueConnection, QUEUE_NAMES, type QueueStatus } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const ROUTE_PREFIX = '/api/v1/admin';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

import { requireApiKey } from '../middleware/api-key.middleware.js';

/**
 * Get job counts for a single queue.
 */
async function getQueueStatus(queue: Queue): Promise<QueueStatus> {
  const counts = await queue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed');

  return {
    name: queue.name,
    active: counts.active ?? 0,
    waiting: counts.waiting ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    delayed: counts.delayed ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route Registration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register admin job queue dashboard routes.
 *
 * Endpoint Summary:
 * ┌─────┬────────┬────────────────────────────────┬──────────────────────────────┐
 * │  #  │ Method │ Path                           │ Description                  │
 * ├─────┼────────┼────────────────────────────────┼──────────────────────────────┤
 * │  1  │ GET    │ /api/v1/admin/jobs              │ All queue statistics          │
 * │  2  │ GET    │ /api/v1/admin/jobs/:jobId       │ Single job status             │
 * └─────┴────────┴────────────────────────────────┴──────────────────────────────┘
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function adminRoutes(server: FastifyInstance): Promise<void> {
  // Create read-only queue connections for status queries
  const connection = createQueueConnection();

  const queues = [
    new Queue(QUEUE_NAMES.HACKS_SYNC, { connection }),
    new Queue(QUEUE_NAMES.SKILLS_INDEX, { connection }),
    new Queue(QUEUE_NAMES.SAFETY_SCAN, { connection }),
  ];

  // ── 1. GET /api/v1/admin/jobs — Queue Statistics ──────────────────────────
  server.get(
    `${ROUTE_PREFIX}/jobs`,
    {
      preHandler: [requireApiKey],
      schema: {
        description:
          'Get aggregate job queue statistics for all ETL queues. ' +
          'Shows active, waiting, completed, failed, and delayed counts.',
        tags: ['Admin - Job Queue'],
        response: {
          200: {
            description: 'Queue statistics for all 3 queues',
            type: 'object',
            additionalProperties: true,
            properties: {
              queues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    active: { type: 'integer' },
                    waiting: { type: 'integer' },
                    completed: { type: 'integer' },
                    failed: { type: 'integer' },
                    delayed: { type: 'integer' },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
          401: {
            description: 'Missing or invalid API key',
            type: 'object',
            additionalProperties: true,
          },
          500: { description: 'Internal server error', type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      try {
        const statuses = await Promise.all(queues.map((q) => getQueueStatus(q)));

        return reply.status(200).send({
          queues: statuses,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch queue statistics',
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // ── 2. GET /api/v1/admin/jobs/:jobId — Job Status ────────────────────────
  server.get(
    `${ROUTE_PREFIX}/jobs/:jobId`,
    {
      preHandler: [requireApiKey],
      schema: {
        description: 'Get the status of a specific job by ID. Searches across all queues.',
        tags: ['Admin - Job Queue'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
        },
        response: {
          200: {
            description: 'Job details and status',
            type: 'object',
            additionalProperties: true,
          },
          401: {
            description: 'Missing or invalid API key',
            type: 'object',
            additionalProperties: true,
          },
          404: { description: 'Job not found', type: 'object', additionalProperties: true },
          500: { description: 'Internal server error', type: 'object', additionalProperties: true },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply) => {
      const { jobId } = request.params;

      try {
        // Search across all queues for the job
        for (const queue of queues) {
          const job = await queue.getJob(jobId);
          if (job) {
            const state = await job.getState();
            return reply.status(200).send({
              id: job.id,
              name: job.name,
              queue: queue.name,
              state,
              data: job.data as unknown,
              progress: job.progress,
              attemptsMade: job.attemptsMade,
              processedOn: job.processedOn ?? null,
              finishedOn: job.finishedOn ?? null,
              failedReason: job.failedReason ?? null,
              returnvalue: (job.returnvalue as unknown) ?? null,
              timestamp: new Date().toISOString(),
            });
          }
        }

        return reply.status(404).send({
          error: 'NOT_FOUND',
          code: 'AEGIS-404-002',
          message: `Job with ID '${jobId}' not found in any queue`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch job status',
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  server.log.info(`🔗 Admin routes registered: 2 endpoints under ${ROUTE_PREFIX}/jobs`);
}
