import { ParsedContent, SemanticFinding, Severity } from '@aegis/core';

export interface SemanticPattern {
  pattern: RegExp;
  category: SemanticFinding['category'];
  severity: Severity;
  baseConfidence: number;
}

export const INJECTION_PATTERNS: SemanticPattern[] = [
  // Role Override
  { pattern: /you\s+are\s+now\s+/i, category: 'role_override', severity: 'high', baseConfidence: 0.8 },
  {
    pattern: /forget\s+(all\s+)?(previous|prior)\s+instructions/i,
    category: 'instruction_override',
    severity: 'critical',
    baseConfidence: 0.95,
  },
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|constraints)/i,
    category: 'instruction_override',
    severity: 'critical',
    baseConfidence: 0.95,
  },
  {
    pattern: /disregard\s+(the\s+)?(system|safety)\s+(prompt|instructions)/i,
    category: 'instruction_override',
    severity: 'critical',
    baseConfidence: 0.95,
  },
  // Deception
  { pattern: /this\s+is\s+(completely\s+)?safe/i, category: 'deception', severity: 'medium', baseConfidence: 0.7 },
  { pattern: /trust\s+me/i, category: 'deception', severity: 'low', baseConfidence: 0.6 },
  // Encoded Content
  { pattern: /[A-Za-z0-9+/]{40,}={0,2}/g, category: 'encoded_content', severity: 'medium', baseConfidence: 0.85 }, // Base64
  { pattern: /\\x[0-9a-fA-F]{2}/g, category: 'encoded_content', severity: 'medium', baseConfidence: 0.75 }, // Hex
  { pattern: /[\u200B-\u200D\uFEFF\u2060]/g, category: 'hidden_text', severity: 'high', baseConfidence: 1.0 }, // Zero-width
];

export class SemanticAnalyzer {
  public scan(parsedContent: ParsedContent): SemanticFinding[] {
    const findings: SemanticFinding[] = [];

    for (const instruction of parsedContent.instructions) {
      findings.push(...this.scanText(instruction));
    }

    return findings;
  }

  private scanText(text: string): SemanticFinding[] {
    const findings: SemanticFinding[] = [];
    const lines = text.split('\n');

    for (const patternDef of INJECTION_PATTERNS) {
      // Create a local regex to ensure we don't mutate state if it has the 'g' flag
      const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);

      let match;
      while ((match = regex.exec(text)) !== null) {
        const matchedText = match[0];
        const matchIndex = match.index;
        
        // Find line number
        const precedingText = text.substring(0, matchIndex);
        const lineNumber = precedingText.split('\n').length;
        
        // Extract context (+/- 2 lines)
        const startLine = Math.max(0, lineNumber - 3); // 0-indexed context start
        const endLine = Math.min(lines.length, lineNumber + 2);
        const context = lines.slice(startLine, endLine).join('\n');

        findings.push({
          category: patternDef.category,
          severity: patternDef.severity,
          confidence: patternDef.baseConfidence,
          lineNumber,
          matchedText,
          context,
        });

        if (!regex.global) {
          break; // Avoid infinite loop if regex is not global
        }
      }
    }

    return findings;
  }
}
