import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestServer } from '../test-utils/build-test-server.js';
import { adminRoutes } from '../../src/routes/admin.routes.js';
import { hacksRoutes } from '../../src/routes/hacks.routes.js';
import { skillsRoutes } from '../../src/routes/skills.routes.js';

const mockGetJobCounts = vi.fn();
const mockAdd = vi.fn();
const mockGetJob = vi.fn();
const mockGetState = vi.fn();

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation((name: string) => ({
      name,
      getJobCounts: mockGetJobCounts,
      add: mockAdd,
      getJob: mockGetJob,
    })),
  };
});

describe('Admin ETL Integration Tests (P2-ETL-010)', () => {
  let server: FastifyInstance;
  const validApiKey = 'test-api-key-123';

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env['API_KEYS'] = validApiKey;

    mockGetJobCounts.mockResolvedValue({
      active: 0,
      waiting: 0,
      delayed: 0,
      completed: 0,
      failed: 0,
    });
    mockAdd.mockResolvedValue({ id: 'mocked-job-id-1' });

    server = await buildTestServer({ withRateLimit: false }); // disable rate limit for tests
    await server.register(adminRoutes);
    await server.register(hacksRoutes);
    await server.register(skillsRoutes);
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it('should return 401 on /api/v1/hacks/sync without valid API key', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/hacks/sync',
      payload: { source: 'defillama' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should successfully enqueue a job and return 202 on /api/v1/hacks/sync', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/hacks/sync',
      headers: { 'x-api-key': validApiKey },
      payload: { source: 'defillama' },
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      jobId: 'mocked-job-id-1',
      status: 'queued',
    });
    expect(mockAdd).toHaveBeenCalledWith('sync', { force: false });
  });

  it('should return 409 on /api/v1/hacks/sync if job is already in progress', async () => {
    mockGetJobCounts.mockResolvedValueOnce({ active: 1, waiting: 0, delayed: 0 });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/hacks/sync',
      headers: { 'x-api-key': validApiKey },
      payload: { source: 'defillama' },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'ETL_SYNC_IN_PROGRESS' });
  });

  it('should successfully enqueue a job and return 202 on /api/v1/skills/sync', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/skills/sync',
      headers: { 'x-api-key': validApiKey },
      payload: { repositories: ['org/repo'] },
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      jobId: 'mocked-job-id-1',
      status: 'queued',
    });
    expect(mockAdd).toHaveBeenCalledWith('sync', { force: false });
  });

  it('should return 409 on /api/v1/skills/sync if job is already in progress', async () => {
    mockGetJobCounts.mockResolvedValueOnce({ active: 0, waiting: 1, delayed: 0 });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/skills/sync',
      headers: { 'x-api-key': validApiKey },
      payload: { repositories: ['org/repo'] },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'ETL_SYNC_IN_PROGRESS' });
  });

  it('should return job status correctly on /api/v1/admin/jobs/:jobId', async () => {
    mockGetJob.mockResolvedValueOnce(null); // Not in queue 1
    mockGetJob.mockResolvedValueOnce({
      id: 'job-123',
      name: 'sync',
      getState: mockGetState.mockResolvedValueOnce('completed'),
      data: { force: true },
      progress: 100,
      attemptsMade: 1,
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/jobs/job-123',
      headers: { 'x-api-key': validApiKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 'job-123',
      name: 'sync',
      state: 'completed',
    });
  });

  it('should return queue statistics correctly on /api/v1/admin/jobs', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/jobs',
      headers: { 'x-api-key': validApiKey },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ queues: unknown[] }>();
    expect(body.queues.length).toBe(3); // Hacks, Skills, Safety
    expect(mockGetJobCounts).toHaveBeenCalledTimes(3);
  });
});
