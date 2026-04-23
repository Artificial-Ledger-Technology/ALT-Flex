-- Migration: 003_create_ai_skill_files.sql
-- Description: Create the ai_skill_files table with unique constraints and indexes.
--              Maps from AISkillFileSchema (Engine β — AI Skills Explorer).
-- Author: Senior Data Architect
-- Date: 2026-04-15
-- Task: P1-ARCH-007

-- UP
BEGIN;

CREATE TABLE IF NOT EXISTS ai_skill_files (
    -- ── Identity ──────────────────────────────────────────────────────────────
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ── Skill Metadata ────────────────────────────────────────────────────────
    name                VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    category            VARCHAR(50) NOT NULL DEFAULT 'general',
    tags                JSONB NOT NULL DEFAULT '[]',
    version             VARCHAR(50),

    -- ── Source Information ─────────────────────────────────────────────────────
    source_repo         VARCHAR(255) NOT NULL,
    file_path           VARCHAR(500) NOT NULL,
    raw_url             TEXT,
    commit_sha          VARCHAR(40),
    license             VARCHAR(100),

    -- ── Content ───────────────────────────────────────────────────────────────
    platform            VARCHAR(50) NOT NULL,
    language            VARCHAR(50) NOT NULL,
    content             TEXT NOT NULL,
    format              VARCHAR(20) NOT NULL,
    content_hash        CHAR(64) NOT NULL,
    content_size_bytes  INTEGER NOT NULL DEFAULT 0,

    -- ── Safety ────────────────────────────────────────────────────────────────
    safety_label        VARCHAR(20) NOT NULL DEFAULT 'unanalyzed',
    latest_scan_id      UUID,

    -- ── Attribution ───────────────────────────────────────────────────────────
    author              VARCHAR(255) NOT NULL DEFAULT 'Unknown',
    author_url          TEXT,

    -- ── Engagement Metrics ────────────────────────────────────────────────────
    copy_count          INTEGER NOT NULL DEFAULT 0,
    star_count          INTEGER NOT NULL DEFAULT 0,
    view_count          INTEGER NOT NULL DEFAULT 0,

    -- ── ETL Metadata ──────────────────────────────────────────────────────────
    last_synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ── Unique Constraints ────────────────────────────────────────────────────
    CONSTRAINT uq_skill_source_path  UNIQUE (source_repo, file_path),
    CONSTRAINT uq_skill_content_hash UNIQUE (content_hash)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_skill_platform      ON ai_skill_files (platform);
CREATE INDEX IF NOT EXISTS idx_skill_language      ON ai_skill_files (language);
CREATE INDEX IF NOT EXISTS idx_skill_safety_label  ON ai_skill_files (safety_label);
CREATE INDEX IF NOT EXISTS idx_skill_author        ON ai_skill_files (author);
CREATE INDEX IF NOT EXISTS idx_skill_category      ON ai_skill_files (category);
CREATE INDEX IF NOT EXISTS idx_skill_name_trgm     ON ai_skill_files USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skill_copy_count    ON ai_skill_files (copy_count DESC);
CREATE INDEX IF NOT EXISTS idx_skill_created_at    ON ai_skill_files (created_at DESC);

COMMIT;

-- DOWN
BEGIN;

DROP TABLE IF EXISTS ai_skill_files CASCADE;

COMMIT;
