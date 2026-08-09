/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Forensic Engine Routes — Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fastify server.inject() integration tests for all 6 Forensic Engine
 * endpoints. Tests verify HTTP status codes, validation error responses,
 * auth guard behavior, and 501 stub correctness.
 *
 * Architecture Notes:
 * - Routes have DUAL validation: Fastify JSON Schema (AJV) runs first,
 *   then the handler's Zod validation runs. For body/params validation
 *   errors, Fastify's AJV may catch the error before the handler,
 *   returning Fastify's own error format rather than the AEGIS format.
 * - Response schemas are stripped via onRoute hook to prevent
 *   fast-json-stringify serialization issues in the test environment
 *   (e.g., nullable: true in response schemas for stub endpoints).
 *
 * @module tests/forensics.routes
 * @task P1-ARCH-005
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    quit: vi.fn(),
  })),
}));

vi.mock('@aegis/forensic-engine', () => ({
  createForensicsQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    getJob: vi.fn().mockResolvedValue(null)
  }),
  PostgresForensicReportRepository: vi.fn().mockImplementation(() => ({
    findById: vi.fn(),
    findAll: vi.fn()
  }))
}));

import { forensicsRoutes } from '../src/routes/forensics.routes.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = randomUUID();
const VALID_TX_HASH = '0x' + 'a'.repeat(64);
const TEST_API_KEY = 'test-key-12345';

let app: FastifyInstance;

beforeAll(async () => {
  // Set API_KEYS BEFORE registering routes — validKeys is evaluated
  // inside forensicsRoutes() at registration time.
  process.env['API_KEYS'] = TEST_API_KEY;

  app = Fastify({ logger: false });

  // Strip response schemas to prevent fast-json-stringify compilation issues
  // in the test environment. Response schemas with nullable: true in the
  // GET :jobId endpoints cause serialization errors without @fastify/swagger.
  // This allows the handler to return the full response body via JSON.stringify.
  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.schema?.response) {
      delete routeOptions.schema.response;
    }
  });

  await app.register(forensicsRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
  delete process.env['API_KEYS'];
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/v1/forensics/pocs — List Available Foundry POCs
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/forensics/pocs', () => {
  it('returns 501 Not Implemented with default query params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs',
    });
    expect(res.statusCode).toBe(501);
    const body = res.json();
    expect(body.error).toBe('NOT_IMPLEMENTED');
    expect(body.code).toBe('AEGIS-501-003');
    expect(body.message).toContain('Phase 5');
    expect(body.timestamp).toBeDefined();
  });

  it('returns 501 with valid query parameters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs?page=1&pageSize=10&sortBy=estimatedLossUsd&sortOrder=asc&chain=ethereum',
    });
    expect(res.statusCode).toBe(501);
  });

  it('returns 400 for invalid query params (page = -1)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs?page=-1',
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    // May come from Fastify AJV (querystring) or handler Zod — both return 400
    expect(body).toBeDefined();
  });

  it('returns 400 for invalid query params (page = 0)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs?page=0',
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid query params (pageSize > 100)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs?pageSize=101',
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid chain enum', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs?chain=dogecoin',
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid source enum', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs?source=github-random',
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for search exceeding 200 characters', async () => {
    const longSearch = 'a'.repeat(201);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/forensics/pocs?search=${longSearch}`,
    });
    expect(res.statusCode).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/v1/forensics/pocs/:id — POC Detail
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/forensics/pocs/:id', () => {
  it('returns 501 for a valid UUID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/forensics/pocs/${VALID_UUID}`,
    });
    expect(res.statusCode).toBe(501);
    const body = res.json();
    expect(body.code).toBe('AEGIS-501-003');
  });

  it('returns 400 for non-UUID id parameter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs/not-a-uuid',
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    // Fastify's AJV validates format:'uuid' in params schema before the handler,
    // returning Fastify's own error format (or AEGIS format if handler runs)
    expect(body).toBeDefined();
    // Either Fastify's 'Bad Request' or our 'VALIDATION_ERROR' is acceptable
    expect(['Bad Request', 'VALIDATION_ERROR']).toContain(body.error);
  });

  it('returns 400 or 404 for missing id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/pocs/',
    });
    // Fastify may return 400 or 404 for missing path param
    expect([400, 404]).toContain(res.statusCode);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. POST /api/v1/forensics/simulate — Trigger Simulation (Auth-guarded)
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/forensics/simulate', () => {
  it('returns 401 without x-api-key header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      payload: { pocId: VALID_UUID },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.code).toBe('AEGIS-401-002');
  });

  it('returns 401 with invalid x-api-key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': 'wrong-key' },
      payload: { pocId: VALID_UUID },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with empty x-api-key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': '' },
      payload: { pocId: VALID_UUID },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid pocId (Fastify AJV or Zod catches)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: { pocId: 'not-a-uuid' },
    });
    expect(res.statusCode).toBe(400);
    // Body format depends on whether Fastify's AJV (format: 'uuid')
    // or handler's Zod catches first — both return 400
  });

  it('returns 400 for missing pocId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid verbosity (out of range)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: { pocId: VALID_UUID, overrides: { verbosity: 0 } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 202 with valid API key and valid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: { pocId: VALID_UUID },
    });
    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.jobId).toBeDefined();
  });

  it('returns 202 with valid API key and full overrides', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: {
        pocId: VALID_UUID,
        overrides: {
          rpcUrlEnvVar: 'TEST_RPC',
          forkBlockNumber: 15_000_000,
          gasLimit: 30_000_000,
        },
      },
    });
    expect(res.statusCode).toBe(202);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /api/v1/forensics/simulate/:jobId — Simulation Status
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/forensics/simulate/:jobId', () => {
  it('returns 501 for valid jobId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/simulate/job-12345',
    });
    expect(res.statusCode).toBe(501);
    const body = res.json();
    expect(body.code).toBe('AEGIS-501-003');
  });

  it('accepts any non-empty jobId string', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/simulate/abc',
    });
    expect(res.statusCode).toBe(501);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. POST /api/v1/forensics/trace — Trace Transaction (Auth-guarded)
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/forensics/trace', () => {
  it('returns 401 without x-api-key header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      payload: { txHash: VALID_TX_HASH, chain: 'ethereum' },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.code).toBe('AEGIS-401-003');
  });

  it('returns 401 with invalid x-api-key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      headers: { 'x-api-key': 'bad-key' },
      payload: { txHash: VALID_TX_HASH, chain: 'ethereum' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid txHash (Fastify AJV or Zod catches)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: { txHash: '0xshort', chain: 'ethereum' },
    });
    expect(res.statusCode).toBe(400);
    // Body format depends on which validation layer catches first
  });

  it('returns 400 for invalid chain', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: { txHash: VALID_TX_HASH, chain: 'bitcoin' },
    });
    // Fastify AJV may catch, or handler auth + Zod may catch
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for missing txHash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: { chain: 'ethereum' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 202 with valid API key and valid body (minimal)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: { txHash: VALID_TX_HASH, chain: 'ethereum' },
    });
    expect(res.statusCode).toBe(202);
  });

  it('returns 202 with valid API key and full body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      headers: { 'x-api-key': TEST_API_KEY },
      payload: {
        txHash: VALID_TX_HASH,
        chain: 'ethereum',
        includeStorageDiffs: false,
        maxDepth: 5,
      },
    });
    expect(res.statusCode).toBe(202);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET /api/v1/forensics/trace/:jobId — Trace Results
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/forensics/trace/:jobId', () => {
  it('returns 501 for valid jobId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/trace/trace-job-xyz',
    });
    expect(res.statusCode).toBe(501);
    const body = res.json();
    expect(body.code).toBe('AEGIS-501-003');
  });

  it('accepts any non-empty jobId string', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/forensics/trace/abc-123',
    });
    expect(res.statusCode).toBe(501);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Cross-Cutting: Response Shape Consistency
