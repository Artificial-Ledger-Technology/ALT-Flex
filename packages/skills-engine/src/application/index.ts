/**
 * @module @aegis/skills-engine/application
 *
 * Application layer (use cases) for the Skills Engine.
 * Orchestrates domain operations via typed ports for:
 * - Skill search and discovery
 * - Safety scanning orchestration
 * - GitHub scraper coordination
 * - Copy/star engagement tracking
 *
 * @hexagonal Application Layer — Engine β
 */

// Use cases will be added in Phase 2+ as scraper pipelines are implemented.
// Examples: SearchSkillsUseCase, ScanSkillUseCase, SyncSkillsUseCase
export * from './use-cases/index-skills-use-case.js';
