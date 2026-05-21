import { supabaseAdmin } from '../../shared/supabase';

export class KnowledgeConflictService {
  static async list(filters?: { status?: string; severity?: string; owner_id?: string }) {
    let query = supabaseAdmin.from('knowledge_conflicts').select('*');

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const sources = data || [];

    const enriched = await Promise.all(sources.map(async (conflict: any) => {
      if (conflict.source_ids && conflict.source_ids.length > 0) {
        const { data: srcData } = await supabaseAdmin
          .from('knowledge_sources')
          .select('title')
          .in('id', conflict.source_ids);
        return {
          ...conflict,
          source_titles: (srcData || []).map((s: any) => s.title),
        };
      }
      return { ...conflict, source_titles: [] };
    }));

    return enriched;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_conflicts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  static async create(input: {
    source_ids: string[];
    chunk_ids?: string[];
    severity: string;
    summary: string;
    owner_id?: string;
    owner_name?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_conflicts')
      .insert({
        source_ids: input.source_ids,
        chunk_ids: input.chunk_ids || [],
        severity: input.severity || 'MEDIUM',
        summary: input.summary,
        owner_id: input.owner_id || null,
        owner_name: input.owner_name || '',
        status: 'OPEN',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async resolve(id: string, resolution: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_conflicts')
      .update({
        status: 'RESOLVED',
        resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getCount() {
    const { count, error } = await supabaseAdmin
      .from('knowledge_conflicts')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'RESOLVED');
    if (error) throw error;
    return count || 0;
  }
}
