import {
  RuleFinding,
  ASTFinding,
  SemanticFinding,
  Finding,
  ScanVerdict,
  SafetyLabel,
  Severity,
} from '@aegis/core';

export interface ScoreCalculatorParams {
  ruleFindings: RuleFinding[];
  astFindings: ASTFinding[];
  semanticFindings: SemanticFinding[];
  scanDurationMs: number;
  analyzersUsed: string[];
  scannerVersion?: string;
}

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
  info: 0,
};

export class SafetyScoreCalculator {
  public calculate(params: ScoreCalculatorParams): ScanVerdict {
    const { ruleFindings, astFindings, semanticFindings, scanDurationMs, analyzersUsed, scannerVersion = 'v1.0.0' } = params;

    const rawFindings: Finding[] = [
      ...this.normalizeRuleFindings(ruleFindings),
      ...this.normalizeASTFindings(astFindings),
      ...this.normalizeSemanticFindings(semanticFindings),
    ];

    const deduplicatedFindings = this.deduplicateFindings(rawFindings);

    const score = deduplicatedFindings.reduce((total, finding) => total + SEVERITY_WEIGHTS[finding.severity], 0);

    let label = SafetyLabel.SAFE;
    if (score >= 10) {
      label = SafetyLabel.MALICIOUS;
    } else if (score > 0) {
      label = SafetyLabel.SUSPICIOUS;
    }

    // Confidence: if 0 findings, confidence is 1.0. Else average confidence of findings.
    let confidence = 1.0;
    if (deduplicatedFindings.length > 0) {
      const totalConf = deduplicatedFindings.reduce((sum, f) => sum + f.confidence, 0);
      confidence = totalConf / deduplicatedFindings.length;
    }

    return {
      label,
      score,
      confidence,
      findings: deduplicatedFindings,
      metadata: {
        scanDurationMs,
        rulesApplied: 0, // Should be passed in or calculated by Orchestrator
        rulesMatched: rawFindings.length,
        analyzersUsed,
        scannerVersion,
      },
    };
  }

  private normalizeRuleFindings(findings: RuleFinding[]): Finding[] {
    return findings.map((f) => ({
      ruleId: f.ruleId,
      ruleName: f.rule.name,
      category: f.rule.category,
      severity: f.rule.severity,
      description: f.rule.description,
      matchedText: f.matchedText,
      location: {
        section: f.section,
        line: f.lineNumber,
      },
      context: f.context,
      confidence: 1.0, // Regex rules have high certainty if they match
    }));
  }

  private normalizeASTFindings(findings: ASTFinding[]): Finding[] {
    return findings.map((f) => ({
      ruleId: `AST-${f.dangerType.replace(/\s+/g, '-').toUpperCase()}`,
      ruleName: `AST Danger: ${f.dangerType}`,
      category: 'code_execution',
      severity: this.mapASTDangerToSeverity(f.dangerType),
      description: `Detected suspicious AST node (${f.nodeType}): ${f.dangerType}`,
      matchedText: f.matchedText,
      location: {
        section: 'codeBlock',
        line: f.lineNumber,
      },
      context: f.context,
      confidence: 1.0, // AST matches are structurally exact
    }));
  }

  private mapASTDangerToSeverity(dangerType: string): Severity {
    switch (dangerType) {
      case 'Code Execution':
      case 'Shell Execution':
        return 'critical';
      case 'Network':
      case 'Browser Exfiltration':
        return 'high';
      case 'File System':
      case 'Encoding':
        return 'medium';
      case 'Suspicious Concatenation':
      case 'Dynamic Import':
      case 'Environment Access':
        return 'low';
      case 'Path Manipulation':
      default:
        return 'info';
    }
  }

  private normalizeSemanticFindings(findings: SemanticFinding[]): Finding[] {
    return findings.map((f) => ({
      ruleId: 'SEMANTIC-001',
      ruleName: 'Semantic Pattern Match',
      category: f.category,
      severity: f.severity,
      description: `Detected semantic pattern of category: ${f.category}`,
      matchedText: f.matchedText,
      location: {
        section: 'instructions',
        line: f.lineNumber,
      },
      context: f.context,
      confidence: f.confidence,
    }));
  }

  private deduplicateFindings(findings: Finding[]): Finding[] {
    const dedupedMap = new Map<string, Finding>();

    for (const finding of findings) {
      // Create a unique key based on section, line, and matched text
      const key = `${finding.location.section}:${finding.location.line}:${finding.matchedText}`;

      if (dedupedMap.has(key)) {
        const existing = dedupedMap.get(key)!;
        // Keep the one with the higher severity
        if (SEVERITY_WEIGHTS[finding.severity] > SEVERITY_WEIGHTS[existing.severity]) {
          dedupedMap.set(key, finding);
        } else if (SEVERITY_WEIGHTS[finding.severity] === SEVERITY_WEIGHTS[existing.severity]) {
           // Or keep the one with higher confidence if severity is equal
           if (finding.confidence > existing.confidence) {
             dedupedMap.set(key, finding);
           }
        }
      } else {
        dedupedMap.set(key, finding);
      }
    }

    return Array.from(dedupedMap.values());
  }
}
