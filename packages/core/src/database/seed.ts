/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Database Seed Script (Stub)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Populates the development database with curated seed data.
 * This is a stub — actual seed data will be implemented in P1-ARCH-008.
 *
 * Usage:
 *   pnpm run seed
 *
 * Prerequisites:
 *   - PostgreSQL running (docker compose up postgres -d)
 *   - Migrations applied (pnpm run migrate)
 *
 * @module database/seed
 * @hexagonal Infrastructure Layer — Database Adapter
 * @task P1-ARCH-007 (stub), P1-ARCH-008 (implementation)
 */

import pg from 'pg';

const { Client } = pg;

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  `postgresql://${process.env['POSTGRES_USER'] ?? 'aegis'}:${process.env['POSTGRES_PASSWORD'] ?? 'aegis_dev'}@${process.env['POSTGRES_HOST'] ?? 'localhost'}:${process.env['POSTGRES_PORT'] ?? '5432'}/${process.env['POSTGRES_DB'] ?? 'aegis_dev'}`;

// ═══════════════════════════════════════════════════════════════════════════════
// Seed Logic (Stub)
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AltFlex AEGIS v3.0 — Database Seed Script');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL.\n');

    // ── P1-ARCH-008: Seed data will be inserted here ──────────────────────
    // - 50+ hack incidents from DefiLlama (2020–2026)
    // - 10+ AI skill files with safety labels
    // - Sample safety scan results

    console.log('⚠️  Seed data not yet implemented.');
    console.log('   This stub will be populated in P1-ARCH-008.');
    console.log('   See: docs/CODE_REVIEW_PHASE1.md → P1-ARCH-008\n');

    // Verify tables exist
    const result = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );

    console.log('📋 Available tables:');
    for (const row of result.rows) {
      console.log(`   • ${row.tablename}`);
    }

    console.log('\n✅ Seed script completed (no data inserted yet).');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from PostgreSQL.');
  }
}

void main();
