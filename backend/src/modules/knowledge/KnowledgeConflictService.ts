/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';
import { KnowledgeNotificationService } from './KnowledgeNotificationService';
import { KnowledgeParsingService } from './KnowledgeParsingService';

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
          .select('title, content')
          .in('id', conflict.source_ids);
        return {
          ...conflict,
          source_titles: (srcData || []).map((s: any) => s.title),
          source_contents: (srcData || []).map((s: any) => s.content?.slice(0, 500)),
        };
      }
      return { ...conflict, source_titles: [], source_contents: [] };
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

    internalEventBus.emit('knowledge.conflict_detected', {
      conflict_id: data!.id,
      source_ids: input.source_ids,
      severity: input.severity,
      summary: input.summary,
    });

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

  static async autoDetectConflicts(sourceId: string): Promise<{ conflictsFound: number }> {
    try {
      const { data: source } = await supabaseAdmin
        .from('knowledge_sources')
        .select('title, content, collection_id, workspace_id, authority_level')
        .eq('id', sourceId)
        .single();

      if (!source || !source.content) return { conflictsFound: 0 };

      const { data: existingSources } = await supabaseAdmin
        .from('knowledge_sources')
        .select('id, title, content, authority_level, status')
        .eq('collection_id', source.collection_id)
        .neq('id', sourceId)
        .eq('status', 'ACTIVE');

      if (!existingSources || existingSources.length === 0) return { conflictsFound: 0 };

      const sourceClaims = KnowledgeParsingService.extractClaimPassages(source.content);
      if (sourceClaims.length === 0) return { conflictsFound: 0 };

      let conflictsFound = 0;

      for (const existing of existingSources as any[]) {
        if (!existing.content) continue;
        const existingClaims = KnowledgeParsingService.extractClaimPassages(existing.content);

        for (const sc of sourceClaims) {
          for (const ec of existingClaims) {
            if (sc.type !== ec.type) continue;
            if (this.claimsAreConflicting(sc.text, ec.text)) {
              const severity = sc.type === 'legal' || sc.type === 'compliance' || sc.type === 'certification'
                ? 'HIGH' : 'MEDIUM';

              await this.create({
                source_ids: [sourceId, existing.id],
                severity,
                summary: `Conflicting ${sc.type} claims: "${sc.text.slice(0, 100)}..." vs "${ec.text.slice(0, 100)}..."`,
                owner_id: source.workspace_id,
              });

              await KnowledgeNotificationService.notifyConflict(
                source.workspace_id,
                sourceId,
                existing.id,
              );

              conflictsFound++;
              break;
            }
          }
        }
      }

      logger.info({ sourceId, conflictsFound }, 'Auto-detected knowledge conflicts');
      return { conflictsFound };
    } catch (error) {
      logger.error({ error, sourceId }, 'Auto-detect conflicts failed');
      throw error;
    }
  }

  private static claimsAreConflicting(claimA: string, claimB: string): boolean {
    const a = claimA.toLowerCase();
    const b = claimB.toLowerCase();

    const conflictMarkers = [
      { positive: /\b(increase|improve|boost|accelerate|grow|reduce|decrease|minimize)\b/g,
        numeric: /\b(\d+%|\d+x|\$\d+)/g },
      { positive: /\b(compliant|certified|approved)\b/g,
        negative: /\b(not\s+compliant|non-compliant|not\s+certified)\b/g },
      { positive: /\b(supports|integrates|works\s+with|compatible)\b/g,
        negative: /\b(does\s+not\s+support|incompatible|no\s+integration)\b/g },
    ];

    for (const marker of conflictMarkers) {
      const aHasPos = marker.positive.test(a);
      const bHasNeg = marker.negative?.test(b);
      const bHasPos = marker.positive.test(b);
      const aHasNeg = marker.negative?.test(a);

      if ((aHasPos && bHasNeg) || (bHasPos && aHasNeg)) {
        return true;
      }
    }

    const aNumbers: string[] = a.match(/\b(\d+%|\d+x|\$\d+)\b/g) || [];
    const bNumbers: string[] = b.match(/\b(\d+%|\d+x|\$\d+)\b/g) || [];

    if (aNumbers.length > 0 && bNumbers.length > 0) {
      const wordsA = new Set(a.split(/\s+/));
      const wordsB = new Set(b.split(/\s+/));
      const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
      const similarity = intersection.size / Math.max(wordsA.size, wordsB.size);

      return similarity > 0.3 && aNumbers.some((n) => bNumbers.includes(n));
    }

    return false;
  }
}
