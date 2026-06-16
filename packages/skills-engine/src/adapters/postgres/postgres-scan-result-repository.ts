import { Pool, type PoolConfig } from 'pg';
import { SafetyScanSummarySchema, type SafetyScanSummary } from '@aegis/core';

interface SafetyScanSummaryRow {
  id: string;
  final_label: string;
  scanner_version: string;
  scan_timestamp: string | Date;
  scan_duration_ms: number | string;
  total_rules_evaluated: number | string;
  critical_count: number | string;
  high_count: number | string;
  medium_count: number | string;
  low_count: number | string;
  info_count: number | string;
  manual_review_status: string;
}

function mapRowToSafetyScanSummary(row: SafetyScanSummaryRow): SafetyScanSummary {
  const totalFindings =
    Number(row.critical_count) +
    Number(row.high_count) +
    Number(row.medium_count) +
    Number(row.low_count) +
    Number(row.info_count);

  return SafetyScanSummarySchema.parse({
    id: row.id,
    finalLabel: row.final_label,
    scannerVersion: row.scanner_version,
    scanTimestamp: new Date(row.scan_timestamp),
    scanDurationMs: Number(row.scan_duration_ms),
    totalRulesEvaluated: Number(row.total_rules_evaluated),
    criticalCount: Number(row.critical_count),
    highCount: Number(row.high_count),
    mediumCount: Number(row.medium_count),
    lowCount: Number(row.low_count),
    infoCount: Number(row.info_count),
    totalFindings,
    manualReviewStatus: row.manual_review_status,
  });
}

interface SafetyStatsRow {
  total_scans: string | number | null;
  average_score: string | number | null;
  safe_count: string | number | null;
  suspicious_count: string | number | null;
  malicious_count: string | number | null;
  unanalyzed_count: string | number | null;
}

interface RuleHitRow {
  rule_id: string;
  name: string | null;
  category: string | null;
  hit_count: string | number;
  last_triggered: string | Date | null;
}

interface TimelineRow {
  date_bucket: string | Date;
  safe_count: string | number | null;
  suspicious_count: string | number | null;
  malicious_count: string | number | null;
  total: string | number | null;
}

interface TopFindingRow {
  rule_id: string;
  rule_name: string | null;
  category: string | null;
  severity: string | null;
  trigger_count: string | number;
}

export class PostgresScanResultRepository {
  private readonly pool: Pool;

  constructor(config?: PoolConfig) {
    this.pool = new Pool({
      min: 2,
      max: 10,
      statement_timeout: 30000,
      ...config,
    });
  }

  async getLatestResult(skillId: string): Promise<SafetyScanSummary | null> {
    const query = `
      SELECT * FROM safety_scan_results
      WHERE skill_file_id = $1
      ORDER BY scan_timestamp DESC
      LIMIT 1
    `;
    const res = await this.pool.query<SafetyScanSummaryRow>(query, [skillId]);
    const row = res.rows[0];
    if (!row) return null;
    return mapRowToSafetyScanSummary(row);
  }

  async getSkillSafetyHistory(skillId: string): Promise<SafetyScanSummary[]> {
    const query = `
      SELECT * FROM safety_scan_results
      WHERE skill_file_id = $1
      ORDER BY scan_timestamp DESC
    `;
    const res = await this.pool.query<SafetyScanSummaryRow>(query, [skillId]);
    return res.rows.map(mapRowToSafetyScanSummary);
  }

  // ── Analytics Methods (P3-SCAN-011) ───────────────────────────────────────

  async getSafetyStats(): Promise<import('@aegis/core').SafetyStatsResponse> {
    const query = `
      SELECT
        COUNT(*) as total_scans,
        AVG((
          COALESCE(critical_count, 0) * 10 +
          COALESCE(high_count, 0) * 5 +
          COALESCE(medium_count, 0) * 2 +
          COALESCE(low_count, 0) * 1
        )) as average_score,
        SUM(CASE WHEN final_label = 'safe' THEN 1 ELSE 0 END) as safe_count,
        SUM(CASE WHEN final_label = 'suspicious' THEN 1 ELSE 0 END) as suspicious_count,
        SUM(CASE WHEN final_label = 'malicious' THEN 1 ELSE 0 END) as malicious_count,
        SUM(CASE WHEN final_label = 'unanalyzed' THEN 1 ELSE 0 END) as unanalyzed_count
      FROM safety_scan_results
    `;
    const res = await this.pool.query<SafetyStatsRow>(query);
    const row = res.rows[0];

    return {
      totalScans: Number(row?.total_scans ?? 0),
      averageScore: Number(row?.average_score ?? 0),
      labelDistribution: {
        safe: Number(row?.safe_count ?? 0),
        suspicious: Number(row?.suspicious_count ?? 0),
        malicious: Number(row?.malicious_count ?? 0),
        unanalyzed: Number(row?.unanalyzed_count ?? 0),
      },
    };
  }

