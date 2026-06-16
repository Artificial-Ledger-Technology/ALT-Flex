import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PostgresScanResultRepository } from '@aegis/skills-engine';
import { type SafetyTimelineQueryParams } from '@aegis/core';
import { requireApiKey } from '../middleware/api-key.middleware.js';

// eslint-disable-next-line @typescript-eslint/require-await
export async function safetyRoutes(server: FastifyInstance): Promise<void> {
  const scanRepo = new PostgresScanResultRepository({
    connectionString:
      process.env['DATABASE_URL'] ?? 'postgres://aegis:devpassword@localhost:5432/aegis_dev',
  });

  server.get(
    '/stats',
    {
      preHandler: [requireApiKey],
      schema: {
        description: 'Get high-level safety scanning statistics',
        tags: ['Safety Analytics'],
        response: {
          200: { type: 'object', additionalProperties: true },
          500: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stats = await scanRepo.getSafetyStats();
      return reply.status(200).send(stats);
    },
  );

  server.get(
    '/rules',
    {
      preHandler: [requireApiKey],
      schema: {
        description: 'Get performance statistics for individual safety rules',
        tags: ['Safety Analytics'],
        response: {
          200: { type: 'object', additionalProperties: true },
          500: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rules = await scanRepo.getRuleHitStats();
      return reply.status(200).send({ data: rules });
    },
  );

  server.get(
    '/timeline',
    {
      preHandler: [requireApiKey],
      schema: {
        description: 'Get time-series data of safety scan results',
        tags: ['Safety Analytics'],
        querystring: {
          type: 'object',
          properties: {
            interval: { type: 'string', enum: ['day', 'week', 'month'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', additionalProperties: true },
          500: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: SafetyTimelineQueryParams }>,
      reply: FastifyReply,
    ) => {
      const { interval, startDate, endDate } = request.query;
      const timeline = await scanRepo.getScanTimeline(interval, startDate, endDate);
      return reply.status(200).send({ data: timeline });
    },
  );

  server.get(
    '/findings/top',
    {
      preHandler: [requireApiKey],
      schema: {
        description: 'Get the most frequently triggered safety rules',
        tags: ['Safety Analytics'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 50 },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', additionalProperties: true },
          500: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
      const { limit } = request.query;
      const top = await scanRepo.getTopFindings(limit ?? 10);
      return reply.status(200).send({ data: top });
    },
  );
}
