import { describe, it, expect } from 'vitest';
import { ParsedContent } from '@aegis/core';
import { ASTCodeAnalyzer } from '../../../src/application/scanners/ASTCodeAnalyzer';

describe('ASTCodeAnalyzer', () => {
  const analyzer = new ASTCodeAnalyzer();

  const createContent = (codeBlocks: { language: string; content: string }[]): ParsedContent => ({
    metadata: {},
    instructions: [],
    codeBlocks,
    inlineCommands: [],
    rawText: codeBlocks.map((b) => b.content).join('\n'),
  });

  describe('Language Filtering', () => {
    it('should ignore non-JS/TS code blocks', () => {
      const content = createContent([
        { language: 'python', content: 'eval("print(1)")' },
        { language: 'bash', content: 'rm -rf /' },
      ]);
      const findings = analyzer.analyze(content);
      expect(findings.length).toBe(0);
    });

    it('should analyze JS/TS/Node code blocks', () => {
      const content = createContent([
        { language: 'javascript', content: 'eval("1+1")' },
        { language: 'ts', content: 'eval("1+1")' },
        { language: 'node', content: 'eval("1+1")' },
      ]);
      const findings = analyzer.analyze(content);
      expect(findings.length).toBe(3);
    });
  });

  describe('Dangerous CallExpressions', () => {
    const dangerousCalls = [
      { name: 'eval', code: 'eval("alert(1)")', dangerType: 'Code Execution' },
      { name: 'Function', code: 'new Function("alert(1)")()', dangerType: 'Code Execution' },
      { name: 'setTimeout', code: 'setTimeout("alert(1)", 1000)', dangerType: 'Code Execution' },
      { name: 'setInterval', code: 'setInterval("alert(1)", 1000)', dangerType: 'Code Execution' },
      { name: 'exec', code: 'exec("ls -la")', dangerType: 'Shell Execution' },
      { name: 'execSync', code: 'execSync("rm -rf /")', dangerType: 'Shell Execution' },
      { name: 'spawn', code: 'spawn("bash")', dangerType: 'Shell Execution' },
      { name: 'spawnSync', code: 'spawnSync("sh")', dangerType: 'Shell Execution' },
      { name: 'require', code: 'require("child_process")', dangerType: 'Dynamic Import' },
      { name: 'fetch', code: 'fetch("http://evil.com")', dangerType: 'Network' },
      { name: 'XMLHttpRequest', code: 'new XMLHttpRequest()', dangerType: 'Network' },
      { name: 'atob', code: 'atob("YmFzaA==")', dangerType: 'Encoding' },
      { name: 'btoa', code: 'btoa("bash")', dangerType: 'Encoding' },
    ];

    dangerousCalls.forEach(({ name, code, dangerType }) => {
      it(`should detect CallExpression for ${name}`, () => {
        const content = createContent([{ language: 'javascript', content: code }]);
        const findings = analyzer.analyze(content);
        expect(findings.length).toBeGreaterThan(0);
        expect(['CallExpression', 'NewExpression']).toContain(findings[0].nodeType);
        expect(findings[0].dangerType).toBe(dangerType);
      });
    });
  });

  describe('Dangerous MemberExpressions', () => {
    const dangerousMembers = [
      { name: 'process', code: 'process.env.SECRET', dangerType: 'Environment Access' },
      { name: 'child_process', code: 'child_process.exec()', dangerType: 'Shell Execution' },
      { name: 'fs', code: 'fs.readFileSync("/etc/passwd")', dangerType: 'File System' },
      { name: 'path', code: 'path.join(a, b)', dangerType: 'Path Manipulation' },
      { name: 'os', code: 'os.platform()', dangerType: 'Shell Execution' },
      { name: 'net', code: 'net.createServer()', dangerType: 'Network' },
      { name: 'http', code: 'http.get()', dangerType: 'Network' },
      { name: 'https', code: 'https.request()', dangerType: 'Network' },
      { name: 'dgram', code: 'dgram.createSocket()', dangerType: 'Network' },
      {
        name: 'window',
        code: 'window.location = "http://evil.com"',
        dangerType: 'Browser Exfiltration',
      },
      { name: 'document', code: 'document.cookie', dangerType: 'Browser Exfiltration' },
      { name: 'navigator', code: 'navigator.userAgent', dangerType: 'Browser Exfiltration' },
      { name: 'Buffer', code: 'Buffer.from("YmFzaA==", "base64")', dangerType: 'Encoding' },
    ];

    dangerousMembers.forEach(({ name, code, dangerType }) => {
      it(`should detect MemberExpression for ${name}`, () => {
        const content = createContent([{ language: 'javascript', content: code }]);
        const findings = analyzer.analyze(content);
        expect(findings.length).toBeGreaterThan(0);
        expect(findings[0].nodeType).toBe('MemberExpression');
        expect(findings[0].dangerType).toBe(dangerType);
      });
    });
  });

  describe('Dynamic Import', () => {
    it('should detect dynamic import() expressions', () => {
      const content = createContent([
        { language: 'javascript', content: 'import("crypto").then(c => c)' },
      ]);
      const findings = analyzer.analyze(content);
      expect(findings.length).toBe(1);
      expect(findings[0].nodeType).toBe('ImportExpression');
      expect(findings[0].dangerType).toBe('Dynamic Import');
    });
  });

  describe('Suspicious Concatenation', () => {
    it('should detect string concatenations that look like URLs', () => {
      const content = createContent([
        { language: 'javascript', content: 'const url = "http://" + domain + "/steal";' },
      ]);
      const findings = analyzer.analyze(content);
      expect(findings.length).toBe(1);
      expect(findings[0].nodeType).toBe('BinaryExpression');
      expect(findings[0].dangerType).toBe('Suspicious Concatenation');
    });

    it('should detect string concatenations that look like shell commands', () => {
      const content = createContent([
        { language: 'javascript', content: 'const cmd = "bash -c " + script;' },
      ]);
      const findings = analyzer.analyze(content);
      expect(findings.length).toBe(1);
      expect(findings[0].nodeType).toBe('BinaryExpression');
      expect(findings[0].dangerType).toBe('Suspicious Concatenation');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should gracefully skip syntax errors without crashing', () => {
      const content = createContent([
        { language: 'javascript', content: 'const a = ; // syntax error' },
        { language: 'javascript', content: 'eval("1+1")' },
      ]);
      const findings = analyzer.analyze(content);
      // It skips the first block but parses the second
      expect(findings.length).toBe(1);
      expect(findings[0].nodeType).toBe('CallExpression');
    });
  });

  describe('Context and Line Numbers', () => {
    it('should correctly report line numbers and context', () => {
      const code = `const a = 1;
const b = 2;
eval(a + b);
const c = 3;
const d = 4;`;
      const content = createContent([{ language: 'javascript', content: code }]);
      const findings = analyzer.analyze(content);

      expect(findings.length).toBe(1);
      expect(findings[0].lineNumber).toBe(3);
      expect(findings[0].context).toContain('const a = 1;');
      expect(findings[0].context).toContain('eval(a + b);');
      expect(findings[0].context).toContain('const d = 4;');
      expect(findings[0].matchedText).toBe('eval(a + b)');
    });
  });
});
