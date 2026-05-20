import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

interface CreateCollectionInput {
  workspace_id?: string;
  name: string;
  description?: string;
  type?: string;
  risk_tier?: string;
  retrieval_policy?: string;
  scope?: string;
  review_cadence?: number;
  owner_id?: string;
  owner_name?: string;
  created_by?: string;
}

interface UpdateCollectionInput {
  name?: string;
  description?: string;
  type?: string;
  risk_tier?: string;
  retrieval_policy?: string;
  scope?: string;
  review_cadence?: number;
  status?: string;
}

export class KnowledgeCollectionService {
  static async list(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_collections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_collections')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  static async create(input: CreateCollectionInput) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_collections')
      .insert({
        workspace_id: input.workspace_id,
        name: input.name,
        description: input.description || '',
        type: input.type || 'AI_LIBRARY',
        risk_tier: input.risk_tier || 'MEDIUM',
        retrieval_policy: input.retrieval_policy || 'ALLOWED',
        scope: input.scope || '',
        review_cadence: input.review_cadence || 90,
        owner_id: input.owner_id,
        owner_name: input.owner_name || '',
        created_by: input.created_by || input.owner_id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async update(id: string, input: UpdateCollectionInput) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_collections')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('knowledge_collections')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }

  static async getStats(workspaceId: string) {
    const { data: sources, error: srcErr } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, status, risk_tier, expiry_date')
      .eq('workspace_id', workspaceId);

    if (srcErr) throw srcErr;

    const { count: collectionCount, error: collErr } = await supabaseAdmin
      .from('knowledge_collections')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (collErr) throw collErr;

    const now = new Date().toISOString();
    const total = sources?.length || 0;
    const approved = sources?.filter(s => s.status === 'APPROVED' || s.status === 'ACTIVE').length || 0;
    const stale = sources?.filter(s => s.expiry_date && s.expiry_date < now).length || 0;
    const reviewRequired = sources?.filter(s => s.status === 'DRAFT' || s.status === 'REVIEW_REQUIRED' || s.status === 'PROCESSING').length || 0;
    const highRiskRestricted = sources?.filter(s => s.risk_tier === 'HIGH' || s.risk_tier === 'CRITICAL').filter(s => s.status !== 'APPROVED' && s.status !== 'ACTIVE').length || 0;

    return {
      total_sources: total,
      approved_sources: approved,
      stale_sources: stale,
      review_required: reviewRequired,
      active_collections: collectionCount || 0,
      retrieval_errors: 0,
      conflict_flags: 0,
      high_risk_restricted: highRiskRestricted,
    };
  }
}
