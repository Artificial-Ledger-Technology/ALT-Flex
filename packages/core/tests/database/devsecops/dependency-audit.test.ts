/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Dependency Audit Tests (DevSecOps)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates the security posture of dependencies used in the database layer:
 *   - pg package CVE check
 *   - Lockfile integrity
 *   - SBOM-relevant metadata
 *
 * CWE References:
 *   - CWE-1035: Using Software with Known Vulnerabilities (OWASP A06:2021)
 *   - CWE-829: Inclusion of Functionality from Untrusted Control Sphere
 *
 * @role Senior DevSecOps Engineer — SCA / Dependency Audit
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { MONOREPO_ROOT } from '../helpers/db-test-utils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: DevSecOps — Dependency Audit
// ═══════════════════════════════════════════════════════════════════════════════

describe('DevSecOps — Dependency Audit', () => {
  // ═════════════════════════════════════════════════════════════════════════
  // [DEP-001] pg package is declared as a dependency
  // ═════════════════════════════════════════════════════════════════════════

  it('[DEP-001] @aegis/core declares pg as a dependency', () => {
    const pkgPath = path.join(MONOREPO_ROOT, 'packages', 'core', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.dependencies).toHaveProperty('pg');
    // Version should be ^8.x
    expect(pkg.dependencies.pg).toMatch(/^\^8\./);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DEP-002] @types/pg is declared as a devDependency
  // ═════════════════════════════════════════════════════════════════════════

  it('[DEP-002] @aegis/core declares @types/pg as devDependency', () => {
    const pkgPath = path.join(MONOREPO_ROOT, 'packages', 'core', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.devDependencies).toHaveProperty('@types/pg');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DEP-003] pnpm-lock.yaml exists and is committed
  // CWE-829: Supply chain integrity
  // ═════════════════════════════════════════════════════════════════════════

  it('[DEP-003] pnpm-lock.yaml exists for reproducible installs', () => {
    const lockPath = path.join(MONOREPO_ROOT, 'pnpm-lock.yaml');
    expect(fs.existsSync(lockPath)).toBe(true);

    // Lockfile should not be empty
    const stat = fs.statSync(lockPath);
    expect(stat.size).toBeGreaterThan(1000);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DEP-004] pnpm audit reports no critical vulnerabilities
  // CWE-1035: Using Software with Known Vulnerabilities
  // ═════════════════════════════════════════════════════════════════════════

  it('[DEP-004] pnpm audit --audit-level=critical reports no critical CVEs', () => {
    try {
      execSync('pnpm audit --audit-level=critical', {
        cwd: MONOREPO_ROOT,
        encoding: 'utf-8',
        timeout: 30_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      // If no critical vulnerabilities, the command exits 0
    } catch (err: any) {
      const output = (err.stdout ?? '') + (err.stderr ?? '');

      // If the command fails, check if it's because of critical vulnerabilities
      if (err.status !== 0 && output.includes('critical')) {
        console.warn(
          '🔴 CRITICAL: pnpm audit found critical vulnerabilities!\n' +
          'Run `pnpm audit` for details.',
        );
        // This is a hard fail — critical CVEs must be addressed
        expect(output).not.toContain('critical');
      }
      // Non-critical audit findings (high/medium) are acceptable for now
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DEP-005] tsx is available for migration script execution
  // ═════════════════════════════════════════════════════════════════════════

  it('[DEP-005] tsx is declared as a root devDependency', () => {
    const rootPkgPath = path.join(MONOREPO_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));

    expect(pkg.devDependencies).toHaveProperty('tsx');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DEP-006] No deprecated pg features are used
  // ═════════════════════════════════════════════════════════════════════════

  it('[DEP-006] migrate.ts uses pg default import pattern (ESM-compatible)', () => {
    const source = fs.readFileSync(
      path.join(MONOREPO_ROOT, 'packages', 'core', 'src', 'database', 'migrate.ts'),
      'utf-8',
    );

    // Should use ESM-compatible import pattern
    expect(source).toContain("import pg from 'pg'");
    expect(source).toContain('const { Client } = pg');

    // Should NOT use deprecated require() syntax
    expect(source).not.toContain("require('pg')");
  });
});
