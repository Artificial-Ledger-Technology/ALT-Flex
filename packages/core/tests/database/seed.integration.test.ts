/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Seed Script Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates the seed script stub behavior:
 *   - Connects and lists tables when migrations are applied
 *   - Reports "not yet implemented" status
 *   - Fails gracefully if PostgreSQL is unreachable
 *
 * @role Senior SDET — Test Data Engineering
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  isPostgresAvailable,
  createTestClient,
  runMigrate,
  runSeed,
  dropAllTables,
  EXPECTED_TABLES,
  TRACKING_TABLE,
} from './helpers/db-test-utils.js';
import type pg from 'pg';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Seed Script — Stub Behavior
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seed Script — Stub Behavior', () => {
  let pgAvailable: boolean;
  let client: pg.Client;

  beforeAll(async () => {
    pgAvailable = await isPostgresAvailable();
    if (!pgAvailable) {
      console.warn('⚠️  PostgreSQL not available — skipping seed tests.');
      return;
    }
    client = await createTestClient();

    // Clean and apply migrations
    await dropAllTables(client);
    runMigrate();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEED-001] Stub connects and lists tables
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-001] seed script connects and lists available tables', async () => {
    if (!pgAvailable) return;

    const result = runSeed();

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Connected to PostgreSQL');
    expect(result.stdout).toContain('Available tables');

    // Should list all domain tables
    for (const table of EXPECTED_TABLES) {
      expect(result.stdout).toContain(table);
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEED-002] Reports "not yet implemented"
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-002] seed script reports not yet implemented', async () => {
    if (!pgAvailable) return;

    const result = runSeed();

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Seed data not yet implemented');
    expect(result.stdout).toContain('P1-ARCH-008');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEED-003] Exits gracefully on connection failure
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-003] seed script exits with error on connection failure', () => {
    const result = runSeed({
      env: {
        DATABASE_URL: 'postgresql://bad:bad@localhost:9999/nope',
      },
    });

    expect(result.exitCode).not.toBe(0);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEED-004] Does not insert any data (stub)
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-004] seed script does not insert data (stub)', async () => {
    if (!pgAvailable) return;

    runSeed();

    // Verify no rows in any domain table
    for (const table of EXPECTED_TABLES) {
      const result = await client.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
      expect(parseInt(result.rows[0].cnt)).toBe(0);
    }
  });
});
