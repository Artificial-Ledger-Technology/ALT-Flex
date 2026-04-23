/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Connection Security Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates database connection security controls:
 *   - Connection string handling
 *   - Environment variable precedence
 *   - No plaintext credential logging
 *
 * CWE References:
 *   - CWE-522: Insufficiently Protected Credentials
 *   - CWE-319: Cleartext Transmission of Sensitive Information
 *   - CWE-209: Information Exposure Through an Error Message
 *
 * @role Senior Security Test Engineer — Connection Security Testing
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { MIGRATE_SCRIPT, SEED_SCRIPT } from '../helpers/db-test-utils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Security — Connection Security
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security — Connection Security', () => {
  // ═════════════════════════════════════════════════════════════════════════
  // [CONN-001] DATABASE_URL takes precedence over individual env vars
  // CWE-522: Insufficiently Protected Credentials
  // ═════════════════════════════════════════════════════════════════════════

  it('[CONN-001] migrate.ts: DATABASE_URL takes precedence over individual vars', () => {
    const source = fs.readFileSync(MIGRATE_SCRIPT, 'utf-8');

    // DATABASE_URL should be checked with nullish coalescing (??) first
    expect(source).toContain("process.env['DATABASE_URL'] ??");

    // The fallback should construct from individual env vars
    expect(source).toContain("process.env['POSTGRES_USER']");
    expect(source).toContain("process.env['POSTGRES_PASSWORD']");
    expect(source).toContain("process.env['POSTGRES_HOST']");
    expect(source).toContain("process.env['POSTGRES_PORT']");
    expect(source).toContain("process.env['POSTGRES_DB']");
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [CONN-002] seed.ts: Same DATABASE_URL precedence pattern
  // CWE-522: Insufficiently Protected Credentials
  // ═════════════════════════════════════════════════════════════════════════

  it('[CONN-002] seed.ts: DATABASE_URL takes precedence over individual vars', () => {
    const source = fs.readFileSync(SEED_SCRIPT, 'utf-8');
    expect(source).toContain("process.env['DATABASE_URL'] ??");
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [CONN-003] No password logging in source code
  // CWE-532: Information Exposure Through Log Files
  // ═════════════════════════════════════════════════════════════════════════

  it('[CONN-003] migrate.ts: does not log DATABASE_URL or passwords', () => {
    const source = fs.readFileSync(MIGRATE_SCRIPT, 'utf-8');

    // Should not log the full connection string
    expect(source).not.toContain('console.log(DATABASE_URL');
    expect(source).not.toContain('console.log(`${DATABASE_URL');
    expect(source).not.toContain('console.log(connectionString');

    // Should not log password env vars
    expect(source).not.toContain("console.log(process.env['POSTGRES_PASSWORD']");
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [CONN-004] Connection cleanup in finally block
  // CWE-404: Improper Resource Shutdown or Release
  // ═════════════════════════════════════════════════════════════════════════

  it('[CONN-004] migrate.ts: connection is cleaned up in finally block', () => {
    const source = fs.readFileSync(MIGRATE_SCRIPT, 'utf-8');

    // Must have a finally block that closes the connection
    expect(source).toContain('finally');
    expect(source).toContain('client.end()');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [CONN-005] seed.ts: connection is cleaned up in finally block
  // ═════════════════════════════════════════════════════════════════════════

  it('[CONN-005] seed.ts: connection is cleaned up in finally block', () => {
    const source = fs.readFileSync(SEED_SCRIPT, 'utf-8');

    expect(source).toContain('finally');
    expect(source).toContain('client.end()');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [CONN-006] Uses pg.Client (not pool) for migrations — single connection
  // ═════════════════════════════════════════════════════════════════════════

  it('[CONN-006] migrate.ts: uses Client, not Pool, for sequential migrations', () => {
    const source = fs.readFileSync(MIGRATE_SCRIPT, 'utf-8');

    // Should use Client for bounded, sequential operations
    expect(source).toContain('new Client(');

    // Should NOT use Pool (migrations are one-shot, not concurrent)
    expect(source).not.toContain('new Pool(');
  });
});
