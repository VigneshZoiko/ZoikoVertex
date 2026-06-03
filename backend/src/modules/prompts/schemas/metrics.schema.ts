import { z } from 'zod';

export const governanceMetricsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    total_prompts: z.number(),
    healthy_prompts: z.number(),
    warning_prompts: z.number(),
    critical_prompts: z.number(),
    average_score: z.number().min(0).max(100),
    deploy_ready_count: z.number(),
    tier_distribution: z.record(z.string(), z.number()),
    top_risks: z.array(
      z.object({
        prompt_id: z.string(),
        prompt_name: z.string(),
        overall_score: z.number(),
        severity: z.enum(['healthy', 'warning', 'critical']),
      }),
    ).max(10),
  }),
  generated_at: z.string(),
});
