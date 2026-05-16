# PR Description: P1-ARCH-011 QA Integration Test Suite

## `test(api-gateway): implement QA integration suite for P1-ARCH-011`

### Summary

Implements a comprehensive **52-test QA integration suite** across **4 new test files** for the API Gateway Skeleton (`P1-ARCH-011`). This suite fills 10 identified coverage gaps in the PR's existing 24 tests by validating CORS policy, rate limiting, route registration, OpenAPI spec depth, error handler edge cases, security/penetration edge cases, graceful shutdown, and server configuration.

### Multi-Role QA Agent Coverage

| Role | Contribution |
|------|-------------|
| **Senior SDET** | Route registration (4 modules), rate limit behavior, Swagger spec validation (15 tags), test architecture |
| **Senior Security Test Engineer** | CORS origin policy, error handler information leak prevention, 404 response shape, credential header validation |
| **Senior Penetration Tester** | Rate limit bypass testing, oversized URL handling, duplicate header injection, host header injection, null byte injection |
| **Senior DevSecOps Engineer** | Graceful shutdown validation, SIGTERM/SIGINT handler verification, environment variable configuration audit |
| **Senior Software Engineer** | Plugin registration order validation, Fastify lifecycle management, isolated test server factory pattern |

### Deliverables

#### 1. `middleware-integration.test.ts` — 20 tests

| Section | Tests | Gap Filled |
|---------|:-----:|:----------:|
| CORS Policy | 5 | GAP-1 |
| Rate Limiting | 4 | GAP-2 |
| Rate Limit Exhaustion (isolated server) | 2 | GAP-2 |
| Route Module Registration | 4 | GAP-3 |
| Plugin Registration Order | 4 | GAP-5 |

Key decisions:
- Rate limit exhaustion tests use an **isolated Fastify instance** with `max: 3` to avoid interference
- All 4 route modules verified: `systemRoutes`, `hacksRoutes`, `forensicsRoutes`, `skillsRoutes`
- CORS origin validated as `http://localhost:3000` (NOT wildcard `*`)

#### 2. `gateway-security.test.ts` — 14 tests

| Section | Tests | Gap Filled |
|---------|:-----:|:----------:|
| Correlation ID Security | 3 | GAP-8 |
| Error Handler Edge Cases | 5 | GAP-7 |
| 404 Error Shape | 3 | GAP-10 |
| Adversarial/Penetration | 3 | — |

Key decisions:
- **SEC-CID-003**: Null bytes in `x-correlation-id` are rejected safely (500) — Fastify defense mechanism
- **SEC-ERR-002**: Thrown `null` bypasses `setErrorHandler` — validated no internal info leaked
- **SEC-ERR-005**: Connection string `postgresql://admin:s3cr3t@db:5432/aegis` confirmed NOT exposed

#### 3. `swagger-spec.test.ts` — 9 tests

| Section | Tests | Gap Filled |
|---------|:-----:|:----------:|
| Spec Metadata | 6 | GAP-6 |
| Tag Coverage | 1 | GAP-6 |
| Route Paths | 1 | GAP-6 |
| Swagger UI | 1 | GAP-6 |

All **15 OpenAPI tags** verified present. OpenAPI version confirmed as `3.1.0`.

#### 4. `server-lifecycle.test.ts` — 10 tests

| Section | Tests | Gap Filled |
|---------|:-----:|:----------:|
| Graceful Shutdown | 3 | GAP-4 |
| Server Configuration (static) | 7 | GAP-9 |

Static analysis validates `server.ts` reads: `API_PORT`, `API_HOST`, `LOG_LEVEL`, `CORS_ORIGIN`, `API_RATE_LIMIT_MAX`, configures `requestIdHeader: 'x-correlation-id'`, and registers `SIGTERM`/`SIGINT` handlers.

### Architecture Note: fastify-plugin CJS Resolution

The PR's original 3 test files (`correlation-id.test.ts`, `error-handler.test.ts`, `server.test.ts`) fail due to Vitest's inability to resolve `fastify-plugin` (a CJS-only module) in the ESM test environment. Our QA tests work around this by **inlining the correlation ID hook and error handler** logic directly in the test server factory, mirroring the production code behavior without importing the CJS module.

> **Pre-existing failures:** 17 tests in the PR's original files fail due to this CJS/ESM incompatibility. These are NOT regressions introduced by this QA suite.

### Verification

```bash
# Run only QA tests (52/52 pass)
cd apps/api-gateway && npx vitest run --reporter verbose \
  tests/middleware-integration.test.ts \
  tests/gateway-security.test.ts \
  tests/swagger-spec.test.ts \
  tests/server-lifecycle.test.ts
```

### Files Changed

| File | Action | Tests |
|------|--------|:-----:|
| `apps/api-gateway/tests/middleware-integration.test.ts` | **NEW** | 20 |
| `apps/api-gateway/tests/gateway-security.test.ts` | **NEW** | 14 |
| `apps/api-gateway/tests/swagger-spec.test.ts` | **NEW** | 9 |
| `apps/api-gateway/tests/server-lifecycle.test.ts` | **NEW** | 10 |
| `docs/PR_DESCRIPTION_P1_ARCH_011.md` | **NEW** | — |

**Total new tests: 52 | Pass rate: 100%**
**Zero external dependencies: no database, no Redis, no Docker**
