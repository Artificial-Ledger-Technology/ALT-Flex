/**
 * @module @aegis/skills-engine/adapters
 *
 * Infrastructure adapters for the Skills Engine.
 * Concrete implementations of driven ports defined in @aegis/core:
 * - PostgreSQL repository for AI skill files
 * - PostgreSQL repository for safety scan results
 * - GitHub API client for skill scraping
 * - AST-based safety scanner implementation
 *
 * @hexagonal Adapter Layer — Engine β (Driven/Secondary)
 */

// Adapters will be added in Phase 2+ as scraper pipelines are implemented.
// Examples: PostgresSkillRepository, GitHubSkillScraper, AstSafetyScanner
export {};
