-- Migration: 005_create_etl_sync_log.sql
-- Description: Create the etl_sync_log table for ETL job tracking and debugging.
--              Infrastructure table — not mapped from a domain entity.
-- Author: Senior Data Architect
-- Date: 2026-04-15
-- Task: P1-ARCH-007

-- UP
BEGIN;

CREATE TABLE IF NOT EXISTS etl_sync_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source          VARCHAR(50) NOT NULL,
    engine          VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    records_added   INTEGER NOT NULL DEFAULT 0,
    records_updated INTEGER NOT NULL DEFAULT 0,
    error_message   TEXT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_etl_sync_source ON etl_sync_log (source, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_etl_sync_engine ON etl_sync_log (engine);
CREATE INDEX IF NOT EXISTS idx_etl_sync_status ON etl_sync_log (status);

COMMIT;

-- DOWN
BEGIN;

DROP TABLE IF EXISTS etl_sync_log CASCADE;

COMMIT;
