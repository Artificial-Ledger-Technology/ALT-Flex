---
description: Phase 1 Architecture & API Design workflow — maps each P1-ARCH task to the responsible Senior role and defines the execution order.
---

# Phase 1: High-Level Architecture & API Design Workflow

This workflow orchestrates the 14 Senior-level agent roles through Phase 1 of AltFlex AEGIS v3.0 development. Every task has a clearly assigned lead and supporting roles.

## Prerequisites

- Phase 0 (Clean Slate Initialization) ✅ Complete
- All 14 Senior agent skills configured and available
- Docker infrastructure (PostgreSQL 16, Redis 7) bootable via `docker compose`

---

## Step 1: System Architecture Design (P1-ARCH-001)

**Lead**: Senior Blockchain Architect
**Support**: Senior Technical Writer, Senior Software Engineer

1. Design C4 Level 1 — System Context diagram (AEGIS in Web3 ecosystem)
2. Design C4 Level 2 — Container diagram (6 services + 2 datastores + external APIs)
3. Design C4 Level 3 — Component diagrams for each engine (Hacks, Skills, Forensic)
4. Design hexagonal architecture diagrams — ports & adapters for each engine
5. Design data flow diagrams — ETL pipeline, safety scanner pipeline
6. Design sequence diagrams — hack search, skill copy, exploit simulation
7. Define technology stack matrix with justifications
8. Define cross-cutting concerns — logging, error handling, auth, caching
9. All diagrams authored in Mermaid for version control

**Deliverable**: `ARCHITECTURE.md` with 10 Mermaid diagrams

---

## Step 2: README Hero Page (P1-ARCH-002)

**Lead**: Senior Technical Writer
**Support**: Senior Blockchain Architect

1. Design hero section with AEGIS v3.0 branding and tagline
2. Create dual-engine feature matrix (Hacks Dashboard + AI Skills Explorer)
3. Embed architecture overview diagram from ARCHITECTURE.md
4. Add tech stack badges (TypeScript, Next.js 15, PostgreSQL, Redis, Foundry, Docker)
5. Write quick-start guide (Docker and local development)
6. Create phase roadmap table (Phase 0–6 with status indicators)
7. Add academic alignment section (Thesis 1 & 2)
8. Create API endpoints summary table
9. Write contributing guidelines and license section

**Deliverable**: `README.md` hero page

---

## Step 3: API Contract Design (P1-ARCH-003, 004, 005, 006)

**Lead**: Senior API Design Engineer
**Support**: Senior Software Engineer, Senior Data Architect, Senior Blockchain Engineer

### 3a. Hacks Dashboard API (P1-ARCH-003)

1. Define 8 endpoints for the Hacks Dashboard (Engine α)
2. Design Zod request/response schemas for each endpoint
3. Define filter parameters: attackVector, chain, date range, loss range, hasFoundryPoc
4. Define sorting: date, lossUsd, protocolName (asc/desc)
5. Define pagination pattern: `{ data, total, page, pageSize, totalPages }`

### 3b. AI Skills Explorer API (P1-ARCH-004)

1. Define 11 endpoints for the AI Skills Explorer (Engine β)
2. Design Zod schemas for skill files, safety scans, and statistics
3. Define filter parameters: platform, language, safetyLabel, author, format
4. Define sorting: name, copyCount, starCount, createdAt (asc/desc)

### 3c. Forensic Engine API (P1-ARCH-005)

1. Define 6 endpoints for the Forensic Engine
2. Design async job pattern with BullMQ for long-running operations
3. Define job status format: `{ jobId, status, result?, error?, progress }`

### 3d. System & Gateway API (P1-ARCH-006)

1. Define 5 system endpoints: health, detailed health, meta, auth, rate-limit
2. Standardize error response format: `{ error, code, message, details?, timestamp }`
3. Define health response format with per-service breakdown
4. Define standard error codes enum

**Deliverable**: OpenAPI 3.1 specification for all 30 endpoints

---

## Step 4: Database Design (P1-ARCH-007)

**Lead**: Senior Data Architect
**Support**: Senior Software Engineer

1. Write `001_extensions.sql` — Enable uuid-ossp, pg_trgm
2. Write `002_create_hack_incidents.sql` — Hacks table with all indexes
3. Write `003_create_ai_skill_files.sql` — Skills table with unique constraints
4. Write `004_create_safety_scan_results.sql` — Safety scan results with FK cascade
5. Write `005_create_etl_sync_log.sql` — ETL job tracking table
6. Write `006_create_api_usage_log.sql` — API usage analytics table
7. Write DOWN migrations (rollback) for every UP migration
8. Create migration runner script (`pnpm run migrate`)
9. Test all migrations against PostgreSQL 16 via Docker

**Deliverable**: 6 migration files (UP + DOWN), migration runner script

---

## Step 5: Seed Data Curation (P1-ARCH-008)

**Lead**: Senior Data Architect
**Support**: Senior API Design Engineer

