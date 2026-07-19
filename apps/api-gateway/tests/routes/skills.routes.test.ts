import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer } from '../test-utils/build-test-server.js';
import { skillsRoutes } from '../../src/routes/skills.routes.js';

const mockFindAll = vi.fn();
const mockGetDashboardStats = vi.fn();
const mockFindById = vi.fn();
const mockGetLatestResult = vi.fn();
const mockGetResultHistory = vi.fn();
const mockAddBulk = vi.fn();
const mockAdd = vi.fn();

vi.mock('@aegis/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aegis/core')>();
  return {
    ...actual,
    createQueueConnection: vi.fn().mockReturnValue({}),
  };
});

vi.mock('@aegis/skills-engine', () => {
  return {
    PostgresSkillRepository: vi.fn().mockImplementation(() => ({
      findAll: mockFindAll,
      getDashboardStats: mockGetDashboardStats,
      findById: mockFindById,
    })),
    PostgresScanResultRepository: vi.fn().mockImplementation(() => ({
      getLatestResult: mockGetLatestResult,
      getSkillSafetyHistory: mockGetResultHistory,
    })),
  };
});

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation((name: string) => ({
      name,
      addBulk: mockAddBulk,
      add: mockAdd,
    })),
  };
});

describe('Skills Routes Integration Tests (P3-SCAN-010)', () => {
  let server: FastifyInstance;
  const validApiKey = 'test-api-key-123';

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env['API_KEYS'] = validApiKey;

    mockFindAll.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    mockGetDashboardStats.mockResolvedValue({ totalSkills: 10 });
    mockFindById.mockResolvedValue(null);
    mockGetLatestResult.mockResolvedValue(null);
    mockGetResultHistory.mockResolvedValue([]);

    server = await buildTestServer({ withRateLimit: false });
    await server.register(skillsRoutes);
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  // 1. POST /scan (Single valid skill)
  it('should successfully enqueue a job for a single skill scan', async () => {
    mockFindById.mockResolvedValueOnce({ id: 'b0000001-0001-4000-8000-000000000001', contentHash: 'hash1' });
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/skills/scan',
      headers: { 'x-api-key': validApiKey },
      payload: { skillId: 'b0000001-0001-4000-8000-000000000001' },
    });
    expect(response.statusCode).toBe(202);
    expect(mockAddBulk).toHaveBeenCalled();
    const args = mockAddBulk.mock.calls[0][0];
    expect(args.length).toBe(1);
    expect(args[0].data.skillId).toBe('b0000001-0001-4000-8000-000000000001');
  });

  // 2. POST /scan (Batch valid skills)
  it('should successfully enqueue batch jobs for multiple skills', async () => {
    mockFindById.mockResolvedValueOnce({ id: 'id1', contentHash: 'hash1' });
    mockFindById.mockResolvedValueOnce({ id: 'id2', contentHash: 'hash2' });
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/skills/scan',
      headers: { 'x-api-key': validApiKey },
      payload: { skillIds: ['b0000001-0001-4000-8000-000000000001', 'b0000001-0002-4000-8000-000000000002'] },
    });
    expect(response.statusCode).toBe(202);
    expect(mockAddBulk).toHaveBeenCalled();
    const args = mockAddBulk.mock.calls[0][0];
    expect(args.length).toBe(2);
  });

  // 3. POST /scan (All skills)
  it('should successfully enqueue jobs for all skills', async () => {
    mockFindAll.mockResolvedValueOnce({ data: [{ id: 'id1', contentHash: 'hash1' }] });
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/skills/scan',
      headers: { 'x-api-key': validApiKey },
      payload: { all: true },
    });
    expect(response.statusCode).toBe(202);
    expect(mockAddBulk).toHaveBeenCalled();
    const args = mockAddBulk.mock.calls[0][0];
    expect(args.length).toBe(1);
  });

  // 4. POST /scan (Unauthorized missing API key)
  it('should return 401 when API key is missing', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/skills/scan',
      payload: { skillId: 'b0000001-0001-4000-8000-000000000001' },
    });
    expect(response.statusCode).toBe(401);
  });

  // 5. GET /:id/safety (Existing skill with history)
  it('should return safety data and history for a skill', async () => {
    mockFindById.mockResolvedValueOnce({ id: 'b0000001-0001-4000-8000-000000000001', safetyLabel: 'safe' });
    mockGetLatestResult.mockResolvedValueOnce({ finalLabel: 'safe', id: 'scan-1' });
    mockGetResultHistory.mockResolvedValueOnce([{ finalLabel: 'safe', id: 'scan-1' }]);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/skills/b0000001-0001-4000-8000-000000000001/safety',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    console.log('Test 5 Response Body:', body);
    expect(body.hasBeenScanned).toBe(true);
    expect(body.totalScans).toBe(1);
    expect(body.currentLabel).toBe('safe');
  });

  // 6. GET /:id/safety (Skill without history)
  it('should return 404 for non-existent skill', async () => {
    mockFindById.mockResolvedValueOnce(null);
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/skills/b0000001-0001-4000-8000-000000000001/safety',
    });
    expect(response.statusCode).toBe(404);
  });

  // 7. GET /skills/stats
  it('should return skills stats correctly', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/skills/stats',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().totalSkills).toBe(10);
  });

  // 8. GET /skills
  it('should return paginated skills list', async () => {
    mockFindAll.mockResolvedValueOnce({ data: [{ id: 'id1', safetyLabel: 'safe' }], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/skills',
    });
    const body = response.json();
    console.log('Test 8 Response Body:', body);
    expect(response.statusCode).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].safetyLabel).toBe('safe');
  });
});
