-- Migration: 002_create_hack_incidents.sql
-- Description: Create the hack_incidents table with all indexes and constraints.
--              Maps from HackIncidentSchema (Engine α — Hacks Dashboard).
-- Author: Senior Data Architect
-- Date: 2026-04-15
-- Task: P1-ARCH-007

-- UP
BEGIN;

CREATE TABLE IF NOT EXISTS hack_incidents (
    -- ── Identity ──────────────────────────────────────────────────────────────
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ── Core Incident Data ────────────────────────────────────────────────────
    protocol_name           VARCHAR(255) NOT NULL,
    protocol_slug           VARCHAR(255),
    date                    TIMESTAMPTZ NOT NULL,
    chain                   VARCHAR(50) NOT NULL,
    attack_vector           VARCHAR(50) NOT NULL,
    secondary_vectors       JSONB NOT NULL DEFAULT '[]',
    loss_usd                NUMERIC(20, 2) NOT NULL DEFAULT 0,
    funds_returned          NUMERIC(20, 2) NOT NULL DEFAULT 0,

    -- ── Transaction Evidence ──────────────────────────────────────────────────
    tx_hashes               JSONB NOT NULL DEFAULT '[]',
    transaction_refs        JSONB NOT NULL DEFAULT '[]',

    -- ── References & Sources ──────────────────────────────────────────────────
    sources                 JSONB NOT NULL DEFAULT '[]',
    description             TEXT NOT NULL DEFAULT '',
    post_mortem             TEXT,

    -- ── Foundry / POC Integration ─────────────────────────────────────────────
    has_foundry_poc         BOOLEAN NOT NULL DEFAULT FALSE,
    foundry_test_path       VARCHAR(500),
    target_contracts        JSONB NOT NULL DEFAULT '[]',

    -- ── Protocol Metadata ─────────────────────────────────────────────────────
    protocol_category       VARCHAR(50),
    protocol_tvl_at_exploit NUMERIC(20, 2),
    was_audited             BOOLEAN,
    audit_firms             JSONB NOT NULL DEFAULT '[]',

    -- ── ETL Metadata ──────────────────────────────────────────────────────────
    data_source             VARCHAR(50) NOT NULL,
    last_synced_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT hack_loss_usd_nonnegative       CHECK (loss_usd >= 0),
    CONSTRAINT hack_funds_returned_nonnegative CHECK (funds_returned >= 0),
    CONSTRAINT hack_funds_returned_lte_loss    CHECK (funds_returned <= loss_usd)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hack_chain             ON hack_incidents (chain);
CREATE INDEX IF NOT EXISTS idx_hack_attack_vector     ON hack_incidents (attack_vector);
CREATE INDEX IF NOT EXISTS idx_hack_date              ON hack_incidents (date DESC);
CREATE INDEX IF NOT EXISTS idx_hack_loss_usd          ON hack_incidents (loss_usd DESC);
CREATE INDEX IF NOT EXISTS idx_hack_data_source       ON hack_incidents (data_source);
CREATE INDEX IF NOT EXISTS idx_hack_protocol_name_trgm ON hack_incidents USING gin (protocol_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hack_has_foundry_poc   ON hack_incidents (id) WHERE has_foundry_poc = TRUE;

COMMIT;

-- DOWN
BEGIN;

DROP TABLE IF EXISTS hack_incidents CASCADE;

COMMIT;
