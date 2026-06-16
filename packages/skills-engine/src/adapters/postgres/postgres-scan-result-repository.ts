import { Pool, type PoolConfig } from 'pg';
import { SafetyScanSummarySchema, type SafetyScanSummary } from '@aegis/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToSafetyScanSummary(row: any): SafetyScanSummary {
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
    const res = await this.pool.query(query, [skillId]);
    if (res.rows.length === 0) return null;
    return mapRowToSafetyScanSummary(res.rows[0]);
  }

  async getResultHistory(skillId: string): Promise<SafetyScanSummary[]> {
    const query = `
      SELECT * FROM safety_scan_results
      WHERE skill_file_id = $1
      ORDER BY scan_timestamp DESC
    `;
    const res = await this.pool.query(query, [skillId]);
    return res.rows.map(mapRowToSafetyScanSummary);
  }
}
