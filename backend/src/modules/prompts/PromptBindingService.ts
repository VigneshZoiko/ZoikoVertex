import { supabaseAdmin } from '../../shared/supabase';

export class PromptBindingService {
  static async listByVersion(versionId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_bindings')
      .select('*')
      .eq('prompt_version_id', versionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async create(input: {
    prompt_version_id: string;
    agent_id?: string;
    workflow_id?: string;
    workflow_node_id?: string;
    channel_id?: string;
    brand_id?: string;
    locale?: string;
    environment?: string;
    effective_from?: string;
    effective_to?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('prompt_bindings')
      .insert({
        prompt_version_id: input.prompt_version_id,
        agent_id: input.agent_id || null,
        workflow_id: input.workflow_id || null,
        workflow_node_id: input.workflow_node_id || null,
        channel_id: input.channel_id || null,
        brand_id: input.brand_id || null,
        locale: input.locale || '',
        environment: input.environment || 'staging',
        effective_from: input.effective_from || null,
        effective_to: input.effective_to || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async listKnowledgeBindings(versionId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_knowledge_bindings')
      .select('*')
      .eq('prompt_version_id', versionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createKnowledgeBinding(input: {
    prompt_version_id: string;
    kb_id?: string;
    collection_id?: string;
    retrieval_mode?: string;
    freshness_rule?: string;
    citation_required?: boolean;
    source_priority?: string;
    restricted_sources?: string[];
  }) {
    const { data, error } = await supabaseAdmin
      .from('prompt_knowledge_bindings')
      .insert({
        prompt_version_id: input.prompt_version_id,
        kb_id: input.kb_id || null,
        collection_id: input.collection_id || null,
        retrieval_mode: input.retrieval_mode || 'optional',
        freshness_rule: input.freshness_rule || '',
        citation_required: input.citation_required || false,
        source_priority: input.source_priority || 'authority',
        restricted_sources: input.restricted_sources || [],
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async listToolPermissions(versionId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_tool_permissions')
      .select('*')
      .eq('prompt_version_id', versionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async createToolPermission(input: {
    prompt_version_id: string;
    tool_name: string;
    tool_id?: string;
    allowed_actions?: string[];
    conditions_json?: Record<string, unknown>;
    approval_required?: boolean;
    runtime_policy_id?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('prompt_tool_permissions')
      .insert({
        prompt_version_id: input.prompt_version_id,
        tool_name: input.tool_name,
        tool_id: input.tool_id || null,
        allowed_actions: input.allowed_actions || [],
        conditions_json: input.conditions_json || {},
        approval_required: input.approval_required || false,
        runtime_policy_id: input.runtime_policy_id || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
