import { z } from 'zod';

export type AdversarialCategory = 'injection' | 'jailbreak' | 'instruction_override' | 'system_prompt_extraction' | 'role_escalation' | 'tool_misuse' | 'conflicting_context' | 'data_leakage' | 'policy_bypass';

export const adversarialSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const createAdversarialScenarioSchema = z.object({
  category: z.enum(['injection', 'jailbreak', 'instruction_override', 'system_prompt_extraction', 'role_escalation', 'tool_misuse', 'conflicting_context', 'data_leakage', 'policy_bypass']),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  severity: adversarialSeveritySchema.optional().default('medium'),
  probe_template: z.string().min(1).max(2000),
  expected_behavior: z.string().min(1).max(2000),
  eval_config: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateAdversarialScenarioSchema = createAdversarialScenarioSchema.partial();

export const runAdversarialTestSchema = z.object({
  suite_id: z.string().uuid(),
  environment: z.string().optional().default('draft'),
});
