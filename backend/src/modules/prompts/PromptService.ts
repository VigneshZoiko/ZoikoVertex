 
import { supabaseAdmin } from '../../shared/supabase';

export const PROMPT_STATUS = {
  DRAFT: 'draft',
  INTERNAL_TEST: 'internal_test',
  REVIEW_REQUESTED: 'review_requested',
  APPROVED_STAGING: 'approved_for_staging',
  PRODUCTION_PENDING: 'production_pending',
  COMMISSIONED: 'commissioned',
  PRODUCTION_ACTIVE: 'production_active',
  LOCKED: 'locked',
  SUPERSEDED: 'superseded',
  PAUSED: 'paused',
  RETIRED: 'retired',
  ARCHIVED: 'archived',
} as const;

export const PROMPT_RISK_TIER = {
  TIER_1_LOW: 'tier_1_low',
  TIER_2_MEDIUM: 'tier_2_medium',
  TIER_3_HIGH: 'tier_3_high',
  TIER_4_CRITICAL: 'tier_4_critical',
} as const;

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

// UI shortform → DB enum canonical value. The frontend wizard
// emits short labels; the deployed `prompt_type` enum uses
// fuller identifiers. Keep this map in sync with the DB enum.
const PROMPT_TYPE_MAP: Record<string, string> = {
  system: 'system_prompt',
  developer: 'developer_prompt',
  agent_role: 'agent_role_instruction',
  task: 'task_instruction',
  channel: 'channel_instruction',
  tool_use: 'tool_use_instruction',
  escalation: 'escalation_instruction',
  refusal: 'refusal_logic',
  safety: 'safety_rule',
  localization: 'localization_instruction',
  output_format: 'output_format_constraint',
};

function normalizePromptType(raw: string | undefined): string {
  const v = (raw || 'system').toLowerCase();
  // If the UI already sent a canonical value, accept it as-is.
  if (Object.values(PROMPT_TYPE_MAP).includes(v)) return v;
  return PROMPT_TYPE_MAP[v] || 'system_prompt';
}

export function normalizePromptStatus(raw: string | undefined): string {
  if (!raw) return PROMPT_STATUS.DRAFT;
  const key = raw.toUpperCase() as keyof typeof PROMPT_STATUS;
  return PROMPT_STATUS[key] || raw.toLowerCase();
}

export function normalizePromptRiskTier(raw: string | undefined): string {
  if (!raw) return PROMPT_RISK_TIER.TIER_2_MEDIUM;
  const key = raw.toUpperCase() as keyof typeof PROMPT_RISK_TIER;
  return PROMPT_RISK_TIER[key] || raw.toLowerCase();
}

