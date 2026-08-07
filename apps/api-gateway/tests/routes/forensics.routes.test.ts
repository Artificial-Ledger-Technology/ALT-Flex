import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { forensicsRoutes } from '../../src/routes/forensics.routes.js';

// Mock dependencies
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      quit: vi.fn(),
    })),
  };
});

vi.mock('@aegis/forensic-engine', () => {
  return {
    createForensicsQueue: vi.fn().mockReturnValue({
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
      getJob: vi.fn().mockImplementation((id: string) => {
        if (id === 'job-123') {
          return Promise.resolve({
            id: 'job-123',
            getState: vi.fn().mockResolvedValue('completed'),
            returnvalue: { status: 'success' },
            failedReason: null,
            progress: 100,
            timestamp: 1620000000000,
            finishedOn: 1620000010000,
          });
        }
        return Promise.resolve(null);
      }),
    }),
    PostgresForensicReportRepository: vi.fn().mockImplementation(() => ({
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === '6a13d778-9e51-40e1-a083-0599589d9703') {
          return Promise.resolve({
            id: '6a13d778-9e51-40e1-a083-0599589d9703',
            hackIncidentId: 'test',
          });
        }
        return Promise.resolve(null);
      }),
      findAll: vi.fn().mockResolvedValue({
        data: [{ id: '6a13d778-9e51-40e1-a083-0599589d9703', hackIncidentId: 'test' }],
        total: 1,
      }),
    })),
  };
});

describe('Forensics Routes (Engine γ)', () => {
  let server: FastifyInstance;
  const adminApiKey = 'test-admin-key';

  beforeAll(async () => {
    process.env['API_KEYS'] = adminApiKey;
    server = Fastify();
    await server.register(forensicsRoutes);
  });

  afterAll(async () => {
    await server.close();
  });

  // ── 1. Simulate Auth & Dispatch Tests ─────────────────────────────────────
  it('should reject simulate request without admin API key', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      payload: {
        pocId: '123e4567-e89b-12d3-a456-426614174000',
      },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty('error');
  });

  it('should reject simulate request with invalid payload', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': adminApiKey },
      payload: { pocId: 'invalid-uuid' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('should accept valid simulate request and dispatch job', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/forensics/simulate',
      headers: { 'x-api-key': adminApiKey },
      payload: {
        pocId: '123e4567-e89b-12d3-a456-426614174000',
      },
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toHaveProperty('jobId');
  });

  // ── 2. Trace Auth & Dispatch Tests ────────────────────────────────────────
  it('should reject trace request without admin API key', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      payload: {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        chain: 'ethereum',
      },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty('error');
  });

  it('should reject trace request with invalid payload', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      headers: { 'x-api-key': adminApiKey },
      payload: { txHash: 'invalid-hash', chain: 'ethereum' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('should accept valid trace request and dispatch job', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/forensics/trace',
      headers: { 'x-api-key': adminApiKey },
      payload: {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        chain: 'ethereum',
      },
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toHaveProperty('jobId');
  });

  // ── 3. Unified Job Status Tests ───────────────────────────────────────────
  it('should return 404 for unknown job ID', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/forensics/jobs/unknown-job',
    });
    expect(response.statusCode).toBe(404);
  });

  it('should return job status for valid job ID', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/forensics/jobs/job-123',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('completed');
    expect(response.json().result).toEqual({ status: 'success' });
  });

  // ── 4. Forensic Report Retrieval Tests ────────────────────────────────────
  it('should list paginated reports', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/forensics/reports?page=1&pageSize=10',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().total).toBe(1);
    expect(response.json().data[0].id).toBe('6a13d778-9e51-40e1-a083-0599589d9703');
  });

  it('should return 404 for unknown report ID', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/forensics/reports/123e4567-e89b-12d3-a456-426614174000',
    });
    expect(response.statusCode).toBe(404);
  });

  it('should return specific report by ID', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/forensics/reports/6a13d778-9e51-40e1-a083-0599589d9703',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe('6a13d778-9e51-40e1-a083-0599589d9703');
  });
});
