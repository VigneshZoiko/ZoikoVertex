/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../shared/supabase';

interface CreatePromptInput {
  workspace_id?: string;
  name: string;
  description?: string;
  prompt_type?: string;
  owner_id?: string;
  owner_name?: string;
  risk_tier?: string;
  linked_agent?: string;
  linked_agent_id?: string;
  linked_workflow?: string;
  linked_workflow_id?: string;
  knowledge_sources?: string[];
  tools_permitted?: string[];
  created_by?: string;
}

export class PromptService {
  static async list(workspaceId: string, filters?: { status?: string; risk_tier?: string; prompt_type?: string }) {
    let query = supabaseAdmin.from('prompts').select('*').eq('workspace_id', workspaceId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.risk_tier) query = query.eq('risk_tier', filters.risk_tier);
    if (filters?.prompt_type) query = query.eq('prompt_type', filters.prompt_type);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const enriched = await Promise.all((data || []).map(async (p: any) => {
      const { data: versions } = await supabaseAdmin
        .from('prompt_versions')
        .select('version_number')
        .eq('prompt_id', p.id)
        .order('version_number', { ascending: false })
        .limit(1);
      const activeVersion = versions?.[0]?.version_number ? `v${versions[0].version_number}` : '—';

      const { data: lastTest } = await supabaseAdmin
        .from('prompt_test_runs')
        .select('suite_id, pass_fail, score_summary, created_at, environment')
        .eq('prompt_version_id', p.current_version_id || '')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: approvals } = await supabaseAdmin
        .from('prompt_approvals')
        .select('reviewer_role, decision, created_at, decision_reason')
        .eq('prompt_version_id', p.current_version_id || '')
        .order('created_at', { ascending: false });

      const { data: deployments } = await supabaseAdmin
        .from('prompt_deployments')
        .select('created_at')
        .eq('prompt_version_id', p.current_version_id || '')
        .eq('environment', 'production')
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        ...p,
        active_version: activeVersion,
        active_version_id: p.current_version_id || null,
        last_test: lastTest?.[0] ? {
          suite_name: lastTest[0].suite_id,
          pass_fail: lastTest[0].pass_fail,
          score: lastTest[0].score_summary?.score || 0,
          run_at: lastTest[0].created_at,
          environment: lastTest[0].environment,
        } : null,
        approvals: (approvals || []).map((a: any) => ({
          reviewer_role: a.reviewer_role,
          decision: a.decision,
          timestamp: a.created_at,
          notes: a.decision_reason || '',
        })),
        last_deployed: deployments?.[0]?.created_at || '',
      };
    }));

    return enriched;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  static async create(input: CreatePromptInput) {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .insert({
        workspace_id: input.workspace_id,
        name: input.name,
        description: input.description || '',
        prompt_type: input.prompt_type || 'system',
        owner_id: input.owner_id,
        owner_name: input.owner_name || '',
        risk_tier: input.risk_tier || 'TIER_2_MEDIUM',
        status: 'DRAFT',
        linked_agent: input.linked_agent || '',
        linked_agent_id: input.linked_agent_id || null,
        linked_workflow: input.linked_workflow || '',
        linked_workflow_id: input.linked_workflow_id || null,
        knowledge_sources: input.knowledge_sources || [],
        tools_permitted: input.tools_permitted || [],
        created_by: input.created_by || input.owner_id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async update(id: string, input: Partial<CreatePromptInput & { status?: string }>) {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateStatus(id: string, status: string) {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateCurrentVersion(id: string, versionId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getStats(workspaceId: string) {
    const { data: all, error } = await supabaseAdmin
      .from('prompts')
      .select('id, status, risk_tier')
      .eq('workspace_id', workspaceId);
    if (error) throw error;

    const total = all?.length || 0;
    const productionActive = all?.filter(p => p.status === 'PRODUCTION_ACTIVE').length || 0;
    const draftsPending = all?.filter(p => p.status === 'DRAFT' || p.status === 'REVIEW_REQUESTED').length || 0;
    const paused = all?.filter(p => p.status === 'PAUSED').length || 0;

    return { total, production_active: productionActive, drafts_pending: draftsPending, paused };
  }

  static async clone(id: string, createdBy?: string) {
    const original = await this.getById(id);
    if (!original) throw new Error('Prompt not found');

    const { data, error } = await supabaseAdmin
      .from('prompts')
      .insert({
        workspace_id: original.workspace_id,
        name: `${original.name} (Clone)`,
        description: `Clone of ${original.name}. Created from version ${original.current_version_id || '—'}`,
        prompt_type: original.prompt_type,
        owner_id: createdBy,
        owner_name: '',
        risk_tier: original.risk_tier,
        status: 'DRAFT',
        linked_agent: original.linked_agent,
        linked_agent_id: original.linked_agent_id,
        linked_workflow: original.linked_workflow,
        linked_workflow_id: original.linked_workflow_id,
        knowledge_sources: original.knowledge_sources || [],
        tools_permitted: original.tools_permitted || [],
        created_by: createdBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
