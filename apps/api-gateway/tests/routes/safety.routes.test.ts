import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestServer } from '../test-utils/build-test-server.js';
import { safetyRoutes } from '../../src/routes/safety.routes.js';

vi.mock('@aegis/skills-engine', () => {
  return {
    PostgresScanResultRepository: vi.fn().mockImplementation(() => {
      return {
        getSafetyStats: vi.fn().mockResolvedValue({
          totalScans: 100,
          averageScore: 85.5,
          labelDistribution: { safe: 80, suspicious: 15, malicious: 5, unanalyzed: 0 },
        }),
        getRuleHitStats: vi
          .fn()
          .mockResolvedValue([
            {
              ruleId: 'rule1',
              name: 'Rule 1',
              category: 'Category 1',
              hitCount: 10,
              lastTriggered: null,
              falsePositiveRate: 0,
            },
          ]),
        getScanTimeline: vi
          .fn()
          .mockResolvedValue([
            { date: new Date().toISOString(), safe: 5, suspicious: 1, malicious: 0, total: 6 },
          ]),
        getTopFindings: vi
          .fn()
          .mockResolvedValue([
            {
              ruleId: 'rule1',
              ruleName: 'Rule 1',
              category: 'Category 1',
              severity: 'high',
              triggerCount: 10,
            },
          ]),
      };
    }),
  };
});

describe('Safety Routes Integration Tests (P3-SCAN-011)', () => {
  let server: FastifyInstance;
  const originalApiKeys = process.env['API_KEYS'];

  beforeAll(async () => {
    process.env['API_KEYS'] = 'test-api-key-123';
    server = await buildTestServer();
    await server.register(safetyRoutes, { prefix: '/api/v1/safety' });
    await server.ready();
  });

  afterAll(async () => {
    process.env['API_KEYS'] = originalApiKeys;
    await server.close();
    vi.restoreAllMocks();
  });

  // Every safety endpoint is protected, so the unauthorized case is asserted
  // against all of them — not just /stats, which was the only one covered when
  // the missing preHandler went unnoticed (#201).
  const PROTECTED_ROUTES = [
    '/api/v1/safety/stats',
    '/api/v1/safety/rules',
    '/api/v1/safety/timeline',
    '/api/v1/safety/findings/top',
  ];

  it('[SAFETY-000] rejects unauthorized access to safety endpoints', async () => {
    for (const url of PROTECTED_ROUTES) {
      const res = await server.inject({
        method: 'GET',
        url,
      });
      expect(res.statusCode, `expected 401 for ${url}`).toBe(401);
    }
  });

  it('[SAFETY-001] GET /api/v1/safety/stats returns valid schema with auth', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/safety/stats',
      headers: { 'x-api-key': 'test-api-key-123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ totalScans: number }>();
    expect(body.totalScans).toBe(100);
  });

  it('[SAFETY-002] GET /api/v1/safety/rules returns valid schema', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/safety/rules',
      headers: { 'x-api-key': 'test-api-key-123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[] }>();
    expect(body.data).toBeInstanceOf(Array);
  });

  it('[SAFETY-003] GET /api/v1/safety/timeline returns valid schema', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/safety/timeline?interval=day',
      headers: { 'x-api-key': 'test-api-key-123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[] }>();
    expect(body.data).toBeInstanceOf(Array);
  });

  it('[SAFETY-004] GET /api/v1/safety/findings/top returns valid schema', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/safety/findings/top?limit=5',
      headers: { 'x-api-key': 'test-api-key-123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[] }>();
    expect(body.data).toBeInstanceOf(Array);
  });
});
