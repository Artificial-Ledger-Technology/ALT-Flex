import vm from 'node:vm';
import { SafetyRule, ParsedContent, RuleFinding } from '@aegis/core';

export class RegexRuleMatcher {
  private readonly TIMEOUT_MS = 50;

  /**
   * Scans ParsedContent against a set of regex-based SafetyRules.
   */
  public match(content: ParsedContent, rules: SafetyRule[]): RuleFinding[] {
    const regexRules = rules.filter((r) => r.pattern.type === 'regex' && r.enabled);
    const matches: RuleFinding[] = [];

    for (const rule of regexRules) {
      // 1. Scan Instructions
      for (const instruction of content.instructions) {
        matches.push(...this.scanSection('instructions', instruction, rule, content.rawText));
      }

      // 2. Scan Code Blocks
      for (const block of content.codeBlocks) {
        matches.push(...this.scanSection('codeBlock', block.content, rule, content.rawText));
      }

      // 3. Scan Raw Text (Fallback, captures everything)
      matches.push(...this.scanSection('rawText', content.rawText, rule, content.rawText));
    }

    return this.deduplicateMatches(matches);
  }

  private scanSection(
    section: 'instructions' | 'codeBlock' | 'rawText',
    text: string,
    rule: SafetyRule,
    rawTextContext: string,
  ): RuleFinding[] {
    if (!text || typeof text !== 'string') return [];

    const matches: RuleFinding[] = [];
    const executionResults = this.executeSafeRegex(rule.pattern.value, text);

    for (const res of executionResults) {
      const { match, index } = res;

      // Calculate relative Line Number (1-indexed) within the snippet
      const textUpToMatch = text.substring(0, index);
      const relativeLineNumber = (textUpToMatch.match(/\n/g) || []).length + 1;

      // Try to map to the absolute line number in the original rawText
      let absoluteLineNumber = relativeLineNumber;
      if (section !== 'rawText') {
        const rawIndex = rawTextContext.indexOf(text);
        if (rawIndex !== -1) {
          const rawTextUpToSnippet = rawTextContext.substring(0, rawIndex + index);
          absoluteLineNumber = (rawTextUpToSnippet.match(/\n/g) || []).length + 1;
        }
      }

      const contextStr = this.extractContext(text, index, 2);

      matches.push({
        ruleId: rule.id,
        rule,
        section,
        lineNumber: absoluteLineNumber,
        matchedText: match,
        context: contextStr,
      });
    }

    return matches;
  }

  /**
   * Executes a regex in a sandboxed V8 VM context to enforce a strict hardware timeout.
   * This protects the main event loop from ReDoS (Regular Expression Denial of Service).
   */
  private executeSafeRegex(pattern: string, text: string): Array<{ match: string; index: number }> {
    let regexSource = pattern;
    let flags = 'gi'; // Default to global, case-insensitive

    // Parse inline flags if provided, e.g., /pattern/gi
    if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
      const lastSlashIndex = pattern.lastIndexOf('/');
      regexSource = pattern.substring(1, lastSlashIndex);
      flags = pattern.substring(lastSlashIndex + 1);
      if (!flags.includes('g')) flags += 'g';
    }

    const context = {
      regexSource,
      flags,
      text,
      resultJSON: '[]',
      errorMsg: null as string | null,
    };
    vm.createContext(context);

    // Using matchAll safely inside the VM
    const code = `
      try {
        const regex = new RegExp(regexSource, flags);
        const matches = [...text.matchAll(regex)];
        const mapped = matches.map(m => ({ match: m[0], index: m.index }));
        resultJSON = JSON.stringify(mapped);
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : String(e);
      }
    `;

    try {
      vm.runInContext(code, context, { timeout: this.TIMEOUT_MS });
      if (context.errorMsg !== null) {
        console.warn(`Regex Error for pattern ${regexSource}:`, context.errorMsg);
        return [];
      }
      return JSON.parse(context.resultJSON) as Array<{ match: string; index: number }>;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Script execution timed out')) {
        console.warn(
          `[ReDoS Protection] Regex timeout (${this.TIMEOUT_MS}ms) triggered for pattern: ${regexSource}`,
        );
        return [];
      }
      console.error(`Unexpected VM Error for Regex ${regexSource}:`, err);
      return [];
    }
  }

  /**
   * Extracts +/- lines around the matched index for human review.
   */
  private extractContext(text: string, matchIndex: number, linesContext: number = 2): string {
    const lines = text.split('\n');
    let currentLength = 0;
    let matchLineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const lineLen = line.length + 1; // +1 for the \n
      if (currentLength + lineLen > matchIndex) {
        matchLineIndex = i;
        break;
      }
      currentLength += lineLen;
    }

    const startLine = Math.max(0, matchLineIndex - linesContext);
    const endLine = Math.min(lines.length - 1, matchLineIndex + linesContext);

    return lines.slice(startLine, endLine + 1).join('\n');
  }

  /**
   * Deduplicates matches. If the exact same string matches the exact same rule on the same line,
   * we prefer the specific section (e.g., 'codeBlock') over 'rawText'.
   */
  private deduplicateMatches(matches: RuleFinding[]): RuleFinding[] {
    const unique = new Map<string, RuleFinding>();

    for (const match of matches) {
      const key = `${match.ruleId}-${match.lineNumber}-${match.matchedText}`;
      const existing = unique.get(key);
      if (existing !== undefined) {
        // Prefer specific section over rawText fallback
        if (existing.section === 'rawText' && match.section !== 'rawText') {
          unique.set(key, match);
        }
      } else {
        unique.set(key, match);
      }
    }

    return Array.from(unique.values());
  }
}