1. Curate 50+ hack incidents from DefiLlama spanning 2020–2026
2. Ensure coverage of all 16 attack vector categories
3. Include the "Top 10" largest DeFi hacks by loss amount
4. Include 10+ incidents with DeFiHackLabs Foundry POC references
5. Create 10 sample AI skill files for Skills Engine
6. Include at least 1 skill per safety label (safe, suspicious, malicious)
7. Store seed data as TypeScript files for type safety
8. Create idempotent seed script (`pnpm run seed`)

**Deliverable**: Seed data files, `pnpm run seed` script

---

## Step 6: Package Wiring (P1-ARCH-009)

**Lead**: Senior Software Engineer
**Support**: Senior Blockchain Architect

1. Create barrel exports (`index.ts`) for @aegis/core
2. Wire @aegis/hacks-engine imports from @aegis/core
3. Wire @aegis/skills-engine imports from @aegis/core
4. Wire @aegis/forensic-engine imports from @aegis/core
5. Wire apps/api-gateway imports from all 3 engine packages
6. Wire apps/web to use @aegis/core types
7. Configure TypeScript composite and project references
8. Verify `pnpm run build` builds in correct dependency order
9. Verify `tsc --build` works from monorepo root

**Deliverable**: Configured inter-package dependencies, working build

---

## Step 7: Error Handling & Logging (P1-ARCH-010)

**Lead**: Senior Software Engineer
**Support**: Senior Blockchain Architect

1. Implement AegisError base class with code, statusCode, details
2. Implement error hierarchy (Validation, NotFound, Conflict, etc.)
3. Configure Winston logger with JSON format and log levels
4. Implement request-scoped correlation ID via AsyncLocalStorage
5. Implement error serialization (no stack traces in production)
6. All code in @aegis/core for cross-package usage

**Deliverable**: Error hierarchy, structured logging, correlation ID system

---

## Step 8: API Gateway Skeleton (P1-ARCH-011)

**Lead**: Senior Software Engineer
**Support**: Senior API Design Engineer, Senior DevOps Engineer

1. Bootstrap Fastify server on configurable port (default 4000)
2. Configure CORS for frontend origin
3. Add rate limiting via @fastify/rate-limit
4. Add Swagger via @fastify/swagger + @fastify/swagger-ui
5. Integrate Zod validation with Fastify type providers
6. Add error handler middleware using AegisError hierarchy
7. Add correlation ID middleware
8. Register all route files (return 501 Not Implemented)
9. Implement GET /api/v1/health
10. Implement GET /docs (Swagger UI)
11. Add graceful shutdown handler

**Deliverable**: Working Fastify server with health check and Swagger UI

---

## Step 9: Phase Gate Validation (P1-ARCH-012)

**Lead**: Senior QA Engineer
**Support**: Senior Code Reviewer, ALL roles

1. Verify all 10 ARCHITECTURE.md diagrams render correctly
2. Verify README.md hero page content
3. Verify all API contracts documented with request/response schemas
4. Verify all 6 migration files execute without errors
5. Verify `pnpm run seed` populates 50+ hacks, 10+ skills
6. Verify `GET /api/v1/health` returns healthy status
7. Verify `GET /docs` renders all registered endpoints
8. Verify `pnpm run build` succeeds
9. Verify standardized error responses from gateway
10. Verify structured JSON logs with correlation IDs
11. Verify `tsc --noEmit` reports 0 errors
12. Verify all documents are cross-referenced and consistent

**Deliverable**: Phase Gate Report — all criteria ✅ or identified blockers

---

## Cross-Phase Collaboration Matrix

| Step                | Lead                        | Supporting Roles                                                            |
| ------------------- | --------------------------- | --------------------------------------------------------------------------- |
| 1. Architecture     | Senior Blockchain Architect | Senior Technical Writer, Senior Software Engineer                           |
| 2. README           | Senior Technical Writer     | Senior Blockchain Architect                                                 |
| 3. API Contracts    | Senior API Design Engineer  | Senior Software Engineer, Senior Data Architect, Senior Blockchain Engineer |
| 4. DB Migrations    | Senior Data Architect       | Senior Software Engineer                                                    |
| 5. Seed Data        | Senior Data Architect       | Senior API Design Engineer                                                  |
| 6. Package Wiring   | Senior Software Engineer    | Senior Blockchain Architect                                                 |
| 7. Error & Logging  | Senior Software Engineer    | Senior Blockchain Architect                                                 |
| 8. Gateway Skeleton | Senior Software Engineer    | Senior API Design Engineer, Senior DevOps Engineer                          |
| 9. Phase Gate       | Senior QA Engineer          | Senior Code Reviewer, ALL                                                   |

---

## Dependency Graph

Steps 1 and 3d (System API) can start immediately.
Steps 2, 3a, 3b, 3c, and 6 depend on Step 1.
Step 4 depends on Steps 3a and 3b.
Step 5 depends on Step 4.
Step 7 depends on Step 6.
Step 8 depends on Steps 3d and 7.
Step 9 depends on Steps 2, 5, and 8.

---

_Aligned with: `docs/CODE_REVIEW_PHASE1.md` v3.1.0_
