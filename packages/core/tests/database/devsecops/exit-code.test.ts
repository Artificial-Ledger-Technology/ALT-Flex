/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — CI Gate Exit Code Compliance Tests (DevSecOps)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates that the migration runner and seed script return proper exit codes
 * for CI/CD pipeline integration:
 *   - Exit 0 on success
 *   - Exit 1 on failure
 *   - Proper npm scripts configuration
 *
 * @role Senior DevSecOps Engineer — CI/CD Security Pipeline Architecture
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isPostgresAvailable,
  createTestClient,
  runMigrate,
  runSeed,
  dropAllTables,
  MONOREPO_ROOT,
  MIGRATE_SCRIPT,
  SEED_SCRIPT,
  type PgClient,
} from '../helpers/db-test-utils.js';
import type pg from 'pg';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: DevSecOps — CI Gate Compliance
// ═══════════════════════════════════════════════════════════════════════════════

describe('DevSecOps — CI Gate Compliance', () => {
  let pgAvailable: boolean;
  let client: PgClient;

  beforeAll(async () => {
    pgAvailable = await isPostgresAvailable();
    if (pgAvailable) {
      client = await createTestClient();
      await dropAllTables(client);
    }
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [OPS-001] migrate exits 0 on success
  // ═════════════════════════════════════════════════════════════════════════

  it('[OPS-001] migrate exits 0 on successful migration', async () => {
    if (!pgAvailable) return;

    const result = runMigrate();
    expect(result.exitCode).toBe(0);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [OPS-002] migrate exits non-zero on failure
  // ═════════════════════════════════════════════════════════════════════════

  it('[OPS-002] migrate exits non-zero on connection failure', () => {
    const result = runMigrate({
      env: {
        DATABASE_URL: 'postgresql://bad:bad@localhost:9999/nope',
      },
    });

    expect(result.exitCode).not.toBe(0);
  }, 30000);

  // ═════════════════════════════════════════════════════════════════════════
  // [OPS-003] seed exits 0 on success
  // ═════════════════════════════════════════════════════════════════════════

  it('[OPS-003] seed exits 0 on successful execution', async () => {
    if (!pgAvailable) return;

    // Ensure migrations are applied
    runMigrate();

    const result = runSeed();
    expect(result.exitCode).toBe(0);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [OPS-004] seed exits non-zero on failure
  // ═════════════════════════════════════════════════════════════════════════

  it('[OPS-004] seed exits non-zero on connection failure', () => {
    const result = runSeed({
      env: {
        DATABASE_URL: 'postgresql://bad:bad@localhost:9999/nope',
      },
    });

    expect(result.exitCode).not.toBe(0);
  }, 30000);

  // ═════════════════════════════════════════════════════════════════════════
  // [OPS-005] Root package.json has correct migrate/seed scripts
  // ═════════════════════════════════════════════════════════════════════════

  it('[OPS-005] root package.json defines migrate, migrate:down, and seed scripts', () => {
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(MONOREPO_ROOT, 'package.json'), 'utf-8'),
    );

    // All three scripts must be defined
    expect(rootPkg.scripts).toHaveProperty('migrate');
    expect(rootPkg.scripts).toHaveProperty('migrate:down');
    expect(rootPkg.scripts).toHaveProperty('seed');

    // migrate should point to the correct script
    expect(rootPkg.scripts.migrate).toContain('migrate.ts');

    // migrate:down should include --rollback flag
    expect(rootPkg.scripts['migrate:down']).toContain('--rollback');

    // seed should point to the correct script
    expect(rootPkg.scripts.seed).toContain('seed.ts');

    // All should use tsx for TypeScript execution
    expect(rootPkg.scripts.migrate).toContain('tsx');
    expect(rootPkg.scripts['migrate:down']).toContain('tsx');
    expect(rootPkg.scripts.seed).toContain('tsx');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [OPS-006] migrate.ts uses process.exit(1) for failure signaling
  // ═════════════════════════════════════════════════════════════════════════

  it('[OPS-006] migrate.ts calls process.exit(1) on error paths', () => {
    const source = fs.readFileSync(MIGRATE_SCRIPT, 'utf-8');

    // Must have process.exit(1) calls for CI gate compliance
    const exitCalls = (source.match(/process\.exit\(1\)/g) ?? []).length;
    expect(exitCalls).toBeGreaterThanOrEqual(3); // connection fail, migrate fail, rollback fail
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [OPS-007] seed.ts uses process.exit(1) for failure signaling
  // ═════════════════════════════════════════════════════════════════════════

  it('[OPS-007] seed.ts calls process.exit(1) on error paths', () => {
    const source = fs.readFileSync(SEED_SCRIPT, 'utf-8');

    const exitCalls = (source.match(/process\.exit\(1\)/g) ?? []).length;
    expect(exitCalls).toBeGreaterThanOrEqual(1);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [OPS-008] Migration scripts are executable via pnpm
  // ═════════════════════════════════════════════════════════════════════════

  it('[OPS-008] migration and seed scripts exist at expected paths', () => {
    expect(fs.existsSync(MIGRATE_SCRIPT)).toBe(true);
    expect(fs.existsSync(SEED_SCRIPT)).toBe(true);
  });
});
