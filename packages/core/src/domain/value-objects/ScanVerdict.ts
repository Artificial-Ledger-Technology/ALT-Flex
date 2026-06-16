import { z } from 'zod';
import { RuleCategorySchema, SeveritySchema } from './SafetyRule.js';
import { SafetyLabelSchema } from './SafetyLabel.js';

export const FindingLocationSchema = z.object({
  section: z.string().describe('The section of the parsed content where the finding was detected (e.g., instructions, codeBlock)'),
  line: z.number().optional().describe('The approximate line number'),
  column: z.number().optional().describe('The approximate column number'),
});

export const FindingSchema = z.object({
  ruleId: z.string().describe('The ID or category name of the rule/heuristic that triggered'),
  ruleName: z.string().describe('Human-readable name of the triggered rule or heuristic'),
  category: z.union([RuleCategorySchema, z.string()]).describe('The category of the threat (e.g., prompt_injection, network, role_override)'),
  severity: SeveritySchema.describe('The severity of the finding'),
  description: z.string().describe('Detailed description of why this was flagged'),
  matchedText: z.string().describe('The actual content that triggered the rule'),
  location: FindingLocationSchema.describe('Where the finding occurred'),
  context: z.string().describe('Surrounding text for human review'),
  confidence: z.number().min(0.0).max(1.0).describe('Confidence score indicating likelihood of a true positive'),
});

export type Finding = z.infer<typeof FindingSchema>;

export const ScanMetadataSchema = z.object({
  scanDurationMs: z.number().describe('Total time taken for the scan in milliseconds'),
  rulesApplied: z.number().describe('Number of regex/AST rules applied during the scan'),
  rulesMatched: z.number().describe('Number of rules that triggered a finding before deduplication'),
  analyzersUsed: z.array(z.string()).describe('List of analyzers used (e.g., regex, ast, semantic)'),
  scannerVersion: z.string().describe('Version of the AEGIS safety scanner engine'),
});

export const ScanVerdictSchema = z.object({
  label: SafetyLabelSchema.describe('The final safety classification assigned to the artifact'),
  score: z.number().describe('Composite risk score representing the weighted sum of all findings'),
  confidence: z.number().min(0.0).max(1.0).describe('Aggregate confidence score based on analysis coverage and finding consistency'),
  findings: z.array(FindingSchema).describe('The deduplicated and normalized list of all findings'),
  metadata: ScanMetadataSchema.describe('Scan execution metrics and context'),
});

export type ScanVerdict = z.infer<typeof ScanVerdictSchema>;
