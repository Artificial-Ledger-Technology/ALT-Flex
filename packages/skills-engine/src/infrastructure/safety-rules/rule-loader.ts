import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { SafetyRule, SafetyRuleSchema } from '@aegis/core';

const SafetyRulesArraySchema = z.array(SafetyRuleSchema);

export class SafetyRuleLoader {
  private readonly rulesPath: string;
  private rulesCache: SafetyRule[] | null = null;

  constructor(rulesDirectory: string) {
    this.rulesPath = join(rulesDirectory, 'rules.v1.json');
  }

  /**
   * Loads and validates safety rules from the JSON configuration.
   * Throws an Error containing Zod validation issues if the file is malformed.
   */
  public loadRules(): SafetyRule[] {
    if (this.rulesCache) {
      return this.rulesCache;
    }

    try {
      const fileContent = readFileSync(this.rulesPath, 'utf-8');
      const parsedJson: unknown = JSON.parse(fileContent);

      const validatedRules = SafetyRulesArraySchema.parse(parsedJson);
      this.rulesCache = validatedRules;
      return validatedRules;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Failed to validate safety rules: ${error.message}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Malformed JSON in safety rules file: ${error.message}`);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error: ${String(error)}`);
    }
  }

  /**
   * Clears the loaded rules cache.
   */
  public clearCache(): void {
    this.rulesCache = null;
  }
}
