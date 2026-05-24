/**
 * @module platform-detector
 * @description Detects the target AI platform for a skill file using
 * a prioritized heuristic chain.
 *
 * Detection priority:
 * 1. Frontmatter field: `platform: "claude"`
 * 2. File path heuristics: `.cursorrules` → cursor, `.claude` → claude
 * 3. Content keywords: "MCP", "tool_use" → mcp
 * 4. Default from source config
 * 5. Fallback: "generic"
 *
 * This module is a pure function — no side effects, no I/O.
 *
 * @hexagonal Adapter Utility — Infrastructure Layer
 * @task P2-ETL-003
 */

import type { AIPlatform } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Path-based Platform Heuristics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ordered list of path-based platform detection rules.
 * First match wins.
 */
const PATH_PLATFORM_RULES: ReadonlyArray<readonly [string, AIPlatform]> = [
  ['.cursorrules', 'cursor'],
  ['cursor/', 'cursor'],
  ['.cursor/', 'cursor'],
  ['.claude/', 'claude'],
  ['claude/', 'claude'],
  ['.gemini/', 'gemini'],
  ['gemini/', 'gemini'],
  ['copilot/', 'copilot'],
  ['.github/copilot', 'copilot'],
  ['windsurf/', 'windsurf'],
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Content-based Platform Heuristics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ordered list of content keyword rules for platform detection.
 * Applied only if path heuristics don't match.
 */
const CONTENT_PLATFORM_RULES: ReadonlyArray<readonly [string[], AIPlatform]> = [
  [['tool_use', 'mcp_server', 'mcp_tool'], 'mcp'],
  [['anthropic', 'claude'], 'claude'],
  [['cursor'], 'cursor'],
  [['copilot'], 'copilot'],
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Detector Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect the target AI platform for a skill file.
 *
 * @param filePath - Relative file path within the repository
 * @param content - Raw file content
 * @param frontmatterPlatform - Platform value extracted from YAML frontmatter (if any)
 * @param defaultPlatform - Default platform from the source configuration
 * @returns Detected `AIPlatform` value
 */
export function detectPlatform(
  filePath: string,
  content: string,
  frontmatterPlatform?: string,
  defaultPlatform?: string,
): AIPlatform {
  // 1. Frontmatter takes highest priority
  if (frontmatterPlatform !== undefined && frontmatterPlatform !== '') {
    const normalized = frontmatterPlatform.toLowerCase().trim();
    const validPlatforms: readonly string[] = [
      'claude',
      'cursor',
      'mcp',
      'copilot',
      'gemini',
      'windsurf',
      'generic',
    ];
    if (validPlatforms.includes(normalized)) {
      return normalized as AIPlatform;
    }
  }

  // 2. File path heuristics
  const lowerPath = filePath.toLowerCase();
  for (const [pattern, platform] of PATH_PLATFORM_RULES) {
    if (lowerPath.includes(pattern)) {
      return platform;
    }
  }

  // 3. Content keyword analysis
  const lowerContent = content.toLowerCase();
  for (const [keywords, platform] of CONTENT_PLATFORM_RULES) {
    if (keywords.some((kw) => lowerContent.includes(kw))) {
      return platform;
    }
  }

  // 4. Source config default
  if (defaultPlatform !== undefined && defaultPlatform !== '') {
    const validPlatforms: readonly string[] = [
      'claude',
      'cursor',
      'mcp',
      'copilot',
      'gemini',
      'windsurf',
      'generic',
    ];
    const normalized = defaultPlatform.toLowerCase().trim();
    if (validPlatforms.includes(normalized)) {
      return normalized as AIPlatform;
    }
  }

  // 5. Fallback
  return 'generic';
}
