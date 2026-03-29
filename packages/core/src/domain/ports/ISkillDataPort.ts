/**
 * @module ISkillDataPort
 * @description Abstract interface for AI skill file data persistence.
 *
 * Hexagonal Port for the Skills Engine (Engine β).
 * Handles CRUD and query operations for AISkillFile entities.
 *
 * Implementations:
 * - `PostgresSkillDataAdapter` (packages/skills-engine/src/adapters/postgres/)
 * - `InMemorySkillDataAdapter` (test utility)
 *
 * @hexagonal Port — Domain Layer
 */

import type { AISkillFile, CreateAISkillInput, UpdateAISkillInput, AIPlatform, SmartContractLanguage, SkillCategory } from '../entities/AISkillFile.js';
import type { SafetyLabel } from '../value-objects/SafetyLabel.js';
import type { PaginatedResult, SortConfig } from './IHackDataPort.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Skill Filters
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Available sort fields for skill files.
 */
export type SkillSortField =
  | 'name'
  | 'starCount'
  | 'copyCount'
  | 'viewCount'
  | 'createdAt'
  | 'updatedAt'
  | 'safetyLabel';

/**
 * Filter parameters for querying skill files.
 */
export interface SkillFilters extends SortConfig<SkillSortField> {
  /** Filter by AI platform */
  readonly platform?: AIPlatform;
  /** Filter by smart contract language */
  readonly language?: SmartContractLanguage;
  /** Filter by safety label */
  readonly safetyLabel?: SafetyLabel;
  /** Filter by skill category */
  readonly category?: SkillCategory;
  /** Filter by source repository */
  readonly sourceRepo?: string;
  /** Filter by author */
  readonly author?: string;
  /** Full-text search across name, description, and content */
  readonly search?: string;
  /** Filter by tags (any match) */
  readonly tags?: readonly string[];
  /** Page number (1-indexed) */
  readonly page: number;
  /** Items per page */
  readonly pageSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Statistics Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Platform distribution statistics.
 */
export interface PlatformStat {
  readonly platform: AIPlatform;
  readonly count: number;
  readonly safeCount: number;
  readonly suspiciousCount: number;
  readonly maliciousCount: number;
}

/**
 * Language distribution statistics.
 */
export interface LanguageStat {
  readonly language: SmartContractLanguage;
  readonly count: number;
}

/**
 * Safety label distribution statistics.
 */
export interface SafetyDistribution {
  readonly safe: number;
  readonly unanalyzed: number;
  readonly suspicious: number;
  readonly malicious: number;
  readonly total: number;
}

/**
 * Skills Explorer dashboard statistics.
 */
export interface SkillsDashboardStats {
  readonly totalSkills: number;
  readonly totalRepositories: number;
  readonly totalAuthors: number;
  readonly safetyDistribution: SafetyDistribution;
  readonly totalCopies: number;
  readonly totalStars: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Port Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ISkillDataPort — Abstract persistence interface for AI skill file data.
 *
 * @hexagonal Port — Domain Layer
 */
export interface ISkillDataPort {
  // ── CRUD Operations ─────────────────────────────────────────────────────
  findById(id: string): Promise<AISkillFile | null>;
  findAll(filters: SkillFilters): Promise<PaginatedResult<AISkillFile>>;
  save(skill: CreateAISkillInput | AISkillFile): Promise<AISkillFile>;
  saveBatch(skills: Array<CreateAISkillInput | AISkillFile>): Promise<number>;
  update(input: UpdateAISkillInput): Promise<AISkillFile | null>;
  delete(id: string): Promise<boolean>;

  // ── Deduplication ───────────────────────────────────────────────────────
  findByContentHash(hash: string): Promise<AISkillFile | null>;
  findByNaturalKey(sourceRepo: string, filePath: string): Promise<AISkillFile | null>;

  // ── Query Operations ────────────────────────────────────────────────────
  count(filters?: Partial<SkillFilters>): Promise<number>;
  exists(id: string): Promise<boolean>;
  findByPlatform(platform: AIPlatform): Promise<AISkillFile[]>;
  findUnanalyzed(limit: number): Promise<AISkillFile[]>;
  findPopular(limit: number): Promise<AISkillFile[]>;

  // ── Safety Label Updates ────────────────────────────────────────────────
  updateSafetyLabel(id: string, label: SafetyLabel, scanId: string): Promise<boolean>;

  // ── Engagement Tracking ─────────────────────────────────────────────────
  incrementCopyCount(id: string): Promise<void>;
  incrementStarCount(id: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;

  // ── Aggregate Operations ────────────────────────────────────────────────
  getPlatformStats(): Promise<PlatformStat[]>;
  getLanguageStats(): Promise<LanguageStat[]>;
  getSafetyDistribution(): Promise<SafetyDistribution>;
  getDashboardStats(): Promise<SkillsDashboardStats>;
}
