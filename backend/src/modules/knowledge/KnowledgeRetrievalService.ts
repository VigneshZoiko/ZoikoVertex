import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

export class KnowledgeRetrievalService {
  static async logEvent(input: {
    tenant_id?: string;
    agent_id?: string;
    agent_name?: string;
    prompt_id?: string;
    workflow_id?: string;
    query: string;
    filters?: Record<string, unknown>;
    returned_chunks?: number;
    blocked_chunks?: number;
    reason_codes?: string[];
    latency_ms?: number;
    output_id?: string;
    evidence_id?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('retrieval_events')
      .insert({
        tenant_id: input.tenant_id || null,
        agent_id: input.agent_id || null,
        agent_name: input.agent_name || '',
        prompt_id: input.prompt_id || null,
        workflow_id: input.workflow_id || null,
        query: input.query,
        filters: input.filters || {},
        returned_chunks: input.returned_chunks || 0,
        blocked_chunks: input.blocked_chunks || 0,
        reason_codes: input.reason_codes || [],
        latency_ms: input.latency_ms || 0,
        output_id: input.output_id || null,
        evidence_id: input.evidence_id || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async listLogs(filters?: {
    agent_id?: string;
    agent_name?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabaseAdmin
      .from('retrieval_events')
      .select('*');

    if (filters?.agent_id) query = query.eq('agent_id', filters.agent_id);
    if (filters?.agent_name) query = query.ilike('agent_name', `%${filters.agent_name}%`);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  static async searchSources(query: string, collectionId?: string) {
    let dbQuery = supabaseAdmin
      .from('knowledge_sources')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

    if (collectionId) {
      dbQuery = dbQuery.eq('collection_id', collectionId);
    }

    const { data, error } = await dbQuery
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }
}
