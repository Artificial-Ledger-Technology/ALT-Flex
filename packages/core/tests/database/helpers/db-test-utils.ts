/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Database Test Utilities
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Shared test infrastructure for all database integration tests.
 * Provides reusable helpers for PostgreSQL connection, migration execution,
 * table introspection, and cleanup.
 *
 * NOTE: Uses dynamic import() for 'pg' to avoid Vite resolution issues
 * in the pnpm workspace. The pg package is a dependency of @aegis/core.
 *
 * @module tests/database/helpers/db-test-utils
 * @role Senior SDET — Test Framework Architecture
 * @task P1-ARCH-007 QA Integration Testing
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/** Default dev database connection string matching docker-compose.dev.yml */
export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ??
  process.env['DATABASE_URL'] ??
  'postgresql://aegis:changeme@localhost:5432/aegis_dev';

/** Root of the monorepo */
export const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

/** Path to the migration runner source */
export const MIGRATE_SCRIPT = path.join(MONOREPO_ROOT, 'packages', 'core', 'src', 'database', 'migrate.ts');

/** Path to the seed script source */
export const SEED_SCRIPT = path.join(MONOREPO_ROOT, 'packages', 'core', 'src', 'database', 'seed.ts');

/** Path to the migrations directory */
export const MIGRATIONS_DIR = path.join(MONOREPO_ROOT, 'packages', 'core', 'src', 'database', 'migrations');

/** All expected domain tables created by migrations */
export const EXPECTED_TABLES = [
  'hack_incidents',
  'ai_skill_files',
  'safety_scan_results',
  'etl_sync_log',
  'api_usage_log',
] as const;

/** Migration tracking table */
export const TRACKING_TABLE = 'schema_migrations';

/** Total number of SQL migration files */
export const EXPECTED_MIGRATION_COUNT = 6;

/** All expected index names across all migrations */
export const EXPECTED_INDEXES = [
  // 002 — hack_incidents
  'idx_hack_chain',
  'idx_hack_attack_vector',
  'idx_hack_date',
  'idx_hack_loss_usd',
  'idx_hack_data_source',
  'idx_hack_protocol_name_trgm',
  'idx_hack_has_foundry_poc',
  // 003 — ai_skill_files
  'idx_skill_platform',
  'idx_skill_language',
  'idx_skill_safety_label',
  'idx_skill_author',
  'idx_skill_category',
  'idx_skill_name_trgm',
  'idx_skill_copy_count',
  'idx_skill_created_at',
  // 004 — safety_scan_results
  'idx_scan_skill_file_id',
  'idx_scan_final_label',
  'idx_scan_timestamp',
  'idx_scan_review_status',
  // 005 — etl_sync_log
  'idx_etl_sync_source',
  'idx_etl_sync_engine',
  'idx_etl_sync_status',
  // 006 — api_usage_log
  'idx_api_usage_endpoint',
  'idx_api_usage_method',
  'idx_api_usage_status',
  'idx_api_usage_created_at',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Types (avoid importing pg at module-level for Vite compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimal subset of pg.Client used by our test helpers */
export interface PgClient {
  query: <T = any>(text: string, values?: any[]) => Promise<{ rows: T[] }>;
  end: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Connection Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dynamically import the pg module.
 * Uses require() fallback for pnpm workspace resolution.
 */
async function loadPg(): Promise<any> {
  try {
    // Try native require (works in pnpm workspace)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('pg');
  } catch {
    try {
      // Fallback: try dynamic import
      return await import('pg');
    } catch {
      // Final fallback: resolve from @aegis/core's node_modules
      const pgPath = path.join(MONOREPO_ROOT, 'packages', 'core', 'node_modules', 'pg');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(pgPath);
    }
  }
}

/**
 * Create a new PostgreSQL client connected to the test database.
 * Caller is responsible for calling `client.end()`.
 */
export async function createTestClient(
  connectionString: string = TEST_DATABASE_URL,
): Promise<PgClient> {
  const pg = await loadPg();
  const ClientClass = pg.Client ?? pg.default?.Client;
  const client = new ClientClass({ connectionString });
  await client.connect();
  return client as PgClient;
}

/**
 * Check if PostgreSQL is reachable at the test database URL.
 * Returns `true` if the connection succeeds, `false` otherwise.
 */
export async function isPostgresAvailable(): Promise<boolean> {
  try {
    const client = await createTestClient();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Migration Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run the migration runner via tsx subprocess.
 * Returns stdout, stderr, and exit code.
 */
export function runMigrate(
  options: { rollback?: boolean; env?: Record<string, string> } = {},
): { stdout: string; stderr: string; exitCode: number } {
  const args = options.rollback ? '--rollback' : '';
  const envOverrides = {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    ...options.env,
  };

  try {
    const stdout = execSync(`npx tsx "${MIGRATE_SCRIPT}" ${args}`, {
      cwd: MONOREPO_ROOT,
      env: envOverrides,
      encoding: 'utf-8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
      exitCode: err.status ?? 1,
    };
  }
}

/**
 * Run the seed script via tsx subprocess.
 * @param options.clean — pass `--clean` flag to truncate tables before seeding
 * @param options.env — override environment variables for the subprocess
 */
export function runSeed(
  options: { clean?: boolean; env?: Record<string, string> } = {},
): { stdout: string; stderr: string; exitCode: number } {
  const args = options.clean ? '-- --clean' : '';
  const envOverrides = {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    ...options.env,
  };

  try {
    const stdout = execSync(`npx tsx "${SEED_SCRIPT}" ${args}`, {
      cwd: MONOREPO_ROOT,
      env: envOverrides,
      encoding: 'utf-8',
      timeout: 60_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
      exitCode: err.status ?? 1,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Introspection Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all public tables in the database.
 */
export async function getPublicTables(client: PgClient): Promise<string[]> {
  const result = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  );
  return result.rows.map((r: any) => r.tablename);
}

/**
 * Get all applied migration filenames from schema_migrations.
 */
export async function getAppliedMigrations(client: PgClient): Promise<string[]> {
  const result = await client.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename',
  );
  return result.rows.map((r: any) => r.filename);
}

/**
 * Get all custom indexes in the public schema.
 */
export async function getCustomIndexes(client: PgClient): Promise<string[]> {
  const result = await client.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname NOT LIKE '%_pkey'
     ORDER BY indexname`,
  );
  return result.rows.map((r: any) => r.indexname);
}

/**
 * Check if a specific table exists.
 */
export async function tableExists(client: PgClient, tableName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1)",
    [tableName],
  );
  return (result.rows[0] as any)?.exists ?? false;
}

/**
 * Drop all domain tables and the tracking table (full cleanup).
 */
export async function dropAllTables(client: PgClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS safety_scan_results CASCADE');
  await client.query('DROP TABLE IF EXISTS ai_skill_files CASCADE');
  await client.query('DROP TABLE IF EXISTS hack_incidents CASCADE');
  await client.query('DROP TABLE IF EXISTS etl_sync_log CASCADE');
  await client.query('DROP TABLE IF EXISTS api_usage_log CASCADE');
  await client.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
}

/**
 * Get the list of migration SQL files from the migrations directory.
 */
export function getMigrationFileList(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}
