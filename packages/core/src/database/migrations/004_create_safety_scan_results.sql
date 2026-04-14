-- Migration: 004_create_safety_scan_results.sql
-- Description: Create the safety_scan_results table with FK cascade to ai_skill_files.
--              Maps from SafetyScanResultSchema (Safety Scanner output).
-- Author: Senior Data Architect
-- Date: 2026-04-15
-- Task: P1-ARCH-007

-- UP
BEGIN;

CREATE TABLE IF NOT EXISTS safety_scan_results (
    -- ── Identity ──────────────────────────────────────────────────────────────
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ── FK to Skill File ──────────────────────────────────────────────────────
    skill_file_id           UUID NOT NULL
                            REFERENCES ai_skill_files(id)
                            ON DELETE CASCADE,

    -- ── Scan Execution ────────────────────────────────────────────────────────
    scan_timestamp          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scan_duration_ms        INTEGER NOT NULL DEFAULT 0,
    scanner_version         VARCHAR(20) NOT NULL,
    total_rules_evaluated   INTEGER NOT NULL DEFAULT 0,

    -- ── Results ───────────────────────────────────────────────────────────────
    final_label             VARCHAR(20) NOT NULL,
    findings                JSONB NOT NULL DEFAULT '[]',
    rule_matches            JSONB NOT NULL DEFAULT '[]',

    -- ── Finding Counts (denormalized for query performance) ───────────────────
    critical_count          INTEGER NOT NULL DEFAULT 0,
    high_count              INTEGER NOT NULL DEFAULT 0,
    medium_count            INTEGER NOT NULL DEFAULT 0,
    low_count               INTEGER NOT NULL DEFAULT 0,
    info_count              INTEGER NOT NULL DEFAULT 0,

    -- ── Manual Review ─────────────────────────────────────────────────────────
    manual_review_status    VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by             VARCHAR(255),
    review_notes            TEXT,
    overridden_label        VARCHAR(20),

    -- ── Metadata ──────────────────────────────────────────────────────────────
    content_hash_at_scan    CHAR(64),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scan_skill_file_id     ON safety_scan_results (skill_file_id);
CREATE INDEX IF NOT EXISTS idx_scan_final_label       ON safety_scan_results (final_label);
CREATE INDEX IF NOT EXISTS idx_scan_timestamp         ON safety_scan_results (scan_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scan_review_status     ON safety_scan_results (manual_review_status);

COMMIT;

-- DOWN
BEGIN;

DROP TABLE IF EXISTS safety_scan_results CASCADE;

COMMIT;
