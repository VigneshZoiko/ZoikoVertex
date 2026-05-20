import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

interface CreateSourceInput {
  collection_id: string;
  kb_id?: string;
  source_type?: string;
  title: string;
  content?: string;
  source_url?: string;
  file_path?: string;
  owner_id?: string;
  owner_name?: string;
  authority_level?: string;
  sensitivity_level?: string;
  risk_tier?: string;
  retrieval_policy?: string;
  locale?: string;
  jurisdiction?: string;
  product?: string;
  brand?: string;
  channel?: string;
  review_date?: string;
  expiry_date?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export class KnowledgeSourceService {
  static async list(collectionId?: string, filters?: { status?: string; authority_level?: string; risk_tier?: string }) {
    let query = supabaseAdmin.from('knowledge_sources').select('*');

    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.authority_level) {
      query = query.eq('authority_level', filters.authority_level);
    }
    if (filters?.risk_tier) {
      query = query.eq('risk_tier', filters.risk_tier);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async listAll(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  static async create(input: CreateSourceInput) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .insert({
        collection_id: input.collection_id,
        kb_id: input.kb_id || input.collection_id,
        source_type: input.source_type || 'MANUAL_ARTICLE',
        title: input.title,
        content: input.content || '',
        source_url: input.source_url || '',
        file_path: input.file_path || '',
        owner_id: input.owner_id,
        owner_name: input.owner_name || '',
        authority_level: input.authority_level || 'DRAFT_INTERNAL',
        sensitivity_level: input.sensitivity_level || 'INTERNAL',
        risk_tier: input.risk_tier || 'MEDIUM',
        retrieval_policy: input.retrieval_policy || 'ALLOWED',
        locale: input.locale || '',
        jurisdiction: input.jurisdiction || '',
        product: input.product || '',
        brand: input.brand || '',
        channel: input.channel || '',
        review_date: input.review_date || null,
        expiry_date: input.expiry_date || null,
        metadata: input.metadata || {},
        status: 'DRAFT',
        version: 1,
        created_by: input.created_by || input.owner_id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async update(id: string, input: Partial<CreateSourceInput>) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateStatus(id: string, status: string, evidenceId?: string) {
    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (evidenceId) updateData.evidence_id = evidenceId;
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('knowledge_sources')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }

  static async incrementVersion(id: string) {
    const { data: current } = await supabaseAdmin
      .from('knowledge_sources')
      .select('version')
      .eq('id', id)
      .single();

    const newVersion = (current?.version || 0) + 1;
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