// ═══════════════════════════════════════════════════════════════════════════════

describe('Response shape consistency', () => {
  it('all non-auth GET endpoints return 501 with consistent error shape', async () => {
    const endpoints = [
      { method: 'GET' as const, url: '/api/v1/forensics/pocs' },
      { method: 'GET' as const, url: `/api/v1/forensics/pocs/${VALID_UUID}` },
      { method: 'GET' as const, url: '/api/v1/forensics/simulate/some-job' },
      { method: 'GET' as const, url: '/api/v1/forensics/trace/some-job' },
    ];

    for (const { method, url } of endpoints) {
      const res = await app.inject({ method, url });
      expect(res.statusCode).toBe(501);
      const body = res.json();
      expect(body).toHaveProperty('error', 'NOT_IMPLEMENTED');
      expect(body).toHaveProperty('code', 'AEGIS-501-003');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
    }
  });

  it('auth-guarded POST endpoints return 202 with valid API key', async () => {
    const endpoints = [
      {
        url: '/api/v1/forensics/simulate',
        payload: { pocId: VALID_UUID },
      },
      {
        url: '/api/v1/forensics/trace',
        payload: { txHash: VALID_TX_HASH, chain: 'ethereum' },
      },
    ];

    for (const endpoint of endpoints) {
      const res = await app.inject({
        method: 'POST',
        url: endpoint.url,
        headers: { 'x-api-key': TEST_API_KEY },
        payload: endpoint.payload,
      });

      expect(res.statusCode).toBe(202);
    }
  });

  it('auth-guarded POST endpoints return 401 without API key', async () => {
    const endpoints = [
      {
        method: 'POST' as const,
        url: '/api/v1/forensics/simulate',
        payload: { pocId: VALID_UUID },
      },
      {
        method: 'POST' as const,
        url: '/api/v1/forensics/trace',
        payload: { txHash: VALID_TX_HASH, chain: 'ethereum' },
      },
    ];

    for (const { method, url, payload } of endpoints) {
      const res = await app.inject({ method, url, payload });
      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body).toHaveProperty('error', 'UNAUTHORIZED');
    }
  });
});
