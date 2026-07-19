/**
 * @module common.schema
 * @description Reusable API contract schemas shared across all engines.
 *
 * These schemas define the standard patterns for pagination, sorting,
 * error responses, and common parameter types. Every engine-specific
 * API schema composes from these building blocks.
 *
 * Design Decisions:
 * 1. `z.coerce.*` for query params (strings from URL → typed values)
 * 2. Pagination defaults: page=1, pageSize=20, max 100
 * 3. Error format follows RFC 7807 (Problem Details for HTTP APIs)
 * 4. All schemas export both the Zod schema and the inferred TypeScript type
 *
 * @hexagonal Shared Kernel — API Contract Layer
 * @see IHackDataPort.PaginatedResult for domain-level pagination type
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Pagination Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pagination query parameters.
 * Applied to all list endpoints via query string.
 *
 * @example `?page=2&pageSize=50`
 */
export const PaginationQuerySchema = z.object({
  /** Page number (1-indexed). Defaults to 1. */
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be ≥ 1')
    .default(1),

  /** Items per page. Defaults to 20. Max 100. */
  pageSize: z.coerce
    .number()
    .int('Page size must be an integer')
    .min(1, 'Page size must be ≥ 1')
    .max(100, 'Page size must be ≤ 100')
    .default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Sort order direction.
 */
export const SortOrderSchema = z
  .enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' }),
  })
  .default('desc');

export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Factory to create a typed sort query schema with specific sortable fields.
 *
 * @param fields - Tuple of allowed sort field names
 * @param defaultField - Default field to sort by
 *
 * @example
 * ```ts
 * const HackSortSchema = createSortQuerySchema(
 *   ['date', 'lossUsd', 'protocolName'] as const,
 *   'date'
 * );
 * ```
 */
export function createSortQuerySchema<T extends string>(
  fields: readonly [T, ...T[]],
  defaultField: T,
): z.ZodObject<{
  sortBy: z.ZodDefault<z.ZodEnum<[T, ...T[]]>>;
  sortOrder: typeof SortOrderSchema;
}> {
  return z.object({
    sortBy: z
      .enum(fields, {
        errorMap: () => ({
          message: `Sort field must be one of: ${fields.join(', ')}`,
        }),
      })
      .default(defaultField),
    sortOrder: SortOrderSchema,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Paginated Response Envelope
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Factory to create a typed paginated response schema.
 *
 * Aligns with `PaginatedResult<T>` from `IHackDataPort` but at the API
 * serialization layer (dates as ISO strings, etc.).
 *
 * @param itemSchema - Zod schema for individual items in the `data` array
 *
 * @example
 * ```ts
 * const HackListResponseSchema = createPaginatedResponseSchema(HackIncidentSchema);
 * ```
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
): z.ZodObject<{
  data: z.ZodArray<T>;
  total: z.ZodNumber;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
  totalPages: z.ZodNumber;
}> {
  return z.object({
    /** Array of items for the current page */
    data: z.array(itemSchema),
    /** Total number of items matching the query (across all pages) */
    total: z.number().int().nonnegative(),
    /** Current page number (1-indexed) */
    page: z.number().int().positive(),
    /** Items per page */
    pageSize: z.number().int().positive(),
    /** Total number of pages */
    totalPages: z.number().int().nonnegative(),
  });
}

/**
 * Non-generic paginated response metadata (without data).
 * Useful for documentation and type extraction.
 */
export const PaginationMetadataSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Error Response Schemas (RFC 7807 aligned)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standardized error codes used across the entire AEGIS platform.
 * Maps to HTTP status codes but provides application-specific granularity.
 */
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'RATE_LIMIT_EXCEEDED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'ETL_SYNC_IN_PROGRESS',
  'CONFLICT',
  'BAD_REQUEST',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/**
 * Individual field-level validation error detail.
 */
export const ValidationErrorDetailSchema = z.object({
  /** Field path (e.g., "page", "attackVector", "body.name") */
  field: z.string(),
  /** Human-readable error message for this field */
  message: z.string(),
});

export type ValidationErrorDetail = z.infer<typeof ValidationErrorDetailSchema>;

/**
 * Standard API error response — RFC 7807 (Problem Details for HTTP APIs).
 *
 * Every error returned by the AEGIS API Gateway follows this shape.
 * This is the contract between the API Gateway and all consumers.
 *
 * @example
 * ```json
 * {
 *   "error": "VALIDATION_ERROR",
 *   "code": "AEGIS-400-001",
 *   "message": "Invalid query parameters",
 *   "details": [
 *     { "field": "page", "message": "Must be ≥ 1" },
 *     { "field": "attackVector", "message": "Invalid enum value" }
 *   ],
 *   "timestamp": "2026-04-05T14:39:00Z"
 * }
 * ```
 */
export const StandardErrorResponseSchema = z.object({
  /** Error classification code */
  error: ErrorCodeSchema,
  /** Structured error code (e.g., "AEGIS-400-001") */
  code: z.string(),
  /** Human-readable error message */
  message: z.string(),
  /** Optional field-level validation error details */
  details: z.array(ValidationErrorDetailSchema).optional(),
  /** ISO 8601 timestamp of the error */
  timestamp: z.string().datetime(),
});

export type StandardErrorResponse = z.infer<typeof StandardErrorResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Common Parameter Schemas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * UUID path parameter schema.
 * Used for all `:id` route parameters.
 */
export const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

export type UuidParam = z.infer<typeof UuidParamSchema>;

/**
 * Date range query parameters.
 * Coerces ISO date strings to Date objects.
 */
export const DateRangeQuerySchema = z.object({
  /** Start date (inclusive) — ISO 8601 date string */
  dateFrom: z.coerce.date().optional(),
  /** End date (inclusive) — ISO 8601 date string */
  dateTo: z.coerce.date().optional(),
});

export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;

/**
 * Search query parameter.
 * Trims whitespace and enforces minimum length for meaningful search.
 */
export const SearchQuerySchema = z.object({
  /** Full-text search query string */
  search: z
    .string()
    .trim()
    .min(1, 'Search query must not be empty')
    .max(200, 'Search query must be ≤ 200 characters')
    .optional(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Success Response Wrappers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard message response for mutation operations.
 */
export const MessageResponseSchema = z.object({
  /** Human-readable status message */
  message: z.string(),
  /** ISO 8601 timestamp */
  timestamp: z.string().datetime(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;

/**
 * Standard async job response for long-running operations.
 * Returned by endpoints that trigger BullMQ jobs.
 */
export const AsyncJobResponseSchema = z.object({
  /** BullMQ job identifier */
  jobId: z.string(),
  /** Current job status */
  status: z.enum(['queued', 'active', 'completed', 'failed']),
  /** Human-readable status message */
  message: z.string(),
  /** ISO 8601 timestamp of when the job was queued */
  timestamp: z.string().datetime(),
});

export type AsyncJobResponse = z.infer<typeof AsyncJobResponseSchema>;
