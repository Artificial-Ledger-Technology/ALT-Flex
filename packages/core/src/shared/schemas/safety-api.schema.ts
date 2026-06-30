import { z } from 'zod';
import { StandardErrorResponseSchema } from './common.schema.js';

// -----------------------------------------------------------------------------
// GET /api/v1/safety/stats
// -----------------------------------------------------------------------------
export const SafetyStatsResponseSchema = z.object({
  totalScans: z.number().int().nonnegative(),
  averageScore: z.number().nonnegative(),
  labelDistribution: z.object({
    safe: z.number().int().nonnegative(),
    suspicious: z.number().int().nonnegative(),
    malicious: z.number().int().nonnegative(),
    unanalyzed: z.number().int().nonnegative(),
  }),
});

export type SafetyStatsResponse = z.infer<typeof SafetyStatsResponseSchema>;

export const SafetyStatsEndpointSchema = {
  description: 'Get high-level safety scanning statistics',
  tags: ['safety-analytics'],
  response: {
    200: SafetyStatsResponseSchema,
    500: StandardErrorResponseSchema,
  },
};

// -----------------------------------------------------------------------------
// GET /api/v1/safety/rules
// -----------------------------------------------------------------------------
export const SafetyRuleStatSchema = z.object({
  ruleId: z.string(),
  name: z.string(),
  category: z.string(),
  hitCount: z.number().int().nonnegative(),
  lastTriggered: z.string().datetime().nullable(),
  falsePositiveRate: z.number().nonnegative().optional(), // If applicable
});

export type SafetyRuleStat = z.infer<typeof SafetyRuleStatSchema>;

export const SafetyRulesResponseSchema = z.object({
  data: z.array(SafetyRuleStatSchema),
});

export type SafetyRulesResponse = z.infer<typeof SafetyRulesResponseSchema>;

export const SafetyRulesEndpointSchema = {
  description: 'Get performance statistics for individual safety rules',
  tags: ['safety-analytics'],
  response: {
    200: SafetyRulesResponseSchema,
    500: StandardErrorResponseSchema,
  },
};

// -----------------------------------------------------------------------------
// GET /api/v1/safety/timeline
// -----------------------------------------------------------------------------
export const SafetyTimelineQueryParamsSchema = z.object({
  interval: z.enum(['day', 'week', 'month']).optional().default('day'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type SafetyTimelineQueryParams = z.infer<typeof SafetyTimelineQueryParamsSchema>;

export const SafetyTimelineDataPointSchema = z.object({
  date: z.string(), // ISO date string
  safe: z.number().int().nonnegative(),
  suspicious: z.number().int().nonnegative(),
  malicious: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export type SafetyTimelineDataPoint = z.infer<typeof SafetyTimelineDataPointSchema>;

export const SafetyTimelineResponseSchema = z.object({
  data: z.array(SafetyTimelineDataPointSchema),
});

export type SafetyTimelineResponse = z.infer<typeof SafetyTimelineResponseSchema>;

export const SafetyTimelineEndpointSchema = {
  description: 'Get time-series data of safety scan results',
  tags: ['safety-analytics'],
  querystring: SafetyTimelineQueryParamsSchema,
  response: {
    200: SafetyTimelineResponseSchema,
    400: StandardErrorResponseSchema,
    500: StandardErrorResponseSchema,
  },
};

// -----------------------------------------------------------------------------
// GET /api/v1/safety/findings/top
// -----------------------------------------------------------------------------
export const TopFindingSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  category: z.string(),
  severity: z.string(),
  triggerCount: z.number().int().nonnegative(),
});

export type TopFinding = z.infer<typeof TopFindingSchema>;

export const TopFindingsResponseSchema = z.object({
  data: z.array(TopFindingSchema),
});

export type TopFindingsResponse = z.infer<typeof TopFindingsResponseSchema>;

export const TopFindingsEndpointSchema = {
  description: 'Get the most frequently triggered safety rules',
  tags: ['safety-analytics'],
  querystring: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
  response: {
    200: TopFindingsResponseSchema,
    400: StandardErrorResponseSchema,
    500: StandardErrorResponseSchema,
  },
};
