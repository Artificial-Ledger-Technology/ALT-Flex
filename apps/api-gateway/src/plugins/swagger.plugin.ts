/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Swagger/OpenAPI Plugin
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Configures @fastify/swagger for OpenAPI 3.1 spec generation
 * and @fastify/swagger-ui for interactive API documentation.
 *
 * Documentation is always available at `/documentation` — kept enabled
 * in production for thesis documentation and operational reference.
 *
 * @module plugins/swagger
 * @hexagonal Infrastructure Layer — Documentation Adapter
 * @task P1-ARCH-011
 */

import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * Register Swagger/OpenAPI spec generation and interactive UI.
 *
 * @param server - The Fastify server instance
 */
export async function registerSwagger(server: FastifyInstance): Promise<void> {
  await server.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'AltFlex AEGIS API Gateway',
        version: '3.0.0',
        description:
          'Backend-for-Frontend API Gateway for the AltFlex AEGIS v3.0 platform. ' +
          'Provides unified REST API access to the Hacks Dashboard (Engine α), ' +
          'AI Skills Explorer (Engine β), and Forensic Engine (Engine γ).',
        contact: {
          name: 'AltFlex AEGIS Engineering',
          url: 'https://github.com/Artificial-Ledger-Technology/ALT-Flex',
        },
        license: {
          name: 'MIT',
        },
      },
      tags: [
        { name: 'System - Health', description: 'Health checks and liveness probes' },
        { name: 'System - Meta', description: 'System metadata and feature flags' },
        { name: 'System - Auth', description: 'Authentication and token management' },
        { name: 'System - Rate Limit', description: 'Rate limit status and configuration' },
        { name: 'Hacks - List & Filter', description: 'Browse and search hack incidents' },
        { name: 'Hacks - Statistics', description: 'Aggregate statistics and charts' },
        { name: 'Hacks - Admin', description: 'ETL sync and admin operations' },
        { name: 'Skills - List & Filter', description: 'Browse and search AI skill files' },
        { name: 'Skills - Statistics', description: 'Skill aggregate statistics' },
        { name: 'Skills - Safety', description: 'Safety scan results and labels' },
        { name: 'Skills - Engagement', description: 'Copy and star engagement' },
        { name: 'Skills - Admin', description: 'Safety scan and sync admin operations' },
        { name: 'Forensics - POCs', description: 'Foundry exploit proof-of-concepts' },
        { name: 'Forensics - Simulation', description: 'Foundry simulation execution' },
        { name: 'Forensics - Trace', description: 'EVM transaction tracing' },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}
