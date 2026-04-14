-- Migration: 001_extensions.sql
-- Description: Enable required PostgreSQL extensions for AEGIS v3.0
-- Author: Senior Data Architect
-- Date: 2026-04-15
-- Task: P1-ARCH-007

-- UP
BEGIN;

-- uuid-ossp: UUID v4 generation for all primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: Trigram-based fuzzy text search for protocol/skill name filtering
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

COMMIT;

-- DOWN
BEGIN;

DROP EXTENSION IF EXISTS "pg_trgm";
DROP EXTENSION IF EXISTS "uuid-ossp";

COMMIT;
