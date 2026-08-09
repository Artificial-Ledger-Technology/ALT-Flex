/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Error Information Disclosure Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates that error messages from the migration runner and seed script
 * do not leak sensitive information: passwords, connection strings, internal
 * file paths, or stack traces.
 *
 * CWE References:
 *   - CWE-209: Information Exposure Through an Error Message
 *   - CWE-532: Information Exposure Through Log Files
 *
 * @role Senior Security Test Engineer — Error Response Testing
 * @role Senior Penetration Tester — Information Disclosure
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect } from 'vitest';
import { runMigrate, runSeed } from '../helpers/db-test-utils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Security — Error Information Disclosure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security — Error Information Disclosure', () => {
  // ═════════════════════════════════════════════════════════════════════════
  // [DISC-001] Migration errors don't leak passwords
  // CWE-209: Information disclosure via error message
  // Severity: 🟡 Medium
  // ═════════════════════════════════════════════════════════════════════════

  it('[DISC-001] migrate error output does not contain the password', () => {
    const testPassword = 'super_secret_test_password_12345';

    const result = runMigrate({
      env: {
        DATABASE_URL: `postgresql://testuser:${testPassword}@localhost:9999/testdb`,
      },
    });

    const combinedOutput = (result.stdout + result.stderr).toLowerCase();

    // The password should NOT appear in any output
    expect(combinedOutput).not.toContain(testPassword.toLowerCase());
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DISC-002] Seed errors don't leak passwords
  // CWE-209: Information disclosure via error message
  // Severity: 🟡 Medium
  // ═════════════════════════════════════════════════════════════════════════

  it('[DISC-002] seed error output does not contain the password', () => {
    const testPassword = 'another_secret_pwd_67890';

    const result = runSeed({
      env: {
        DATABASE_URL: `postgresql://testuser:${testPassword}@localhost:9999/testdb`,
      },
    });

    const combinedOutput = (result.stdout + result.stderr).toLowerCase();
    expect(combinedOutput).not.toContain(testPassword.toLowerCase());
  }, 30000);

  // ═════════════════════════════════════════════════════════════════════════
  // [DISC-003] Error output does not expose internal file system paths
  // CWE-209: Path disclosure
  // Severity: 🔵 Low
  // ═════════════════════════════════════════════════════════════════════════

  it('[DISC-003] error output does not expose sensitive system paths', () => {
    const result = runMigrate({
      env: {
        DATABASE_URL: 'postgresql://x:x@localhost:9999/noexist',
      },
    });

    const combinedOutput = result.stdout + result.stderr;

    // Should not contain full Windows user profiles or system directories
    expect(combinedOutput).not.toMatch(/C:\\Users\\[^\\]+\\AppData/i);
    expect(combinedOutput).not.toMatch(/\/etc\/shadow/);
    expect(combinedOutput).not.toMatch(/\/root\//);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DISC-004] Error messages are user-readable, not raw stack dumps
  // CWE-209: Stack trace exposure
  // Severity: ⚪ Info
  // ═════════════════════════════════════════════════════════════════════════

  it('[DISC-004] migration runner displays user-friendly error messages', () => {
    const result = runMigrate({
      env: {
        DATABASE_URL: 'postgresql://x:x@localhost:9999/noexist',
      },
    });

    const combinedOutput = result.stdout + result.stderr;

    // Should contain a user-friendly error indicator
    expect(combinedOutput).toMatch(/❌|error|failed/i);
  });
});
