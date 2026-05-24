/**
 * @module @aegis/skills-engine/adapters
 *
 * Infrastructure adapters for the Skills Engine.
 * Concrete implementations of driven ports defined in @aegis/core:
 * - GitHub API client for skill scraping
 * - PostgreSQL repository for AI skill files (Phase 2 — P2-ETL-004)
 * - AST-based safety scanner implementation (Phase 3)
 *
 * @hexagonal Adapter Layer — Engine β (Driven/Secondary)
 */

// ── GitHub Skills ETL Adapter (P2-ETL-003) ──────────────────────────────────
export { GitHubSkillsAdapter } from './github-skills-adapter.js';
export {
  DEFAULT_GITHUB_SKILLS_CONFIG,
  DEFAULT_SKILL_SOURCES,
  type GitHubSkillsAdapterConfig,
  type SkillSource,
} from './github-skills-adapter.config.js';
export { detectPlatform } from './platform-detector.js';
export { detectLanguage } from './language-detector.js';
export {
  parseFrontmatter,
  deriveNameFromPath,
  type SkillFrontmatter,
  type FrontmatterParseResult,
} from './frontmatter-parser.js';
