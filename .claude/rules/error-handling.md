# Error Handling — Mandatory Rules

## Error Hierarchy

All errors extend a base `AegisError` class defined in `@aegis/core`:

```typescript
// @aegis/core/src/shared/errors/

abstract class AegisError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
}

// Domain Errors (4xx — client errors)
class NotFoundError extends AegisError {
  code = 'NOT_FOUND';
  statusCode = 404;
}
class ValidationError extends AegisError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
}
class UnauthorizedError extends AegisError {
  code = 'UNAUTHORIZED';
  statusCode = 401;
}
class ForbiddenError extends AegisError {
  code = 'FORBIDDEN';
  statusCode = 403;
}
class ConflictError extends AegisError {
  code = 'CONFLICT';
  statusCode = 409;
}
class RateLimitError extends AegisError {
  code = 'RATE_LIMITED';
  statusCode = 429;
}

// Infrastructure Errors (5xx — server errors)
class DatabaseError extends AegisError {
  code = 'DATABASE_ERROR';
  statusCode = 500;
}
class CacheError extends AegisError {
  code = 'CACHE_ERROR';
  statusCode = 500;
}
class ExternalServiceError extends AegisError {
  code = 'EXTERNAL_SERVICE_ERROR';
  statusCode = 502;
}
class TimeoutError extends AegisError {
  code = 'TIMEOUT';
  statusCode = 504;
}

// Engine-Specific Errors
class ETLSyncError extends AegisError {
  code = 'ETL_SYNC_ERROR';
  statusCode = 500;
}
class SafetyScanError extends AegisError {
  code = 'SAFETY_SCAN_ERROR';
  statusCode = 500;
}
class ForensicSimulationError extends AegisError {
  code = 'FORENSIC_SIM_ERROR';
  statusCode = 500;
}
```

## Rules

### Never Swallow Errors

```typescript
// ❌ WRONG — error silently disappears
try {
  await fetchData();
} catch (e) {
  /* do nothing */
}

// ✅ CORRECT — error is logged and re-thrown or handled
try {
  await fetchData();
} catch (error) {
  logger.error('Failed to fetch data', { error, context: { source: 'defillama' } });
  throw new ExternalServiceError('DefiLlama API unreachable', { cause: error });
}
```

### Use Typed Errors

```typescript
// ❌ WRONG — generic error with no type info
throw new Error('Hack not found');

// ✅ CORRECT — typed error with context
throw new NotFoundError(`HackIncident not found: ${id}`, {
  context: { entityType: 'HackIncident', id },
});
```

### Error Response Format

All errors returned to the client must follow this structure:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "HackIncident not found: abc-123",
    "statusCode": 404,
    "timestamp": "2026-03-29T00:00:00.000Z"
  }
}
```

### Async Error Handling

- Always `await` promises — no fire-and-forget without explicit error handling
- Use `Promise.allSettled()` for parallel operations that should not fail fast
- Wrap BullMQ job processors with try/catch and structured error logging
- Set timeouts on all external calls (DefiLlama API, GitHub API, RPC nodes)

### Validation Errors

- Use Zod `.safeParse()` and return structured validation errors
- Include field path and expected type in error details
- Never expose internal error details to the client in production

### Logging Standards

- Log errors with structured context (JSON format via Winston)
- Include correlation ID (`requestId`) in all error logs
- Log at appropriate levels:
  - `error` — Unrecoverable failures, 5xx responses
  - `warn` — Recoverable issues, deprecated usage, rate limiting
  - `info` — Successful operations, state transitions
  - `debug` — Detailed execution flow (dev only)

### Retry Strategy

| Operation        | Max Retries | Backoff                   | Timeout |
| ---------------- | ----------- | ------------------------- | ------- |
| DefiLlama API    | 3           | Exponential (1s, 2s, 4s)  | 30s     |
| GitHub API       | 3           | Exponential (1s, 2s, 4s)  | 30s     |
| EVM RPC calls    | 5           | Exponential (500ms base)  | 15s     |
| Database queries | 2           | Fixed (500ms)             | 30s     |
| Redis operations | 2           | Fixed (100ms)             | 5s      |
| BullMQ jobs      | 3           | Exponential (1m, 5m, 30m) | 10m     |
