import { supabaseAdmin } from '../../shared/supabase';

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
      .in('status', ['ACTIVE', 'APPROVED'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  /** Stopwords excluded from claim keyword extraction. */
  private static readonly STOPWORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'has',
    'have', 'this', 'that', 'with', 'from', 'they', 'will', 'would', 'there',
    'their', 'what', 'which', 'when', 'about', 'into', 'than', 'them', 'then',
    'your', 'our', 'its', 'was', 'were', 'been', 'being', 'more', 'most', 'some',
    'such', 'only', 'over', 'also', 'how', 'why', 'who', 'whom',
  ]);

  /**
   * Prompt Governance claim verification.
   *
   * Given a post description, extract its significant keywords and look for
   * ACTIVE knowledge sources (tenant-scoped) whose title / content / keyword
   * metadata or citation reference substantiate the claim. Returns a coverage
   * verdict the runtime decision engine maps to APPROVE / REVIEW / BLOCK.
   */
  static async matchClaimEvidence(text: string, workspaceId?: string): Promise<{
    status: 'MATCH' | 'PARTIAL' | 'NONE';
    keywords: string[];
    matched_keywords: string[];
    matches: Array<{ id: string; title: string; citation_reference: string | null; collection_id: string | null }>;
  }> {
    const keywords = Array.from(
      new Set(
        (text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [])
          .filter((w) => w.length >= 4 && !this.STOPWORDS.has(w)),
      ),
    ).slice(0, 8);

    if (keywords.length === 0) {
      return { status: 'NONE', keywords: [], matched_keywords: [], matches: [] };
    }

    const orFilter = keywords
      .map((kw) => `title.ilike.%${kw}%,content.ilike.%${kw}%`)
      .join(',');

    let dbQuery = supabaseAdmin
      .from('knowledge_sources')
      .select('id, title, content, collection_id, metadata, status, workspace_id')
      .eq('status', 'APPROVED')
      .or(orFilter)
      .limit(20);

    if (workspaceId) dbQuery = dbQuery.eq('workspace_id', workspaceId);

    const { data, error } = await dbQuery;
    if (error) throw error;

    const rows = data || [];
    const matchedKeywords = new Set<string>();
    const matches = rows.map((row: any) => {
      const haystack = `${row.title || ''} ${row.content || ''} ${JSON.stringify(row.metadata?.keywords || '')}`.toLowerCase();
      keywords.forEach((kw) => { if (haystack.includes(kw)) matchedKeywords.add(kw); });
      return {
        id: row.id,
        title: row.title || 'Untitled source',
        citation_reference: row.metadata?.citation_reference || null,
        collection_id: row.collection_id || null,
      };
    });

    const coverage = matchedKeywords.size / keywords.length;
    let status: 'MATCH' | 'PARTIAL' | 'NONE' = 'NONE';
    if (matches.length > 0 && coverage >= 0.5) status = 'MATCH';
    else if (matches.length > 0) status = 'PARTIAL';

    return {
      status,
      keywords,
      matched_keywords: Array.from(matchedKeywords),
      matches: matches.slice(0, 8),
    };
  }
}
