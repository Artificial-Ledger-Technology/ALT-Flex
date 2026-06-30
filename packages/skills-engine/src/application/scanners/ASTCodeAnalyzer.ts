/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { ParsedContent, ASTFinding } from '@aegis/core';

const DANGEROUS_CALLEE_NAMES = [
  'eval',
  'Function',
  'setTimeout',
  'setInterval',
  'exec',
  'execSync',
  'spawn',
  'spawnSync',
  'require',
  'fetch',
  'XMLHttpRequest',
  'atob',
  'btoa',
];

const DANGEROUS_MEMBER_OBJECTS = [
  'process',
  'child_process',
  'fs',
  'path',
  'os',
  'net',
  'http',
  'https',
  'dgram',
  'window',
  'document',
  'navigator',
  'Buffer',
];

export class ASTCodeAnalyzer {
  /**
   * Analyzes the given ParsedContent for dangerous AST patterns in JS/TS code blocks.
   */
  public analyze(content: ParsedContent): ASTFinding[] {
    const findings: ASTFinding[] = [];

    for (const block of content.codeBlocks) {
      if (!this.isJavaScript(block.language)) {
        continue;
      }

      try {
        const ast = acorn.parse(block.content, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          locations: true,
        });

        const blockFindings = this.traverseAST(ast, block.content);
        findings.push(...blockFindings);
      } catch (err) {
        // Log a warning and skip if parsing fails
        console.warn(
          `[AST Analyzer] Skipping unparseable code block. Error:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    return findings;
  }

  private isJavaScript(language?: string): boolean {
    if (!language) return false;
    const lang = language.toLowerCase();
    return ['javascript', 'js', 'typescript', 'ts', 'node'].includes(lang);
  }

  private traverseAST(ast: acorn.Node, sourceCode: string): ASTFinding[] {
    const findings: ASTFinding[] = [];

    const addFinding = (
      node: acorn.Node,
      nodeType: string,
      dangerType: ASTFinding['dangerType'],
      snippet?: string,
    ): void => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loc = (node as any).loc;
      const startLine = loc ? loc.start.line : 1;

      let matchedText = snippet || '';
      if (!snippet && 'start' in node && 'end' in node) {
        matchedText = sourceCode.substring(node.start, node.end);
      }

      findings.push({
        nodeType,
        dangerType,
        lineNumber: startLine,
        matchedText,
        context: this.extractContext(sourceCode, startLine, 2),
      });
    };

    walk.simple(ast, {
      CallExpression(node: any) {
        if (
          node.callee.type === 'Identifier' &&
          DANGEROUS_CALLEE_NAMES.includes(node.callee.name)
        ) {
          let dangerType: ASTFinding['dangerType'] = 'Code Execution';
          const name = node.callee.name;
          if (['exec', 'execSync', 'spawn', 'spawnSync'].includes(name))
            dangerType = 'Shell Execution';
          if (['fetch', 'XMLHttpRequest'].includes(name)) dangerType = 'Network';
          if (['atob', 'btoa'].includes(name)) dangerType = 'Encoding';
          if (name === 'require') dangerType = 'Dynamic Import';

          addFinding(node, 'CallExpression', dangerType);
        }
      },
      NewExpression(node: any) {
        if (
          node.callee.type === 'Identifier' &&
          DANGEROUS_CALLEE_NAMES.includes(node.callee.name)
        ) {
          let dangerType: ASTFinding['dangerType'] = 'Code Execution';
          const name = node.callee.name;
          if (['fetch', 'XMLHttpRequest'].includes(name)) dangerType = 'Network';
          addFinding(node, 'NewExpression', dangerType);
        }
      },
      MemberExpression(node: any) {
        if (
          node.object.type === 'Identifier' &&
          DANGEROUS_MEMBER_OBJECTS.includes(node.object.name)
        ) {
          let dangerType: ASTFinding['dangerType'] = 'Code Execution';
          const name = node.object.name;
          if (name === 'fs') dangerType = 'File System';
          if (name === 'path') dangerType = 'Path Manipulation';
          if (name === 'child_process' || name === 'os') dangerType = 'Shell Execution';
          if (name === 'process') dangerType = 'Environment Access';
          if (['net', 'http', 'https', 'dgram'].includes(name)) dangerType = 'Network';
          if (['window', 'document', 'navigator'].includes(name))
            dangerType = 'Browser Exfiltration';
          if (name === 'Buffer') dangerType = 'Encoding';

          addFinding(node, 'MemberExpression', dangerType);
        }
      },
      ImportExpression(node: any) {
        // Dynamic import() calls
        addFinding(node, 'ImportExpression', 'Dynamic Import');
      },
      BinaryExpression(node: any) {
        // Simple heuristic for suspicious string concatenation building URLs or shell commands
        if (node.operator === '+') {
          const isSusString = (n: any): boolean => {
            if (n.type === 'Literal' && typeof n.value === 'string') {
              const val = n.value.toLowerCase();
              return (
                val.includes('http') ||
                val.includes('://') ||
                val.includes('bin/sh') ||
                val.includes('bash -c')
              );
            }
            return false;
          };
          if (isSusString(node.left) || isSusString(node.right)) {
            addFinding(node, 'BinaryExpression', 'Suspicious Concatenation');
          }
        }
      },
    });

    return findings;
  }

  private extractContext(text: string, matchLine: number, linesContext: number = 2): string {
    const lines = text.split('\n');
    const startLine = Math.max(0, matchLine - 1 - linesContext);
    const endLine = Math.min(lines.length - 1, matchLine - 1 + linesContext);
    return lines.slice(startLine, endLine + 1).join('\n');
  }
}
