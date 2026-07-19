/**
 * @module platform-detector.test
 * @description Unit tests for the AI platform detector.
 *
 * Tests cover:
 * - Frontmatter-based detection (highest priority)
 * - File path heuristics (cursorrules, claude, gemini, copilot)
 * - Content keyword analysis (MCP, tool_use)
 * - Default platform from source config
 * - Fallback to 'generic'
 *
 * @task P2-ETL-003
 */

import { describe, it, expect } from 'vitest';
import { detectPlatform } from '../src/adapters/platform-detector.js';

describe('detectPlatform', () => {
  // ── Frontmatter Priority ────────────────────────────────────────────────

  it('returns frontmatter platform when provided', () => {
    expect(detectPlatform('skills/test.yml', 'some content', 'claude')).toBe('claude');
  });

  it('normalizes frontmatter platform to lowercase', () => {
    expect(detectPlatform('skills/test.yml', 'some content', 'Cursor')).toBe('cursor');
  });

  it('ignores invalid frontmatter platform values', () => {
    expect(detectPlatform('.claude/skills/test.yml', 'some content', 'invalid-platform')).toBe(
      'claude',
    );
  });

  // ── Path Heuristics ─────────────────────────────────────────────────────

  it('detects cursor from .cursorrules path', () => {
    expect(detectPlatform('.cursorrules/audit.md', 'content')).toBe('cursor');
  });

  it('detects claude from .claude/ path', () => {
    expect(detectPlatform('.claude/skills/reentrancy.yml', 'content')).toBe('claude');
  });

  it('detects gemini from .gemini/ path', () => {
    expect(detectPlatform('.gemini/skills/test.yml', 'content')).toBe('gemini');
  });

  it('detects copilot from .github/copilot path', () => {
    expect(detectPlatform('.github/copilot/instructions.md', 'content')).toBe('copilot');
  });

  // ── Content Keywords ────────────────────────────────────────────────────

  it('detects mcp from tool_use keyword in content', () => {
    expect(
      detectPlatform('skills/test.yml', 'This skill uses tool_use for MCP integration'),
    ).toBe('mcp');
  });

  it('detects claude from anthropic keyword in content', () => {
    expect(detectPlatform('skills/test.yml', 'Designed for anthropic models')).toBe('claude');
  });

  // ── Default Platform ────────────────────────────────────────────────────

  it('uses default platform when no heuristic matches', () => {
    expect(detectPlatform('random/path.yml', 'generic content', undefined, 'cursor')).toBe(
      'cursor',
    );
  });

  // ── Fallback ────────────────────────────────────────────────────────────

  it('falls back to generic when nothing matches', () => {
    expect(detectPlatform('random/path.yml', 'no keywords here')).toBe('generic');
  });
});
