import { z } from 'zod';

export const RuleCategorySchema = z.enum([
  'shell_execution',
  'file_system',
  'network',
  'prompt_injection',
  'code_execution',
]);

export type RuleCategory = z.infer<typeof RuleCategorySchema>;

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);

export type Severity = z.infer<typeof SeveritySchema>;

export const RulePatternTypeSchema = z.enum(['regex', 'ast', 'semantic']);

export const RulePatternSchema = z.object({
  type: RulePatternTypeSchema,
  value: z.string().describe('The pattern to match (regex string, node type, or semantic rule)'),
});

export type RulePattern = z.infer<typeof RulePatternSchema>;

export const SafetyRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: RuleCategorySchema,
  severity: SeveritySchema,
  description: z.string(),
  pattern: RulePatternSchema,
  falsePositiveGuidance: z.string(),
  references: z.array(z.string()),
  enabled: z.boolean(),
  version: z.string(),
});

export type SafetyRule = z.infer<typeof SafetyRuleSchema>;
