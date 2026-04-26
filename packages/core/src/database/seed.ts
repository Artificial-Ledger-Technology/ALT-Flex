/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Database Seed Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Populates the development database with curated seed data from
 * DefiLlama, DeFiHackLabs, and hand-crafted AI skill files.
 *
 * Usage:
 *   pnpm run seed              # Upsert all seed data (idempotent)
 *   pnpm run seed -- --clean   # Truncate tables first, then seed
 *
 * Prerequisites:
 *   - PostgreSQL running (docker compose up postgres -d)
 *   - Migrations applied (pnpm run migrate)
 *
 * @module database/seed
 * @hexagonal Infrastructure Layer — Database Adapter
 * @task P1-ARCH-008
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import pg from 'pg';
import { HACK_INCIDENTS_SEED } from './seeds/hack-incidents.seed.js';
import { AI_SKILL_FILES_SEED } from './seeds/ai-skill-files.seed.js';
import { SAFETY_SCAN_RESULTS_SEED } from './seeds/safety-scan-results.seed.js';

const { Client } = pg;

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  `postgresql://${process.env['POSTGRES_USER'] ?? 'aegis'}:${process.env['POSTGRES_PASSWORD'] ?? 'aegis_dev'}@${process.env['POSTGRES_HOST'] ?? 'localhost'}:${process.env['POSTGRES_PORT'] ?? '5432'}/${process.env['POSTGRES_DB'] ?? 'aegis_dev'}`;

const isClean = process.argv.includes('--clean');

// ═══════════════════════════════════════════════════════════════════════════════
// Seed Stats
// ═══════════════════════════════════════════════════════════════════════════════

interface SeedStats {
  table: string;
  inserted: number;
  updated: number;
  failed: number;
}

