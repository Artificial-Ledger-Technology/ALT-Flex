import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SafetyRuleLoader } from '../../../src/infrastructure/safety-rules/rule-loader.js';
import { join, dirname } from 'path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('SafetyRuleLoader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `aegis-rules-test-${Date.now()}`);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should successfully load and validate correct rules', () => {
    const validRules = [
      {
        id: 'TEST-001',
        name: 'Test Rule',
        category: 'shell_execution',
        severity: 'critical',
        description: 'A test rule',
        pattern: { type: 'regex', value: 'test' },
        falsePositiveGuidance: 'None',
        references: [],
        enabled: true,
        version: '1.0.0',
      },
    ];

    writeFileSync(join(tempDir, 'rules.v1.json'), JSON.stringify(validRules));

    const loader = new SafetyRuleLoader(tempDir);
    const rules = loader.loadRules();

    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('TEST-001');
  });

  it('should throw an error for malformed JSON', () => {
    writeFileSync(join(tempDir, 'rules.v1.json'), '{ malformed json');

    const loader = new SafetyRuleLoader(tempDir);
    expect(() => loader.loadRules()).toThrow(/Malformed JSON in safety rules file/);
  });

  it('should throw an error for invalid rule schema', () => {
    const invalidRules = [
      {
        id: 'TEST-002',
        category: 'invalid_category',
      },
    ];

    writeFileSync(join(tempDir, 'rules.v1.json'), JSON.stringify(invalidRules));

    const loader = new SafetyRuleLoader(tempDir);
    expect(() => loader.loadRules()).toThrow(/Failed to validate safety rules/);
  });

  it('should cache loaded rules', () => {
    const validRules = [
      {
        id: 'TEST-003',
        name: 'Test Rule 3',
        category: 'network',
        severity: 'low',
        description: 'A test rule',
        pattern: { type: 'semantic', value: 'test' },
        falsePositiveGuidance: 'None',
        references: [],
        enabled: true,
        version: '1.0.0',
      },
    ];

    writeFileSync(join(tempDir, 'rules.v1.json'), JSON.stringify(validRules));

    const loader = new SafetyRuleLoader(tempDir);

    const rules1 = loader.loadRules();
    expect(rules1).toHaveLength(1);

    writeFileSync(join(tempDir, 'rules.v1.json'), JSON.stringify([]));

    const rules2 = loader.loadRules();
    expect(rules2).toHaveLength(1);
    expect(rules2[0].id).toBe('TEST-003');

    loader.clearCache();
    const rules3 = loader.loadRules();
    expect(rules3).toHaveLength(0);
  });
});

describe('Production Safety Rules Validation', () => {
  it('should load and validate the actual rules.v1.json file without errors', () => {
    const rulesDir = join(__dirname, '../../../src/infrastructure/safety-rules');
    const loader = new SafetyRuleLoader(rulesDir);
    const rules = loader.loadRules();

    expect(rules.length).toBeGreaterThanOrEqual(30);

    const categories = new Set(rules.map((r) => r.category));
    expect(categories.has('shell_execution')).toBe(true);
    expect(categories.has('file_system')).toBe(true);
    expect(categories.has('network')).toBe(true);
    expect(categories.has('prompt_injection')).toBe(true);
    expect(categories.has('code_execution')).toBe(true);
  });
});