export class PromptService {
  static async list(workspaceId: string, filters?: { status?: string; risk_tier?: string; prompt_type?: string }) {
    let query = supabaseAdmin.from('prompts').select('id, name, prompt_type, status, risk_tier, owner_name, description, linked_agent, linked_workflow, workflow_node, autonomy_level, review_requirement, knowledge_sources, linked_knowledge_sources, tools_permitted, metadata, current_version_id, created_by, created_at, updated_at').eq('workspace_id', workspaceId);
    if (filters?.status) query = query.eq('status', normalizePromptStatus(filters.status));
    if (filters?.risk_tier) query = query.eq('risk_tier', normalizePromptRiskTier(filters.risk_tier));
    if (filters?.prompt_type) query = query.eq('prompt_type', normalizePromptType(filters.prompt_type));
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
    if (error) throw error;

    const prompts = data || [];
    const promptIds = prompts.map(p => p.id);
    const versionIds = prompts.map(p => p.current_version_id || '').filter(Boolean);

    const [{ data: versions }, { data: testRuns }, { data: approvals }, { data: deployments }] = await Promise.all([
      promptIds.length > 0
        ? supabaseAdmin.from('prompt_versions').select('prompt_id, version_number').in('prompt_id', promptIds).order('version_number', { ascending: false })
        : Promise.resolve({ data: [] }),
      versionIds.length > 0
        ? supabaseAdmin.from('prompt_test_runs').select('suite_id, pass_fail, score_summary, created_at, environment, prompt_version_id').in('prompt_version_id', versionIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      versionIds.length > 0
        ? supabaseAdmin.from('prompt_approvals').select('reviewer_role, decision, created_at, decision_reason, prompt_version_id').in('prompt_version_id', versionIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      versionIds.length > 0
        ? supabaseAdmin.from('prompt_deployments').select('created_at, prompt_version_id').eq('environment', 'production').in('prompt_version_id', versionIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    const versionByPrompt = new Map<string, number>();
    for (const v of versions || []) {
      if (!versionByPrompt.has(v.prompt_id)) versionByPrompt.set(v.prompt_id, v.version_number);
    }

    const testByVersionId = new Map<string, any>();
    for (const t of testRuns || []) {
      if (!testByVersionId.has(t.prompt_version_id)) testByVersionId.set(t.prompt_version_id, t);
    }

    const approvalsByVersionId = new Map<string, any[]>();
    for (const a of approvals || []) {
      const arr = approvalsByVersionId.get(a.prompt_version_id) || [];
      arr.push(a);
      approvalsByVersionId.set(a.prompt_version_id, arr);
    }

    const deployByVersionId = new Map<string, any>();
    for (const d of deployments || []) {
      if (!deployByVersionId.has(d.prompt_version_id)) deployByVersionId.set(d.prompt_version_id, d);
    }

    const enriched = prompts.map((p: any) => {
      const vNum = versionByPrompt.get(p.id);
      const activeVersion = vNum ? `v${vNum}` : '—';
      const lastTest = testByVersionId.get(p.current_version_id || '');
      const promptApprovals = approvalsByVersionId.get(p.current_version_id || '') || [];
      const lastDeploy = deployByVersionId.get(p.current_version_id || '');

      return {
        ...p,
        active_version: activeVersion,
        active_version_id: p.current_version_id || null,
        last_test: lastTest ? {
          suite_name: lastTest.suite_id,
          pass_fail: lastTest.pass_fail,
          score: lastTest.score_summary?.score || 0,
          run_at: lastTest.created_at,
          environment: lastTest.environment,
        } : null,
        approvals: promptApprovals.map((a: any) => ({
          reviewer_role: a.reviewer_role,
          decision: a.decision,
          timestamp: a.created_at,
          notes: a.decision_reason || '',
        })),
        last_deployed: lastDeploy?.created_at || '',
      };
    });

    return enriched;
  }

  static async getById(id: string, workspaceId?: string) {
    let query = supabaseAdmin
      .from('prompts')
      .select('*')
      .eq('id', id);
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  static async requireById(id: string, workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();
    if (error) throw error;
    return data;
  }

  static async create(input: CreatePromptInput) {
    // ── FIX: align with deployed `prompts` schema discovered via
    //    information_schema. The table has NOT NULL `tenant_id`
    //    and three Postgres enums (`prompt_type`, `prompt_risk_tier`,
    //    `prompt_status`) whose values are lowercase. Insert was
    //    failing with NOT NULL / 22P02 invalid_enum errors.
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .insert({
        tenant_id: input.workspace_id,          // NOT NULL in schema; mirror workspace
        workspace_id: input.workspace_id,
        name: input.name,
        description: input.description || '',
        prompt_type: normalizePromptType(input.prompt_type),
        owner_id: input.owner_id,
        owner_name: input.owner_name || '',
        risk_tier: normalizePromptRiskTier(input.risk_tier),
        status: PROMPT_STATUS.DRAFT,             // enum is lowercase
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

  static allowedUpdateFields = ['name', 'description', 'linked_agent', 'linked_agent_id', 'linked_workflow', 'linked_workflow_id', 'knowledge_sources', 'tools_permitted'];

  static async update(id: string, input: Partial<CreatePromptInput & { status?: string }>, workspaceId?: string) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of PromptService.allowedUpdateFields) {
      if (input[k as keyof CreatePromptInput] !== undefined) update[k] = input[k as keyof CreatePromptInput];
    }
    if (input.status) update.status = normalizePromptStatus(input.status);
    if (input.risk_tier) update.risk_tier = normalizePromptRiskTier(input.risk_tier);
    if (input.prompt_type) update.prompt_type = normalizePromptType(input.prompt_type);

    let query = supabaseAdmin
      .from('prompts')
      .update(update)
      .eq('id', id);
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  static async updateStatus(id: string, status: string, workspaceId?: string) {
    let query = supabaseAdmin
      .from('prompts')
      .update({ status: normalizePromptStatus(status), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  static async updateCurrentVersion(id: string, versionId: string, workspaceId?: string) {
    let query = supabaseAdmin
      .from('prompts')
      .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query.select().single();
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
    const productionActive = all?.filter(p => p.status === PROMPT_STATUS.PRODUCTION_ACTIVE).length || 0;
    const draftsPending = all?.filter(p => p.status === PROMPT_STATUS.DRAFT || p.status === PROMPT_STATUS.REVIEW_REQUESTED).length || 0;
    const paused = all?.filter(p => p.status === PROMPT_STATUS.PAUSED).length || 0;

    return { total, production_active: productionActive, drafts_pending: draftsPending, paused };
  }

  static async clone(id: string, createdBy?: string, workspaceId?: string) {
    const original = workspaceId ? await this.requireById(id, workspaceId) : await this.getById(id);
    if (!original) throw new Error('Prompt not found');

    const { data, error } = await supabaseAdmin
      .from('prompts')
      .insert({
        tenant_id: original.tenant_id || original.workspace_id,
        workspace_id: original.workspace_id,
        name: `${original.name} (Clone)`,
        description: `Clone of ${original.name}. Created from version ${original.current_version_id || '—'}`,
        prompt_type: original.prompt_type,
        owner_id: createdBy,
        owner_name: '',
        risk_tier: original.risk_tier,
        status: PROMPT_STATUS.DRAFT,
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
