/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Seed Data Unit Tests (NO DATABASE REQUIRED)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pure unit tests against the exported seed arrays — verifiable without PostgreSQL.
 * Validates ALL acceptance criteria from P1-ARCH-008 directly against the
 * in-memory seed data.
 *
 * Multi-Role Coverage:
 * - Senior SDET:           Core data validation (counts, uniqueness, coverage)
 * - Senior Security Test:  [SEC] FK integrity, content hash, credential scan
 * - Senior Pen Tester:     [PEN] SQL injection resilience, malicious content
 * - Senior DevSecOps:      [OPS] CI-compatible (no DB dependency)
 *
 * @module tests/database/seed-data.unit
 * @task P1-ARCH-008
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { HACK_INCIDENTS_SEED } from '../../src/database/seeds/hack-incidents.seed.js';
import { AI_SKILL_FILES_SEED } from '../../src/database/seeds/ai-skill-files.seed.js';
import { SAFETY_SCAN_RESULTS_SEED } from '../../src/database/seeds/safety-scan-results.seed.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** All 16 AttackVector enum values from the domain model */
const ALL_ATTACK_VECTORS = [
  'access-control', 'flash-loan', 'oracle-manipulation', 'reentrancy',
  'bridge-exploit', 'dao-governance', 'rug-pull', 'frontrunning',
  'phishing', 'arithmetic-overflow', 'delegatecall-injection', 'replay',
  'dos', 'self-destruct', 'logic-error', 'other',
] as const;

/** Minimum required chains per acceptance criteria (≥8, we expect 12) */
const EXPECTED_CHAINS = [
  'ethereum', 'bsc', 'solana', 'multi', 'polygon', 'fantom',
  'optimism', 'arbitrum', 'avalanche', 'base', 'gnosis', 'cronos',
] as const;

/** Top 10 largest hacks required by the task spec */
const TOP_10_HACKS = [
  { slug: 'ronin-network', loss: 624_000_000 },
  { slug: 'poly-network', loss: 611_000_000 },
  { slug: 'bnb-bridge', loss: 586_000_000 },
  { slug: 'wormhole', loss: 326_000_000 },
  { slug: 'euler-finance', loss: 197_000_000 },
  { slug: 'nomad-bridge', loss: 190_000_000 },
  { slug: 'wintermute', loss: 160_000_000 },
  { slug: 'cream-finance', loss: 130_000_000 },
  { slug: 'mango-markets', loss: 117_000_000 },
  { slug: 'curve-finance-july', loss: 73_000_000 },
] as const;

/** UUID v4 pattern (variant 1) */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Patterns that indicate hardcoded secrets */
const SECRET_PATTERNS = [
  /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,                       // AWS Access Key
  /sk-[a-zA-Z0-9]{20,}/,                     // Stripe / OpenAI secret key
  /ghp_[a-zA-Z0-9]{36}/,                     // GitHub PAT
  /xox[bprs]-[a-zA-Z0-9-]+/,                 // Slack token
  /password\s*[:=]\s*['"][^'"]{8,}['"]/i,     // Inline password assignment
];

// ═══════════════════════════════════════════════════════════════════════════════
// HACK_INCIDENTS_SEED
// ═══════════════════════════════════════════════════════════════════════════════

