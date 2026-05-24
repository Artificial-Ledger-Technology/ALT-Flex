/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/strict-boolean-expressions */
/**
 * @module postgres-hack-repository
 * @description PostgreSQL concrete implementation of the IHackDataPort.
 *
 * Uses `pg.Pool` for connection pooling.
 * Employs parameterized queries to prevent SQL injection.
 * Dynamic query builder for advanced filtering and full-text search.
 *
 * @hexagonal Adapter — Infrastructure Layer (Driven)
 * @task P2-ETL-004
 */

import { Pool, type PoolConfig } from 'pg';
import {
  HackIncidentSchema,
  type IHackDataPort,
  type HackIncident,
  type CreateHackIncidentInput,
  type UpdateHackIncidentInput,
  type HackFilters,
  type PaginatedResult,
  type AttackVectorStat,
  type ChainStat,
  type LossTimeSeriesPoint,
  type DashboardStats,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Query Builder Helpers
// ═══════════════════════════════════════════════════════════════════════════════

interface QueryClause {
  text: string;
  values: unknown[];
}

function buildHackWhereClause(filters: Partial<HackFilters>): QueryClause {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (filters.attackVector) {
    conditions.push(`attack_vector = $${paramIdx++}`);
    values.push(filters.attackVector);
  }
  if (filters.chain) {
    conditions.push(`chain = $${paramIdx++}`);
    values.push(filters.chain);
  }
  if (filters.dateFrom) {
    conditions.push(`date >= $${paramIdx++}`);
    values.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`date <= $${paramIdx++}`);
    values.push(filters.dateTo);
  }
  if (filters.minLossUsd !== undefined) {
    conditions.push(`loss_usd >= $${paramIdx++}`);
    values.push(filters.minLossUsd);
  }
  if (filters.maxLossUsd !== undefined) {
    conditions.push(`loss_usd <= $${paramIdx++}`);
    values.push(filters.maxLossUsd);
  }
  if (filters.hasFoundryPoc !== undefined) {
    conditions.push(`has_foundry_poc = $${paramIdx++}`);
    values.push(filters.hasFoundryPoc);
  }
  if (filters.dataSource) {
    conditions.push(`data_source = $${paramIdx++}`);
    values.push(filters.dataSource);
  }
  if (filters.protocol) {
    conditions.push(`protocol_name ILIKE $${paramIdx++}`);
    values.push(`%${filters.protocol}%`);
  }
  if (filters.search) {
    // Full text search using pg_trgm (protocol_name and description)
    conditions.push(`(protocol_name ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`);
    values.push(`%${filters.search}%`);
    paramIdx++;
  }

  const text = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { text, values };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Row Mapper
// ═══════════════════════════════════════════════════════════════════════════════

function mapRowToHackIncident(row: any): HackIncident {
  // Extract JSONB payload as the base, overlaying specific columns
  const base = {
    ...row.metadata,
    id: row.id,
    protocolName: row.protocol_name,
    protocolSlug: row.protocol_slug,
    date: new Date(row.date),
    chain: row.chain,
    attackVector: row.attack_vector,
    secondaryVectors: row.secondary_vectors || [],
    lossUsd: Number(row.loss_usd),
    fundsReturned: Number(row.funds_returned),
    hasFoundryPoc: row.has_foundry_poc,
    dataSource: row.data_source,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastSyncedAt: new Date(row.last_synced_at),
    // Fallbacks for array/json fields
    txHashes: row.tx_hashes || [],
    transactionRefs: row.transaction_refs || [],
    sources: row.sources || [],
    targetContracts: row.target_contracts || [],
    auditFirms: row.audit_firms || [],
  };

  if (row.description) base.description = row.description;
  if (row.post_mortem) base.postMortem = row.post_mortem;
  if (row.foundry_test_path) base.foundryTestPath = row.foundry_test_path;
  if (row.protocol_category) base.protocolCategory = row.protocol_category;
  if (row.protocol_tvl_at_exploit) base.protocolTvlAtExploit = Number(row.protocol_tvl_at_exploit);
  if (row.was_audited !== null) base.wasAudited = row.was_audited;

  return HackIncidentSchema.parse(base);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Repository Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class PostgresHackRepository implements IHackDataPort {
  private readonly pool: Pool;

  constructor(config?: PoolConfig) {
    this.pool = new Pool({
      min: 2,
      max: 10,
      statement_timeout: 30000, // 30s default
      ...config,
    });
  }

  /** For cleanup in testing */
  async end(): Promise<void> {
    await this.pool.end();
  }

  // ── CRUD Operations ─────────────────────────────────────────────────────

  async findById(id: string): Promise<HackIncident | null> {
    const res = await this.pool.query('SELECT * FROM hack_incidents WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapRowToHackIncident(res.rows[0]);
  }

  async findAll(filters: HackFilters): Promise<PaginatedResult<HackIncident>> {
    const { text: whereClause, values } = buildHackWhereClause(filters);

    // Count total query
    const countQuery = `SELECT COUNT(*) FROM hack_incidents ${whereClause}`;
    const countRes = await this.pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query with sorting and pagination
    const sortByMap: Record<string, string> = {
      date: 'date',
      lossUsd: 'loss_usd',
      protocolName: 'protocol_name',
      fundsReturned: 'funds_returned',
      chain: 'chain',
    };
    const dbSortField = sortByMap[filters.sortBy] || 'date';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const limit = filters.pageSize;
    const offset = (filters.page - 1) * limit;

    const dataQuery = `
      SELECT * FROM hack_incidents
      ${whereClause}
      ORDER BY ${dbSortField} ${sortOrder}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const dataRes = await this.pool.query(dataQuery, [...values, limit, offset]);
    const data = dataRes.rows.map(mapRowToHackIncident);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page: filters.page,
      pageSize: limit,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1,
    };
  }

  async save(incident: CreateHackIncidentInput | HackIncident): Promise<HackIncident> {
    const isUpdate = 'id' in incident && incident.id;

    // Validate to ensure we have all defaults
    const validated = isUpdate
      ? HackIncidentSchema.parse(incident)
      : HackIncidentSchema.parse({
          ...incident,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

    const query = `
      INSERT INTO hack_incidents (
        id, protocol_name, protocol_slug, date, chain, attack_vector, secondary_vectors,
        loss_usd, funds_returned, tx_hashes, transaction_refs, sources, description,
        post_mortem, has_foundry_poc, foundry_test_path, target_contracts, protocol_category,
        protocol_tvl_at_exploit, was_audited, audit_firms, data_source,
        last_synced_at, created_at, updated_at, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
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
        updated_at = NOW(),
        metadata = EXCLUDED.metadata
      RETURNING *
    `;

    const values = [
      validated.id,
      validated.protocolName,
      validated.protocolSlug || null,
      validated.date,
      validated.chain,
      validated.attackVector,
      validated.secondaryVectors,
      validated.lossUsd,
      validated.fundsReturned,
      JSON.stringify(validated.txHashes),
      JSON.stringify(validated.transactionRefs),
      JSON.stringify(validated.sources),
      validated.description,
      validated.postMortem || null,
      validated.hasFoundryPoc,
      validated.foundryTestPath || null,
      JSON.stringify(validated.targetContracts),
      validated.protocolCategory || null,
      validated.protocolTvlAtExploit ?? null,
      validated.wasAudited ?? null,
      JSON.stringify(validated.auditFirms),
      validated.dataSource,
      validated.lastSyncedAt,
      validated.createdAt,
      validated.updatedAt,
      JSON.stringify({}), // metadata placeholder
    ];

    const res = await this.pool.query(query, values);
    return mapRowToHackIncident(res.rows[0]);
  }

  async saveBatch(incidents: Array<CreateHackIncidentInput | HackIncident>): Promise<number> {
    if (incidents.length === 0) return 0;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let count = 0;
      for (const incident of incidents) {
        const validated =
          'id' in incident && incident.id
            ? HackIncidentSchema.parse(incident)
            : HackIncidentSchema.parse({
                ...incident,
                id: crypto.randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
              });

        const query = `
          INSERT INTO hack_incidents (
            id, protocol_name, protocol_slug, date, chain, attack_vector, secondary_vectors,
            loss_usd, funds_returned, tx_hashes, transaction_refs, sources, description,
            post_mortem, has_foundry_poc, foundry_test_path, target_contracts, protocol_category,
            protocol_tvl_at_exploit, was_audited, audit_firms, data_source,
            last_synced_at, created_at, updated_at, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
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
            updated_at = NOW(),
            metadata = EXCLUDED.metadata
        `;

        const values = [
          validated.id,
          validated.protocolName,
          validated.protocolSlug || null,
          validated.date,
          validated.chain,
          validated.attackVector,
          validated.secondaryVectors,
          validated.lossUsd,
          validated.fundsReturned,
          JSON.stringify(validated.txHashes),
          JSON.stringify(validated.transactionRefs),
          JSON.stringify(validated.sources),
          validated.description,
          validated.postMortem || null,
          validated.hasFoundryPoc,
          validated.foundryTestPath || null,
          JSON.stringify(validated.targetContracts),
          validated.protocolCategory || null,
          validated.protocolTvlAtExploit ?? null,
          validated.wasAudited ?? null,
          JSON.stringify(validated.auditFirms),
          validated.dataSource,
          validated.lastSyncedAt,
          validated.createdAt,
          validated.updatedAt,
          JSON.stringify({}),
        ];

        await client.query(query, values);
        count++;
      }
      await client.query('COMMIT');
      return count;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async update(input: UpdateHackIncidentInput): Promise<HackIncident | null> {
    const existing = await this.findById(input.id);
    if (!existing) return null;

    // Merge existing with input
    const updated = { ...existing, ...input };
    return this.save(updated as HackIncident);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM hack_incidents WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ── Query Operations ────────────────────────────────────────────────────

  async count(filters?: Partial<HackFilters>): Promise<number> {
    const { text, values } = buildHackWhereClause(filters || {});
    const res = await this.pool.query(`SELECT COUNT(*) FROM hack_incidents ${text}`, values);
    return parseInt(res.rows[0].count, 10);
  }

  async exists(id: string): Promise<boolean> {
    const res = await this.pool.query('SELECT 1 FROM hack_incidents WHERE id = $1', [id]);
    return res.rows.length > 0;
  }

  async findByProtocol(protocolName: string): Promise<HackIncident[]> {
    const res = await this.pool.query(
      'SELECT * FROM hack_incidents WHERE protocol_name = $1 ORDER BY date DESC',
      [protocolName],
    );
    return res.rows.map(mapRowToHackIncident);
  }

  async findRecent(limit: number): Promise<HackIncident[]> {
    const res = await this.pool.query('SELECT * FROM hack_incidents ORDER BY date DESC LIMIT $1', [
      limit,
    ]);
    return res.rows.map(mapRowToHackIncident);
  }

  // ── Aggregate Operations ────────────────────────────────────────────────

  async getTotalLossUsd(filters?: Partial<HackFilters>): Promise<number> {
    const { text, values } = buildHackWhereClause(filters || {});
    const res = await this.pool.query(
      `SELECT SUM(loss_usd) as total FROM hack_incidents ${text}`,
      values,
    );
    return Number(res.rows[0].total) || 0;
  }

  async getAttackVectorStats(): Promise<AttackVectorStat[]> {
    const query = `
      SELECT 
        attack_vector,
        COUNT(*) as count,
        SUM(loss_usd) as total_loss,
        AVG(loss_usd) as avg_loss,
        MAX(date) as last_incident_date
      FROM hack_incidents
      GROUP BY attack_vector
      ORDER BY total_loss DESC
    `;
    const res = await this.pool.query(query);
    return res.rows.map((row) => ({
      attackVector: row.attack_vector,
      count: Number(row.count),
      totalLossUsd: Number(row.total_loss),
      avgLossUsd: Number(row.avg_loss),
      lastIncidentDate: new Date(row.last_incident_date),
    }));
  }

  async getChainStats(): Promise<ChainStat[]> {
    const query = `
      SELECT 
        chain,
        COUNT(*) as count,
        SUM(loss_usd) as total_loss,
        AVG(loss_usd) as avg_loss
      FROM hack_incidents
      GROUP BY chain
      ORDER BY total_loss DESC
    `;
    const res = await this.pool.query(query);
    return res.rows.map((row) => ({
      chain: row.chain,
      count: Number(row.count),
      totalLossUsd: Number(row.total_loss),
      avgLossUsd: Number(row.avg_loss),
    }));
  }

  async getLossTimeSeries(
    granularity: 'day' | 'week' | 'month' | 'year',
  ): Promise<LossTimeSeriesPoint[]> {
    // Standard PostgreSQL date truncation
    const query = `
      WITH time_series AS (
        SELECT 
          DATE_TRUNC($1, date) as date_bucket,
          SUM(loss_usd) as total_loss_usd,
          COUNT(*) as incident_count
        FROM hack_incidents
        GROUP BY DATE_TRUNC($1, date)
        ORDER BY date_bucket ASC
      )
      SELECT 
        date_bucket as date,
        total_loss_usd,
        incident_count,
        SUM(total_loss_usd) OVER (ORDER BY date_bucket ASC) as cumulative_loss_usd
      FROM time_series
    `;
    const res = await this.pool.query(query, [granularity]);
    return res.rows.map((row) => ({
      date: new Date(row.date),
      totalLossUsd: Number(row.total_loss_usd),
      incidentCount: Number(row.incident_count),
      cumulativeLossUsd: Number(row.cumulative_loss_usd),
    }));
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const query = `
      SELECT 
        COUNT(*) as total_incidents,
        SUM(loss_usd) as total_loss_usd,
        SUM(funds_returned) as total_recovered_usd,
        AVG(loss_usd) as avg_loss_usd,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY loss_usd) as median_loss_usd,
        COUNT(*) FILTER (WHERE has_foundry_poc = TRUE) as poc_count,
        COUNT(DISTINCT protocol_name) as unique_protocols,
        COUNT(DISTINCT chain) as unique_chains
      FROM hack_incidents
    `;
    const res = await this.pool.query(query);
    const row = res.rows[0];
    const pocCoverage =
      row.total_incidents > 0 ? (Number(row.poc_count) / Number(row.total_incidents)) * 100 : 0;

    return {
      totalIncidents: Number(row.total_incidents),
      totalLossUsd: Number(row.total_loss_usd),
      totalRecoveredUsd: Number(row.total_recovered_usd),
      avgLossUsd: Number(row.avg_loss_usd) || 0,
      medianLossUsd: Number(row.median_loss_usd) || 0,
      pocCoverage,
      uniqueProtocols: Number(row.unique_protocols),
      uniqueChains: Number(row.unique_chains),
    };
  }
}
