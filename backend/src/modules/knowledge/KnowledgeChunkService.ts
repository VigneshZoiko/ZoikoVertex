import { supabaseAdmin } from '../../shared/supabase';

export class KnowledgeChunkService {
  static async listBySource(sourceId: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('*')
      .eq('source_id', sourceId)
      .order('chunk_index', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  static async create(chunks: Array<{
    source_id: string;
    chunk_index: number;
    text: string;
    heading_path?: string;
    token_count?: number;
    citation_anchor?: string;
    hash?: string;
    sensitivity_level?: string;
  }>) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_chunks')
      .insert(chunks.map(c => ({
        source_id: c.source_id,
        chunk_index: c.chunk_index,
        text: c.text,
        heading_path: c.heading_path || '',
        token_count: c.token_count || 0,
        citation_anchor: c.citation_anchor || `chunk-${c.source_id}-${c.chunk_index}`,
        hash: c.hash || '',
        sensitivity_level: c.sensitivity_level || 'INTERNAL',
      })))
      .select();
    if (error) throw error;
    return data || [];
  }

  static async deleteBySource(sourceId: string) {
    const { error } = await supabaseAdmin
      .from('knowledge_chunks')
      .delete()
      .eq('source_id', sourceId);
    if (error) throw error;
    return true;
  }
}
