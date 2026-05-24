/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/strict-boolean-expressions */
/**
 * @module postgres-skill-repository
 * @description PostgreSQL concrete implementation of the ISkillDataPort.
 *
 * Uses `pg.Pool` for connection pooling.
 * Employs parameterized queries to prevent SQL injection.
 * Dynamic query builder for advanced filtering and full-text search.
 * Atomic counters for engagement metrics.
 *
 * @hexagonal Adapter — Infrastructure Layer (Driven)
 * @task P2-ETL-004
 */

import { Pool, type PoolConfig } from 'pg';
import {
  AISkillFileSchema,
  SafetyLabel,
  type ISkillDataPort,
  type AISkillFile,
  type CreateAISkillInput,
  type UpdateAISkillInput,
  type SkillFilters,
  type PaginatedResult,
  type PlatformStat,
  type LanguageStat,
  type SafetyDistribution,
  type SkillsDashboardStats,
  type AIPlatform,
} from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Query Builder Helpers
// ═══════════════════════════════════════════════════════════════════════════════

interface QueryClause {
  text: string;
  values: unknown[];
}

function buildSkillWhereClause(filters: Partial<SkillFilters>): QueryClause {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (filters.platform) {
    conditions.push(`platform = $${paramIdx++}`);
    values.push(filters.platform);
  }
  if (filters.language) {
    conditions.push(`language = $${paramIdx++}`);
    values.push(filters.language);
  }
  if (filters.safetyLabel) {
    conditions.push(`safety_label = $${paramIdx++}`);
    values.push(filters.safetyLabel);
  }
  if (filters.category) {
    conditions.push(`category = $${paramIdx++}`);
    values.push(filters.category);
  }
  if (filters.sourceRepo) {
    conditions.push(`source_repo = $${paramIdx++}`);
    values.push(filters.sourceRepo);
  }
  if (filters.author) {
    conditions.push(`author = $${paramIdx++}`);
    values.push(filters.author);
  }
  if (filters.tags && filters.tags.length > 0) {
    // Requires tags JSONB or array intersection. Assuming tags is a text array: tags && ARRAY[...]
    conditions.push(`tags && $${paramIdx++}`);
    values.push(filters.tags);
  }
  if (filters.search) {
    // Full text search across name, description, content
    conditions.push(
      `(name ILIKE $${paramIdx} OR description ILIKE $${paramIdx} OR content ILIKE $${paramIdx})`,
    );
    values.push(`%${filters.search}%`);
    paramIdx++;
  }

  const text = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { text, values };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Row Mapper
// ═══════════════════════════════════════════════════════════════════════════════

function mapRowToAISkillFile(row: any): AISkillFile {
  const base = {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags || [],
    version: row.version,
    sourceRepo: row.source_repo,
    filePath: row.file_path,
    rawUrl: row.raw_url,
    commitSha: row.commit_sha,
    license: row.license,
    platform: row.platform,
    language: row.language,
    content: row.content,
    format: row.format,
    contentHash: row.content_hash,
    contentSizeBytes: Number(row.content_size_bytes),
    safetyLabel: row.safety_label,
    latestScanId: row.latest_scan_id,
    author: row.author,
    authorUrl: row.author_url,
    copyCount: Number(row.copy_count),
    starCount: Number(row.star_count),
    viewCount: Number(row.view_count),
    lastSyncedAt: new Date(row.last_synced_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
  return AISkillFileSchema.parse(base);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Repository Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class PostgresSkillRepository implements ISkillDataPort {
  private readonly pool: Pool;

  constructor(config?: PoolConfig) {
    this.pool = new Pool({
      min: 2,
      max: 10,
      statement_timeout: 30000, // 30s default
      ...config,
    });
  }

  async end(): Promise<void> {
    await this.pool.end();
  }

  // ── CRUD Operations ─────────────────────────────────────────────────────

  async findById(id: string): Promise<AISkillFile | null> {
    const res = await this.pool.query('SELECT * FROM ai_skill_files WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapRowToAISkillFile(res.rows[0]);
  }

  async findAll(filters: SkillFilters): Promise<PaginatedResult<AISkillFile>> {
    const { text: whereClause, values } = buildSkillWhereClause(filters);

    const countQuery = `SELECT COUNT(*) FROM ai_skill_files ${whereClause}`;
    const countRes = await this.pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const sortByMap: Record<string, string> = {
      name: 'name',
      starCount: 'star_count',
      copyCount: 'copy_count',
      viewCount: 'view_count',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      safetyLabel: 'safety_label',
    };
    const dbSortField = sortByMap[filters.sortBy] || 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const limit = filters.pageSize;
    const offset = (filters.page - 1) * limit;

    const dataQuery = `
      SELECT * FROM ai_skill_files
      ${whereClause}
      ORDER BY ${dbSortField} ${sortOrder}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const dataRes = await this.pool.query(dataQuery, [...values, limit, offset]);
    const data = dataRes.rows.map(mapRowToAISkillFile);
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

  async save(skill: CreateAISkillInput | AISkillFile): Promise<AISkillFile> {
    const isUpdate = 'id' in skill && skill.id;

    // Add defaults if creating new
    const payload = isUpdate
      ? skill
      : {
          ...skill,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          copyCount: 0,
          starCount: 0,
          viewCount: 0,
        };

    const validated = AISkillFileSchema.parse(payload);

    const query = `
      INSERT INTO ai_skill_files (
        id, name, description, category, tags, version, source_repo, file_path, raw_url,
        commit_sha, license, platform, language, content, format, content_hash, content_size_bytes,
        safety_label, latest_scan_id, author, author_url, copy_count, star_count, view_count,
        last_synced_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      ON CONFLICT (source_repo, file_path) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        version = EXCLUDED.version,
        raw_url = EXCLUDED.raw_url,
        commit_sha = EXCLUDED.commit_sha,
        license = EXCLUDED.license,
        platform = EXCLUDED.platform,
        language = EXCLUDED.language,
        content = EXCLUDED.content,
        format = EXCLUDED.format,
        content_hash = EXCLUDED.content_hash,
        content_size_bytes = EXCLUDED.content_size_bytes,
        safety_label = EXCLUDED.safety_label,
        latest_scan_id = EXCLUDED.latest_scan_id,
        author = EXCLUDED.author,
        author_url = EXCLUDED.author_url,
        last_synced_at = EXCLUDED.last_synced_at,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      validated.id,
      validated.name,
      validated.description,
      validated.category,
      validated.tags,
      validated.version || null,
      validated.sourceRepo,
      validated.filePath,
      validated.rawUrl || null,
      validated.commitSha || null,
      validated.license || null,
      validated.platform,
      validated.language,
      validated.content,
      validated.format,
      validated.contentHash,
      validated.contentSizeBytes,
      validated.safetyLabel,
      validated.latestScanId || null,
      validated.author,
      validated.authorUrl || null,
      validated.copyCount,
      validated.starCount,
      validated.viewCount,
      validated.lastSyncedAt,
      validated.createdAt,
      validated.updatedAt,
    ];

    const res = await this.pool.query(query, values);
    return mapRowToAISkillFile(res.rows[0]);
  }

  async saveBatch(skills: Array<CreateAISkillInput | AISkillFile>): Promise<number> {
    if (skills.length === 0) return 0;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let count = 0;
      for (const skill of skills) {
        const payload =
          'id' in skill && skill.id
            ? skill
            : {
                ...skill,
                id: crypto.randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
                copyCount: 0,
                starCount: 0,
                viewCount: 0,
              };
        const validated = AISkillFileSchema.parse(payload);

        const query = `
          INSERT INTO ai_skill_files (
            id, name, description, category, tags, version, source_repo, file_path, raw_url,
            commit_sha, license, platform, language, content, format, content_hash, content_size_bytes,
            safety_label, latest_scan_id, author, author_url, copy_count, star_count, view_count,
            last_synced_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
          )
          ON CONFLICT (source_repo, file_path) DO UPDATE SET
            name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
            tags = EXCLUDED.tags, version = EXCLUDED.version, raw_url = EXCLUDED.raw_url,
            commit_sha = EXCLUDED.commit_sha, license = EXCLUDED.license, platform = EXCLUDED.platform,
            language = EXCLUDED.language, content = EXCLUDED.content, format = EXCLUDED.format,
            content_hash = EXCLUDED.content_hash, content_size_bytes = EXCLUDED.content_size_bytes,
            safety_label = EXCLUDED.safety_label, latest_scan_id = EXCLUDED.latest_scan_id,
            author = EXCLUDED.author, author_url = EXCLUDED.author_url, last_synced_at = EXCLUDED.last_synced_at,
            updated_at = NOW()
        `;

        const values = [
          validated.id,
          validated.name,
          validated.description,
          validated.category,
          validated.tags,
          validated.version || null,
          validated.sourceRepo,
          validated.filePath,
          validated.rawUrl || null,
          validated.commitSha || null,
          validated.license || null,
          validated.platform,
          validated.language,
          validated.content,
          validated.format,
          validated.contentHash,
          validated.contentSizeBytes,
          validated.safetyLabel,
          validated.latestScanId || null,
          validated.author,
          validated.authorUrl || null,
          validated.copyCount,
          validated.starCount,
          validated.viewCount,
          validated.lastSyncedAt,
          validated.createdAt,
          validated.updatedAt,
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

  async update(input: UpdateAISkillInput): Promise<AISkillFile | null> {
    const existing = await this.findById(input.id);
    if (!existing) return null;
    const updated = { ...existing, ...input };
    return this.save(updated as AISkillFile);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM ai_skill_files WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ── Deduplication ───────────────────────────────────────────────────────

  async findByContentHash(hash: string): Promise<AISkillFile | null> {
    const res = await this.pool.query('SELECT * FROM ai_skill_files WHERE content_hash = $1', [
      hash,
    ]);
    return res.rows.length > 0 ? mapRowToAISkillFile(res.rows[0]) : null;
  }

  async findByNaturalKey(sourceRepo: string, filePath: string): Promise<AISkillFile | null> {
    const res = await this.pool.query(
      'SELECT * FROM ai_skill_files WHERE source_repo = $1 AND file_path = $2',
      [sourceRepo, filePath],
    );
    return res.rows.length > 0 ? mapRowToAISkillFile(res.rows[0]) : null;
  }

  // ── Query Operations ────────────────────────────────────────────────────

  async count(filters?: Partial<SkillFilters>): Promise<number> {
    const { text, values } = buildSkillWhereClause(filters || {});
    const res = await this.pool.query(`SELECT COUNT(*) FROM ai_skill_files ${text}`, values);
    return parseInt(res.rows[0].count, 10);
  }

  async exists(id: string): Promise<boolean> {
    const res = await this.pool.query('SELECT 1 FROM ai_skill_files WHERE id = $1', [id]);
    return res.rows.length > 0;
  }

  async findByPlatform(platform: AIPlatform): Promise<AISkillFile[]> {
    const res = await this.pool.query(
      'SELECT * FROM ai_skill_files WHERE platform = $1 ORDER BY created_at DESC',
      [platform],
    );
    return res.rows.map(mapRowToAISkillFile);
  }

  async findUnanalyzed(limit: number): Promise<AISkillFile[]> {
    const res = await this.pool.query(
      `SELECT * FROM ai_skill_files WHERE safety_label = $1 ORDER BY created_at ASC LIMIT $2`,
      [SafetyLabel.UNANALYZED, limit],
    );
    return res.rows.map(mapRowToAISkillFile);
  }

  async findPopular(limit: number): Promise<AISkillFile[]> {
    const res = await this.pool.query(
      `SELECT * FROM ai_skill_files ORDER BY star_count DESC, copy_count DESC LIMIT $1`,
      [limit],
    );
    return res.rows.map(mapRowToAISkillFile);
  }

  // ── Safety Label Updates ────────────────────────────────────────────────

  async updateSafetyLabel(id: string, label: SafetyLabel, scanId: string): Promise<boolean> {
    const res = await this.pool.query(
      'UPDATE ai_skill_files SET safety_label = $1, latest_scan_id = $2, updated_at = NOW() WHERE id = $3',
      [label, scanId, id],
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ── Engagement Tracking ─────────────────────────────────────────────────

  async incrementCopyCount(id: string): Promise<void> {
    await this.pool.query('UPDATE ai_skill_files SET copy_count = copy_count + 1 WHERE id = $1', [
      id,
    ]);
  }

  async incrementStarCount(id: string): Promise<void> {
    await this.pool.query('UPDATE ai_skill_files SET star_count = star_count + 1 WHERE id = $1', [
      id,
    ]);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.pool.query('UPDATE ai_skill_files SET view_count = view_count + 1 WHERE id = $1', [
      id,
    ]);
  }

  // ── Aggregate Operations ────────────────────────────────────────────────

  async getPlatformStats(): Promise<PlatformStat[]> {
    const query = `
      SELECT 
        platform,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE safety_label = 'SAFE') as safe_count,
        COUNT(*) FILTER (WHERE safety_label = 'SUSPICIOUS') as suspicious_count,
        COUNT(*) FILTER (WHERE safety_label = 'MALICIOUS') as malicious_count
      FROM ai_skill_files
      GROUP BY platform
    `;
    const res = await this.pool.query(query);
    return res.rows.map((row) => ({
      platform: row.platform,
      count: Number(row.count),
      safeCount: Number(row.safe_count),
      suspiciousCount: Number(row.suspicious_count),
      maliciousCount: Number(row.malicious_count),
    }));
  }

  async getLanguageStats(): Promise<LanguageStat[]> {
    const query = `
      SELECT 
        language,
        COUNT(*) as count
      FROM ai_skill_files
      GROUP BY language
    `;
    const res = await this.pool.query(query);
    return res.rows.map((row) => ({
      language: row.language,
      count: Number(row.count),
    }));
  }

  async getSafetyDistribution(): Promise<SafetyDistribution> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE safety_label = 'SAFE') as safe,
        COUNT(*) FILTER (WHERE safety_label = 'UNANALYZED') as unanalyzed,
        COUNT(*) FILTER (WHERE safety_label = 'SUSPICIOUS') as suspicious,
        COUNT(*) FILTER (WHERE safety_label = 'MALICIOUS') as malicious
      FROM ai_skill_files
    `;
    const res = await this.pool.query(query);
    const row = res.rows[0];
    return {
      safe: Number(row.safe),
      unanalyzed: Number(row.unanalyzed),
      suspicious: Number(row.suspicious),
      malicious: Number(row.malicious),
      total: Number(row.total),
    };
  }

  async getDashboardStats(): Promise<SkillsDashboardStats> {
    const query = `
      SELECT 
        COUNT(*) as total_skills,
        COUNT(DISTINCT source_repo) as total_repositories,
        COUNT(DISTINCT author) as total_authors,
        SUM(copy_count) as total_copies,
        SUM(star_count) as total_stars
      FROM ai_skill_files
    `;
    const res = await this.pool.query(query);
    const row = res.rows[0];

    const safetyDist = await this.getSafetyDistribution();

    return {
      totalSkills: Number(row.total_skills),
      totalRepositories: Number(row.total_repositories),
      totalAuthors: Number(row.total_authors),
      safetyDistribution: safetyDist,
      totalCopies: Number(row.total_copies) || 0,
      totalStars: Number(row.total_stars) || 0,
    };
  }
}
