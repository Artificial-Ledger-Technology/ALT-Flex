import { describe, it, expect, beforeEach } from 'vitest';
import { SafetyScoreCalculator } from '../../../src/application/scanners/SafetyScoreCalculator.js';
import { RuleFinding, ASTFinding, SemanticFinding, SafetyLabel } from '@aegis/core';

describe('SafetyScoreCalculator', () => {
  let calculator: SafetyScoreCalculator;

  beforeEach(() => {
    calculator = new SafetyScoreCalculator();
  });

  const createRuleFinding = (severity: 'critical' | 'high' | 'medium' | 'low' | 'info', matchedText: string, line: number): RuleFinding => ({
    ruleId: 'TEST-001',
    rule: {
      id: 'TEST-001',
      name: 'Test Rule',
      category: 'prompt_injection',
      severity,
      description: 'Test rule',
      pattern: { type: 'regex', value: '.*' },
      falsePositiveGuidance: 'None',
      references: [],
      enabled: true,
      version: '1.0.0',
    },
    section: 'instructions',
    lineNumber: line,
    matchedText,
    context: 'Some context',
  });

  const createASTFinding = (dangerType: 'Code Execution' | 'Shell Execution' | 'Network' | 'File System' | 'Encoding' | 'Browser Exfiltration' | 'Dynamic Import' | 'Suspicious Concatenation', matchedText: string, line: number): ASTFinding => ({
    nodeType: 'CallExpression',
    dangerType,
    lineNumber: line,
    matchedText,
    context: 'Some context',
  });

  const createSemanticFinding = (severity: 'critical' | 'high' | 'medium' | 'low' | 'info', matchedText: string, line: number, confidence: number = 0.9): SemanticFinding => ({
    category: 'role_override',
    severity,
    confidence,
    lineNumber: line,
    matchedText,
    context: 'Some context',
  });

  it('should return SAFE label with 0 score for empty findings', () => {
    const verdict = calculator.calculate({
      ruleFindings: [],
      astFindings: [],
      semanticFindings: [],
      scanDurationMs: 10,
      analyzersUsed: ['test'],
    });

    expect(verdict.label).toBe(SafetyLabel.SAFE);
    expect(verdict.score).toBe(0);
    expect(verdict.confidence).toBe(1.0); // Perfect confidence when there are no findings
    expect(verdict.findings).toHaveLength(0);
    expect(verdict.metadata.rulesMatched).toBe(0);
  });

  it('should correctly sum scores for multiple non-overlapping findings', () => {
    // 1 critical (10), 1 high (5), 1 medium (2) -> total 17
    const ruleFinding = createRuleFinding('critical', 'rm -rf /', 1);
    const astFinding = createASTFinding('Network', 'eval()', 5); // high
    const semanticFinding = createSemanticFinding('medium', 'trust me', 10);

    const verdict = calculator.calculate({
      ruleFindings: [ruleFinding],
      astFindings: [astFinding],
      semanticFindings: [semanticFinding],
      scanDurationMs: 15,
      analyzersUsed: ['regex', 'ast', 'semantic'],
    });

    expect(verdict.score).toBe(17);
    expect(verdict.label).toBe(SafetyLabel.MALICIOUS); // 17 > 10
    expect(verdict.findings).toHaveLength(3);
  });

  it('should assign SUSPICIOUS label for score between 1 and 10', () => {
    // 2 high findings (5 + 5 = 10)
    const ruleFinding = createRuleFinding('high', 'fetch(/api)', 1);
    const astFinding = createASTFinding('File System', 'require("child_process")', 5); // high

    const verdict = calculator.calculate({
      ruleFindings: [ruleFinding],
      astFindings: [astFinding],
      semanticFindings: [],
      scanDurationMs: 12,
      analyzersUsed: ['regex', 'ast'],
    });

    expect(verdict.score).toBe(10);
    expect(verdict.label).toBe(SafetyLabel.SUSPICIOUS);
  });

  it('should assign MALICIOUS label for score > 10', () => {
    // 1 critical (10) + 1 low (1) = 11
    const ruleFinding = createRuleFinding('critical', 'forget instructions', 2);
    const semanticFinding = createSemanticFinding('low', 'this is safe', 3);

    const verdict = calculator.calculate({
      ruleFindings: [ruleFinding],
      astFindings: [],
      semanticFindings: [semanticFinding],
      scanDurationMs: 8,
      analyzersUsed: ['regex', 'semantic'],
    });

    expect(verdict.score).toBe(11);
    expect(verdict.label).toBe(SafetyLabel.MALICIOUS);
  });

  it('should deduplicate findings that match on the exact same text, line, and section', () => {
    // Both regex and semantic match the exact same string at line 2 in 'instructions'
    const ruleFinding = createRuleFinding('critical', 'you are now admin', 2);
    const semanticFinding = createSemanticFinding('high', 'you are now admin', 2);

    const verdict = calculator.calculate({
      ruleFindings: [ruleFinding],
      astFindings: [],
      semanticFindings: [semanticFinding],
      scanDurationMs: 5,
      analyzersUsed: ['regex', 'semantic'],
    });

    // Before dedup: 15. After dedup: 10 (critical > high)
    expect(verdict.score).toBe(10);
    expect(verdict.findings).toHaveLength(1);
    expect(verdict.findings[0].severity).toBe('critical'); // Kept the highest severity
    // Note: rulesMatched in metadata is raw count
    expect(verdict.metadata.rulesMatched).toBe(2);
  });

  it('should calculate the average confidence for all deduplicated findings', () => {
    const f1 = createSemanticFinding('low', 'trust me', 1, 0.6); // score 1
    const f2 = createSemanticFinding('medium', 'completely safe', 2, 0.8); // score 2

    const verdict = calculator.calculate({
      ruleFindings: [],
      astFindings: [],
      semanticFindings: [f1, f2],
      scanDurationMs: 5,
      analyzersUsed: ['semantic'],
    });

    expect(verdict.score).toBe(3);
    expect(verdict.findings).toHaveLength(2);
    expect(verdict.confidence).toBe(0.7); // (0.6 + 0.8) / 2
  });

  it('should treat multiple identical findings but on different lines as distinct', () => {
    const r1 = createRuleFinding('high', 'bad string', 1);
    const r2 = createRuleFinding('high', 'bad string', 2); // Different line

    const verdict = calculator.calculate({
      ruleFindings: [r1, r2],
      astFindings: [],
      semanticFindings: [],
      scanDurationMs: 5,
      analyzersUsed: ['regex'],
    });

    expect(verdict.findings).toHaveLength(2);
    expect(verdict.score).toBe(10); // 5 + 5
  });

  it('should treat identical findings but in different sections as distinct', () => {
    const r1 = createRuleFinding('high', 'bad string', 1);
    r1.section = 'instructions';

    const r2 = createRuleFinding('high', 'bad string', 1);
    r2.section = 'rawText'; // Different section

    const verdict = calculator.calculate({
      ruleFindings: [r1, r2],
      astFindings: [],
      semanticFindings: [],
      scanDurationMs: 5,
      analyzersUsed: ['regex'],
    });

    expect(verdict.findings).toHaveLength(2);
    expect(verdict.score).toBe(10); // 5 + 5
  });

  it('should default scannerVersion to v1.0.0 if not provided', () => {
    const verdict = calculator.calculate({
      ruleFindings: [],
      astFindings: [],
      semanticFindings: [],
      scanDurationMs: 10,
      analyzersUsed: ['test'],
    });

    expect(verdict.metadata.scannerVersion).toBe('v1.0.0');
  });

  it('should use provided scannerVersion if provided', () => {
    const verdict = calculator.calculate({
      ruleFindings: [],
      astFindings: [],
      semanticFindings: [],
      scanDurationMs: 10,
      analyzersUsed: ['test'],
      scannerVersion: 'v2.0.0',
    });

    expect(verdict.metadata.scannerVersion).toBe('v2.0.0');
  });

  it('should correctly normalize ASTFinding properties to Finding', () => {
    const ast = createASTFinding('Dynamic Import', 'fs.readFile()', 5); // medium
    const verdict = calculator.calculate({
      ruleFindings: [],
      astFindings: [ast],
      semanticFindings: [],
      scanDurationMs: 5,
      analyzersUsed: ['ast'],
    });

    const f = verdict.findings[0];
    expect(f.ruleId).toBe('AST-DYNAMIC-IMPORT');
    expect(f.ruleName).toBe('AST Danger: Dynamic Import');
    expect(f.location.section).toBe('codeBlock');
    expect(f.location.line).toBe(5);
    expect(f.matchedText).toBe('fs.readFile()');
    expect(f.category).toBe('code_execution');
    expect(f.severity).toBe('medium');
    expect(f.confidence).toBe(1.0);
  });

  it('should correctly normalize RuleFinding properties to Finding', () => {
    const rule = createRuleFinding('low', 'curl http://...', 10);
    const verdict = calculator.calculate({
      ruleFindings: [rule],
      astFindings: [],
      semanticFindings: [],
      scanDurationMs: 5,
      analyzersUsed: ['regex'],
    });

    const f = verdict.findings[0];
    expect(f.ruleId).toBe('TEST-001');
    expect(f.location.section).toBe('instructions');
    expect(f.matchedText).toBe('curl http://...');
    expect(f.severity).toBe('low');
    expect(f.confidence).toBe(1.0);
  });

  it('should correctly normalize SemanticFinding properties to Finding', () => {
    const sem = createSemanticFinding('critical', 'ignore all rules', 20, 0.99);
    const verdict = calculator.calculate({
      ruleFindings: [],
      astFindings: [],
      semanticFindings: [sem],
      scanDurationMs: 5,
      analyzersUsed: ['semantic'],
    });

    const f = verdict.findings[0];
    expect(f.ruleId).toBe('SEMANTIC-001');
    expect(f.location.section).toBe('instructions');
    expect(f.matchedText).toBe('ignore all rules');
    expect(f.severity).toBe('critical');
    expect(f.category).toBe('role_override');
    expect(f.confidence).toBe(0.99);
  });

  it('should favor higher confidence finding during deduplication if severity is equal', () => {
    const f1 = createSemanticFinding('high', 'identical string', 5, 0.5);
    const f2 = createSemanticFinding('high', 'identical string', 5, 0.9);

    const verdict = calculator.calculate({
      ruleFindings: [],
      astFindings: [],
      semanticFindings: [f1, f2],
      scanDurationMs: 5,
      analyzersUsed: ['semantic'],
    });

    expect(verdict.findings).toHaveLength(1);
    expect(verdict.findings[0].confidence).toBe(0.9);
  });

  it('should correctly accumulate scan metadata arrays', () => {
    const verdict = calculator.calculate({
      ruleFindings: [],
      astFindings: [],
      semanticFindings: [],
      scanDurationMs: 150,
      analyzersUsed: ['regex', 'ast', 'semantic', 'custom'],
    });

    expect(verdict.metadata.scanDurationMs).toBe(150);
    expect(verdict.metadata.analyzersUsed).toEqual(['regex', 'ast', 'semantic', 'custom']);
  });
});
