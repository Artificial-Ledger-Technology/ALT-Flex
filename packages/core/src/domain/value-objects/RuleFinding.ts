import { z } from 'zod';
import { SafetyRuleSchema } from './SafetyRule.js';

export const RuleFindingSchema = z.object({
  ruleId: z.string().describe('The ID of the triggered SafetyRule'),
  rule: SafetyRuleSchema.describe('The matched SafetyRule definition'),
  section: z
    .enum(['instructions', 'codeBlock', 'rawText'])
    .describe('The section where the match was found'),
  lineNumber: z
    .number()
    .describe('The approximate line number in the source where the match occurred'),
  matchedText: z.string().describe('The specific string segment that triggered the rule'),
  context: z.string().describe('The surrounding context (e.g., +/- 2 lines) of the match'),
});

export type RuleFinding = z.infer<typeof RuleFindingSchema>;
