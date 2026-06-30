/**
 * @module AegisError
 * @description Abstract base class for all AEGIS application errors.
 *
 * Every error in the AEGIS platform extends this class, providing:
 * - Typed `code` aligned to `ErrorCodeSchema` from common.schema
 * - HTTP `statusCode` for API response mapping
 * - `toJSON()` for safe API serialization (no stack traces)
 * - `isOperational` to distinguish expected errors from programmer bugs
 *
 * @hexagonal Shared Kernel — Cross-Cutting Concerns
 * @task P1-ARCH-010
 */

import type { ErrorCode } from '../shared/schemas/common.schema.js';

/** Options for constructing an AegisError. */
export interface AegisErrorOptions {
  /** Additional error details (field-level validation errors, context, etc.) */
  readonly details?: unknown;
  /** Whether this is an expected operational error (true) or a programmer bug (false). */
  readonly isOperational?: boolean;
  /** The underlying error that caused this one. */
  readonly cause?: Error;
}

/**
 * Abstract base error for the AEGIS platform.
 *
 * All domain and infrastructure errors extend this class.
 * Never instantiate directly — use a specific subclass.
 */
export abstract class AegisError extends Error {
  /** Application error code — aligns with ErrorCodeSchema. */
  readonly code: ErrorCode;

  /** HTTP status code for API response mapping. */
  readonly statusCode: number;

  /** Additional error context (validation details, resource info, etc.). */
  readonly details?: unknown;

  /** ISO 8601 timestamp of when the error occurred. */
  readonly timestamp: string;

  /**
   * Whether this is an expected operational error (true)
   * or an unexpected programmer error (false).
   *
   * Operational errors: validation failures, not found, rate limits.
   * Non-operational errors: null pointer, assertion failure, unhandled.
   */
  readonly isOperational: boolean;

  constructor(message: string, code: ErrorCode, statusCode: number, options?: AegisErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);

    this.code = code;
    this.statusCode = statusCode;
    this.details = options?.details;
    this.isOperational = options?.isOperational ?? true;
    this.timestamp = new Date().toISOString();

    // Ensure the name matches the class for readable stack traces
    this.name = this.constructor.name;

    // Clean stack trace — omit the constructor frame
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize this error for API responses.
   *
   * SECURITY: Never exposes stack traces. Only returns fields
   * compatible with `StandardErrorResponseSchema`.
   */
  toJSON(): {
    error: ErrorCode;
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  } {
    return {
      error: this.code,
      code: `AEGIS-${this.statusCode}`,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
      timestamp: this.timestamp,
    };
  }
}
