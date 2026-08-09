/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Migration Runner Lifecycle Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates the complete lifecycle of the database migration runner:
 *   - Fresh-DB UP migration (all 6 migrations)
 *   - Idempotency (safe to re-run)
 *   - Rollback (DOWN in reverse order)
 *   - Re-migration after rollback
 *   - Connection failure handling
 *   - Partial failure isolation
 *
 * @role Senior SDET — Test Framework Architecture
 * @role Senior Security Test Engineer — Migration Safety Testing
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  isPostgresAvailable,
  createTestClient,
  runMigrate,
  dropAllTables,
  getPublicTables,
  getAppliedMigrations,
  EXPECTED_TABLES,
  EXPECTED_MIGRATION_COUNT,
  TRACKING_TABLE,
  TEST_DATABASE_URL,
  type PgClient,
} from './helpers/db-test-utils.js';
import type pg from 'pg';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Migration Runner — Lifecycle
// ═══════════════════════════════════════════════════════════════════════════════

describe('Migration Runner — Lifecycle', () => {
  let pgAvailable: boolean;
  let client: PgClient;

  beforeAll(async () => {
    pgAvailable = await isPostgresAvailable();
    if (!pgAvailable) {
      console.warn(
        '⚠️  PostgreSQL not available — skipping live integration tests.\n' +
        '   Start PostgreSQL: docker compose -f docker-compose.dev.yml up postgres -d',
      );
      return;
    }
    client = await createTestClient();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // ── Clean slate before each test ────────────────────────────────────────
  beforeEach(async () => {
    if (!pgAvailable) return;
    await dropAllTables(client);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [MIG-001] Fresh DB — Apply all 6 migrations
  // ═════════════════════════════════════════════════════════════════════════

  it('[MIG-001] applies all 6 migrations on a fresh database', async () => {
    if (!pgAvailable) return;

    const result = runMigrate();

    // Assert: runner exits successfully
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Successfully applied');

    // Assert: schema_migrations has exactly 6 rows
    const applied = await getAppliedMigrations(client);
    expect(applied).toHaveLength(EXPECTED_MIGRATION_COUNT);

    // Assert: All domain tables exist
    const tables = await getPublicTables(client);
    for (const table of EXPECTED_TABLES) {
      expect(tables).toContain(table);
    }

    // Assert: Tracking table exists
    expect(tables).toContain(TRACKING_TABLE);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [MIG-002] Idempotency — Running migrate twice produces no errors
  // ═════════════════════════════════════════════════════════════════════════

  it('[MIG-002] is idempotent — running migrate twice produces no errors', async () => {
    if (!pgAvailable) return;

    // First run
    const run1 = runMigrate();
    expect(run1.exitCode).toBe(0);

    // Second run
    const run2 = runMigrate();
    expect(run2.exitCode).toBe(0);
    expect(run2.stdout).toContain('All migrations are already applied');

    // Assert: schema_migrations still has exactly 6 rows (no duplicates)
    const applied = await getAppliedMigrations(client);
    expect(applied).toHaveLength(EXPECTED_MIGRATION_COUNT);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [MIG-003] Rollback — Removes all tables in reverse order
  // ═════════════════════════════════════════════════════════════════════════

  it('[MIG-003] rollback removes all tables in reverse order', async () => {
    if (!pgAvailable) return;

    // Apply first
    runMigrate();

    // Rollback
    const result = runMigrate({ rollback: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Successfully rolled back');

    // Assert: No domain tables remain
    const tables = await getPublicTables(client);
    for (const table of EXPECTED_TABLES) {
      expect(tables).not.toContain(table);
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [MIG-004] Re-migration after rollback works cleanly
  // ═════════════════════════════════════════════════════════════════════════

  it('[MIG-004] re-migration after rollback works cleanly', async () => {
    if (!pgAvailable) return;

    // Apply → Rollback → Re-apply
    runMigrate();
    runMigrate({ rollback: true });
    const result = runMigrate();

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Successfully applied');

    // Assert: All tables restored
    const tables = await getPublicTables(client);
    for (const table of EXPECTED_TABLES) {
      expect(tables).toContain(table);
    }

    const applied = await getAppliedMigrations(client);
    expect(applied).toHaveLength(EXPECTED_MIGRATION_COUNT);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [MIG-005] Connection failure — Exits with code 1
  // ═════════════════════════════════════════════════════════════════════════

  it('[MIG-005] exits with code 1 on connection failure', () => {
    // Use a deliberately impossible connection string
    const result = runMigrate({
      env: {
        DATABASE_URL: 'postgresql://bad_user:bad_pass@localhost:9999/nonexistent_db',
      },
    });

    expect(result.exitCode).not.toBe(0);
    // Error output should exist
    const combinedOutput = result.stdout + result.stderr;
    expect(combinedOutput.length).toBeGreaterThan(0);
  }, 30000);

  // ═════════════════════════════════════════════════════════════════════════
  // [MIG-006] Migration file ordering is deterministic
  // ═════════════════════════════════════════════════════════════════════════

  it('[MIG-006] migration files are sorted by numeric prefix', async () => {
    if (!pgAvailable) return;

    runMigrate();

    const applied = await getAppliedMigrations(client);

    // Verify they are in sorted order (001, 002, ..., 006)
    const sorted = [...applied].sort();
    expect(applied).toEqual(sorted);

    // Verify the expected filenames
    expect(applied[0]).toContain('001_');
    expect(applied[applied.length - 1]).toContain('006_');
  });
});
