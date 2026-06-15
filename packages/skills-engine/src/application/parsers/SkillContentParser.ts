import { marked, Token } from 'marked';
import matter from 'gray-matter';
import toml from 'toml';
import { ParsedContent } from '@aegis/core';

export type SupportedFormat = 'markdown' | 'yaml' | 'json' | 'toml';

export class SkillContentParser {
  /**
   * Parses the content of a skill file based on its format.
   * Extracts metadata, instructions, code blocks, and inline commands.
   * Handles malformed inputs gracefully by returning whatever can be salvaged alongside the rawText.
   */
  public parse(content: string, format: SupportedFormat): ParsedContent {
    switch (format) {
      case 'markdown':
        return this.parseMarkdown(content);
      case 'yaml':
        return this.parseYaml(content);
      case 'json':
        return this.parseJson(content);
      case 'toml':
        return this.parseToml(content);
      default:
        throw new Error(`Unsupported format: ${format as string}`);
    }
  }

  private parseMarkdown(content: string, existingMetadata: Record<string, unknown> = {}): ParsedContent {
    const parsed: ParsedContent = {
      metadata: existingMetadata,
      instructions: [],
      codeBlocks: [],
      inlineCommands: [],
      rawText: content,
    };

    try {
      const tokens = marked.lexer(content);
      this.walkMarkdownTokens(tokens, parsed);
    } catch (error) {
      console.warn('Markdown parsing failed partially, returning raw content:', error);
    }

    return parsed;
  }

  private walkMarkdownTokens(tokens: Token[], parsed: ParsedContent): void {
    for (const token of tokens) {
      if (token.type === 'code') {
        parsed.codeBlocks.push({
          language: token.lang || 'unknown',
          content: token.text,
        });
      } else if (token.type === 'codespan') {
        parsed.inlineCommands.push(token.text);
      } else if (token.type === 'paragraph' || token.type === 'heading') {
        if ('text' in token && token.text) {
          parsed.instructions.push(token.text);
        }
      }

      // Recursively walk nested tokens
      if ('tokens' in token && Array.isArray(token.tokens)) {
        this.walkMarkdownTokens(token.tokens as Token[], parsed);
      }
    }
  }

  private parseYaml(content: string): ParsedContent {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-argument */
      const parsedMatter = matter(content) as any;
      const metadata = (parsedMatter && typeof parsedMatter.data === 'object') ? parsedMatter.data : {};
      const bodyContent = (parsedMatter && typeof parsedMatter.content === 'string') ? parsedMatter.content : content;
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-argument */

      return this.parseMarkdown(bodyContent, metadata);
    } catch (error) {
      console.warn('YAML parsing failed, returning raw content:', error);
      return {
        metadata: {},
        instructions: [],
        codeBlocks: [],
        inlineCommands: [],
        rawText: content,
      };
    }
  }

  private parseJson(content: string): ParsedContent {
    const parsed: ParsedContent = {
      metadata: {},
      instructions: [],
      codeBlocks: [],
      inlineCommands: [],
      rawText: content,
    };

    try {
      const data = JSON.parse(content) as unknown;
      this.extractStrings(data, parsed.instructions);
    } catch (error) {
      console.warn('JSON parsing failed, returning raw content:', error);
    }

    return parsed;
  }

  private parseToml(content: string): ParsedContent {
    const parsed: ParsedContent = {
      metadata: {},
      instructions: [],
      codeBlocks: [],
      inlineCommands: [],
      rawText: content,
    };

    try {
      const data = toml.parse(content) as unknown;
      this.extractStrings(data, parsed.instructions);
    } catch (error) {
      console.warn('TOML parsing failed, returning raw content:', error);
    }

    return parsed;
  }

  /**
   * Recursively traverses objects/arrays to extract all string values into the target array.
   */
  private extractStrings(obj: unknown, targetArray: string[]): void {
    if (typeof obj === 'string') {
      targetArray.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractStrings(item, targetArray);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        this.extractStrings((obj as Record<string, unknown>)[key], targetArray);
      }
    }
  }
}
