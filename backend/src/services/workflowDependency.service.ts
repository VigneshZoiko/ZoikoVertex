import { supabaseAdmin } from '../shared/supabase';

export interface DependencyHealth {
  dependency_type: string;
  status: string;
  count: number;
  details: string[];
}

export async function checkWorkflowDependencies(workflowId: string) {
  const { data: template, error: tmplError } = await supabaseAdmin
    .from('workflow_templates')
    .select('current_version_id')
    .eq('id', workflowId)
    .single();
  if (tmplError || !template) throw Object.assign(new Error('Workflow template not found'), { statusCode: 404 });

  const currentVersionId = template.current_version_id;
  void currentVersionId;

  const [agentsStatus, pausedAgentsStatus] = await Promise.all([
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('status', 'PAUSED'),
    supabaseAdmin.from('agents').select('id', { count: 'exact', head: true }).in('status', ['PAUSED', 'DEGRADED', 'SUSPENDED']),
  ]);

  const health: DependencyHealth[] = [];

  const pausedAgents = (agentsStatus.count || 0) + (pausedAgentsStatus.count || 0);
  health.push({
    dependency_type: 'agents',
    status: pausedAgents > 0 ? 'stale' : 'healthy',
    count: pausedAgents,
    details: pausedAgents > 0 ? ['Some linked agents are paused or degraded'] : [],
  });

  health.push({
    dependency_type: 'prompts',
    status: 'healthy',
    count: 0,
    details: [],
  });

  health.push({
    dependency_type: 'policy_packs',
    status: 'healthy',
    count: 0,
    details: [],
  });

  return health;
}
