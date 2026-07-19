import { z } from 'zod';

export const CodeBlockSchema = z.object({
  language: z.string().describe('The programming language of the code block'),
  content: z.string().describe('The raw code content'),
});

export type CodeBlock = z.infer<typeof CodeBlockSchema>;

export const ParsedContentSchema = z.object({
  metadata: z.record(z.any()).describe('Extracted metadata (frontmatter, fields, etc.)'),
  instructions: z.array(z.string()).describe('Text instructions extracted from the document'),
  codeBlocks: z.array(CodeBlockSchema).describe('Code snippets/blocks extracted from the document'),
  inlineCommands: z.array(z.string()).describe('Inline code strings or commands'),
  rawText: z.string().describe('The fallback or original text (useful if parser fails)'),
});

export type ParsedContent = z.infer<typeof ParsedContentSchema>;
