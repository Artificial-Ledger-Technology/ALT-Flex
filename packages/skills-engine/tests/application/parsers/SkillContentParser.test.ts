import { describe, it, expect, beforeEach } from 'vitest';
import { SkillContentParser, SupportedFormat } from '../../../src/application/parsers/SkillContentParser.js';

describe('SkillContentParser', () => {
  let parser: SkillContentParser;

  beforeEach(() => {
    parser = new SkillContentParser();
  });

  describe('Markdown Parsing', () => {
    it('should extract instructions, codeblocks, and inline commands from markdown', () => {
      const md = `
# Skill Instructions
You are an expert auditor. Please run \`npm install\`.

\`\`\`bash
echo "Hello World"
\`\`\`

\`\`\`python
print("Hello World")
\`\`\`
      `;

      const result = parser.parse(md, 'markdown');
      
      expect(result.instructions).toContain('Skill Instructions');
      expect(result.instructions).toContain('You are an expert auditor. Please run `npm install`.');
      
      expect(result.inlineCommands).toContain('npm install');
      
      expect(result.codeBlocks).toHaveLength(2);
      expect(result.codeBlocks[0].language).toBe('bash');
      expect(result.codeBlocks[0].content).toBe('echo "Hello World"');
      expect(result.codeBlocks[1].language).toBe('python');
      expect(result.codeBlocks[1].content).toBe('print("Hello World")');
    });

    it('should handle malformed markdown gracefully', () => {
      const md = '```\nunclosed code block\n';
      const result = parser.parse(md, 'markdown');
      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].content).toContain('unclosed code block');
    });
  });

  describe('YAML Parsing', () => {
    it('should extract frontmatter metadata and parse the body as markdown', () => {
      const yamlContent = `---
name: AuditSkill
version: 1.0.0
tags: [security, web3]
---

# Instructions
Run \`slither .\`
      `;

      const result = parser.parse(yamlContent, 'yaml');

      expect(result.metadata.name).toBe('AuditSkill');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.tags).toEqual(['security', 'web3']);

      expect(result.instructions).toContain('Instructions');
      expect(result.inlineCommands).toContain('slither .');
    });

    it('should handle pure YAML without markdown body', () => {
      const pureYaml = `---
key1: value1
key2:
  - list1
  - list2
---`;

      const result = parser.parse(pureYaml, 'yaml');
      expect(result.metadata.key1).toBe('value1');
      expect(result.metadata.key2).toEqual(['list1', 'list2']);
    });

    it('should handle malformed YAML gracefully', () => {
      const invalidYaml = `
---
invalid: : yaml
---
      `;
      const result = parser.parse(invalidYaml, 'yaml');
      expect(result.rawText).toBe(invalidYaml);
    });
  });

  describe('JSON Parsing', () => {
    it('should recursively extract all string values into instructions', () => {
      const jsonContent = JSON.stringify({
        name: "TestSkill",
        details: {
          description: "This is a nested string.",
          steps: ["Step 1", "Step 2"]
        },
        count: 5
      });

      const result = parser.parse(jsonContent, 'json');
      
      expect(result.instructions).toContain('TestSkill');
      expect(result.instructions).toContain('This is a nested string.');
      expect(result.instructions).toContain('Step 1');
      expect(result.instructions).toContain('Step 2');
      expect(result.instructions).not.toContain(5);
    });

    it('should handle malformed JSON gracefully', () => {
      const invalidJson = `{ "unclosed: string }`;
      const result = parser.parse(invalidJson, 'json');
      
      expect(result.instructions).toHaveLength(0);
      expect(result.rawText).toBe(invalidJson);
    });
  });

  describe('TOML Parsing', () => {
    it('should recursively extract all string values into instructions', () => {
      const tomlContent = `
title = "TOML Example"

[owner]
name = "Tom Preston-Werner"
organization = "GitHub"

[database]
server = "192.168.1.1"
ports = [ 8000, 8001, 8002 ]
connection_max = 5000
      `;

      const result = parser.parse(tomlContent, 'toml');
      
      expect(result.instructions).toContain('TOML Example');
      expect(result.instructions).toContain('Tom Preston-Werner');
      expect(result.instructions).toContain('GitHub');
      expect(result.instructions).toContain('192.168.1.1');
    });

    it('should handle malformed TOML gracefully', () => {
      const invalidToml = `[invalid`;
      const result = parser.parse(invalidToml, 'toml');
      
      expect(result.instructions).toHaveLength(0);
      expect(result.rawText).toBe(invalidToml);
    });
  });

  describe('Unsupported Formats', () => {
    it('should throw error for unknown formats', () => {
      expect(() => parser.parse('content', 'xml' as SupportedFormat)).toThrowError(/Unsupported format: xml/);
    });
  });
});
