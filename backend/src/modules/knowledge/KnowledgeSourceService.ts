import { supabaseAdmin } from '../../shared/supabase';

interface CreateSourceInput {
  collection_id: string;
  workspace_id?: string;
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

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  }

  static async listAll(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100);
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
        workspace_id: input.workspace_id || null,
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
        status: 'ACTIVE',
        version: 1,
        created_by: input.created_by || input.owner_id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static allowedUpdateFields = ['title', 'content', 'source_url', 'file_path', 'kb_id', 'source_type', 'authority_level', 'sensitivity_level', 'risk_tier', 'retrieval_policy', 'locale', 'jurisdiction', 'product', 'brand', 'channel', 'review_date', 'expiry_date', 'metadata'];

  static async update(id: string, input: Partial<CreateSourceInput>) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of KnowledgeSourceService.allowedUpdateFields) {
      if (input[k as keyof CreateSourceInput] !== undefined) update[k] = input[k as keyof CreateSourceInput];
    }
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update(update)
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

  static async incrementVersion(id: string, retries = 3): Promise<any> {
    const { data: current } = await supabaseAdmin
      .from('knowledge_sources')
      .select('version')
      .eq('id', id)
      .single();
    const nextVersion = (current?.version || 0) + 1;
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update({ version: nextVersion, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('version', current?.version ?? 0)
      .select()
      .single();
    if (error) throw error;
    if (!data && retries > 0) return this.incrementVersion(id, retries - 1);
    return data;
  }
}
