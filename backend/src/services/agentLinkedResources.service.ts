import { supabaseAdmin } from '../../shared/supabase';
import { logToDatabase } from '../../shared/databaseLogger';

const SERVICE = 'AgentLinkedResources';

export interface LinkedResource {
  type: 'prompt' | 'workflow' | 'policy' | 'knowledge';
  id: string;
  name: string;
  status: string;
  risk_level?: string;
  version?: number;
  owner_name?: string;
}

export interface AgentLinkedResources {
  agent_id: string;
  prompts: LinkedResource[];
  workflows: LinkedResource[];
  policies: LinkedResource[];
  knowledge_sources: LinkedResource[];
}

export async function getAgentLinkedResources(agentId: string): Promise<AgentLinkedResources> {
  const empty: AgentLinkedResources = {
    agent_id: agentId,
    prompts: [],
    workflows: [],
    policies: [],
    knowledge_sources: [],
  };

  try {
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('linked_prompts, linked_workflows, linked_policies, linked_knowledge_sources')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) return empty;

    const [promptIds, workflowIds, policyIds, knowledgeIds] = [
      (agent.linked_prompts || []) as string[],
      (agent.linked_workflows || []) as string[],
      (agent.linked_policies || []) as string[],
      (agent.linked_knowledge_sources || []) as string[],
    ];

    const [prompts, workflows, policies, knowledge_sources] = await Promise.all([
      promptIds.length > 0
        ? supabaseAdmin.from('prompts').select('id, name, status, risk_level, version, owner_id').in('id', promptIds)
        : { data: [] },
      workflowIds.length > 0
        ? supabaseAdmin.from('workflows').select('id, name, status, risk_level, version, owner_id').in('id', workflowIds)
        : { data: [] },
      policyIds.length > 0
        ? supabaseAdmin.from('policies').select('id, name, status, risk_level, version, owner_id').in('id', policyIds)
        : { data: [] },
      knowledgeIds.length > 0
        ? supabaseAdmin.from('knowledge_sources').select('id, title as name, status, source_quality_score as risk_level, version, owner_id').in('id', knowledgeIds)
        : { data: [] },
    ]);

    const ownerIds = [
      ...(prompts.data || []),
      ...(workflows.data || []),
      ...(policies.data || []),
      ...(knowledge_sources.data || []),
    ]
      .map((r: any) => r.owner_id)
      .filter(Boolean);

    const { data: owners } = ownerIds.length > 0
      ? await supabaseAdmin.from('users').select('id, full_name').in('id', ownerIds)
      : { data: [] };

    const ownerMap: Record<string, string> = {};
    (owners || []).forEach((u: any) => { ownerMap[u.id] = u.full_name; });

    const mapResource = (type: LinkedResource['type'], item: any): LinkedResource => ({
      type,
      id: item.id,
      name: item.name || item.title || item.title,
      status: item.status,
      risk_level: item.risk_level || item.source_quality_score,
      version: item.version,
      owner_name: ownerMap[item.owner_id] || 'Unknown',
    });

    return {
      agent_id: agentId,
      prompts: (prompts.data || []).map((p: any) => mapResource('prompt', p)),
      workflows: (workflows.data || []).map((w: any) => mapResource('workflow', w)),
      policies: (policies.data || []).map((p: any) => mapResource('policy', p)),
      knowledge_sources: (knowledge_sources.data || []).map((k: any) => mapResource('knowledge', k)),
    };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get linked resources', { agentId, err });
    return empty;
  }
}

export async function updateAgentLinkedResources(
  agentId: string,
  resources: Partial<{
    linked_prompts: string[];
    linked_workflows: string[];
    linked_policies: string[];
    linked_knowledge_sources: string[];
  }>
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('agents')
      .update({
        ...resources,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (error) throw error;

    await logToDatabase('info', SERVICE, `Updated linked resources for agent ${agentId}`, { resources });
    return { success: true, message: 'Linked resources updated' };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to update linked resources', { agentId, err });
    return { success: false, message: 'Failed to update linked resources' };
  }
}

export async function getActivationChecklist(agentId: string): Promise<{
  identity_complete: boolean;
  permissions_configured: boolean;
  prompt_attached: boolean;
  workflow_assigned: boolean;
  knowledge_attached: boolean;
  approval_gates_configured: boolean;
  evidence_enabled: boolean;
  sandbox_passed: boolean;
  all_complete: boolean;
  blockers: string[];
}> {
  try {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    const { data: testResults } = await supabaseAdmin
      .from('agent_test_results')
      .select('overall_result')
      .eq('agent_id', agentId)
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const blockers: string[] = [];

    const identity_complete = Boolean(agent?.name && agent?.primary_dri_id && agent?.type);
    if (!identity_complete) blockers.push('Identity fields incomplete (name, DRI, type)');

    const permissions_configured = Boolean(
      (agent?.permitted_actions && agent.permitted_actions.length > 0) ||
      (agent?.prohibited_actions && agent.prohibited_actions.length > 0) ||
      (agent?.autonomy_level && agent.autonomy_level !== 'L0')
    );
    if (!permissions_configured) blockers.push('Permissions not configured');

    const prompt_attached = Boolean(agent?.linked_prompts && agent.linked_prompts.length > 0);
    if (!prompt_attached) blockers.push('No prompt attached');

    const workflow_assigned = Boolean(agent?.linked_workflows && agent.linked_workflows.length > 0);
    if (!workflow_assigned) blockers.push('No workflow assigned');

    const knowledge_attached = Boolean(agent?.linked_knowledge_sources && agent.linked_knowledge_sources.length > 0);
    if (!knowledge_attached) blockers.push('No knowledge source attached');

    const approval_gates_configured = Boolean(agent?.approval_required !== undefined);
    if (!approval_gates_configured) blockers.push('Approval gates not configured');

    const evidence_enabled = Boolean(agent?.evidence_required !== undefined);
    if (!evidence_enabled) blockers.push('Evidence settings not enabled');

    const sandbox_passed = testResults?.overall_result !== 'block';
    if (!sandbox_passed) blockers.push('Sandbox test suite has blocking failures');

    const all_complete = identity_complete && permissions_configured && prompt_attached &&
      workflow_assigned && knowledge_attached && approval_gates_configured &&
      evidence_enabled && sandbox_passed;

    return {
      identity_complete,
      permissions_configured,
      prompt_attached,
      workflow_assigned,
      knowledge_attached,
      approval_gates_configured,
      evidence_enabled,
      sandbox_passed,
      all_complete,
      blockers,
    };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to build activation checklist', { agentId, err });
    return {
      identity_complete: false,
      permissions_configured: false,
      prompt_attached: false,
      workflow_assigned: false,
      knowledge_attached: false,
      approval_gates_configured: false,
      evidence_enabled: false,
      sandbox_passed: false,
      all_complete: false,
      blockers: ['System error — could not evaluate checklist'],
    };
  }
}