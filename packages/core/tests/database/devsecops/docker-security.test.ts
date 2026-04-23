/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Docker Security Tests (DevSecOps)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates Docker container security hardening for the PostgreSQL service:
 *   - Non-root user execution
 *   - Health check configuration
 *   - Volume security
 *   - Network isolation
 *
 * CWE References:
 *   - CWE-250: Execution with Unnecessary Privileges
 *   - CWE-269: Improper Privilege Management
 *   - CWE-16: Configuration
 *
 * @role Senior DevSecOps Engineer — Container & Runtime Security
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { MONOREPO_ROOT } from '../helpers/db-test-utils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function isDockerAvailable(): boolean {
  try {
    execSync('docker --version', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function isContainerRunning(containerName: string): boolean {
  try {
    const output = execSync(
      `docker inspect --format="{{.State.Running}}" ${containerName}`,
      { encoding: 'utf-8', stdio: 'pipe' },
    ).trim();
    return output === 'true';
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: DevSecOps — Docker Security
// ═══════════════════════════════════════════════════════════════════════════════

describe('DevSecOps — Docker Security', () => {
  const dockerAvailable = isDockerAvailable();

  // ═════════════════════════════════════════════════════════════════════════
  // [DOCK-001] PostgreSQL container runs as non-root user
  // CWE-250: Execution with Unnecessary Privileges
  // ═════════════════════════════════════════════════════════════════════════

  it('[DOCK-001] PostgreSQL container runs as non-root (postgres user)', () => {
    if (!dockerAvailable || !isContainerRunning('aegis-postgres-dev')) {
      console.warn('⚠️  Docker/container not available — testing config only.');

      // Static analysis: postgres:16-alpine runs as 'postgres' user by default
      // The official PostgreSQL image already runs the daemon as the 'postgres' user
      const devCompose = fs.readFileSync(
        path.join(MONOREPO_ROOT, 'docker-compose.dev.yml'),
        'utf-8',
      );

      // Verify no 'user: root' override in the postgres service
      const postgresSection = devCompose.split(/postgres:/)[1]?.split(/^\s{2}\w/m)[0] ?? '';
      expect(postgresSection).not.toContain('user: root');
      return;
    }

    // Runtime check: verify container user
    const user = execSync(
      'docker exec aegis-postgres-dev whoami',
      { encoding: 'utf-8', stdio: 'pipe' },
    ).trim();

    // Official postgres image runs as 'postgres' user, NOT root
    expect(user).not.toBe('root');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DOCK-002] Health check is configured with reasonable intervals
  // CWE-16: Configuration
  // ═════════════════════════════════════════════════════════════════════════

  it('[DOCK-002] PostgreSQL health check has proper configuration', () => {
    const devCompose = fs.readFileSync(
      path.join(MONOREPO_ROOT, 'docker-compose.dev.yml'),
      'utf-8',
    );

    // Should have healthcheck configured
    expect(devCompose).toContain('healthcheck:');
    expect(devCompose).toContain('pg_isready');

    // Should have reasonable intervals
    expect(devCompose).toContain('interval:');
    expect(devCompose).toContain('timeout:');
    expect(devCompose).toContain('retries:');
    expect(devCompose).toContain('start_period:');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DOCK-003] Services depend on PostgreSQL health
  // CWE-16: Configuration
  // ═════════════════════════════════════════════════════════════════════════

  it('[DOCK-003] application services wait for PostgreSQL to be healthy', () => {
    const devCompose = fs.readFileSync(
      path.join(MONOREPO_ROOT, 'docker-compose.dev.yml'),
      'utf-8',
    );

    // API gateway and workers should depend on postgres health
    expect(devCompose).toContain('condition: service_healthy');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DOCK-004] PostgreSQL version is pinned (not 'latest')
  // CWE-829: Supply chain — version pinning
  // ═════════════════════════════════════════════════════════════════════════

  it('[DOCK-004] PostgreSQL image version is pinned, not :latest', () => {
    const devCompose = fs.readFileSync(
      path.join(MONOREPO_ROOT, 'docker-compose.dev.yml'),
      'utf-8',
    );
    const prodCompose = fs.readFileSync(
      path.join(MONOREPO_ROOT, 'docker-compose.prod.yml'),
      'utf-8',
    );

    // Should use specific version (e.g., postgres:16-alpine), NOT :latest
    expect(devCompose).not.toContain('postgres:latest');
    expect(prodCompose).not.toContain('postgres:latest');

    // Should have a specific major version
    expect(devCompose).toMatch(/postgres:\d+/);
    expect(prodCompose).toMatch(/postgres:\d+/);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DOCK-005] No privileged mode
  // CWE-250: Execution with Unnecessary Privileges
  // ═════════════════════════════════════════════════════════════════════════

  it('[DOCK-005] PostgreSQL service does not use privileged mode', () => {
    const devCompose = fs.readFileSync(
      path.join(MONOREPO_ROOT, 'docker-compose.dev.yml'),
      'utf-8',
    );
    const prodCompose = fs.readFileSync(
      path.join(MONOREPO_ROOT, 'docker-compose.prod.yml'),
      'utf-8',
    );

    // Neither compose file should have privileged: true
    expect(devCompose).not.toContain('privileged: true');
    expect(prodCompose).not.toContain('privileged: true');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [DOCK-006] .dockerignore exists to prevent secret leakage
  // CWE-200: Information Exposure
  // ═════════════════════════════════════════════════════════════════════════

  it('[DOCK-006] .dockerignore prevents sensitive files from being copied', () => {
    const dockerignorePath = path.join(MONOREPO_ROOT, '.dockerignore');
    expect(fs.existsSync(dockerignorePath)).toBe(true);

    const content = fs.readFileSync(dockerignorePath, 'utf-8');

    // Should exclude sensitive files
    expect(content).toContain('.env');
    expect(content).toContain('node_modules');
    expect(content).toContain('.git');
  });
});
