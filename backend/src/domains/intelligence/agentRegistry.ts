const CONTENT_GENERATION_AGENT = {
  agent_id: 'agent-content-gen-v1',
  agent_type: 'content',
  autonomy_level: 'L0',
  state: 'ACTIVE',
  authority: {
    financial: { daily_limit: 0, per_action_limit: 0 },
    operational: { max_actions_per_hour: 50, max_parallel_actions: 5 },
    temporal: { execution_window: ['00:00-23:59'] },
    strategic: { allowed_domains: ['content'], allowed_channels: [] },
  },
};

export const validateAgentCanAct = (
  agentId: string,
  actionType: string,
): { allowed: boolean; reason?: string } => {
  if (agentId !== CONTENT_GENERATION_AGENT.agent_id) {
    return { allowed: false, reason: `Unknown agent: ${agentId}` };
  }

  if (CONTENT_GENERATION_AGENT.state !== 'ACTIVE') {
    return { allowed: false, reason: `Agent ${agentId} is not ACTIVE` };
  }

  const domain = actionType.split('_')[0];
  if (!CONTENT_GENERATION_AGENT.authority.strategic.allowed_domains.includes(domain)) {
    return { allowed: false, reason: `Action type '${actionType}' not in allowed domains` };
  }

  return { allowed: true };
};
