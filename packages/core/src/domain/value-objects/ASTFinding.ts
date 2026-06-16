import { z } from 'zod';

export const ASTFindingSchema = z.object({
  nodeType: z.string().describe('The AST node type (e.g., CallExpression, MemberExpression)'),
  dangerType: z
    .enum([
      'Code Execution',
      'Shell Execution',
      'Network',
      'File System',
      'Encoding',
      'Browser Exfiltration',
      'Dynamic Import',
      'Suspicious Concatenation',
      'Environment Access',
      'Path Manipulation',
    ])
    .describe('The category of the danger detected'),
  lineNumber: z
    .number()
    .describe('The approximate line number in the source where the node was found'),
  matchedText: z.string().describe('The textual representation of the detected node or pattern'),
  context: z.string().describe('The surrounding context (e.g., +/- 2 lines) for human review'),
});

export type ASTFinding = z.infer<typeof ASTFindingSchema>;
