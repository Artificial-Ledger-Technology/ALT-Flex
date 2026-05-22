/**
 * @module PostgresHackRepository
 * @description Concrete PostgreSQL implementation of IHackDataPort.
 *
 * This adapter translates domain operations into SQL queries against
 * the hack_incidents table. It uses raw `pg` queries (no ORM) for
 * maximum performance and transparency.
 *
 * @hexagonal Adapter — Infrastructure Layer (Driven/Secondary)
 * @task P2-ETL-004
 */

import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  HackIncidentSchema,
  AttackVector,
  Chain,
  type IHackDataPort,
  type PaginatedResult,
  type HackFilters,
  type AttackVectorStat,
  type ChainStat,
  type LossTimeSeriesPoint,
  type DashboardStats,
  type HackIncident,
  type CreateHackIncidentInput,
  type UpdateHackIncidentInput,
} from '@aegis/core';

const { Pool } = pg;

// ═══════════════════════════════════════════════════════════════════════════════
// Row Type Definitions (snake_case DB rows)
// ═══════════════════════════════════════════════════════════════════════════════

/** Raw row shape from hack_incidents table. */
interface HackIncidentRow {
  id: string;
  protocol_name: string;
  protocol_slug: string | null;
  date: Date;
  chain: Chain;
  attack_vector: AttackVector;
  secondary_vectors: string[];
  loss_usd: string; // NUMERIC comes as string from pg
  funds_returned: string;
  tx_hashes: string[];
  transaction_refs: unknown[];
  sources: string[];
  description: string;
  post_mortem: string | null;
  has_foundry_poc: boolean;
  foundry_test_path: string | null;
  target_contracts: string[];
  protocol_category: string | null;
  protocol_tvl_at_exploit: string | null;
  was_audited: boolean | null;
  audit_firms: string[];
  data_source: string;
  last_synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

/** Row shape for COUNT(*) queries. */
interface CountRow {
  total: string;
}

/** Row shape for SUM aggregate queries. */
interface SumRow {
  total: string;
}

/** Row shape for attack vector stats aggregate. */
interface AttackVectorStatsRow {
  attack_vector: AttackVector;
  count: number;
  total_loss_usd: string;
  avg_loss_usd: string;
  last_incident_date: Date;
}

/** Row shape for chain stats aggregate. */
interface ChainStatsRow {
  chain: Chain;
  count: number;
  total_loss_usd: string;
  avg_loss_usd: string;
}

/** Row shape for time-series aggregate. */
interface TimeSeriesRow {
  bucket_date: Date;
  total_loss_usd: string;
  incident_count: number;
}

/** Row shape for dashboard stats aggregate. */
interface DashboardStatsRow {
  total_incidents: number;
  total_loss_usd: string;
  total_recovered_usd: string;
  avg_loss_usd: string;
  median_loss_usd: string;
  unique_protocols: number;
  unique_chains: number;
}

/** Row shape for POC coverage aggregate. */
interface PocCoverageRow {
  poc_count: number;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Row Mapper
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map a raw PostgreSQL row (snake_case) to a HackIncident domain entity (camelCase).
 */
function rowToEntity(row: HackIncidentRow): HackIncident {
  return HackIncidentSchema.parse({
    id: row.id,
    protocolName: row.protocol_name,
    protocolSlug: row.protocol_slug ?? undefined,
    date: row.date,
    chain: row.chain,
    attackVector: row.attack_vector,
    secondaryVectors: row.secondary_vectors,
    lossUsd: Number(row.loss_usd),
    fundsReturned: Number(row.funds_returned),
    txHashes: row.tx_hashes,
    transactionRefs: row.transaction_refs,
    sources: row.sources,
    description: row.description,
    postMortem: row.post_mortem ?? undefined,
    hasFoundryPoc: row.has_foundry_poc,
    foundryTestPath: row.foundry_test_path ?? undefined,
    targetContracts: row.target_contracts,
    protocolCategory: row.protocol_category ?? undefined,
    protocolTvlAtExploit:
      row.protocol_tvl_at_exploit !== null ? Number(row.protocol_tvl_at_exploit) : undefined,
    wasAudited: row.was_audited ?? undefined,
    auditFirms: row.audit_firms,
    dataSource: row.data_source,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PostgresHackRepository
// ═══════════════════════════════════════════════════════════════════════════════

export class PostgresHackRepository implements IHackDataPort {
  private readonly pool: pg.Pool;

  constructor(connectionStringOrPool: string | pg.Pool) {
    if (typeof connectionStringOrPool === 'string') {
      this.pool = new Pool({ connectionString: connectionStringOrPool });
    } else {
      this.pool = connectionStringOrPool;
    }
  }

  // ── CRUD Operations ─────────────────────────────────────────────────────

  async findById(id: string): Promise<HackIncident | null> {
    const result = await this.pool.query<HackIncidentRow>(
      'SELECT * FROM hack_incidents WHERE id = $1',
      [id],
    );
    const row = result.rows[0];
    if (row === undefined) return null;
    return rowToEntity(row);
  }

  async findAll(filters: HackFilters): Promise<PaginatedResult<HackIncident>> {
    const { where, params } = this.buildWhereClause(filters);
    const countResult = await this.pool.query<CountRow>(
      `SELECT COUNT(*) AS total FROM hack_incidents ${where}`,
      params,
    );
    const countRow = countResult.rows[0];
    const total = countRow !== undefined ? parseInt(countRow.total, 10) : 0;

    const sortColumn = this.mapSortField(filters.sortBy);
    const sortDir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const offset = (filters.page - 1) * filters.pageSize;

    const paramIndex = params.length + 1;
    const dataResult = await this.pool.query<HackIncidentRow>(
      `SELECT * FROM hack_incidents ${where}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, filters.pageSize, offset],
    );

    const totalPages = Math.ceil(total / filters.pageSize);

    return {
      data: dataResult.rows.map(rowToEntity),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1,
    };
  }

  async save(incident: CreateHackIncidentInput | HackIncident): Promise<HackIncident> {
    const id = 'id' in incident && incident.id ? incident.id : randomUUID();
    const now = new Date();

    const result = await this.pool.query<HackIncidentRow>(
      `INSERT INTO hack_incidents (
        id, protocol_name, protocol_slug, date, chain, attack_vector,
        secondary_vectors, loss_usd, funds_returned, tx_hashes,
        transaction_refs, sources, description, post_mortem,
        has_foundry_poc, foundry_test_path, target_contracts,
        protocol_category, protocol_tvl_at_exploit, was_audited, audit_firms,
        data_source, last_synced_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25
      )
      ON CONFLICT (id) DO UPDATE SET
        protocol_name = EXCLUDED.protocol_name,
        protocol_slug = EXCLUDED.protocol_slug,
        date = EXCLUDED.date,
        chain = EXCLUDED.chain,
        attack_vector = EXCLUDED.attack_vector,
        secondary_vectors = EXCLUDED.secondary_vectors,
        loss_usd = EXCLUDED.loss_usd,
        funds_returned = EXCLUDED.funds_returned,
        tx_hashes = EXCLUDED.tx_hashes,
        transaction_refs = EXCLUDED.transaction_refs,
        sources = EXCLUDED.sources,
        description = EXCLUDED.description,
        post_mortem = EXCLUDED.post_mortem,
        has_foundry_poc = EXCLUDED.has_foundry_poc,
        foundry_test_path = EXCLUDED.foundry_test_path,
        target_contracts = EXCLUDED.target_contracts,
        protocol_category = EXCLUDED.protocol_category,
        protocol_tvl_at_exploit = EXCLUDED.protocol_tvl_at_exploit,
        was_audited = EXCLUDED.was_audited,
        audit_firms = EXCLUDED.audit_firms,
        data_source = EXCLUDED.data_source,
        last_synced_at = EXCLUDED.last_synced_at,
        updated_at = NOW()
      RETURNING *`,
      [
        id,
        incident.protocolName,
        incident.protocolSlug ?? null,
        incident.date,
        incident.chain,
        incident.attackVector,
        JSON.stringify(incident.secondaryVectors ?? []),
        incident.lossUsd,
        incident.fundsReturned ?? 0,
        JSON.stringify(incident.txHashes ?? []),
        JSON.stringify(incident.transactionRefs ?? []),
        JSON.stringify(incident.sources ?? []),
        incident.description ?? '',
        incident.postMortem ?? null,
        incident.hasFoundryPoc ?? false,
        incident.foundryTestPath ?? null,
        JSON.stringify(incident.targetContracts ?? []),
        incident.protocolCategory ?? null,
        incident.protocolTvlAtExploit ?? null,
        incident.wasAudited ?? null,
        JSON.stringify(incident.auditFirms ?? []),
        incident.dataSource,
        incident.lastSyncedAt ?? now,
        now,
        now,
      ],
    );

    const savedRow = result.rows[0];
    if (savedRow === undefined) {
      throw new Error('INSERT/UPSERT returned no rows — unexpected database error');
    }
    return rowToEntity(savedRow);
  }

  async saveBatch(incidents: Array<CreateHackIncidentInput | HackIncident>): Promise<number> {
    const client = await this.pool.connect();
    let count = 0;

    try {
      await client.query('BEGIN');
      for (const incident of incidents) {
        await this.save(incident);
        count++;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return count;
  }

  async update(input: UpdateHackIncidentInput): Promise<HackIncident | null> {
    const existing = await this.findById(input.id);
    if (existing === null) return null;

    const merged = { ...existing, ...input, updatedAt: new Date() };
    return this.save(merged);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM hack_incidents WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // ── Query Operations ────────────────────────────────────────────────────

  async count(filters?: Partial<HackFilters>): Promise<number> {
    if (filters === undefined) {
      const result = await this.pool.query<CountRow>(
        'SELECT COUNT(*) AS total FROM hack_incidents',
      );
      const countRow = result.rows[0];
      return countRow !== undefined ? parseInt(countRow.total, 10) : 0;
    }

    const { where, params } = this.buildWhereClause(filters);
    const result = await this.pool.query<CountRow>(
      `SELECT COUNT(*) AS total FROM hack_incidents ${where}`,
      params,
    );
    const filteredCountRow = result.rows[0];
    return filteredCountRow !== undefined ? parseInt(filteredCountRow.total, 10) : 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM hack_incidents WHERE id = $1 LIMIT 1', [
      id,
    ]);
    return result.rows.length > 0;
  }

  async findByProtocol(protocolName: string): Promise<HackIncident[]> {
    const result = await this.pool.query<HackIncidentRow>(
      `SELECT * FROM hack_incidents
       WHERE protocol_name ILIKE $1
       ORDER BY date DESC`,
      [`%${protocolName}%`],
    );
    return result.rows.map(rowToEntity);
  }

  async findRecent(limit: number): Promise<HackIncident[]> {
    const result = await this.pool.query<HackIncidentRow>(
      'SELECT * FROM hack_incidents ORDER BY date DESC LIMIT $1',
      [limit],
    );
    return result.rows.map(rowToEntity);
  }

  // ── Aggregate Operations ────────────────────────────────────────────────

  async getTotalLossUsd(filters?: Partial<HackFilters>): Promise<number> {
    if (filters === undefined) {
      const result = await this.pool.query<SumRow>(
        'SELECT COALESCE(SUM(loss_usd), 0) AS total FROM hack_incidents',
      );
      const sumRow = result.rows[0];
      return sumRow !== undefined ? Number(sumRow.total) : 0;
    }

    const { where, params } = this.buildWhereClause(filters);
    const result = await this.pool.query<SumRow>(
      `SELECT COALESCE(SUM(loss_usd), 0) AS total FROM hack_incidents ${where}`,
      params,
    );
    const filteredSumRow = result.rows[0];
    return filteredSumRow !== undefined ? Number(filteredSumRow.total) : 0;
  }

  async getAttackVectorStats(): Promise<AttackVectorStat[]> {
    const result = await this.pool.query<AttackVectorStatsRow>(`
      SELECT
        attack_vector,
        COUNT(*)::int AS count,
        COALESCE(SUM(loss_usd), 0)::numeric AS total_loss_usd,
        COALESCE(AVG(loss_usd), 0)::numeric AS avg_loss_usd,
        MAX(date) AS last_incident_date
      FROM hack_incidents
      GROUP BY attack_vector
      ORDER BY total_loss_usd DESC
    `);

    return result.rows.map(
      (row): AttackVectorStat => ({
        attackVector: row.attack_vector,
        count: row.count,
        totalLossUsd: Number(row.total_loss_usd),
        avgLossUsd: Number(row.avg_loss_usd),
        lastIncidentDate: new Date(row.last_incident_date),
      }),
    );
  }

  async getChainStats(): Promise<ChainStat[]> {
    const result = await this.pool.query<ChainStatsRow>(`
      SELECT
        chain,
        COUNT(*)::int AS count,
        COALESCE(SUM(loss_usd), 0)::numeric AS total_loss_usd,
        COALESCE(AVG(loss_usd), 0)::numeric AS avg_loss_usd
      FROM hack_incidents
      GROUP BY chain
      ORDER BY total_loss_usd DESC
    `);

    return result.rows.map(
      (row): ChainStat => ({
        chain: row.chain,
        count: row.count,
        totalLossUsd: Number(row.total_loss_usd),
        avgLossUsd: Number(row.avg_loss_usd),
      }),
    );
  }

  async getLossTimeSeries(
    granularity: 'day' | 'week' | 'month' | 'year',
  ): Promise<LossTimeSeriesPoint[]> {
    const truncFn =
      granularity === 'week' ? "date_trunc('week', date)" : `date_trunc('${granularity}', date)`;

    const result = await this.pool.query<TimeSeriesRow>(`
      SELECT
        ${truncFn} AS bucket_date,
        COALESCE(SUM(loss_usd), 0)::numeric AS total_loss_usd,
        COUNT(*)::int AS incident_count
      FROM hack_incidents
      GROUP BY bucket_date
      ORDER BY bucket_date ASC
    `);

    let cumulative = 0;
    return result.rows.map((row) => {
      cumulative += Number(row.total_loss_usd);
      return {
        date: new Date(row.bucket_date),
        totalLossUsd: Number(row.total_loss_usd),
        incidentCount: row.incident_count,
        cumulativeLossUsd: cumulative,
      };
    });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const result = await this.pool.query<DashboardStatsRow>(`
      SELECT
        COUNT(*)::int AS total_incidents,
        COALESCE(SUM(loss_usd), 0)::numeric AS total_loss_usd,
        COALESCE(SUM(funds_returned), 0)::numeric AS total_recovered_usd,
        COALESCE(AVG(loss_usd), 0)::numeric AS avg_loss_usd,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY loss_usd), 0)::numeric AS median_loss_usd,
        COUNT(DISTINCT protocol_name)::int AS unique_protocols,
        COUNT(DISTINCT chain)::int AS unique_chains
      FROM hack_incidents
    `);

    const pocResult = await this.pool.query<PocCoverageRow>(`
      SELECT
        COUNT(*) FILTER (WHERE has_foundry_poc = true)::int AS poc_count,
        COUNT(*)::int AS total
      FROM hack_incidents
    `);

    const row = result.rows[0];
    const pocRow = pocResult.rows[0];

    if (row === undefined || pocRow === undefined) {
      return {
        totalIncidents: 0,
        totalLossUsd: 0,
        totalRecoveredUsd: 0,
        avgLossUsd: 0,
        medianLossUsd: 0,
        pocCoverage: 0,
        uniqueProtocols: 0,
        uniqueChains: 0,
      };
    }

    const pocCoverage = pocRow.total > 0 ? (pocRow.poc_count / pocRow.total) * 100 : 0;

    return {
      totalIncidents: row.total_incidents,
      totalLossUsd: Number(row.total_loss_usd),
      totalRecoveredUsd: Number(row.total_recovered_usd),
      avgLossUsd: Number(row.avg_loss_usd),
      medianLossUsd: Number(row.median_loss_usd),
      pocCoverage: Math.round(pocCoverage * 100) / 100,
      uniqueProtocols: row.unique_protocols,
      uniqueChains: row.unique_chains,
    };
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  async close(): Promise<void> {
    await this.pool.end();
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private buildWhereClause(filters: Partial<HackFilters>): { where: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.attackVector !== undefined) {
      params.push(filters.attackVector);
      conditions.push(`attack_vector = $${params.length.toString()}`);
    }
    if (filters.chain !== undefined) {
      params.push(filters.chain);
      conditions.push(`chain = $${params.length.toString()}`);
    }
    if (filters.protocol !== undefined && filters.protocol !== '') {
      params.push(`%${filters.protocol}%`);
      conditions.push(`protocol_name ILIKE $${params.length.toString()}`);
    }
    if (filters.dateFrom !== undefined) {
      params.push(filters.dateFrom);
      conditions.push(`date >= $${params.length.toString()}`);
    }
    if (filters.dateTo !== undefined) {
      params.push(filters.dateTo);
      conditions.push(`date <= $${params.length.toString()}`);
    }
    if (filters.minLossUsd !== undefined) {
      params.push(filters.minLossUsd);
      conditions.push(`loss_usd >= $${params.length.toString()}`);
    }
    if (filters.maxLossUsd !== undefined) {
      params.push(filters.maxLossUsd);
      conditions.push(`loss_usd <= $${params.length.toString()}`);
    }
    if (filters.hasFoundryPoc !== undefined) {
      params.push(filters.hasFoundryPoc);
      conditions.push(`has_foundry_poc = $${params.length.toString()}`);
    }
    if (filters.search !== undefined && filters.search !== '') {
      params.push(`%${filters.search}%`);
      conditions.push(
        `(protocol_name ILIKE $${params.length.toString()} OR description ILIKE $${params.length.toString()})`,
      );
    }
    if (filters.dataSource !== undefined && filters.dataSource !== '') {
      params.push(filters.dataSource);
      conditions.push(`data_source = $${params.length.toString()}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params };
  }

  private mapSortField(sortBy: string): string {
    const map: Record<string, string> = {
      date: 'date',
      lossUsd: 'loss_usd',
      protocolName: 'protocol_name',
      fundsReturned: 'funds_returned',
      chain: 'chain',
    };
    return map[sortBy] ?? 'date';
  }
}
