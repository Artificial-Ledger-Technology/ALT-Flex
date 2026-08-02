import pg from 'pg';
import { type ForensicReport } from '../../domain/report-types.js';
import { type IForensicReportRepositoryPort } from '../../domain/ports/forensic-report-repository.port.js';

const { Pool } = pg;

export class PostgresForensicReportRepository implements IForensicReportRepositoryPort {
  private readonly pool: pg.Pool;

  constructor(connectionStringOrPool: string | pg.Pool) {
    if (typeof connectionStringOrPool === 'string') {
      this.pool = new Pool({ connectionString: connectionStringOrPool });
    } else {
      this.pool = connectionStringOrPool;
    }
  }

  async save(report: ForensicReport): Promise<void> {
    const query = `
      INSERT INTO forensic_reports (
        id, hack_incident_id, analysis_mode, chain, tx_hash,
        simulation_data, trace_data, storage_diff_data, patterns_data, metadata
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
      ON CONFLICT (id) DO UPDATE SET
        hack_incident_id = EXCLUDED.hack_incident_id,
        analysis_mode = EXCLUDED.analysis_mode,
        chain = EXCLUDED.chain,
        tx_hash = EXCLUDED.tx_hash,
        simulation_data = EXCLUDED.simulation_data,
        trace_data = EXCLUDED.trace_data,
        storage_diff_data = EXCLUDED.storage_diff_data,
        patterns_data = EXCLUDED.patterns_data,
        metadata = EXCLUDED.metadata
    `;

    await this.pool.query(query, [
      report.id,
      report.hackIncidentId,
      report.analysisMode,
      report.chain,
      report.txHash ?? null,
      report.simulation ? JSON.stringify(report.simulation, (_, v) => typeof v === 'bigint' ? v.toString() : v) : null,
      JSON.stringify(report.trace, (_, v) => typeof v === 'bigint' ? v.toString() : v),
      JSON.stringify(report.storageDiff, (_, v) => typeof v === 'bigint' ? v.toString() : v),
      JSON.stringify(report.patterns, (_, v) => typeof v === 'bigint' ? v.toString() : v),
      JSON.stringify(report.metadata, (_, v) => typeof v === 'bigint' ? v.toString() : v),
    ]);
  }

  async findById(id: string): Promise<ForensicReport | null> {
    const result = await this.pool.query('SELECT * FROM forensic_reports WHERE id = $1', [id]);
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToEntity(row);
  }

  async findByHackIncidentId(hackIncidentId: string): Promise<ForensicReport[]> {
    const result = await this.pool.query('SELECT * FROM forensic_reports WHERE hack_incident_id = $1', [hackIncidentId]);
    return result.rows.map((row: Record<string, any>) => this.mapRowToEntity(row));
  }

  async findAll(limit = 20, offset = 0): Promise<{ data: ForensicReport[]; total: number }> {
    const result = await this.pool.query("SELECT * FROM forensic_reports ORDER BY metadata->>'createdAt' DESC LIMIT $1 OFFSET $2", [limit, offset]);
    const countResult = await this.pool.query('SELECT COUNT(*) FROM forensic_reports');
    return {
      data: result.rows.map((row: Record<string, any>) => this.mapRowToEntity(row)),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  private mapRowToEntity(row: Record<string, any>): ForensicReport {
    // A proper implementation would also parse bigints from strings back to bigints here.
    // Assuming simple JSON.parse mapping for now in this MVP version.
    return {
      id: row.id,
      hackIncidentId: row.hack_incident_id,
      analysisMode: row.analysis_mode,
      chain: row.chain,
      txHash: row.tx_hash || undefined,
      simulation: row.simulation_data || undefined,
      trace: row.trace_data,
      storageDiff: row.storage_diff_data,
      patterns: row.patterns_data,
      metadata: row.metadata,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
