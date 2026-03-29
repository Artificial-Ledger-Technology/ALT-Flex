# API Conventions — Mandatory Rules

## API Gateway Architecture

AltFlex AEGIS uses the **Backend-for-Frontend (BFF) pattern** with a single Fastify 5 API gateway (`@aegis/api-gateway`). All client requests route through this gateway.

## Route Conventions

### Base URL

```
/api/v1/<resource>
```

### Versioning

- URL-based versioning: `/api/v1/`, `/api/v2/`
- Never break backward compatibility within a version
- Deprecate with 6-month sunset period and `Deprecation` header

### Endpoint Naming

- Use **plural nouns** for resources: `/hacks`, `/skills`, `/forensics`
- Use **kebab-case** for multi-word paths: `/attack-vectors`, `/safety-scans`
- Use **path parameters** for single resource: `/hacks/:id`
- Use **query parameters** for filtering: `/hacks?chain=ethereum&vector=flash-loan`

### HTTP Methods

| Method   | Usage                              | Idempotent |
| -------- | ---------------------------------- | ---------- |
| `GET`    | Read resources / search / filter   | Yes        |
| `POST`   | Create resources / trigger actions | No         |
| `PUT`    | Full resource replacement          | Yes        |
| `PATCH`  | Partial update                     | No         |
| `DELETE` | Remove resources                   | Yes        |

## Request/Response Standards

### Request Validation

- ALL request bodies validated with **Zod schemas** before processing
- Query parameters validated and typed
- Path parameters validated (UUID format, etc.)

### Response Format

```typescript
// Success response
{
  "data": T,
  "meta": {
    "timestamp": string,    // ISO 8601
    "version": string       // API version
  }
}

// Paginated response
{
  "data": T[],
  "meta": {
    "timestamp": string,
    "version": string
  },
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}

// Error response
{
  "error": {
    "code": string,         // Machine-readable error code
    "message": string,      // Human-readable message
    "statusCode": number,   // HTTP status code
    "details"?: unknown     // Optional validation errors
  }
}
```

### HTTP Status Codes

| Code | Usage                                  |
| ---- | -------------------------------------- |
| 200  | Success                                |
| 201  | Resource created                       |
| 204  | Success, no content                    |
| 400  | Bad request / validation error         |
| 401  | Unauthorized — missing or invalid auth |
| 403  | Forbidden — insufficient permissions   |
| 404  | Resource not found                     |
| 409  | Conflict — duplicate resource          |
| 422  | Unprocessable entity                   |
| 429  | Rate limit exceeded                    |
| 500  | Internal server error                  |

## Middleware Stack

Every request passes through (in order):

1. **CORS** — Configured per environment
2. **Rate Limiting** — 100 req/min per IP (configurable)
3. **Request ID** — UUID correlation ID on every request
4. **Authentication** — JWT verification on protected routes
5. **Validation** — Zod schema validation
6. **Handler** — Route business logic
7. **Error Handler** — Structured error response

## Documentation

- All endpoints must have OpenAPI 3.1 annotations
- Auto-generated Swagger UI at `/api/v1/docs` (dev only)
- Keep `docs/API_SPECIFICATION.md` in sync with implementation
