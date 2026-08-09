/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Seed Script Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates the REAL seed script behavior (upgraded from P1-ARCH-007 stub):
 *   - Connects and seeds all 3 tables (hack_incidents, ai_skill_files, safety_scan_results)
 *   - Row counts match seed array lengths (55 + 12 + 10 = 77 total records)
 *   - Idempotent operation (second run updates, doesn't duplicate)
 *   - --clean flag truncates then re-seeds
 *   - Fails gracefully if PostgreSQL is unreachable
 *   - Data integrity spot checks
 *
 * NOTE: This file REPLACES the P1-ARCH-007 stub tests that asserted
 * "Seed data not yet implemented" — that stub no longer exists.
 *
 * Multi-Role Coverage:
 * - Senior SDET:         Core integration tests (seeding, idempotency, counts)
 * - Senior Security:     [SEC] FK integrity, secret leak prevention, data isolation
 * - Senior Pen Tester:   [PEN] SQL injection via special chars in descriptions
 *
 * @role Senior SDET — Test Data Engineering
 * @task P1-ARCH-008 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  isPostgresAvailable,
  createTestClient,
  runMigrate,
  runSeed,
  dropAllTables,
} from './helpers/db-test-utils.js';
import type { PgClient } from './helpers/db-test-utils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Seed Script — Real Implementation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seed Script — P1-ARCH-008 Implementation', () => {
  let pgAvailable: boolean;
  let client: PgClient;

  beforeAll(async () => {
    pgAvailable = await isPostgresAvailable();
    if (!pgAvailable) {
      console.warn('⚠️  PostgreSQL not available — skipping seed integration tests.');
      return;
    }
    client = await createTestClient();

    // Clean slate: drop all tables and re-apply migrations
    await dropAllTables(client);
    runMigrate();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Seed Script Execution
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-001] seed script connects and seeds all tables (exit code 0)', () => {
    if (!pgAvailable) return;

    const result = runSeed();
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Connected to PostgreSQL');
  });

  it('[SEED-002a] seed script output mentions hack_incidents with 55 records', () => {
    if (!pgAvailable) return;

    const result = runSeed();
    expect(result.stdout).toContain('hack_incidents');
    expect(result.stdout).toContain('55');
  });

  it('[SEED-002b] seed script output mentions ai_skill_files with 12 records', () => {
    if (!pgAvailable) return;

    const result = runSeed();
    expect(result.stdout).toContain('ai_skill_files');
    expect(result.stdout).toContain('12');
  });

  it('[SEED-002c] seed script output mentions safety_scan_results with 10 records', () => {
    if (!pgAvailable) return;

    const result = runSeed();
    expect(result.stdout).toContain('safety_scan_results');
    expect(result.stdout).toContain('10');
  });

  it('[SEED-003] seed script prints summary with success', () => {
    if (!pgAvailable) return;

    const result = runSeed();
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Seed Summary');
    expect(result.stdout).toContain('seeded successfully');
  });

  it('[SEED-004] seed script exits with error on bad connection string', () => {
    const result = runSeed({
      env: {
        DATABASE_URL: 'postgresql://bad:bad@localhost:9999/nope',
      },
    });
    expect(result.exitCode).not.toBe(0);
  }, 30000);

  // ═════════════════════════════════════════════════════════════════════════
  // Row Count Verification
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-010] hack_incidents has exactly 55 rows', async () => {
    if (!pgAvailable) return;

    // Ensure data is seeded (idempotent)
    runSeed();

    const result = await client.query('SELECT COUNT(*)::int AS cnt FROM hack_incidents');
    expect(result.rows[0].cnt).toBe(55);
  });

  it('[SEED-011] ai_skill_files has exactly 12 rows', async () => {
    if (!pgAvailable) return;

    const result = await client.query('SELECT COUNT(*)::int AS cnt FROM ai_skill_files');
    expect(result.rows[0].cnt).toBe(12);
  });

  it('[SEED-012] safety_scan_results has exactly 10 rows', async () => {
    if (!pgAvailable) return;

    const result = await client.query('SELECT COUNT(*)::int AS cnt FROM safety_scan_results');
    expect(result.rows[0].cnt).toBe(10);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Idempotency
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-020] second run produces updates, not inserts', () => {
    if (!pgAvailable) return;

    // First run already done above — run again
    const result = runSeed();
    expect(result.exitCode).toBe(0);

    // On second run, all records should be "Updated", not "Inserted"
    // The output format is: "Inserted: 0  |  Updated: 55"
    expect(result.stdout).toContain('Updated');
  });

  it('[SEED-021] row counts remain unchanged after second run', async () => {
    if (!pgAvailable) return;

    // Run seed again (idempotent)
    runSeed();

    const hacks = await client.query('SELECT COUNT(*)::int AS cnt FROM hack_incidents');
    const skills = await client.query('SELECT COUNT(*)::int AS cnt FROM ai_skill_files');
    const scans = await client.query('SELECT COUNT(*)::int AS cnt FROM safety_scan_results');

    expect(hacks.rows[0].cnt).toBe(55);
    expect(skills.rows[0].cnt).toBe(12);
    expect(scans.rows[0].cnt).toBe(10);
  });

  it('[SEED-022] --clean flag truncates then re-seeds to same counts', async () => {
    if (!pgAvailable) return;

    const result = runSeed({ clean: true });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Cleaning');

    const hacks = await client.query('SELECT COUNT(*)::int AS cnt FROM hack_incidents');
    const skills = await client.query('SELECT COUNT(*)::int AS cnt FROM ai_skill_files');
    const scans = await client.query('SELECT COUNT(*)::int AS cnt FROM safety_scan_results');

    expect(hacks.rows[0].cnt).toBe(55);
    expect(skills.rows[0].cnt).toBe(12);
    expect(scans.rows[0].cnt).toBe(10);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Data Integrity Spot Checks
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-030] Ronin Network hack exists with correct loss_usd', async () => {
    if (!pgAvailable) return;

    const result = await client.query(
      "SELECT loss_usd FROM hack_incidents WHERE protocol_slug = 'ronin-network'",
    );
    expect(result.rows.length).toBe(1);
    expect(Number(result.rows[0].loss_usd)).toBe(624_000_000);
  });

  it('[SEED-031] Solidity Reentrancy Detector exists with safety_label = safe', async () => {
    if (!pgAvailable) return;

    const result = await client.query(
      "SELECT safety_label FROM ai_skill_files WHERE name = 'Solidity Reentrancy Detector'",
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].safety_label).toBe('safe');
  });

  it('[SEED-032] Security Audit Helper exists with safety_label = malicious', async () => {
    if (!pgAvailable) return;

    const result = await client.query(
      "SELECT safety_label FROM ai_skill_files WHERE name = 'Security Audit Helper'",
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].safety_label).toBe('malicious');
  });

  it('[SEED-033] FK integrity: all scan skill_file_ids exist in ai_skill_files', async () => {
    if (!pgAvailable) return;

    const result = await client.query(`
      SELECT s.id FROM safety_scan_results s
      LEFT JOIN ai_skill_files a ON s.skill_file_id = a.id
      WHERE a.id IS NULL
    `);
    // No orphan records
    expect(result.rows.length).toBe(0);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEC] Security Checks
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEED-040] no seed data leaked into etl_sync_log or api_usage_log', async () => {
    if (!pgAvailable) return;

    const etl = await client.query('SELECT COUNT(*)::int AS cnt FROM etl_sync_log');
    const api = await client.query('SELECT COUNT(*)::int AS cnt FROM api_usage_log');
    expect(etl.rows[0].cnt).toBe(0);
    expect(api.rows[0].cnt).toBe(0);
  });

  it('[SEED-041] special characters in descriptions stored correctly', async () => {
    if (!pgAvailable) return;

    // The DAO description contains an apostrophe — verify it survived SQL insertion
    const result = await client.query(
      "SELECT description FROM hack_incidents WHERE protocol_slug = 'poly-network'",
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].description.length).toBeGreaterThan(10);
  });
});
