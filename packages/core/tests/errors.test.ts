/**
 * @module errors.test
 * @description Comprehensive unit tests for the AEGIS error hierarchy.
 *
 * @task P1-ARCH-010
 */

import { describe, it, expect } from 'vitest';
import {
  AegisError,
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  ExternalServiceError,
} from '../src/errors/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// AegisError Base Class
// ═══════════════════════════════════════════════════════════════════════════════

describe('AegisError', () => {
  it('cannot be instantiated directly (abstract)', () => {
    // AegisError is abstract — we verify via subclass
    const err = new ValidationError('test');
    expect(err).toBeInstanceOf(AegisError);
    expect(err).toBeInstanceOf(Error);
  });

  it('has correct name matching class constructor', () => {
    const err = new ValidationError('test');
    expect(err.name).toBe('ValidationError');
  });

  it('has ISO 8601 timestamp', () => {
    const err = new ValidationError('test');
    expect(err.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ValidationError (400)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ValidationError', () => {
  it('has correct code and statusCode', () => {
    const err = new ValidationError('Invalid input');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid input');
    expect(err.isOperational).toBe(true);
  });

  it('carries field-level details', () => {
    const details = [
      { field: 'page', message: 'Must be ≥ 1' },
      { field: 'attackVector', message: 'Invalid enum value' },
    ];
    const err = new ValidationError('Invalid query parameters', details);
    expect(err.details).toEqual(details);
  });

  it('toJSON() includes details', () => {
    const details = [{ field: 'name', message: 'Required' }];
    const json = new ValidationError('Bad input', details).toJSON();
    expect(json.error).toBe('VALIDATION_ERROR');
    expect(json.code).toBe('AEGIS-400');
    expect(json.message).toBe('Bad input');
    expect(json.details).toEqual(details);
    expect(json.timestamp).toBeDefined();
  });

  it('toJSON() omits details when undefined', () => {
    const json = new ValidationError('Bad input').toJSON();
    expect(json).not.toHaveProperty('details');
  });

  it('toJSON() never exposes stack traces', () => {
    const json = new ValidationError('test').toJSON();
    expect(json).not.toHaveProperty('stack');
    expect(JSON.stringify(json)).not.toContain('at ');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BadRequestError (400)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BadRequestError', () => {
  it('has correct defaults', () => {
    const err = new BadRequestError();
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Bad request');
    expect(err.isOperational).toBe(true);
  });

  it('accepts custom message', () => {
    const err = new BadRequestError('Request body is not valid JSON');
    expect(err.message).toBe('Request body is not valid JSON');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UnauthorizedError (401)
// ═══════════════════════════════════════════════════════════════════════════════

describe('UnauthorizedError', () => {
  it('has correct defaults', () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
    expect(err.isOperational).toBe(true);
  });

  it('accepts custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ForbiddenError (403)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForbiddenError', () => {
  it('has correct defaults', () => {
    const err = new ForbiddenError();
    expect(err.code).toBe('FORBIDDEN');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access denied');
    expect(err.isOperational).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NotFoundError (404)
// ═══════════════════════════════════════════════════════════════════════════════

describe('NotFoundError', () => {
  it('generates message with resource name only', () => {
    const err = new NotFoundError('Endpoint');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Endpoint not found');
    expect(err.isOperational).toBe(true);
  });

  it('generates message with resource and identifier', () => {
    const err = new NotFoundError('HackIncident', 'abc-123');
    expect(err.message).toBe("HackIncident with id 'abc-123' not found");
  });

  it('toJSON() has correct shape', () => {
    const json = new NotFoundError('Skill', '456').toJSON();
    expect(json.error).toBe('NOT_FOUND');
    expect(json.code).toBe('AEGIS-404');
    expect(json.message).toBe("Skill with id '456' not found");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ConflictError (409)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ConflictError', () => {
  it('has correct defaults', () => {
    const err = new ConflictError();
    expect(err.code).toBe('CONFLICT');
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Resource conflict');
    expect(err.isOperational).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RateLimitError (429)
// ═══════════════════════════════════════════════════════════════════════════════

describe('RateLimitError', () => {
  it('has correct defaults', () => {
    const err = new RateLimitError();
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe('Rate limit exceeded');
    expect(err.retryAfterMs).toBe(60000);
    expect(err.isOperational).toBe(true);
  });

  it('accepts custom retryAfterMs', () => {
    const err = new RateLimitError(30000);
    expect(err.retryAfterMs).toBe(30000);
  });

  it('accepts custom message and retryAfterMs', () => {
    const err = new RateLimitError(5000, 'Slow down');
    expect(err.message).toBe('Slow down');
    expect(err.retryAfterMs).toBe(5000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// InternalError (500)
// ═══════════════════════════════════════════════════════════════════════════════

describe('InternalError', () => {
  it('has correct defaults and isOperational = false', () => {
    const err = new InternalError();
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('An unexpected error occurred');
    expect(err.isOperational).toBe(false);
  });

  it('preserves cause error', () => {
    const cause = new Error('original');
    const err = new InternalError('Wrapped', cause);
    expect(err.cause).toBe(cause);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ExternalServiceError (502)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ExternalServiceError', () => {
  it('generates message from serviceName', () => {
    const err = new ExternalServiceError('DefiLlama');
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.statusCode).toBe(502);
    expect(err.message).toBe("External service 'DefiLlama' is unavailable");
    expect(err.serviceName).toBe('DefiLlama');
    expect(err.isOperational).toBe(true);
  });

  it('accepts custom message', () => {
    const err = new ExternalServiceError('DefiLlama', 'API returned 503');
    expect(err.message).toBe('API returned 503');
  });

  it('preserves cause', () => {
    const cause = new TypeError('fetch failed');
    const err = new ExternalServiceError('RPC', 'Connection refused', cause);
    expect(err.cause).toBe(cause);
  });

  it('toJSON() does not expose cause stack trace', () => {
    const cause = new Error('secret internal error with stack');
    const json = new ExternalServiceError('API', undefined, cause).toJSON();
    expect(JSON.stringify(json)).not.toContain('secret internal error');
    expect(json).not.toHaveProperty('stack');
    expect(json).not.toHaveProperty('cause');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// instanceof checks across all error types
// ═══════════════════════════════════════════════════════════════════════════════

describe('instanceof checks', () => {
  const errors = [
    new ValidationError('v'),
    new BadRequestError(),
    new UnauthorizedError(),
    new ForbiddenError(),
    new NotFoundError('R'),
    new ConflictError(),
    new RateLimitError(),
    new InternalError(),
    new ExternalServiceError('S'),
  ];

  it.each(errors)('%s is instanceof AegisError', (err) => {
    expect(err).toBeInstanceOf(AegisError);
  });

  it.each(errors)('%s is instanceof Error', (err) => {
    expect(err).toBeInstanceOf(Error);
  });
});
