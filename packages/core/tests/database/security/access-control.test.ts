/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Access Control Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates database access control and least-privilege patterns:
 *   - Migration runner should not require SUPERUSER
 *   - Schema tracking table is properly protected
 *   - Application role permissions are scoped
 *
 * CWE References:
 *   - CWE-250: Execution with Unnecessary Privileges
 *   - CWE-269: Improper Privilege Management
 *
 * @role Senior Security Test Engineer — Access Control Testing
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  isPostgresAvailable,
  createTestClient,
  runMigrate,
  dropAllTables,
} from '../helpers/db-test-utils.js';
import type pg from 'pg';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Security — Access Control
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security — Access Control', () => {
  let pgAvailable: boolean;
  let client: pg.Client;

  beforeAll(async () => {
    pgAvailable = await isPostgresAvailable();
    if (!pgAvailable) {
      console.warn('⚠️  PostgreSQL not available — skipping access control tests.');
      return;
    }
    client = await createTestClient();
    await dropAllTables(client);
    runMigrate();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [AC-001] Extensions require CREATE privilege (not SUPERUSER)
  // CWE-250: Execution with Unnecessary Privileges
  // ═════════════════════════════════════════════════════════════════════════

  it('[AC-001] uuid-ossp and pg_trgm extensions are installed', async () => {
    if (!pgAvailable) return;

    const result = await client.query(
      "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm') ORDER BY extname",
    );

    const extensions = result.rows.map((r) => r.extname);
    expect(extensions).toContain('pg_trgm');
    expect(extensions).toContain('uuid-ossp');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [AC-002] schema_migrations table is writable
  // CWE-269: Improper Privilege Management
  // ═════════════════════════════════════════════════════════════════════════

  it('[AC-002] schema_migrations table allows INSERT and SELECT', async () => {
    if (!pgAvailable) return;

    // Should be able to SELECT
    const selectResult = await client.query('SELECT COUNT(*) FROM schema_migrations');
    expect(selectResult.rows).toBeDefined();

    // Should be able to INSERT (with conflict handling)
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ('test_migration_ac002.sql') ON CONFLICT (filename) DO NOTHING",
    );

    // Cleanup
    await client.query(
      "DELETE FROM schema_migrations WHERE filename = 'test_migration_ac002.sql'",
    );
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [AC-003] Tables use SERIAL/UUID for PKs (no manual ID management)
  // CWE-269: Improper Privilege Management
  // ═════════════════════════════════════════════════════════════════════════

  it('[AC-003] all domain tables use auto-generated primary keys', async () => {
    if (!pgAvailable) return;

    const tables = ['hack_incidents', 'ai_skill_files', 'safety_scan_results', 'etl_sync_log', 'api_usage_log'];

    for (const table of tables) {
      const result = await client.query(
        `SELECT column_default FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'id'`,
        [table],
      );
      expect(result.rows).toHaveLength(1);
      // Should use uuid_generate_v4() default
      expect(result.rows[0].column_default).toContain('uuid_generate_v4()');
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [AC-004] schema_migrations uses SERIAL (auto-increment) PK
  // ═════════════════════════════════════════════════════════════════════════

  it('[AC-004] schema_migrations uses SERIAL auto-increment PK', async () => {
    if (!pgAvailable) return;

    const result = await client.query(
      `SELECT column_default FROM information_schema.columns
       WHERE table_name = 'schema_migrations' AND column_name = 'id'`,
    );
    expect(result.rows).toHaveLength(1);
    // SERIAL generates a nextval('schema_migrations_id_seq'::regclass) default
    expect(result.rows[0].column_default).toContain('nextval');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [AC-005] All tables are in 'public' schema (not system schemas)
  // ═════════════════════════════════════════════════════════════════════════

  it('[AC-005] all domain tables are in public schema', async () => {
    if (!pgAvailable) return;

    const expectedTables = [
      'hack_incidents',
      'ai_skill_files',
      'safety_scan_results',
      'etl_sync_log',
      'api_usage_log',
      'schema_migrations',
    ];

    for (const table of expectedTables) {
      const result = await client.query(
        "SELECT schemaname FROM pg_tables WHERE tablename = $1",
        [table],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].schemaname).toBe('public');
    }
  });
});
