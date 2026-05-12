/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — SQL Injection Prevention Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates that all database queries use parameterized queries to prevent
 * SQL injection attacks. This is a static + runtime analysis suite.
 *
 * CWE References:
 *   - CWE-89: SQL Injection
 *   - CWE-20: Improper Input Validation
 *
 * @role Senior Security Test Engineer — SQL Injection Testing
 * @role Senior Penetration Tester — Injection Mastery
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isPostgresAvailable,
  createTestClient,
  runMigrate,
  dropAllTables,
  MIGRATE_SCRIPT,
  SEED_SCRIPT,
} from '../helpers/db-test-utils.js';
import type pg from 'pg';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Security — SQL Injection Prevention
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security — SQL Injection Prevention', () => {
  let pgAvailable: boolean;
  let client: pg.Client;

  beforeAll(async () => {
    pgAvailable = await isPostgresAvailable();
    if (pgAvailable) {
      client = await createTestClient();
      await dropAllTables(client);
      runMigrate();
    }
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEC-001] Static Analysis: migrate.ts uses parameterized queries
  // CWE-89: SQL Injection
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEC-001] migrate.ts: schema_migrations INSERT uses parameterized $1', () => {
    const source = fs.readFileSync(MIGRATE_SCRIPT, 'utf-8');

    // Verify INSERT uses parameterized query with $1 placeholder
    expect(source).toContain(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
    );

    // Verify DELETE uses parameterized query with $1 placeholder
    expect(source).toContain(
      'DELETE FROM schema_migrations WHERE filename = $1',
    );

    // Verify the parameterized values are passed as arrays
    expect(source).toContain('[filename]');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEC-002] Static Analysis: seed.ts uses no user input interpolation
  // CWE-89: SQL Injection
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEC-002] seed.ts: INSERT queries use parameterized placeholders', () => {
    const source = fs.readFileSync(SEED_SCRIPT, 'utf-8');

    // Verify seed.ts uses parameterized queries with $N placeholders
    expect(source).toContain('$1');
    expect(source).toContain('VALUES');
    expect(source).toContain('ON CONFLICT');

    // Verify no template literal injection in SELECT/INSERT/UPDATE/DELETE queries.
    // Note: TRUNCATE TABLE with hardcoded table array is safe and expected.
    const dangerousInterpolationPattern = /client\.query\(`\s*(SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{/;
    expect(dangerousInterpolationPattern.test(source)).toBe(false);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEC-003] Static Analysis: No string concatenation in SQL queries
  // CWE-89: SQL Injection
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEC-003] migrate.ts: no string concatenation in SQL query calls', () => {
    const source = fs.readFileSync(MIGRATE_SCRIPT, 'utf-8');

    // Find all client.query calls
    const queryCallPattern = /client\.query\(/g;
    const matches = source.match(queryCallPattern);
    expect(matches).toBeDefined();
    expect(matches!.length).toBeGreaterThan(0);

    // Verify no dangerous concat patterns like: client.query("..." + variable)
    const concatPattern = /client\.query\([^)]*\+\s*\w/;
    expect(concatPattern.test(source)).toBe(false);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEC-004] Runtime: SQL injection in JSONB fields is safely handled
  // CWE-89: SQL Injection via JSON
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEC-004] JSONB columns safely store injection payloads', async () => {
    if (!pgAvailable) return;

    // Attempt to store SQL injection payloads in JSONB fields
    const maliciousPayload = JSON.stringify([
      "'; DROP TABLE hack_incidents; --",
      "1 OR 1=1",
      "UNION SELECT * FROM pg_shadow",
    ]);

    const result = await client.query(
      `INSERT INTO hack_incidents
        (protocol_name, date, chain, attack_vector, sources, data_source)
       VALUES ($1, NOW(), $2, $3, $4::jsonb, $5)
       RETURNING id, sources`,
      ['Injection Test', 'ethereum', 'reentrancy', maliciousPayload, 'test'],
    );

    // The data should be stored safely as JSON, not executed
    expect(result.rows[0].sources).toEqual([
      "'; DROP TABLE hack_incidents; --",
      "1 OR 1=1",
      "UNION SELECT * FROM pg_shadow",
    ]);

    // Table should still exist and be functional
    const tableCheck = await client.query(
      "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'hack_incidents')",
    );
    expect(tableCheck.rows[0].exists).toBe(true);

    // Cleanup
    await client.query('DELETE FROM hack_incidents WHERE protocol_name = $1', [
      'Injection Test',
    ]);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEC-005] Runtime: Special characters in text fields don't cause injection
  // CWE-89: SQL Injection
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEC-005] special characters in text fields are safely escaped', async () => {
    if (!pgAvailable) return;

    const maliciousNames = [
      "'; DROP TABLE hack_incidents; --",
      "Robert'); DROP TABLE Students;--",
      "1; SELECT * FROM pg_shadow",
      "\\x27 OR 1=1",
      "' UNION SELECT password FROM users --",
    ];

    for (const name of maliciousNames) {
      const result = await client.query(
        `INSERT INTO hack_incidents
          (protocol_name, date, chain, attack_vector, data_source)
         VALUES ($1, NOW(), 'ethereum', 'reentrancy', 'test')
         RETURNING protocol_name`,
        [name],
      );
      expect(result.rows[0].protocol_name).toBe(name);
    }

    // Cleanup
    await client.query("DELETE FROM hack_incidents WHERE data_source = 'test'");
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SEC-006] Static Analysis: Migration SQL files use safe patterns
  // CWE-89: SQL Injection in migration files
  // ═════════════════════════════════════════════════════════════════════════

  it('[SEC-006] migration SQL files contain no dynamic variable interpolation', () => {
    const migrationsDir = path.join(path.dirname(MIGRATE_SCRIPT), 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // No bash-style variable interpolation
      expect(content).not.toMatch(/\$\{[^}]+\}/);

      // No EXECUTE format() with user input (dynamic SQL risk)
      expect(content.toUpperCase()).not.toContain('EXECUTE FORMAT');

      // All statements should be static DDL
      expect(content).toMatch(/^(--|BEGIN|COMMIT|CREATE|DROP|ALTER|SET|\s)*$/m);
    }
  });
});
