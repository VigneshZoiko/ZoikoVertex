import { supabaseAdmin } from '../shared/supabase';

export interface DependencyResult {
  dependency_type: string;
  dependency_id_ref: string;
  dependency_name: string;
  required_status: string;
  current_status: string;
  health: 'healthy' | 'stale' | 'paused' | 'missing' | 'deprecated' | 'critical_failure';
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  last_checked_at: string;
  blocking: boolean;
  recommended_action: string;
}

function nowISO(): string {
  return new Date().toISOString();
}

function healthy(name: string, id: string, status: string, depType: string, required: string): DependencyResult {
  return {
    dependency_type: depType,
    dependency_id_ref: id,
    dependency_name: name,
    required_status: required,
    current_status: status,
    health: 'healthy',
    impact_level: 'low',
    last_checked_at: nowISO(),
    blocking: false,
    recommended_action: 'No action required',
  };
}

function stale(name: string, id: string, status: string, depType: string, required: string, impact: 'low' | 'medium' | 'high' | 'critical', action: string): DependencyResult {
  return {
    dependency_type: depType,
    dependency_id_ref: id,
    dependency_name: name,
    required_status: required,
    current_status: status,
    health: 'stale',
    impact_level: impact,
    last_checked_at: nowISO(),
    blocking: impact === 'high' || impact === 'critical',
    recommended_action: action,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- dependency-classification helper retained for parity with missing()/paused()/deprecated()
function failedDep(name: string, id: string, status: string, depType: string, required: string, action: string): DependencyResult {
  return {
    dependency_type: depType,
    dependency_id_ref: id,
    dependency_name: name,
    required_status: required,
    current_status: status,
    health: 'critical_failure',
    impact_level: 'critical',
    last_checked_at: nowISO(),
    blocking: true,
    recommended_action: action,
  };
}

function missing(name: string, id: string, depType: string, action: string): DependencyResult {
  return {
    dependency_type: depType,
    dependency_id_ref: id,
    dependency_name: name,
    required_status: 'active',
    current_status: 'missing',
    health: 'missing',
    impact_level: 'critical',
    last_checked_at: nowISO(),
    blocking: true,
    recommended_action: action,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- dependency-classification helper retained for parity with missing()/failedDep()/deprecated()
function paused(name: string, id: string, depType: string, action: string): DependencyResult {
  return {
    dependency_type: depType,
    dependency_id_ref: id,
    dependency_name: name,
    required_status: 'active',
    current_status: 'paused',
    health: 'paused',
    impact_level: 'medium',
    last_checked_at: nowISO(),
    blocking: false,
    recommended_action: action,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- dependency-classification helper retained for parity with missing()/failedDep()/paused()
function deprecated(name: string, id: string, depType: string, action: string): DependencyResult {
  return {
    dependency_type: depType,
    dependency_id_ref: id,
    dependency_name: name,
    required_status: 'active',
    current_status: 'deprecated',
    health: 'deprecated',
    impact_level: 'high',
    last_checked_at: nowISO(),
    blocking: false,
    recommended_action: action,
  };
}

function classifyHealth(status: string | null | undefined): { health: DependencyResult['health']; blocking: boolean; impact_level: DependencyResult['impact_level']; recommended_action: string } {
  const s = (status || '').toLowerCase();
  if (!s || s === 'unknown') return { health: 'missing', blocking: true, impact_level: 'critical', recommended_action: 'Create or re-link this dependency' };
  if (s === 'active' || s === 'ready' || s === 'idle' || s === 'connected' || s === 'approved') return { health: 'healthy', blocking: false, impact_level: 'low', recommended_action: 'No action required' };
  if (s === 'paused' || s === 'suspended') return { health: 'paused', blocking: false, impact_level: 'medium', recommended_action: 'Resume or re-activate this dependency' };
  if (s === 'deprecated' || s === 'retired') return { health: 'deprecated', blocking: false, impact_level: 'high', recommended_action: 'Replace with active version' };
  if (s === 'failed' || s === 'error') return { health: 'critical_failure', blocking: true, impact_level: 'critical', recommended_action: 'Investigate and resolve failure' };
  return { health: 'stale', blocking: false, impact_level: 'medium', recommended_action: `Review and update dependency status (current: ${status})` };
}

export async function checkWorkflowDependencies(workflowId: string): Promise<DependencyResult[]> {
  const { data: template, error: tmplError } = await supabaseAdmin
    .from('workflow_templates')
    .select('id, name, current_version_id, status, risk_level')
    .eq('id', workflowId)
    .single();
  if (tmplError || !template) throw Object.assign(new Error('Workflow template not found'), { statusCode: 404 });

  const currentVersionId = template.current_version_id;
  const results: DependencyResult[] = [];

  let steps: any[] = [];
  if (currentVersionId) {
    const { data: s } = await supabaseAdmin
      .from('workflow_steps')
      .select('id, name, step_type, config, conditions')
      .eq('version_id', currentVersionId);
    steps = s || [];
  }

  const agentIds = new Set<string>();
  const promptIds = new Set<string>();
  const knowledgeIds = new Set<string>();
  const connectorIds = new Set<string>();
  const campaignIds = new Set<string>();

  for (const step of steps) {
    const cfg = step.config || {};
    const cond = step.conditions || {};
    const allKeys = { ...cfg, ...cond };
    for (const [k, v] of Object.entries(allKeys)) {
      const vs = String(v);
      if (typeof v === 'string' && v.length > 0) {
        if (k.includes('agent') || vs.startsWith('agent-') || vs.startsWith('ag_')) agentIds.add(v);
        else if (k.includes('prompt') || vs.startsWith('prompt-') || vs.startsWith('pr_')) promptIds.add(v);
        else if (k.includes('knowledge') || k.includes('source') || vs.startsWith('knowledge-') || vs.startsWith('ks_')) knowledgeIds.add(v);
        else if (k.includes('connector') || k.includes('platform') || vs.startsWith('connector-') || vs.startsWith('cn_')) connectorIds.add(v);
        else if (k.includes('campaign') || vs.startsWith('campaign-') || vs.startsWith('cp_')) campaignIds.add(v);
      }
    }
  }

  if (currentVersionId) {
    const { data: depRecords } = await supabaseAdmin
      .from('dependency_records')
      .select('dependency_type, dependency_id_ref, required_status, current_status, impact_level')
      .eq('workflow_version_id', currentVersionId);
    if (depRecords) {
      for (const dr of depRecords) {
        if (dr.dependency_type === 'agent') agentIds.add(dr.dependency_id_ref);
        if (dr.dependency_type === 'prompt') promptIds.add(dr.dependency_id_ref);
        if (dr.dependency_type === 'knowledge_source') knowledgeIds.add(dr.dependency_id_ref);
        if (dr.dependency_type === 'connector') connectorIds.add(dr.dependency_id_ref);
        if (dr.dependency_type === 'campaign') campaignIds.add(dr.dependency_id_ref);
      }
    }
  }

  const now = nowISO();

  if (agentIds.size > 0) {
    const ids = [...agentIds];
    const { data: agents } = await supabaseAdmin.from('agents').select('id, name, status').in('id', ids);
    const agentMap = new Map((agents || []).map((a: any) => [a.id, a]));
    for (const id of ids) {
      const agent = agentMap.get(id);
      if (!agent) {
        results.push(missing(id, id, 'agent', 'Create or re-link the agent'));
      } else {
        const c = classifyHealth(agent.status);
        results.push({ dependency_type: 'agent', dependency_id_ref: agent.id, dependency_name: agent.name || 'Unnamed Agent', required_status: 'active', current_status: agent.status || 'unknown', ...c, last_checked_at: now });
      }
    }
  }

  if (promptIds.size > 0) {
    const ids = [...promptIds];
    const { data: prompts } = await supabaseAdmin.from('prompts').select('id, name, status').in('id', ids);
    const promptMap = new Map((prompts || []).map((p: any) => [p.id, p]));
    for (const id of ids) {
      const prompt = promptMap.get(id);
      if (!prompt) {
        results.push(missing(id, id, 'prompt', 'Create or re-link the prompt'));
      } else {
        const c = classifyHealth(prompt.status);
        results.push({ dependency_type: 'prompt', dependency_id_ref: prompt.id, dependency_name: prompt.name || 'Unnamed Prompt', required_status: 'active', current_status: prompt.status || 'unknown', ...c, last_checked_at: now });
      }
    }

    const { data: promptVersions } = await supabaseAdmin
      .from('prompt_versions')
      .select('prompt_id, state, version_number')
      .in('prompt_id', ids);
    const versionMap = new Map<string, any[]>();
    for (const pv of promptVersions || []) {
      const arr = versionMap.get(pv.prompt_id) || [];
      arr.push(pv);
      versionMap.set(pv.prompt_id, arr);
    }
    for (const id of ids) {
      const versions = versionMap.get(id) || [];
      const approvedVersion = versions.find((v: any) => v.state === 'approved');
      if (!approvedVersion) {
        results.push({
          dependency_type: 'prompt',
          dependency_id_ref: `${id}-version`,
          dependency_name: `Prompt ${id} version`,
          required_status: 'approved',
          current_status: versions.length > 0 ? `draft (${versions.length} versions)` : 'no versions',
          health: 'stale',
          impact_level: 'high',
          last_checked_at: now,
          blocking: false,
          recommended_action: 'Create and approve a version for this prompt',
        });
      }
    }
  }

  if (knowledgeIds.size > 0) {
    const ids = [...knowledgeIds];
    const { data: sources } = await supabaseAdmin.from('knowledge_sources').select('id, name, status, freshness_score').in('id', ids);
    const sourceMap = new Map((sources || []).map((k: any) => [k.id, k]));
    for (const id of ids) {
      const source = sourceMap.get(id);
      if (!source) {
        results.push(missing(id, id, 'knowledge_source', 'Create or re-link the knowledge source'));
      } else {
        const c = classifyHealth(source.status);
        const freshness = source.freshness_score;
        if (c.health === 'healthy' && freshness != null && freshness < 0.5) {
          results.push(stale(source.name || 'Unnamed Source', source.id, source.status, 'knowledge_source', 'active', 'medium', `Knowledge source freshness score is low (${freshness}); consider refreshing`));
        } else {
          results.push({ dependency_type: 'knowledge_source', dependency_id_ref: source.id, dependency_name: source.name || 'Unnamed Source', required_status: 'active', current_status: source.status || 'unknown', ...c, last_checked_at: now });
        }
      }
    }
  }

  if (connectorIds.size > 0) {
    const ids = [...connectorIds];
    const { data: connectors } = await supabaseAdmin.from('platform_connectors').select('id, name, status').in('id', ids);
    const connMap = new Map((connectors || []).map((c: any) => [c.id, c]));
    for (const id of ids) {
      const conn = connMap.get(id);
      if (!conn) {
        results.push(missing(id, id, 'connector', 'Create or re-link the platform connector'));
      } else {
        const c = classifyHealth(conn.status);
        const required = 'connected';
        results.push({ dependency_type: 'connector', dependency_id_ref: conn.id, dependency_name: conn.name || 'Unnamed Connector', required_status: required, current_status: conn.status || 'unknown', ...c, last_checked_at: now });
      }
    }
  }

  const { data: policyPacks } = await supabaseAdmin.from('policy_packs').select('id, name, status').eq('workspace_id', workflowId).limit(10);
  if (policyPacks && policyPacks.length > 0) {
    for (const pp of policyPacks) {
      if (pp.status !== 'active') {
        results.push(stale(pp.name || 'Unnamed Policy Pack', pp.id, pp.status, 'policy_pack', 'active', 'high', `Policy pack "${pp.name}" is not active (${pp.status})`));
      } else {
        results.push(healthy(pp.name || 'Unnamed Policy Pack', pp.id, pp.status, 'policy_pack', 'active'));
      }
    }
  }

  const { data: downstreamFlows } = await supabaseAdmin
    .from('workflow_templates')
    .select('id, name, status')
    .eq('id', workflowId);
  if (downstreamFlows && downstreamFlows.length > 0) {
    for (const wf of downstreamFlows) {
      if (wf.id !== workflowId) {
        const c = classifyHealth(wf.status);
        results.push({ dependency_type: 'workflow', dependency_id_ref: wf.id, dependency_name: wf.name || 'Unnamed Workflow', required_status: 'active', current_status: wf.status || 'unknown', ...c, last_checked_at: now });
      }
    }
  }

  return results;
}
