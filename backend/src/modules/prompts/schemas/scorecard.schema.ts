import { z } from 'zod';

export const scorecardCategoryWeights = {
  dependency_health: 20,
  approval_completeness: 20,
  adversarial_testing: 20,
  drift_status: 15,
  audit_integrity: 10,
  binding_health: 10,
  lifecycle_status: 5,
} as const;

export const scoreCardOverallSchema = z.enum(['healthy', 'warning', 'critical']);

export const scorecardCategorySchema = z.object({
  score: z.number().min(0).max(100),
  severity: scoreCardOverallSchema,
  label: z.string(),
  details: z.record(z.string(), z.unknown()),
});

export const promptScorecardResponseSchema = z.object({
  prompt_id: z.string(),
  version_id: z.string(),
  version_number: z.number(),
  generated_at: z.string(),
  overall_score: z.number().min(0).max(100),
  overall_severity: scoreCardOverallSchema,
  categories: z.object({
    dependency_health: scorecardCategorySchema,
    approval_completeness: scorecardCategorySchema,
    adversarial_testing: scorecardCategorySchema,
    drift_status: scorecardCategorySchema,
    audit_integrity: scorecardCategorySchema,
    binding_health: scorecardCategorySchema,
    lifecycle_status: scorecardCategorySchema,
  }),
  deployment_ready: z.boolean(),
  modifier_applied: z.boolean(),
  action_items: z.array(z.string()),
});

export const promptScorecardListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(promptScorecardResponseSchema),
  summary: z.object({
    average_score: z.number().min(0).max(100),
    healthy_count: z.number(),
    warning_count: z.number(),
    critical_count: z.number(),
    total: z.number(),
  }),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
  }),
});
