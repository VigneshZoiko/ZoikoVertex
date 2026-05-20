import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

export class KnowledgeAccessService {
  static async getPolicy(collectionId?: string, sourceId?: string) {
    let query = supabaseAdmin.from('knowledge_access_policies').select('*');

    if (collectionId) query = query.eq('collection_id', collectionId);
    if (sourceId) query = query.eq('source_id', sourceId);

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }

  static async upsert(policy: {
    collection_id?: string;
    source_id?: string;
    allowed_agents?: string[];
    allowed_prompts?: string[];
    allowed_workflows?: string[];
    allowed_roles?: string[];
    allowed_channels?: string[];
    restrictions?: Record<string, unknown>;
  }) {
    const existing = await this.getPolicy(policy.collection_id, policy.source_id);

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('knowledge_access_policies')
        .update({
          allowed_agents: policy.allowed_agents || existing.allowed_agents,
          allowed_prompts: policy.allowed_prompts || existing.allowed_prompts,
          allowed_workflows: policy.allowed_workflows || existing.allowed_workflows,
          allowed_roles: policy.allowed_roles || existing.allowed_roles,
          allowed_channels: policy.allowed_channels || existing.allowed_channels,
          restrictions: policy.restrictions || existing.restrictions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabaseAdmin
      .from('knowledge_access_policies')
      .insert({
        collection_id: policy.collection_id || null,
        source_id: policy.source_id || null,
        allowed_agents: policy.allowed_agents || [],
        allowed_prompts: policy.allowed_prompts || [],
        allowed_workflows: policy.allowed_workflows || [],
        allowed_roles: policy.allowed_roles || [],
        allowed_channels: policy.allowed_channels || [],
        restrictions: policy.restrictions || {},
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