const stats: SeedStats[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// Clean Tables (optional)
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanTables(client: pg.Client): Promise<void> {
  console.log('🧹 Cleaning tables (--clean flag detected)...\n');

  // Order matters: FK dependencies (children first)
  const tables = [
    'safety_scan_results',
    'ai_skill_files',
    'hack_incidents',
  ];

  for (const table of tables) {
    await client.query(`TRUNCATE TABLE ${table} CASCADE`);
    console.log(`   🗑️  Truncated: ${table}`);
  }

  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Seed Hack Incidents
// ═══════════════════════════════════════════════════════════════════════════════

async function seedHackIncidents(client: pg.Client): Promise<void> {
  console.log(`📦 Seeding hack_incidents (${HACK_INCIDENTS_SEED.length} records)...\n`);

  const stat: SeedStats = { table: 'hack_incidents', inserted: 0, updated: 0, failed: 0 };

  for (const h of HACK_INCIDENTS_SEED) {
    try {
      const result = await client.query(
        `INSERT INTO hack_incidents (
          id, protocol_name, protocol_slug, date, chain, attack_vector,
          secondary_vectors, loss_usd, funds_returned, tx_hashes,
          sources, description, has_foundry_poc, foundry_test_path,
          target_contracts, protocol_category, was_audited, audit_firms,
          data_source, last_synced_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, NOW(), NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          protocol_name = EXCLUDED.protocol_name,
          loss_usd = EXCLUDED.loss_usd,
          funds_returned = EXCLUDED.funds_returned,
          description = EXCLUDED.description,
          has_foundry_poc = EXCLUDED.has_foundry_poc,
          foundry_test_path = EXCLUDED.foundry_test_path,
          updated_at = NOW()
        RETURNING (xmax = 0) AS is_insert`,
        [
          h.id, h.protocol_name, h.protocol_slug, h.date, h.chain, h.attack_vector,
          JSON.stringify(h.secondary_vectors), h.loss_usd, h.funds_returned,
          JSON.stringify(h.tx_hashes), JSON.stringify(h.sources), h.description,
          h.has_foundry_poc, h.foundry_test_path, JSON.stringify(h.target_contracts),
          h.protocol_category, h.was_audited, JSON.stringify(h.audit_firms),
          h.data_source,
        ],
      );

      if (result.rows[0]?.is_insert) {
        stat.inserted++;
      } else {
        stat.updated++;
      }
    } catch (err) {
      stat.failed++;
      console.error(`   ❌ Failed: ${h.protocol_name} — ${(err as Error).message}`);
    }
  }

  console.log(`   ✅ Inserted: ${stat.inserted}  |  🔄 Updated: ${stat.updated}  |  ❌ Failed: ${stat.failed}\n`);
  stats.push(stat);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Seed AI Skill Files
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAISkillFiles(client: pg.Client): Promise<void> {
  console.log(`📦 Seeding ai_skill_files (${AI_SKILL_FILES_SEED.length} records)...\n`);

  const stat: SeedStats = { table: 'ai_skill_files', inserted: 0, updated: 0, failed: 0 };

  for (const s of AI_SKILL_FILES_SEED) {
    try {
      const result = await client.query(
        `INSERT INTO ai_skill_files (
          id, name, description, category, tags, version,
          source_repo, file_path, raw_url, commit_sha, license,
          platform, language, content, format, content_hash,
          content_size_bytes, safety_label, author, author_url,
          copy_count, star_count, view_count,
          last_synced_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20,
          $21, $22, $23,
          NOW(), NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          content = EXCLUDED.content,
          content_hash = EXCLUDED.content_hash,
          content_size_bytes = EXCLUDED.content_size_bytes,
          safety_label = EXCLUDED.safety_label,
          copy_count = EXCLUDED.copy_count,
          star_count = EXCLUDED.star_count,
          view_count = EXCLUDED.view_count,
          updated_at = NOW()
        RETURNING (xmax = 0) AS is_insert`,
        [
          s.id, s.name, s.description, s.category, JSON.stringify(s.tags), s.version,
          s.source_repo, s.file_path, s.raw_url, s.commit_sha, s.license,
          s.platform, s.language, s.content, s.format, s.content_hash,
          s.content_size_bytes, s.safety_label, s.author, s.author_url,
          s.copy_count, s.star_count, s.view_count,
        ],
      );

      if (result.rows[0]?.is_insert) {
        stat.inserted++;
      } else {
        stat.updated++;
      }
    } catch (err) {
      stat.failed++;
      console.error(`   ❌ Failed: ${s.name} — ${(err as Error).message}`);
    }
  }

  console.log(`   ✅ Inserted: ${stat.inserted}  |  🔄 Updated: ${stat.updated}  |  ❌ Failed: ${stat.failed}\n`);
  stats.push(stat);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Seed Safety Scan Results
// ═══════════════════════════════════════════════════════════════════════════════

async function seedSafetyScanResults(client: pg.Client): Promise<void> {
  console.log(`📦 Seeding safety_scan_results (${SAFETY_SCAN_RESULTS_SEED.length} records)...\n`);

  const stat: SeedStats = { table: 'safety_scan_results', inserted: 0, updated: 0, failed: 0 };

  for (const r of SAFETY_SCAN_RESULTS_SEED) {
    try {
      const result = await client.query(
        `INSERT INTO safety_scan_results (
          id, skill_file_id, scan_duration_ms, scanner_version,
          total_rules_evaluated, final_label, findings, rule_matches,
          critical_count, high_count, medium_count, low_count, info_count,
          manual_review_status, reviewed_by, review_notes,
          content_hash_at_scan, created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16,
          $17, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          final_label = EXCLUDED.final_label,
          findings = EXCLUDED.findings,
          critical_count = EXCLUDED.critical_count,
          high_count = EXCLUDED.high_count,
          medium_count = EXCLUDED.medium_count,
          manual_review_status = EXCLUDED.manual_review_status,
          reviewed_by = EXCLUDED.reviewed_by,
          review_notes = EXCLUDED.review_notes
        RETURNING (xmax = 0) AS is_insert`,
        [
          r.id, r.skill_file_id, r.scan_duration_ms, r.scanner_version,
          r.total_rules_evaluated, r.final_label, JSON.stringify(r.findings),
          JSON.stringify(r.rule_matches), r.critical_count, r.high_count,
          r.medium_count, r.low_count, r.info_count,
          r.manual_review_status, r.reviewed_by, r.review_notes,
          r.content_hash_at_scan,
        ],
      );

      if (result.rows[0]?.is_insert) {
        stat.inserted++;
      } else {
        stat.updated++;
      }
    } catch (err) {
      stat.failed++;
      console.error(`   ❌ Failed: scan ${r.id} — ${(err as Error).message}`);
    }
  }

  console.log(`   ✅ Inserted: ${stat.inserted}  |  🔄 Updated: ${stat.updated}  |  ❌ Failed: ${stat.failed}\n`);
  stats.push(stat);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════

function printSummary(): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Seed Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Table                    Inserted  Updated  Failed');
  console.log('  ─────────────────────────────────────────────────────');

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalFailed = 0;

  for (const s of stats) {
    const name = s.table.padEnd(25);
    console.log(`  ${name}${String(s.inserted).padStart(6)}  ${String(s.updated).padStart(7)}  ${String(s.failed).padStart(6)}`);
    totalInserted += s.inserted;
    totalUpdated += s.updated;
    totalFailed += s.failed;
  }

  console.log('  ─────────────────────────────────────────────────────');
  console.log(`  ${'TOTAL'.padEnd(25)}${String(totalInserted).padStart(6)}  ${String(totalUpdated).padStart(7)}  ${String(totalFailed).padStart(6)}`);
  console.log('');

  if (totalFailed > 0) {
    console.log('  ⚠️  Some records failed. Check error messages above.');
  } else {
    console.log('  🎉 All records seeded successfully!');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AltFlex AEGIS v3.0 — Database Seed Script');
  console.log(`  Mode: ${isClean ? '🧹 CLEAN + SEED' : '📦 UPSERT (idempotent)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL.\n');

    // Optional: clean tables first
    if (isClean) {
      await cleanTables(client);
    }

    // Seed in FK dependency order (parents first)
    await seedHackIncidents(client);
    await seedAISkillFiles(client);
    await seedSafetyScanResults(client);

    // Print summary
    printSummary();
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from PostgreSQL.');
  }
}

void main();
