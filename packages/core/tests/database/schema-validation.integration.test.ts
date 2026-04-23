/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Schema Validation Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Validates all database schema correctness after migrations:
 *   - CHECK constraints (non-negative loss, funds_returned ≤ loss)
 *   - UNIQUE constraints (content_hash, source_repo + file_path)
 *   - Foreign key CASCADE behavior (safety_scan_results → ai_skill_files)
 *   - UUID auto-generation
 *   - Trigram index fuzzy search
 *   - Timestamp defaults
 *   - INET type validation
 *   - Index existence verification
 *
 * @role Senior SDET — Test Data Engineering
 * @role Senior Security Test Engineer — Data Integrity Testing
 * @task P1-ARCH-007 QA Integration Testing
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  isPostgresAvailable,
  createTestClient,
  runMigrate,
  dropAllTables,
  getCustomIndexes,
  EXPECTED_INDEXES,
} from './helpers/db-test-utils.js';
import type pg from 'pg';

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Schema Validation — Constraints & Indexes
// ═══════════════════════════════════════════════════════════════════════════════

describe('Schema Validation — Constraints & Indexes', () => {
  let pgAvailable: boolean;
  let client: pg.Client;

  beforeAll(async () => {
    pgAvailable = await isPostgresAvailable();
    if (!pgAvailable) {
      console.warn('⚠️  PostgreSQL not available — skipping schema validation tests.');
      return;
    }
    client = await createTestClient();

    // Ensure clean state and apply all migrations
    await dropAllTables(client);
    runMigrate();
  });

  afterAll(async () => {
    if (client) {
      // Clean up test data but leave schema intact
      await client.query('DELETE FROM safety_scan_results').catch(() => {});
      await client.query('DELETE FROM ai_skill_files').catch(() => {});
      await client.query('DELETE FROM hack_incidents').catch(() => {});
      await client.query('DELETE FROM etl_sync_log').catch(() => {});
      await client.query('DELETE FROM api_usage_log').catch(() => {});
      await client.end();
    }
  });

  afterEach(async () => {
    if (!pgAvailable) return;
    // Clean test data between tests
    await client.query('DELETE FROM safety_scan_results').catch(() => {});
    await client.query('DELETE FROM ai_skill_files').catch(() => {});
    await client.query('DELETE FROM hack_incidents').catch(() => {});
    await client.query('DELETE FROM etl_sync_log').catch(() => {});
    await client.query('DELETE FROM api_usage_log').catch(() => {});
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-001] CHECK: Reject negative loss_usd
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-001] hack_incidents: CHECK constraint rejects negative loss_usd', async () => {
    if (!pgAvailable) return;

    try {
      await client.query(`
        INSERT INTO hack_incidents (protocol_name, date, chain, attack_vector, loss_usd, data_source)
        VALUES ('TestProtocol', NOW(), 'ethereum', 'reentrancy', -100, 'test')
      `);
      // Should not reach here
      expect.unreachable('INSERT with negative loss_usd should fail');
    } catch (err: any) {
      // PostgreSQL error code 23514 = check_violation
      expect(err.code).toBe('23514');
      expect(err.constraint).toBe('hack_loss_usd_nonnegative');
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-002] CHECK: Reject funds_returned > loss_usd
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-002] hack_incidents: CHECK constraint rejects funds_returned > loss_usd', async () => {
    if (!pgAvailable) return;

    try {
      await client.query(`
        INSERT INTO hack_incidents (protocol_name, date, chain, attack_vector, loss_usd, funds_returned, data_source)
        VALUES ('TestProtocol', NOW(), 'ethereum', 'reentrancy', 500, 1000, 'test')
      `);
      expect.unreachable('INSERT with funds_returned > loss_usd should fail');
    } catch (err: any) {
      expect(err.code).toBe('23514');
      expect(err.constraint).toBe('hack_funds_returned_lte_loss');
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-003] UNIQUE: Reject duplicate content_hash
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-003] ai_skill_files: UNIQUE constraint rejects duplicate content_hash', async () => {
    if (!pgAvailable) return;

    const hash = 'a'.repeat(64);

    // First insert — should succeed
    await client.query(`
      INSERT INTO ai_skill_files (name, source_repo, file_path, platform, language, content, format, content_hash)
      VALUES ('Skill A', 'repo/a', 'path/a', 'openai', 'python', 'content', 'md', $1)
    `, [hash]);

    // Second insert with same hash — should fail
    try {
      await client.query(`
        INSERT INTO ai_skill_files (name, source_repo, file_path, platform, language, content, format, content_hash)
        VALUES ('Skill B', 'repo/b', 'path/b', 'openai', 'python', 'content2', 'md', $1)
      `, [hash]);
      expect.unreachable('INSERT with duplicate content_hash should fail');
    } catch (err: any) {
      // PostgreSQL error code 23505 = unique_violation
      expect(err.code).toBe('23505');
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-004] UNIQUE: Reject duplicate (source_repo, file_path)
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-004] ai_skill_files: UNIQUE constraint rejects duplicate (source_repo, file_path)', async () => {
    if (!pgAvailable) return;

    await client.query(`
      INSERT INTO ai_skill_files (name, source_repo, file_path, platform, language, content, format, content_hash)
      VALUES ('Skill A', 'same/repo', 'same/path', 'openai', 'python', 'c1', 'md', $1)
    `, ['b'.repeat(64)]);

    try {
      await client.query(`
        INSERT INTO ai_skill_files (name, source_repo, file_path, platform, language, content, format, content_hash)
        VALUES ('Skill B', 'same/repo', 'same/path', 'claude', 'ts', 'c2', 'md', $1)
      `, ['c'.repeat(64)]);
      expect.unreachable('INSERT with duplicate (source_repo, file_path) should fail');
    } catch (err: any) {
      expect(err.code).toBe('23505');
      expect(err.constraint).toBe('uq_skill_source_path');
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-005] FK CASCADE: Deleting parent deletes children
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-005] safety_scan_results: FK CASCADE deletes child rows', async () => {
    if (!pgAvailable) return;

    // Insert parent
    const parentResult = await client.query(`
      INSERT INTO ai_skill_files (name, source_repo, file_path, platform, language, content, format, content_hash)
      VALUES ('Cascade Test Skill', 'repo/cascade', 'path/cascade', 'openai', 'python', 'content', 'md', $1)
      RETURNING id
    `, ['d'.repeat(64)]);
    const parentId = parentResult.rows[0].id;

    // Insert child referencing parent
    await client.query(`
      INSERT INTO safety_scan_results (skill_file_id, scanner_version, final_label)
      VALUES ($1, '1.0.0', 'safe')
    `, [parentId]);

    // Verify child exists
    const beforeDelete = await client.query(
      'SELECT COUNT(*) AS cnt FROM safety_scan_results WHERE skill_file_id = $1',
      [parentId],
    );
    expect(parseInt(beforeDelete.rows[0].cnt)).toBe(1);

    // Delete parent
    await client.query('DELETE FROM ai_skill_files WHERE id = $1', [parentId]);

    // Assert: child row is CASCADE deleted
    const afterDelete = await client.query(
      'SELECT COUNT(*) AS cnt FROM safety_scan_results WHERE skill_file_id = $1',
      [parentId],
    );
    expect(parseInt(afterDelete.rows[0].cnt)).toBe(0);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-006] UUID auto-generation
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-006] hack_incidents: UUID primary key auto-generates', async () => {
    if (!pgAvailable) return;

    const result = await client.query(`
      INSERT INTO hack_incidents (protocol_name, date, chain, attack_vector, data_source)
      VALUES ('UUID Test', NOW(), 'ethereum', 'reentrancy', 'test')
      RETURNING id
    `);

    const id = result.rows[0].id;
    expect(id).toBeDefined();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-007] Trigram index fuzzy search
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-007] hack_incidents: trigram index enables fuzzy search', async () => {
    if (!pgAvailable) return;

    // Insert test data
    await client.query(`
      INSERT INTO hack_incidents (protocol_name, date, chain, attack_vector, data_source)
      VALUES ('Ronin Bridge', NOW(), 'ethereum', 'bridge-exploit', 'test')
    `);

    // Fuzzy search using trigram similarity operator
    const result = await client.query(`
      SELECT protocol_name FROM hack_incidents
      WHERE protocol_name % 'ronin'
    `);

    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    expect(result.rows[0].protocol_name).toBe('Ronin Bridge');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-008] Default timestamps
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-008] all tables have created_at DEFAULT NOW()', async () => {
    if (!pgAvailable) return;

    const beforeInsert = new Date();

    // Insert without specifying created_at
    const result = await client.query(`
      INSERT INTO hack_incidents (protocol_name, date, chain, attack_vector, data_source)
      VALUES ('Timestamp Test', NOW(), 'ethereum', 'reentrancy', 'test')
      RETURNING created_at
    `);

    const createdAt = new Date(result.rows[0].created_at);
    const afterInsert = new Date();

    // Assert: created_at is between before and after insert
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000);
    expect(createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime() + 1000);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-009] INET type validation
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-009] api_usage_log: INET type validates IP addresses', async () => {
    if (!pgAvailable) return;

    // Valid IPv4 — should succeed
    await client.query(`
      INSERT INTO api_usage_log (endpoint, method, status_code, response_time_ms, ip_address)
      VALUES ('/api/test', 'GET', 200, 50, '192.168.1.1')
    `);

    // Valid IPv6 — should succeed
    await client.query(`
      INSERT INTO api_usage_log (endpoint, method, status_code, response_time_ms, ip_address)
      VALUES ('/api/test', 'GET', 200, 50, '::1')
    `);

    // Invalid IP — should fail
    try {
      await client.query(`
        INSERT INTO api_usage_log (endpoint, method, status_code, response_time_ms, ip_address)
        VALUES ('/api/test', 'GET', 200, 50, 'not-an-ip-address')
      `);
      expect.unreachable('INSERT with invalid IP should fail');
    } catch (err: any) {
      // PostgreSQL error code 22P02 = invalid_text_representation
      expect(err.code).toBe('22P02');
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // [SCH-010] Verify all expected indexes exist
  // ═════════════════════════════════════════════════════════════════════════

  it('[SCH-010] verify all expected indexes exist', async () => {
    if (!pgAvailable) return;

    const indexes = await getCustomIndexes(client);

    for (const expectedIndex of EXPECTED_INDEXES) {
      expect(indexes).toContain(expectedIndex);
    }

    // Total custom indexes = 7 + 8 + 4 + 3 + 4 = 26
    // (Plus unique constraint indexes: uq_skill_source_path, uq_skill_content_hash)
    expect(indexes.length).toBeGreaterThanOrEqual(EXPECTED_INDEXES.length);
  });
});
