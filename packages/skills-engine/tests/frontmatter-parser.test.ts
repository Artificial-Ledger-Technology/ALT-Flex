/**
 * @module frontmatter-parser.test
 * @description Unit tests for the YAML frontmatter parser.
 *
 * Tests cover:
 * - Parsing valid YAML frontmatter
 * - Extracting all metadata fields
 * - Handling files without frontmatter
 * - Handling invalid YAML gracefully
 * - Deriving skill names from file paths
 *
 * @task P2-ETL-003
 */

import { describe, it, expect } from 'vitest';
import { parseFrontmatter, deriveNameFromPath } from '../src/adapters/frontmatter-parser.js';

describe('parseFrontmatter', () => {
  it('parses valid YAML frontmatter', () => {
    const content = `---
name: Solidity Reentrancy Detector
description: Detects reentrancy vulnerabilities
platform: claude
language: solidity
category: vulnerability-detection
tags:
  - reentrancy
  - security
version: "1.0.0"
author: Trail of Bits
---
# Skill Content
This is the actual skill content.
`;

    const result = parseFrontmatter(content);

    expect(result.hasFrontmatter).toBe(true);
    expect(result.metadata.name).toBe('Solidity Reentrancy Detector');
    expect(result.metadata.description).toBe('Detects reentrancy vulnerabilities');
    expect(result.metadata.platform).toBe('claude');
    expect(result.metadata.language).toBe('solidity');
    expect(result.metadata.category).toBe('vulnerability-detection');
    expect(result.metadata.tags).toEqual(['reentrancy', 'security']);
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.metadata.author).toBe('Trail of Bits');
    expect(result.content).toContain('# Skill Content');
  });

  it('handles files without frontmatter', () => {
    const content = '# Just a regular markdown file\nNo frontmatter here.';

    const result = parseFrontmatter(content);

    expect(result.hasFrontmatter).toBe(false);
    expect(result.metadata).toEqual({});
    expect(result.content).toContain('Just a regular markdown file');
  });

  it('handles empty content', () => {
    const result = parseFrontmatter('');

    expect(result.hasFrontmatter).toBe(false);
    expect(result.metadata).toEqual({});
    expect(result.content).toBe('');
  });

  it('handles invalid YAML gracefully without throwing', () => {
    const content = `---
invalid: yaml: : content: [
not valid
---
Content after bad frontmatter.
`;

    const result = parseFrontmatter(content);

    // Should not throw — returns raw content as fallback
    expect(result.content).toBeDefined();
  });

  it('handles partial frontmatter (only some fields)', () => {
    const content = `---
name: Simple Skill
---
Content here.
`;

    const result = parseFrontmatter(content);

    expect(result.hasFrontmatter).toBe(true);
    expect(result.metadata.name).toBe('Simple Skill');
    expect(result.metadata.platform).toBeUndefined();
    expect(result.metadata.language).toBeUndefined();
  });

  it('filters non-string values from tags array', () => {
    const content = `---
name: Test
tags:
  - valid-tag
  - 123
  - another-tag
---
Content.
`;

    const result = parseFrontmatter(content);

    expect(result.metadata.tags).toEqual(['valid-tag', 'another-tag']);
  });
});

describe('deriveNameFromPath', () => {
  it('converts kebab-case filename to Title Case', () => {
    expect(deriveNameFromPath('skills/solidity-reentrancy-detector.yml')).toBe(
      'Solidity Reentrancy Detector',
    );
  });

  it('converts snake_case filename to Title Case', () => {
    expect(deriveNameFromPath('prompts/flash_loan_audit.md')).toBe('Flash Loan Audit');
  });

  it('handles files with no directory prefix', () => {
    expect(deriveNameFromPath('simple-skill.json')).toBe('Simple Skill');
  });

  it('handles deeply nested paths', () => {
    expect(deriveNameFromPath('a/b/c/my-awesome-skill.toml')).toBe('My Awesome Skill');
  });
});
