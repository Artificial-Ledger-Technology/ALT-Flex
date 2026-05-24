/**
 * @module ISkillSourcePort
 * @description Abstract interface for external AI skill file sources (ETL ingestion).
 *
 * This is a Hexagonal Architecture "Driven Port". The application layer
 * (use cases) depends on this interface; concrete implementations
 * (GitHub API scraper, local file scanner) are "Adapters" that
 * live outside the domain.
 *
 * Implementations:
 * - `GitHubSkillsAdapter` (packages/skills-engine/src/adapters/github-skills-adapter.ts)
 *
 * @hexagonal Port — Domain Layer
 * @task P2-ETL-003
 */

import type { AISkillFile } from '../entities/AISkillFile.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Port Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ISkillSourcePort — Abstract interface for fetching AI skill files
 * from external sources (GitHub repos, registries, etc.).
 *
 * Contract:
 * - `fetchAllSkills()` returns validated `AISkillFile[]` ready for upsert
 * - Invalid records are logged and skipped (partial failure tolerance)
 * - Network/rate-limit errors are retried internally by the adapter
 * - The caller receives only successfully validated records
 *
 * @hexagonal Port — Domain Layer (Driven / Secondary)
 */
export interface ISkillSourcePort {
  /** Unique identifier for this data source (e.g., 'github-skills') */
  readonly sourceName: string;

  /**
   * Fetch all AI skill files from this external source.
   *
   * The adapter is responsible for:
   * 1. Discovering skill files in configured repositories
   * 2. Downloading and parsing file content
   * 3. Extracting metadata (platform, language, frontmatter)
   * 4. Generating content hashes for deduplication
   * 5. Transforming raw data into `AISkillFile` domain entities
   * 6. Validating each record with Zod schema
   * 7. Logging and skipping invalid records
   * 8. Handling retry logic and rate limiting
   *
   * @returns Array of validated `AISkillFile` entities ready for database upsert
   * @throws ExternalServiceError if all retries are exhausted
   */
  fetchAllSkills(): Promise<AISkillFile[]>;
}
