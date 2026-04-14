-- Migration: 006_create_api_usage_log.sql
-- Description: Create the api_usage_log table for API usage analytics.
--              Infrastructure table — not mapped from a domain entity.
-- Author: Senior Data Architect
-- Date: 2026-04-15
-- Task: P1-ARCH-007

-- UP
BEGIN;

CREATE TABLE IF NOT EXISTS api_usage_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint            VARCHAR(255) NOT NULL,
    method              VARCHAR(10) NOT NULL,
    status_code         INTEGER NOT NULL,
    response_time_ms    INTEGER NOT NULL,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint   ON api_usage_log (endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_method     ON api_usage_log (method);
CREATE INDEX IF NOT EXISTS idx_api_usage_status     ON api_usage_log (status_code);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_log (created_at DESC);

COMMIT;

-- DOWN
BEGIN;

DROP TABLE IF EXISTS api_usage_log CASCADE;

COMMIT;
