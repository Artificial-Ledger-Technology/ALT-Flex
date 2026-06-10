import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Middleware to enforce API Key authentication for admin endpoints.
 * Validates the `x-api-key` header against the `API_KEYS` environment variable.
 */
export async function requireApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;
  const validKeys = (process.env['API_KEYS'] ?? '').split(',').filter(Boolean);

  if (typeof apiKey !== 'string' || !validKeys.includes(apiKey)) {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      code: 'AEGIS-401-001',
      message: 'Missing or invalid API key. Admin access required.',
      timestamp: new Date().toISOString(),
    });
  }
}
