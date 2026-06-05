import { supabaseAdmin } from '../../shared/supabase';

export class KnowledgeReviewService {
  static async list(filters?: { source_id?: string; reviewer_id?: string; decision?: string }) {
    let query = supabaseAdmin.from('knowledge_reviews').select('*');

    if (filters?.source_id) query = query.eq('source_id', filters.source_id);
    if (filters?.reviewer_id) query = query.eq('reviewer_id', filters.reviewer_id);
    if (filters?.decision) query = query.eq('decision', filters.decision);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async create(input: {
    source_id: string;
    reviewer_id: string;
    review_type: string;
    decision: string;
    comments?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_reviews')
      .insert({
        source_id: input.source_id,
        reviewer_id: input.reviewer_id,
        review_type: input.review_type,
        decision: input.decision,
        comments: input.comments || '',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getBySource(sourceId: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_reviews')
      .select('*')
      .eq('source_id', sourceId);
    if (error) throw error;
    return data || [];
  }
}
