/**
 * @module logging.test
 * @description Unit tests for the AEGIS structured logging framework.
 *
 * @task P1-ARCH-010
 */

import { describe, it, expect } from 'vitest';
import {
  getCorrelationId,
  runWithCorrelation,
  createCorrelationId,
  createLogger,
  describeError,
} from '../src/logging/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Correlation Context
// ═══════════════════════════════════════════════════════════════════════════════

describe('correlation-context', () => {
  it('getCorrelationId() returns "unknown" outside context', () => {
    expect(getCorrelationId()).toBe('unknown');
  });

  it('runWithCorrelation() provides correlation ID within context', () => {
    const id = 'test-correlation-123';
    const result = runWithCorrelation(id, () => {
      return getCorrelationId();
    });
    expect(result).toBe(id);
  });

  it('runWithCorrelation() restores previous context after completion', () => {
    runWithCorrelation('inner-id', () => {
      expect(getCorrelationId()).toBe('inner-id');
    });
    expect(getCorrelationId()).toBe('unknown');
  });

  it('runWithCorrelation() supports nested contexts', () => {
    runWithCorrelation('outer', () => {
      expect(getCorrelationId()).toBe('outer');
      runWithCorrelation('inner', () => {
        expect(getCorrelationId()).toBe('inner');
      });
      expect(getCorrelationId()).toBe('outer');
    });
  });

  it('runWithCorrelation() propagates through async boundaries', async () => {
    const result = await runWithCorrelation('async-id', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return getCorrelationId();
    });
    expect(result).toBe('async-id');
  });

  it('createCorrelationId() generates valid UUID v4 format', () => {
    const id = createCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('createCorrelationId() generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createCorrelationId()));
    expect(ids.size).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Logger Factory
// ═══════════════════════════════════════════════════════════════════════════════

describe('createLogger', () => {
  it('returns object with all LoggerPort methods', () => {
    const logger = createLogger({ level: 'silent' });
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('child() returns a LoggerPort with all methods', () => {
    const logger = createLogger({ level: 'silent' });
    const child = logger.child({ service: 'test' });
    expect(typeof child.fatal).toBe('function');
    expect(typeof child.error).toBe('function');
    expect(typeof child.warn).toBe('function');
    expect(typeof child.info).toBe('function');
    expect(typeof child.debug).toBe('function');
    expect(typeof child.child).toBe('function');
  });

  it('accepts name option', () => {
    // Should not throw
    const logger = createLogger({ name: 'test-service', level: 'silent' });
    expect(logger).toBeDefined();
  });

  it('methods do not throw when called with message only', () => {
    const logger = createLogger({ level: 'silent' });
    expect(() => logger.fatal('test')).not.toThrow();
    expect(() => logger.error('test')).not.toThrow();
    expect(() => logger.warn('test')).not.toThrow();
    expect(() => logger.info('test')).not.toThrow();
    expect(() => logger.debug('test')).not.toThrow();
  });

  it('methods do not throw when called with message and meta', () => {
    const logger = createLogger({ level: 'silent' });
    expect(() => logger.fatal('test', { key: 'value' })).not.toThrow();
    expect(() => logger.error('test', { key: 'value' })).not.toThrow();
    expect(() => logger.warn('test', { key: 'value' })).not.toThrow();
    expect(() => logger.info('test', { key: 'value' })).not.toThrow();
    expect(() => logger.debug('test', { key: 'value' })).not.toThrow();
  });

  it('child logger chains do not throw', () => {
    const logger = createLogger({ level: 'silent' });
    const child = logger.child({ service: 'a' });
    const grandchild = child.child({ module: 'b' });
    expect(() => grandchild.info('test')).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// describeError
// ═══════════════════════════════════════════════════════════════════════════════

describe('describeError', () => {
  it('returns the message of an ordinary Error', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
  });

  it('expands an AggregateError whose own message is empty', () => {
    // Shape thrown by Node when a dual-stack connect fails on every address —
    // the reason a worker with an unreachable database logged error:"".
    const aggregate = new AggregateError(
      [
        new Error('connect ECONNREFUSED ::1:5432'),
        new Error('connect ECONNREFUSED 127.0.0.1:5432'),
      ],
      '',
    );

    expect(describeError(aggregate)).toBe(
      'AggregateError: connect ECONNREFUSED ::1:5432; connect ECONNREFUSED 127.0.0.1:5432',
    );
  });

  it('keeps both the message and the aggregated causes when both are present', () => {
    const aggregate = new AggregateError([new Error('inner')], 'outer');
    expect(describeError(aggregate)).toBe('outer: inner');
  });

  it('falls back to the class name rather than an empty string', () => {
    expect(describeError(new Error(''))).toBe('Error');
  });

  it('stringifies non-Error throws', () => {
    expect(describeError('plain string')).toBe('plain string');
    expect(describeError(undefined)).toBe('undefined');
  });
});
