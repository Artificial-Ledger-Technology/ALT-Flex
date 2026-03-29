# Database Conventions — Mandatory Rules

## Technology

- **Primary**: PostgreSQL 16 — relational data for Hacks Engine + Skills Engine
- **Cache**: Redis 7 — response caching + BullMQ job queue backend
- **ORM**: None — use raw SQL with type-safe query builders (pg + Zod)

## Schema Design

### Naming Conventions

| Element            | Convention                | Example                                         |
| ------------------ | ------------------------- | ----------------------------------------------- |
| Tables             | snake_case, plural        | `hack_incidents`, `ai_skill_files`              |
| Columns            | snake_case                | `protocol_name`, `attack_vector`, `created_at`  |
| Primary Keys       | `id` (UUID v4)            | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Foreign Keys       | `<table>_id`              | `hack_incident_id`                              |
| Indexes            | `idx_<table>_<column(s)>` | `idx_hack_incidents_chain`                      |
| Unique Constraints | `uq_<table>_<column(s)>`  | `uq_ai_skill_files_content_hash`                |
| Check Constraints  | `ck_<table>_<column>`     | `ck_hack_incidents_loss_usd_positive`           |

### Column Standards

- Every table has: `id`, `created_at`, `updated_at`
- `created_at` / `updated_at` use `TIMESTAMPTZ` with default `NOW()`
- Use `TIMESTAMPTZ` (not `TIMESTAMP`) for all date/time columns
- Use `TEXT` for strings — never `VARCHAR` without a strong reason
- Use `JSONB` for semi-structured data (e.g., skill file metadata)
- Use `NUMERIC` for monetary values (USD losses) — never `FLOAT`

### Indexing Strategy

- Primary keys are automatically indexed
- Index all foreign keys
- Index columns used in `WHERE` clauses and `ORDER BY`
- Use partial indexes for common filters: `WHERE is_deleted = false`
- Use GIN indexes for JSONB `@>` queries
- Use B-tree indexes for range queries (dates, amounts)

## Migrations

### Rules

1. Migrations are **forward-only** in production — no rollbacks
2. Every migration must be **idempotent** (`IF NOT EXISTS`)
3. Migrations live in: `packages/<engine>/src/infrastructure/migrations/`
4. File naming: `YYYYMMDD_HHMMSS_<description>.sql`
5. Separate DDL (schema) and DML (data) migrations
6. Large data migrations run in batches (1000 rows per batch)
7. Never drop columns in production — mark as deprecated, remove after 2 releases

### Migration Template

```sql
-- Migration: 20260301_120000_create_hack_incidents
-- Description: Create the hack_incidents table for Engine α

BEGIN;

CREATE TABLE IF NOT EXISTS hack_incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_name   TEXT NOT NULL,
    date            TIMESTAMPTZ NOT NULL,
    chain           TEXT NOT NULL,
    attack_vector   TEXT NOT NULL,
    loss_usd        NUMERIC NOT NULL CHECK (loss_usd >= 0),
    tx_hashes       TEXT[] DEFAULT '{}',
    has_foundry_poc BOOLEAN DEFAULT FALSE,
    data_source     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hack_incidents_chain ON hack_incidents (chain);
CREATE INDEX IF NOT EXISTS idx_hack_incidents_attack_vector ON hack_incidents (attack_vector);
CREATE INDEX IF NOT EXISTS idx_hack_incidents_date ON hack_incidents (date DESC);

COMMIT;
```

## Connection Management

### Pool Configuration

```
DATABASE_POOL_MIN=2    # Minimum connections
DATABASE_POOL_MAX=10   # Maximum connections
```

- Use connection pooling — never create per-request connections
- Close connections properly in error paths
- Set statement timeout: 30s for queries, 5m for migrations
- Use `DATABASE_SSL=true` in production

## Redis Usage

### Key Naming

- Prefix all keys: `aegis:<namespace>:<key>`
- Use colons `:` as separators
- Examples: `aegis:hacks:stats`, `aegis:skills:search:query123`, `aegis:cache:hack:uuid`

### TTL Policy

| Data Type                | TTL                | Rationale                            |
| ------------------------ | ------------------ | ------------------------------------ |
| API response cache       | 5 minutes          | Fresh data, low staleness tolerance  |
| Attack vector stats      | 1 hour             | Aggregated, changes infrequently     |
| Skill safety scan result | 24 hours           | Expensive to compute, rarely changes |
| Session tokens           | Matches JWT expiry | Security requirement                 |

### BullMQ Queues

- `aegis:queue:hacks-sync` — DefiLlama + DeFiHackLabs ETL jobs
- `aegis:queue:skills-index` — GitHub skill file indexing jobs
- `aegis:queue:safety-scan` — AI skill safety scanning jobs
