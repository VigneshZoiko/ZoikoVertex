import { z } from 'zod';

export const runPolicySimulationSchema = z.object({
  simulation_type: z.enum(['approval_rule', 'risk_tier_threshold', 'deployment_rule', 'adversarial_policy', 'drift_tolerance', 'binding_policy']),
  parameters: z.record(z.string(), z.unknown()),
});

export const promptRunPolicySimulationSchema = runPolicySimulationSchema.extend({
  // Same shape — prompt_id comes from URL param
});
