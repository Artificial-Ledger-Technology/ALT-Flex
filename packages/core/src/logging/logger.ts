/**
 * @module logger
 * @description Pino-based structured logger implementing LoggerPort.
 *
 * Features:
 * - JSON output (NDJSON) for production log aggregation
 * - Automatic correlation ID injection from AsyncLocalStorage
 * - Sensitive field redaction (password, secret, token, etc.)
 * - Child logger support for request-scoped metadata
 *
 * @hexagonal Shared Kernel — Infrastructure Utility
 * @task P1-ARCH-010
 */

import pino from 'pino';
import { getCorrelationId } from './correlation-context.js';
import type { LoggerPort } from './logger-port.js';

/** Known Pino log levels — constrains LoggerOptions to valid values. */
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

/** Options for creating a logger instance. */
export interface LoggerOptions {
  /** Minimum log level. Defaults to `process.env.LOG_LEVEL ?? 'info'`. */
  readonly level?: LogLevel;
  /** Logger name — appears in every log entry as `name` field. */
  readonly name?: string;
}

/**
 * Paths to redact in log output — prevents accidental secret leakage.
 *
 * SECURITY (CWE-532): Covers top-level, one-level nested (`*.field`),
 * and array-nested (`[*].field`) paths. Includes credentials, PII,
 * and auth-related fields. Pino does NOT support `**` deep-glob syntax,
 * so we explicitly list common nesting patterns.
 */
const REDACT_PATHS = [
  // ── Credentials & Secrets ──────────────────────────────────────────
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apiKey',
  '*.password',
  '*.secret',
  '*.token',
  '*.authorization',
  '*.cookie',
  '*.apiKey',
  '[*].password',
  '[*].secret',
  '[*].token',
  '[*].authorization',
  '[*].cookie',
  '[*].apiKey',

  // ── Auth Tokens ────────────────────────────────────────────────────
  'accessToken',
  'refreshToken',
  'sessionId',
  '*.accessToken',
  '*.refreshToken',
  '*.sessionId',
  '[*].accessToken',
  '[*].refreshToken',
  '[*].sessionId',

  // ── PII Fields ─────────────────────────────────────────────────────
  'email',
  'ssn',
  'creditCard',
  'phoneNumber',
  '*.email',
  '*.ssn',
  '*.creditCard',
  '*.phoneNumber',
  '[*].email',
  '[*].ssn',
  '[*].creditCard',
  '[*].phoneNumber',

  // ── Fastify Request Headers ────────────────────────────────────────
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
];

/**
 * Wrap a Pino logger instance to satisfy the LoggerPort interface.
 *
 * This adapter bridges Pino's API (which uses the object-first calling
 * convention) to LoggerPort's simpler `(message, meta?)` signature.
 */
function wrapPinoLogger(pinoLogger: pino.Logger): LoggerPort {
  return {
    fatal(message: string, meta?: Record<string, unknown>): void {
      if (meta) {
        pinoLogger.fatal(meta, message);
      } else {
        pinoLogger.fatal(message);
      }
    },
    error(message: string, meta?: Record<string, unknown>): void {
      if (meta) {
        pinoLogger.error(meta, message);
      } else {
        pinoLogger.error(message);
      }
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      if (meta) {
        pinoLogger.warn(meta, message);
      } else {
        pinoLogger.warn(message);
      }
    },
    info(message: string, meta?: Record<string, unknown>): void {
      if (meta) {
        pinoLogger.info(meta, message);
      } else {
        pinoLogger.info(message);
      }
    },
    debug(message: string, meta?: Record<string, unknown>): void {
      if (meta) {
        pinoLogger.debug(meta, message);
      } else {
        pinoLogger.debug(message);
      }
    },
    child(meta: Record<string, unknown>): LoggerPort {
      return wrapPinoLogger(pinoLogger.child(meta));
    },
  };
}

/**
 * Create a structured logger implementing LoggerPort.
 *
 * Automatically injects the current correlation ID from AsyncLocalStorage
 * into every log entry via Pino's `mixin` option.
 *
 * @param options - Logger configuration
 * @returns LoggerPort-compliant logger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger({ name: 'hacks-engine' });
 * logger.info('ETL sync started', { source: 'defillama' });
 * // → {"level":30,"time":...,"name":"hacks-engine","correlationId":"abc-123","msg":"ETL sync started","source":"defillama"}
 * ```
 */
export function createLogger(options?: LoggerOptions): LoggerPort {
  const level = options?.level ?? process.env['LOG_LEVEL'] ?? 'info';

  const pinoLogger = pino({
    level,
    ...(options?.name !== undefined && options?.name !== '' ? { name: options.name } : {}),
    // Inject correlationId from AsyncLocalStorage on every log entry
    mixin() {
      return { correlationId: getCorrelationId() };
    },
    // Redact sensitive fields to prevent secret leakage
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
  });

  return wrapPinoLogger(pinoLogger);
}