describe('HACK_INCIDENTS_SEED', () => {
  // ── Record Count ──────────────────────────────────────────────────────────
  it('contains exactly 55 records', () => {
    expect(HACK_INCIDENTS_SEED).toHaveLength(55);
  });

  // ── ID Uniqueness ─────────────────────────────────────────────────────────
  it('all IDs are unique', () => {
    const ids = HACK_INCIDENTS_SEED.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all IDs match UUID v4 format', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      expect(h.id).toMatch(UUID_PATTERN);
    }
  });

  // ── Attack Vector Coverage (Acceptance Criteria) ──────────────────────────
  it('covers all 16 attack vector categories', () => {
    const vectors = new Set(HACK_INCIDENTS_SEED.map((h) => h.attack_vector));
    for (const v of ALL_ATTACK_VECTORS) {
      expect(vectors.has(v)).toBe(true);
    }
  });

  it('each attack vector has at least 1 record', () => {
    const vectorCounts = new Map<string, number>();
    for (const h of HACK_INCIDENTS_SEED) {
      vectorCounts.set(h.attack_vector, (vectorCounts.get(h.attack_vector) ?? 0) + 1);
    }
    for (const v of ALL_ATTACK_VECTORS) {
      expect(vectorCounts.get(v)).toBeGreaterThanOrEqual(1);
    }
  });

  // ── Chain Coverage (Acceptance Criteria: ≥8) ──────────────────────────────
  it('covers at least 8 different chains', () => {
    const chains = new Set(HACK_INCIDENTS_SEED.map((h) => h.chain));
    expect(chains.size).toBeGreaterThanOrEqual(8);
  });

  it('covers all 12 expected chains', () => {
    const chains = new Set(HACK_INCIDENTS_SEED.map((h) => h.chain));
    for (const c of EXPECTED_CHAINS) {
      expect(chains.has(c)).toBe(true);
    }
  });

  // ── Foundry POC Coverage (Acceptance Criteria: ≥10) ───────────────────────
  it('has at least 10 records with Foundry POC references', () => {
    const withPoc = HACK_INCIDENTS_SEED.filter((h) => h.has_foundry_poc);
    expect(withPoc.length).toBeGreaterThanOrEqual(10);
  });

  it('every has_foundry_poc=true record has a non-null foundry_test_path', () => {
    const withPoc = HACK_INCIDENTS_SEED.filter((h) => h.has_foundry_poc);
    for (const h of withPoc) {
      expect(h.foundry_test_path).not.toBeNull();
      expect(h.foundry_test_path!.length).toBeGreaterThan(0);
    }
  });

  it('foundry_test_path values follow DeFiHackLabs convention', () => {
    const withPoc = HACK_INCIDENTS_SEED.filter((h) => h.has_foundry_poc);
    for (const h of withPoc) {
      expect(h.foundry_test_path).toMatch(/^src\/test\//);
      expect(h.foundry_test_path).toMatch(/_exp\.t\.sol$/);
    }
  });

  // ── Top 10 Hacks (Acceptance Criteria) ────────────────────────────────────
  it('includes all Top 10 largest hacks by loss amount', () => {
    const slugs = new Set(HACK_INCIDENTS_SEED.map((h) => h.protocol_slug));
    for (const hack of TOP_10_HACKS) {
      expect(slugs.has(hack.slug)).toBe(true);
    }
  });

  it('Top 10 hacks have correct loss amounts', () => {
    for (const expected of TOP_10_HACKS) {
      const actual = HACK_INCIDENTS_SEED.find((h) => h.protocol_slug === expected.slug);
      expect(actual).toBeDefined();
      expect(actual!.loss_usd).toBe(expected.loss);
    }
  });

  // ── Date Range (Acceptance Criteria: 2020-2026, actual data starts 2016) ──
  it('date range spans from at least 2016 to 2024', () => {
    const years = HACK_INCIDENTS_SEED.map((h) => parseInt(h.date.substring(0, 4)));
    expect(Math.min(...years)).toBeLessThanOrEqual(2016);
    expect(Math.max(...years)).toBeGreaterThanOrEqual(2024);
  });

  it('all dates are valid ISO date strings', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      const parsed = new Date(h.date);
      expect(parsed.toString()).not.toBe('Invalid Date');
    }
  });

  // ── Data Integrity ────────────────────────────────────────────────────────
  it('every record has non-empty protocol_name', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      expect(h.protocol_name.length).toBeGreaterThan(0);
    }
  });

  it('every record has non-empty description', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      expect(h.description.length).toBeGreaterThan(0);
    }
  });

  it('every record has non-empty protocol_slug', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      expect(h.protocol_slug.length).toBeGreaterThan(0);
    }
  });

  it('all protocol_slugs are unique', () => {
    const slugs = HACK_INCIDENTS_SEED.map((h) => h.protocol_slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('loss_usd is non-negative for all records', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      expect(h.loss_usd).toBeGreaterThanOrEqual(0);
    }
  });

  it('funds_returned never exceeds loss_usd', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      expect(h.funds_returned).toBeLessThanOrEqual(h.loss_usd);
    }
  });

  it('data_source is a non-empty string for all records', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      expect(h.data_source.length).toBeGreaterThan(0);
    }
  });

  // ── [SEC] Security: No Hardcoded Secrets ──────────────────────────────────
  it('[SEC] no seed data contains real credentials or private keys', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      const blob = JSON.stringify(h);
      for (const pattern of SECRET_PATTERNS) {
        expect(blob).not.toMatch(pattern);
      }
    }
  });

  // ── [SEC] SQL Injection Resilience ────────────────────────────────────────
  it('[SEC] descriptions contain special characters (SQL injection test data)', () => {
    const allDescs = HACK_INCIDENTS_SEED.map((h) => h.description).join(' ');
    // Verify SQL-relevant special characters exist — parameterized queries must handle these
    expect(allDescs).toContain('(');   // parentheses in technical descriptions
    expect(allDescs).toContain(')');
    expect(allDescs).toContain(',');   // commas in lists
    expect(allDescs).toContain('/');   // slashes in URLs/paths
  });

  it('[SEC] secondary_vectors and tx_hashes are proper arrays', () => {
    for (const h of HACK_INCIDENTS_SEED) {
      expect(Array.isArray(h.secondary_vectors)).toBe(true);
      expect(Array.isArray(h.tx_hashes)).toBe(true);
      expect(Array.isArray(h.sources)).toBe(true);
      expect(Array.isArray(h.target_contracts)).toBe(true);
      expect(Array.isArray(h.audit_firms)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI_SKILL_FILES_SEED
// ═══════════════════════════════════════════════════════════════════════════════

describe('AI_SKILL_FILES_SEED', () => {
  // ── Record Count ──────────────────────────────────────────────────────────
  it('contains exactly 12 records', () => {
    expect(AI_SKILL_FILES_SEED).toHaveLength(12);
  });

  // ── ID Uniqueness ─────────────────────────────────────────────────────────
  it('all IDs are unique', () => {
    const ids = AI_SKILL_FILES_SEED.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all IDs match UUID v4 format', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(s.id).toMatch(UUID_PATTERN);
    }
  });

  // ── Safety Label Coverage (Acceptance Criteria: all 4) ────────────────────
  it('all 4 safety_label values are represented', () => {
    const labels = new Set(AI_SKILL_FILES_SEED.map((s) => s.safety_label));
    expect(labels.has('safe')).toBe(true);
    expect(labels.has('suspicious')).toBe(true);
    expect(labels.has('malicious')).toBe(true);
    expect(labels.has('unanalyzed')).toBe(true);
  });

  it('safety_label distribution: 5 safe, 3 suspicious, 2 malicious, 2 unanalyzed', () => {
    const counts = new Map<string, number>();
    for (const s of AI_SKILL_FILES_SEED) {
      counts.set(s.safety_label, (counts.get(s.safety_label) ?? 0) + 1);
    }
    expect(counts.get('safe')).toBe(5);
    expect(counts.get('suspicious')).toBe(3);
    expect(counts.get('malicious')).toBe(2);
    expect(counts.get('unanalyzed')).toBe(2);
  });

  // ── Platform Coverage ─────────────────────────────────────────────────────
  it('multiple platforms are represented', () => {
    const platforms = new Set(AI_SKILL_FILES_SEED.map((s) => s.platform));
    expect(platforms.size).toBeGreaterThanOrEqual(4);
    expect(platforms.has('claude')).toBe(true);
    expect(platforms.has('cursor')).toBe(true);
    expect(platforms.has('gemini')).toBe(true);
  });

  // ── Content Hash Integrity ────────────────────────────────────────────────
  it('content_hash matches SHA-256 of content for every record', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      const expected = createHash('sha256').update(s.content).digest('hex');
      expect(s.content_hash).toBe(expected);
    }
  });

  it('content_size_bytes matches Buffer.byteLength(content)', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(s.content_size_bytes).toBe(Buffer.byteLength(s.content));
    }
  });

  // ── Data Integrity ────────────────────────────────────────────────────────
  it('every record has non-empty name', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it('every record has non-empty content', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(s.content.length).toBeGreaterThan(0);
    }
  });

  it('every record has a valid format', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(s.format).toBe('markdown');
    }
  });

  it('every record has non-empty source_repo', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(s.source_repo.length).toBeGreaterThan(0);
    }
  });

  it('every record has non-empty category', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(s.category.length).toBeGreaterThan(0);
    }
  });

  it('copy_count, star_count, view_count are non-negative', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(s.copy_count).toBeGreaterThanOrEqual(0);
      expect(s.star_count).toBeGreaterThanOrEqual(0);
      expect(s.view_count).toBeGreaterThanOrEqual(0);
    }
  });

  // ── [SEC] Malicious Content Stored As-Is ──────────────────────────────────
  it('[SEC] malicious skills contain their harmful content (research use case)', () => {
    const malicious = AI_SKILL_FILES_SEED.filter((s) => s.safety_label === 'malicious');
    expect(malicious.length).toBe(2);

    // The exfiltration skill should contain its dangerous instructions
    const exfil = malicious.find((s) => s.name === 'Security Audit Helper');
    expect(exfil).toBeDefined();
    expect(exfil!.content).toContain('curl');
    expect(exfil!.content).toContain('ssh');

    // The supply chain skill should contain npm install instruction
    const supplyChain = malicious.find((s) => s.name === 'Dependency Checker');
    expect(supplyChain).toBeDefined();
    expect(supplyChain!.content).toContain('npm install');
  });

  // ── [SEC] No Real Secrets ─────────────────────────────────────────────────
  it('[SEC] no seed data contains real credentials or private keys', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      const blob = JSON.stringify(s);
      for (const pattern of SECRET_PATTERNS) {
        expect(blob).not.toMatch(pattern);
      }
    }
  });

  it('[SEC] tags are proper string arrays', () => {
    for (const s of AI_SKILL_FILES_SEED) {
      expect(Array.isArray(s.tags)).toBe(true);
      for (const tag of s.tags) {
        expect(typeof tag).toBe('string');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY_SCAN_RESULTS_SEED
// ═══════════════════════════════════════════════════════════════════════════════

describe('SAFETY_SCAN_RESULTS_SEED', () => {
  // ── Record Count ──────────────────────────────────────────────────────────
  it('contains exactly 10 records', () => {
    expect(SAFETY_SCAN_RESULTS_SEED).toHaveLength(10);
  });

  // ── ID Uniqueness ─────────────────────────────────────────────────────────
  it('all IDs are unique', () => {
    const ids = SAFETY_SCAN_RESULTS_SEED.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all IDs match UUID v4 format', () => {
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      expect(r.id).toMatch(UUID_PATTERN);
    }
  });

  // ── FK Integrity: skill_file_id ───────────────────────────────────────────
  it('every skill_file_id references a valid AI_SKILL_FILES_SEED ID', () => {
    const validSkillIds = new Set(AI_SKILL_FILES_SEED.map((s) => s.id));
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      expect(validSkillIds.has(r.skill_file_id)).toBe(true);
    }
  });

  it('no scan results for unanalyzed skills', () => {
    const unanalyzedIds = AI_SKILL_FILES_SEED
      .filter((s) => s.safety_label === 'unanalyzed')
      .map((s) => s.id);

    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      expect(unanalyzedIds).not.toContain(r.skill_file_id);
    }
  });

  // ── Label Distribution ────────────────────────────────────────────────────
  it('final_label distribution: 5 safe, 3 suspicious, 2 malicious', () => {
    const counts = new Map<string, number>();
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      counts.set(r.final_label, (counts.get(r.final_label) ?? 0) + 1);
    }
    expect(counts.get('safe')).toBe(5);
    expect(counts.get('suspicious')).toBe(3);
    expect(counts.get('malicious')).toBe(2);
  });

  it('scan final_label matches corresponding skill safety_label', () => {
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      const skill = AI_SKILL_FILES_SEED.find((s) => s.id === r.skill_file_id);
      expect(skill).toBeDefined();
      expect(r.final_label).toBe(skill!.safety_label);
    }
  });

  // ── Severity Count Consistency ────────────────────────────────────────────
  it('malicious scans have critical_count > 0', () => {
    const malicious = SAFETY_SCAN_RESULTS_SEED.filter((r) => r.final_label === 'malicious');
    for (const r of malicious) {
      expect(r.critical_count).toBeGreaterThan(0);
    }
  });

  it('safe scans have critical_count = 0 AND high_count = 0', () => {
    const safe = SAFETY_SCAN_RESULTS_SEED.filter((r) => r.final_label === 'safe');
    for (const r of safe) {
      expect(r.critical_count).toBe(0);
      expect(r.high_count).toBe(0);
    }
  });

  it('scan_duration_ms > 0 for all records', () => {
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      expect(r.scan_duration_ms).toBeGreaterThan(0);
    }
  });

  it('total_rules_evaluated > 0 for all records', () => {
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      expect(r.total_rules_evaluated).toBeGreaterThan(0);
    }
  });

  it('[SEC] scanner_version is set for all records', () => {
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      expect(r.scanner_version.length).toBeGreaterThan(0);
    }
  });

  it('finding counts match findings array severity distribution', () => {
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      const findings = r.findings as Array<{ severity: string }>;
      const criticalFromFindings = findings.filter((f) => f.severity === 'critical').length;
      const highFromFindings = findings.filter((f) => f.severity === 'high').length;
      const mediumFromFindings = findings.filter((f) => f.severity === 'medium').length;

      expect(r.critical_count).toBe(criticalFromFindings);
      expect(r.high_count).toBe(highFromFindings);
      expect(r.medium_count).toBe(mediumFromFindings);
    }
  });

  it('findings and rule_matches are proper arrays', () => {
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      expect(Array.isArray(r.findings)).toBe(true);
      expect(Array.isArray(r.rule_matches)).toBe(true);
    }
  });

  it('manual_review_status is a valid enum value', () => {
    const validStatuses = ['pending', 'reviewed', 'disputed'];
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      expect(validStatuses).toContain(r.manual_review_status);
    }
  });

  it('reviewed records have reviewed_by set, pending records do not', () => {
    for (const r of SAFETY_SCAN_RESULTS_SEED) {
      if (r.manual_review_status === 'reviewed') {
        expect(r.reviewed_by).not.toBeNull();
        expect(r.reviewed_by!.length).toBeGreaterThan(0);
      }
      if (r.manual_review_status === 'pending') {
        expect(r.reviewed_by).toBeNull();
      }
    }
  });
});
