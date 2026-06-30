/**
 * @module frontmatter-parser
 * @description Safely parses YAML frontmatter from skill files using `gray-matter`.
 *
 * Extracts structured metadata fields:
 * - name, description, platform, language, category
 * - tags, version, author
 *
 * Files without frontmatter return empty metadata (graceful fallback).
 * Invalid YAML is caught and logged — never throws.
 *
 * @hexagonal Adapter Utility — Infrastructure Layer
 * @task P2-ETL-003
 */

import matter from 'gray-matter';

// ═══════════════════════════════════════════════════════════════════════════════
// Parsed Frontmatter Type
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Structured metadata extracted from YAML frontmatter.
 * All fields are optional — files may have partial or no frontmatter.
 */
export interface SkillFrontmatter {
  /** Skill name */
  name?: string;
  /** Short description */
  description?: string;
  /** Target AI platform */
  platform?: string;
  /** Target smart contract language */
  language?: string;
  /** Skill category */
  category?: string;
  /** Free-form tags */
  tags?: string[];
  /** Semantic version */
  version?: string;
  /** Author name or team */
  author?: string;
}

/**
 * Result of frontmatter parsing — includes both structured data and raw content.
 */
export interface FrontmatterParseResult {
  /** Extracted frontmatter metadata */
  metadata: SkillFrontmatter;
  /** File content with frontmatter stripped */
  content: string;
  /** Whether valid frontmatter was found */
  hasFrontmatter: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parser Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse YAML frontmatter from a skill file's raw content.
 *
 * @param rawContent - Raw file content (may or may not have frontmatter)
 * @returns Parsed frontmatter metadata and stripped content
 */
export function parseFrontmatter(rawContent: string): FrontmatterParseResult {
  try {
    const parsed = matter(rawContent);

    const data = parsed.data as Record<string, unknown>;
    const hasFrontmatter = Object.keys(data).length > 0;

    const metadata: SkillFrontmatter = {};

    if (typeof data['name'] === 'string' && data['name'].length > 0) {
      metadata.name = data['name'];
    }
    if (typeof data['description'] === 'string') {
      metadata.description = data['description'];
    }
    if (typeof data['platform'] === 'string') {
      metadata.platform = data['platform'];
    }
    if (typeof data['language'] === 'string') {
      metadata.language = data['language'];
    }
    if (typeof data['category'] === 'string') {
      metadata.category = data['category'];
    }
    if (Array.isArray(data['tags'])) {
      metadata.tags = data['tags'].filter((t): t is string => typeof t === 'string');
    }
    if (typeof data['version'] === 'string') {
      metadata.version = data['version'];
    }
    if (typeof data['author'] === 'string') {
      metadata.author = data['author'];
    }

    return {
      metadata,
      content: parsed.content,
      hasFrontmatter,
    };
  } catch {
    // Invalid YAML — return raw content as-is
    return {
      metadata: {},
      content: rawContent,
      hasFrontmatter: false,
    };
  }
}

/**
 * Derive a human-readable skill name from the file path when
 * frontmatter doesn't provide one.
 *
 * "skills/solidity-reentrancy-detector.yml" → "Solidity Reentrancy Detector"
 */
export function deriveNameFromPath(filePath: string): string {
  const basename = filePath.split('/').pop() ?? filePath;
  // Remove extension
  const nameWithoutExt = basename.replace(/\.[^.]+$/, '');
  // Convert kebab-case/snake_case to Title Case
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
