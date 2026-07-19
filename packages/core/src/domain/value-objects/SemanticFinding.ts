import { z } from 'zod';
import { SeveritySchema } from './SafetyRule.js';

export const SemanticFindingSchema = z.object({
  category: z
    .enum(['role_override', 'instruction_override', 'deception', 'encoded_content', 'hidden_text'])
    .describe('The category of the semantic threat'),
  severity: SeveritySchema.describe('The severity of the matched finding'),
  confidence: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe('Confidence score from 0.0 to 1.0 indicating the likelihood of the finding being an injection'),
  lineNumber: z
    .number()
    .describe('The approximate line number in the source where the match occurred'),
  matchedText: z.string().describe('The specific string segment that triggered the finding'),
  context: z.string().describe('The surrounding context (e.g., +/- 2 lines) of the match'),
});

export type SemanticFinding = z.infer<typeof SemanticFindingSchema>;
