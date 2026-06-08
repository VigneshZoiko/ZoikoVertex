import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

interface EmbeddingResult {
  chunk_id: string;
  embedding: number[];
  model: string;
}

export class KnowledgeEmbeddingService {
  private static OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  private static EMBEDDING_MODEL = 'text-embedding-3-small';
  private static BATCH_SIZE = 20;

  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.EMBEDDING_MODEL,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI embedding error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> };
      return data.data[0].embedding;
    } catch (error) {
      logger.error({ error }, 'Failed to generate embedding');
      throw error;
    }
  }

  static async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += this.BATCH_SIZE) {
      const batch = texts.slice(i, i + this.BATCH_SIZE);
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            input: batch,
            model: this.EMBEDDING_MODEL,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI batch embedding error: ${response.status}`);
        }

        const data = await response.json() as { data: Array<{ embedding: number[]; index: number }> };
        const sorted = data.data.sort((a, b) => a.index - b.index);
        results.push(...sorted.map(d => d.embedding));
      } catch (error) {
        logger.error({ error, batchIndex: i }, 'Failed to generate batch embeddings');
        for (let j = 0; j < batch.length; j++) {
          results.push(new Array(1536).fill(0));
        }
      }
    }

    return results;
  }

  static async embedChunks(sourceId: string): Promise<EmbeddingResult[]> {
    const { data: chunks, error } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('id, text')
      .eq('source_id', sourceId)
      .order('chunk_index', { ascending: true });

    if (error || !chunks) {
      logger.error({ error }, 'Failed to fetch chunks for embedding');
      return [];
    }

    const texts = chunks.map((c: any) => c.text.slice(0, 8000));
    const embeddings = await this.generateEmbeddingsBatch(texts);

    const results: EmbeddingResult[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i] as any;
      const embedding = embeddings[i];

      const { error: updateError } = await supabaseAdmin
        .from('knowledge_chunks')
        .update({
          embedding: `[${embedding.join(',')}]`,
          embedding_model: this.EMBEDDING_MODEL,
          re_embed_at: new Date().toISOString(),
        } as any)
        .eq('id', chunk.id);

      if (updateError) {
        logger.error({ error: updateError, chunkId: chunk.id }, 'Failed to update chunk embedding');
      } else {
        results.push({ chunk_id: chunk.id, embedding, model: this.EMBEDDING_MODEL });
      }
    }

    return results;
  }

  static async vectorSearch(
    query: string,
    options: {
      collectionIds?: string[];
      limit?: number;
      threshold?: number;
      permissionFilter?: string[];
      maxAge?: number;
      authorityMin?: string;
    } = {},
  ): Promise<Array<{ chunk_id: string; source_id: string; text: string; heading_path: string; score: number; source_title: string; citation_anchor: string; authority_level: string; source_url: string }>> {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.7;

    if (!this.OPENAI_API_KEY) {
      logger.warn('No OpenAI API key for embeddings, falling back to search');
      return [];
    }

    const queryEmbedding = await this.generateEmbedding(query);

    let rpcQuery = supabaseAdmin.rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (options.collectionIds && options.collectionIds.length > 0) {
      rpcQuery = rpcQuery.in('collection_id', options.collectionIds);
    }

    const { data: matches, error } = await rpcQuery;

    if (error) {
      logger.error({ error }, 'Vector search failed');
      return [];
    }

    const results = (matches || []) as any[];

    let filtered = results;

    if (options.permissionFilter && options.permissionFilter.length > 0) {
      filtered = filtered.filter((r: any) =>
        options.permissionFilter!.includes(r.retrieval_policy)
      );
    }

    if (options.maxAge) {
      const cutoff = new Date(Date.now() - options.maxAge).toISOString();
      filtered = filtered.filter((r: any) =>
        !r.expiry_date || r.expiry_date > cutoff
      );
    }

    const authorityRank: Record<string, number> = {
      'VERIFIED_EXTERNAL': 5,
      'LEGAL_APPROVED': 4,
      'SUBJECT_MATTER_EXPERT': 3,
      'DRAFT_INTERNAL': 2,
      'AI_GENERATED': 1,
    };

    if (options.authorityMin) {
      const minRank = authorityRank[options.authorityMin] || 0;
      filtered = filtered.filter((r: any) =>
        (authorityRank[r.authority_level] || 0) >= minRank
      );
    }

    filtered.sort((a: any, b: any) => {
      const aRank = authorityRank[a.authority_level] || 0;
      const bRank = authorityRank[b.authority_level] || 0;
      if (aRank !== bRank) return bRank - aRank;
      return b.score - a.score;
    });

    return filtered.map((r: any) => ({
      chunk_id: r.id || r.chunk_id,
      source_id: r.source_id,
      text: r.text,
      heading_path: r.heading_path || '',
      score: r.score || 0,
      source_title: r.title || '',
      citation_anchor: r.citation_anchor || `chunk-${r.source_id}`,
      authority_level: r.authority_level || 'DRAFT_INTERNAL',
      source_url: r.source_url || '',
    }));
  }

  static async hybridSearch(
    query: string,
    options: {
      collectionIds?: string[];
      limit?: number;
      threshold?: number;
      permissionFilter?: string[];
      authorityMin?: string;
      keywordWeight?: number;
      vectorWeight?: number;
    } = {},
  ): Promise<Array<{ chunk_id: string; source_id: string; text: string; heading_path: string; score: number; source_title: string; citation_anchor: string; authority_level: string; source_url: string }>> {
    const vectorWeight = options.vectorWeight ?? 0.7;
    const keywordWeight = options.keywordWeight ?? 0.3;

    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query, options),
      this.keywordSearch(query, options),
    ]);

    const combined = new Map<string, any>();

    for (const vr of vectorResults) {
      combined.set(vr.chunk_id, { ...vr, score: vr.score * vectorWeight });
    }

    for (const kr of keywordResults) {
      if (combined.has(kr.chunk_id)) {
        combined.get(kr.chunk_id)!.score += kr.score * keywordWeight;
      } else {
        combined.set(kr.chunk_id, { ...kr, score: kr.score * keywordWeight });
      }
    }

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  static async keywordSearch(
    query: string,
    options: {
      collectionIds?: string[];
      limit?: number;
    } = {},
  ): Promise<Array<{ chunk_id: string; source_id: string; text: string; heading_path: string; score: number; source_title: string; citation_anchor: string; authority_level: string; source_url: string }>> {
    const limit = options.limit || 10;
    let dbQuery = supabaseAdmin
      .from('knowledge_chunks')
      .select(`
        id, text, heading_path, citation_anchor, chunk_index,
        source_id,
        knowledge_sources!inner(title, retrieval_policy, authority_level, expiry_date, collection_id, status)
      `)
      .textSearch('text', query, { type: 'websearch' })
      .eq('knowledge_sources.status', 'ACTIVE')
      .order('chunk_index', { ascending: true })
      .limit(limit);

    if (options.collectionIds && options.collectionIds.length > 0) {
      dbQuery = dbQuery.in('knowledge_sources.collection_id', options.collectionIds);
    }

    const { data, error } = await dbQuery;

    if (error) {
      logger.warn({ error }, 'Keyword search failed, falling back to ilike');
      return this.fallbackSearch(query, options);
    }

    return ((data || []) as any[]).map((r: any) => ({
      chunk_id: r.id,
      source_id: r.source_id,
      text: r.text,
      heading_path: r.heading_path || '',
      score: 0.5,
      source_title: r.knowledge_sources?.title || '',
      citation_anchor: r.citation_anchor || `chunk-${r.source_id}-${r.chunk_index}`,
      authority_level: r.knowledge_sources?.authority_level || 'DRAFT_INTERNAL',
      source_url: r.knowledge_sources?.source_url || '',
    }));
  }

  private static async fallbackSearch(
    query: string,
    options: { collectionIds?: string[]; limit?: number } = {},
  ): Promise<Array<{ chunk_id: string; source_id: string; text: string; heading_path: string; score: number; source_title: string; citation_anchor: string; authority_level: string; source_url: string }>> {
    const limit = options.limit || 10;
    let dbQuery = supabaseAdmin
      .from('knowledge_chunks')
      .select(`
        id, text, heading_path, citation_anchor, chunk_index,
        source_id,
        knowledge_sources!inner(title, retrieval_policy, authority_level, collection_id, status)
      `)
      .ilike('text', `%${query}%`)
      .eq('knowledge_sources.status', 'ACTIVE')
      .order('chunk_index', { ascending: true })
      .limit(limit);

    if (options.collectionIds && options.collectionIds.length > 0) {
      dbQuery = dbQuery.in('knowledge_sources.collection_id', options.collectionIds);
    }

    const { data, error } = await dbQuery;
    if (error) throw error;

    return ((data || []) as any[]).map((r: any) => ({
      chunk_id: r.id,
      source_id: r.source_id,
      text: r.text,
      heading_path: r.heading_path || '',
      score: 0.3,
      source_title: r.knowledge_sources?.title || '',
      citation_anchor: r.citation_anchor || `chunk-${r.source_id}-${r.chunk_index}`,
      authority_level: r.knowledge_sources?.authority_level || 'DRAFT_INTERNAL',
      source_url: r.knowledge_sources?.source_url || '',
    }));
  }
}