  async getRuleHitStats(): Promise<import('@aegis/core').SafetyRuleStat[]> {
    const query = `
      SELECT
        f->>'ruleId' as rule_id,
        MAX(f->>'ruleName') as name,
        MAX(f->>'category') as category,
        COUNT(*) as hit_count,
        MAX(scan_timestamp) as last_triggered
      FROM safety_scan_results,
      jsonb_array_elements(findings) as f
      GROUP BY f->>'ruleId'
      ORDER BY hit_count DESC
    `;
    const res = await this.pool.query<RuleHitRow>(query);
    return res.rows.map((row) => ({
      ruleId: String(row.rule_id),
      name: row.name !== null && row.name !== undefined ? String(row.name) : 'Unknown',
      category:
        row.category !== null && row.category !== undefined ? String(row.category) : 'Unknown',
      hitCount: Number(row.hit_count),
      lastTriggered:
        row.last_triggered !== null && row.last_triggered !== undefined
          ? new Date(row.last_triggered).toISOString()
          : null,
      falsePositiveRate: 0,
    }));
  }

  async getScanTimeline(
    interval: 'day' | 'week' | 'month',
    startDate?: string,
    endDate?: string,
  ): Promise<import('@aegis/core').SafetyTimelineDataPoint[]> {
    let dateTrunc = 'day';
    if (interval === 'week') dateTrunc = 'week';
    if (interval === 'month') dateTrunc = 'month';

    const query = `
      SELECT
        DATE_TRUNC($1, scan_timestamp) as date_bucket,
        COUNT(*) as total,
        SUM(CASE WHEN final_label = 'safe' THEN 1 ELSE 0 END) as safe_count,
        SUM(CASE WHEN final_label = 'suspicious' THEN 1 ELSE 0 END) as suspicious_count,
        SUM(CASE WHEN final_label = 'malicious' THEN 1 ELSE 0 END) as malicious_count
      FROM safety_scan_results
      WHERE ($2::timestamp IS NULL OR scan_timestamp >= $2::timestamp)
        AND ($3::timestamp IS NULL OR scan_timestamp <= $3::timestamp)
      GROUP BY date_bucket
      ORDER BY date_bucket ASC
    `;
    const res = await this.pool.query<TimelineRow>(query, [
      dateTrunc,
      startDate ?? null,
      endDate ?? null,
    ]);
    return res.rows.map((row) => ({
      date: new Date(row.date_bucket).toISOString(),
      safe: Number(row.safe_count ?? 0),
      suspicious: Number(row.suspicious_count ?? 0),
      malicious: Number(row.malicious_count ?? 0),
      total: Number(row.total ?? 0),
    }));
  }

  async getTopFindings(limit: number = 10): Promise<import('@aegis/core').TopFinding[]> {
    const query = `
      SELECT
        f->>'ruleId' as rule_id,
        MAX(f->>'ruleName') as rule_name,
        MAX(f->>'category') as category,
        MAX(f->>'severity') as severity,
        COUNT(*) as trigger_count
      FROM safety_scan_results,
      jsonb_array_elements(findings) as f
      GROUP BY f->>'ruleId'
      ORDER BY trigger_count DESC
      LIMIT $1
    `;
    const res = await this.pool.query<TopFindingRow>(query, [limit]);
    return res.rows.map((row) => ({
      ruleId: String(row.rule_id),
      ruleName:
        row.rule_name !== null && row.rule_name !== undefined ? String(row.rule_name) : 'Unknown',
      category:
        row.category !== null && row.category !== undefined ? String(row.category) : 'Unknown',
      severity: row.severity !== null && row.severity !== undefined ? String(row.severity) : 'info',
      triggerCount: Number(row.trigger_count),
    }));
  }
}
