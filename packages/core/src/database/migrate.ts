/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Database Migration Runner
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lightweight sequential migration runner for PostgreSQL.
 * Reads numbered `.sql` files from the migrations/ directory and executes
 * them in order against the configured database.
 *
 * Usage:
 *   pnpm run migrate              # Apply all pending migrations (UP)
 *   pnpm run migrate:down         # Rollback all migrations (DOWN)
 *
 * Conventions:
 *   - Each `.sql` file contains both UP and DOWN blocks separated by `-- DOWN`
 *   - Applied migrations are tracked in a `schema_migrations` table
 *   - All migrations are idempotent (safe to re-run)
 *
 * @module database/migrate
 * @hexagonal Infrastructure Layer — Database Adapter
 * @task P1-ARCH-007
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* eslint-disable no-console */

import pg from 'pg';

const { Client } = pg;

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = process.env['AEGIS_MIGRATIONS_DIR'] ?? path.join(__dirname, 'migrations');

const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  `postgresql://${process.env['POSTGRES_USER'] ?? 'aegis'}:${process.env['POSTGRES_PASSWORD'] ?? 'aegis_dev'}@${process.env['POSTGRES_HOST'] ?? 'localhost'}:${process.env['POSTGRES_PORT'] ?? '5432'}/${process.env['POSTGRES_DB'] ?? 'aegis_dev'}`;

const isRollback = process.argv.includes('--rollback');

// ═══════════════════════════════════════════════════════════════════════════════
// Schema Migrations Tracking Table
// ═══════════════════════════════════════════════════════════════════════════════

const CREATE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id          SERIAL PRIMARY KEY,
    filename    VARCHAR(255) NOT NULL UNIQUE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

// ═══════════════════════════════════════════════════════════════════════════════
// Migration Logic
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a migration file into UP and DOWN SQL blocks.
 * Splits on the `-- DOWN` delimiter.
 */
function parseMigrationFile(content: string): { up: string; down: string } {
  const delimiter = '-- DOWN';
  const delimiterIndex = content.indexOf(delimiter);

  if (delimiterIndex === -1) {
    return { up: content, down: '' };
  }

  return {
    up: content.substring(0, delimiterIndex).trim(),
    down: content.substring(delimiterIndex + delimiter.length).trim(),
  };
}

/**
 * Get all migration files sorted by filename (numeric prefix order).
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/**
 * Get the set of already-applied migration filenames.
 */
async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
  const result = await client.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename',
  );
  return new Set(result.rows.map((r) => r.filename));
}

/**
 * Apply all pending UP migrations in order.
 */
async function migrateUp(client: pg.Client): Promise<void> {
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations(client);

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('✅ All migrations are already applied. Nothing to do.');
    return;
  }

  console.log(`📦 Found ${pending.length} pending migration(s):\n`);

  for (const filename of pending) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { up } = parseMigrationFile(content);

    console.log(`  ⏳ Applying: ${filename}...`);

    try {
      await client.query(up);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        [filename],
      );
      console.log(`  ✅ Applied:  ${filename}`);
    } catch (err) {
      console.error(`  ❌ Failed:   ${filename}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log(`\n🎉 Successfully applied ${pending.length} migration(s).`);
}

/**
 * Rollback all applied migrations in reverse order.
 */
async function migrateDown(client: pg.Client): Promise<void> {
  const applied = await getAppliedMigrations(client);

  if (applied.size === 0) {
    console.log('✅ No migrations to rollback. Nothing to do.');
    return;
  }

  // Reverse order for rollback
  const filesToRollback = [...applied].sort().reverse();

  console.log(`🔄 Rolling back ${filesToRollback.length} migration(s):\n`);

  for (const filename of filesToRollback) {
    const filePath = path.join(MIGRATIONS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  Migration file not found: ${filename}. Skipping.`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const { down } = parseMigrationFile(content);

    if (!down) {
      console.warn(`  ⚠️  No DOWN block in: ${filename}. Skipping.`);
      continue;
    }

    console.log(`  ⏳ Rolling back: ${filename}...`);

    try {
      await client.query(down);
      await client.query('DELETE FROM schema_migrations WHERE filename = $1', [filename]);
      console.log(`  ✅ Rolled back: ${filename}`);
    } catch (err) {
      console.error(`  ❌ Rollback failed: ${filename}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log(`\n🎉 Successfully rolled back ${filesToRollback.length} migration(s).`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AltFlex AEGIS v3.0 — Database Migration Runner');
  console.log(`  Mode: ${isRollback ? '🔄 ROLLBACK (DOWN)' : '📦 MIGRATE (UP)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL.\n');

    // Ensure the tracking table exists
    await client.query(CREATE_TRACKING_TABLE);

    if (isRollback) {
      await migrateDown(client);
    } else {
      await migrateUp(client);
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from PostgreSQL.');
  }
}

void main();
