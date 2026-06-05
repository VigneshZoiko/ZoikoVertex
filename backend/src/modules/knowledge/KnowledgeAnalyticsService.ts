import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

export interface KnowledgeAnalytics {
  summary: {
    total_collections: number;
    total_sources: number;
    total_chunks: number;
    total_claims: number;
    total_conflicts: number;
    total_retrievals: number;
  };
  status_breakdown: Array<{ status: string; count: number }>;
  type_breakdown: Array<{ source_type: string; count: number }>;
  authority_breakdown: Array<{ authority_level: string; count: number }>;
  risk_breakdown: Array<{ risk_tier: string; count: number }>;
  collection_stats: Array<{
    id: string;
    name: string;
    source_count: number;
    active_count: number;
    stale_count: number;
    conflict_count: number;
  }>;
  retrieval_stats: {
    total: number;
    avg_latency: number;
    blocked_count: number;
    top_agents: Array<{ agent_name: string; count: number }>;
    top_queries: Array<{ query: string; count: number }>;
  };
  scan_stats: {
    total_scanned: number;
    blocked: number;
    failed: number;
    passed: number;
    pii_findings: number;
    offensive_findings: number;
    duplicate_findings: number;
  };
  stale_rate: number;
  top_sources: Array<{ id: string; title: string; retrieval_count: number; last_retrieved_at: string }>;
  unused_sources: Array<{ id: string; title: string; created_at: string }>;
  citation_compliance: {
    total_outputs: number;
    outputs_with_citations: number;
    compliance_rate: number;
  };
  review_sla_performance: {
    on_track: number;
    due_soon: number;
    overdue: number;
    escalated: number;
    sla_compliance_rate: number;
  };
  conflict_age: {
    avg_age_hours: number;
    max_age_hours: number;
    open_count: number;
  };
}

export class KnowledgeAnalyticsService {
  static async getAnalytics(workspaceId: string): Promise<KnowledgeAnalytics> {
    const [
      summary,
      statusBreakdown,
      typeBreakdown,
      authorityBreakdown,
      riskBreakdown,
      retrievalEvents,
      scanLog,
      staleCount,
      totalSources,
      topSources,
      unusedSources,
      collectionsWithSources,
      collectionConflictCounts,
      claimCount,
      conflictCount,
      citationCompliance,
      reviewSlaPerf,
      conflictAge,
    ] = await Promise.all([
      this.getSummary(workspaceId),
      this.getStatusBreakdown(workspaceId),
      this.getTypeBreakdown(workspaceId),
      this.getAuthorityBreakdown(workspaceId),
      this.getRiskBreakdown(workspaceId),
      this.getRetrievalStats(workspaceId),
      this.getScanStats(workspaceId),
      this.getStaleCount(workspaceId),
      this.getTotalSources(workspaceId),
      this.getTopSources(workspaceId),
      this.getUnusedSources(workspaceId),
      this.getCollectionsWithSources(workspaceId),
      this.getCollectionConflictCounts(workspaceId),
      this.getClaimCount(workspaceId),
      this.getConflictCount(workspaceId),
      this.getCitationCompliance(workspaceId),
      this.getReviewSlaPerformance(workspaceId),
      this.getConflictAge(workspaceId),
    ]);

    return {
      summary: {
        total_collections: collectionsWithSources.length,
        total_sources: totalSources,
        total_chunks: summary.chunks || 0,
        total_claims: claimCount,
        total_conflicts: conflictCount,
        total_retrievals: retrievalEvents.total,
      },
      status_breakdown: statusBreakdown,
      type_breakdown: typeBreakdown,
      authority_breakdown: authorityBreakdown,
      risk_breakdown: riskBreakdown,
      collection_stats: collectionsWithSources.map((c: any) => ({
        id: c.id,
        name: c.name,
        source_count: c.source_count || 0,
        active_count: c.active_count || 0,
        stale_count: 0,
        conflict_count: collectionConflictCounts.find((cc: any) => cc.id === c.id)?.conflict_count || 0,
      })),
      retrieval_stats: retrievalEvents,
      scan_stats: scanLog,
      stale_rate: totalSources > 0 ? staleCount / totalSources : 0,
      top_sources: topSources,
      unused_sources: unusedSources,
      citation_compliance: citationCompliance,
      review_sla_performance: reviewSlaPerf,
      conflict_age: conflictAge,
    };
  }

  private static async getSummary(workspaceId: string): Promise<{ chunks: number }> {
    const { count } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('id', { count: 'exact', head: true });
    return { chunks: count || 0 };
  }

  private static async getStatusBreakdown(workspaceId: string): Promise<Array<{ status: string; count: number }>> {
    const { data } = await supabaseAdmin
      .from('knowledge_sources')
      .select('status')
      .eq('workspace_id', workspaceId);
    if (!data) return [];
    const map = new Map<string, number>();
    for (const d of data as any[]) {
      map.set(d.status, (map.get(d.status) || 0) + 1);
    }
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }

  private static async getTypeBreakdown(workspaceId: string): Promise<Array<{ source_type: string; count: number }>> {
    const { data } = await supabaseAdmin
      .from('knowledge_sources')
      .select('source_type')
      .eq('workspace_id', workspaceId);
    if (!data) return [];
    const map = new Map<string, number>();
    for (const d of data as any[]) {
      map.set(d.source_type, (map.get(d.source_type) || 0) + 1);
    }
    return Array.from(map.entries()).map(([source_type, count]) => ({ source_type, count }));
  }

  private static async getAuthorityBreakdown(workspaceId: string): Promise<Array<{ authority_level: string; count: number }>> {
    const { data } = await supabaseAdmin
      .from('knowledge_sources')
      .select('authority_level')
      .eq('workspace_id', workspaceId);
    if (!data) return [];
    const map = new Map<string, number>();
    for (const d of data as any[]) {
      map.set(d.authority_level, (map.get(d.authority_level) || 0) + 1);
    }
    return Array.from(map.entries()).map(([authority_level, count]) => ({ authority_level, count }));
  }

  private static async getRiskBreakdown(workspaceId: string): Promise<Array<{ risk_tier: string; count: number }>> {
    const { data } = await supabaseAdmin
      .from('knowledge_sources')
      .select('risk_tier')
      .eq('workspace_id', workspaceId);
    if (!data) return [];
    const map = new Map<string, number>();
    for (const d of data as any[]) {
      map.set(d.risk_tier, (map.get(d.risk_tier) || 0) + 1);
    }
    return Array.from(map.entries()).map(([risk_tier, count]) => ({ risk_tier, count }));
  }

  private static async getRetrievalStats(workspaceId: string): Promise<{
    total: number; avg_latency: number; blocked_count: number;
    top_agents: Array<{ agent_name: string; count: number }>;
    top_queries: Array<{ query: string; count: number }>;
  }> {
    const { data: events } = await supabaseAdmin
      .from('retrieval_events')
      .select('agent_name, query, latency_ms, blocked_chunks')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (!events || events.length === 0) {
      return { total: 0, avg_latency: 0, blocked_count: 0, top_agents: [], top_queries: [] };
    }

    const totalLatency = events.reduce((sum: number, e: any) => sum + (e.latency_ms || 0), 0);
    const blockedCount = events.reduce((sum: number, e: any) => sum + (e.blocked_chunks || 0), 0);

    const agentMap = new Map<string, number>();
    const queryMap = new Map<string, number>();
    for (const e of events as any[]) {
      if (e.agent_name) agentMap.set(e.agent_name, (agentMap.get(e.agent_name) || 0) + 1);
      if (e.query) queryMap.set(e.query, (queryMap.get(e.query) || 0) + 1);
    }

    return {
      total: events.length,
      avg_latency: totalLatency / events.length,
      blocked_count: blockedCount,
      top_agents: Array.from(agentMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([agent_name, count]) => ({ agent_name, count })),
      top_queries: Array.from(queryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count })),
    };
  }

  private static async getScanStats(workspaceId: string): Promise<{
    total_scanned: number; blocked: number; failed: number; passed: number;
    pii_findings: number; offensive_findings: number; duplicate_findings: number;
  }> {
    const { data: sources } = await supabaseAdmin
      .from('knowledge_sources')
      .select('scan_status')
      .eq('workspace_id', workspaceId);

    if (!sources) return { total_scanned: 0, blocked: 0, failed: 0, passed: 0, pii_findings: 0, offensive_findings: 0, duplicate_findings: 0 };

    let blocked = 0, failed = 0, passed = 0;
    for (const s of sources as any[]) {
      if (s.scan_status === 'blocked') blocked++;
      else if (s.scan_status === 'failed') failed++;
      else if (s.scan_status === 'passed') passed++;
    }

    const { data: scanLogs } = await supabaseAdmin
      .from('knowledge_scan_log')
      .select('scan_type')
      .in('source_id', supabaseAdmin.from('knowledge_sources').select('id').eq('workspace_id', workspaceId).in('scan_status', ['blocked', 'failed']) as any);

    let piiCount = 0, offensiveCount = 0, duplicateCount = 0;
    if (scanLogs) {
      for (const l of scanLogs as any[]) {
        if (l.scan_type === 'pii') piiCount++;
        else if (l.scan_type === 'offensive') offensiveCount++;
        else if (l.scan_type === 'duplicate') duplicateCount++;
      }
    }

    return { total_scanned: sources.length, blocked, failed, passed, pii_findings: piiCount, offensive_findings: offensiveCount, duplicate_findings: duplicateCount };
  }

  private static async getStaleCount(workspaceId: string): Promise<number> {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'ACTIVE')
      .lt('updated_at', cutoff);
    if (error) return 0;
    return count || 0;
  }

  private static async getTotalSources(workspaceId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    if (error) return 0;
    return count || 0;
  }

  private static async getTopSources(workspaceId: string): Promise<Array<{ id: string; title: string; retrieval_count: number; last_retrieved_at: string }>> {
    const { data } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, title, retrieval_count, last_retrieved_at')
      .eq('workspace_id', workspaceId)
      .not('retrieval_count', 'is', null)
      .order('retrieval_count', { ascending: false })
      .limit(10);
    return (data || []) as any[];
  }

  private static async getUnusedSources(workspaceId: string): Promise<Array<{ id: string; title: string; created_at: string }>> {
    const { data } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, title, created_at')
      .eq('workspace_id', workspaceId)
      .eq('retrieval_count', 0)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(20);
    return (data || []) as any[];
  }

  private static async getCollectionsWithSources(workspaceId: string): Promise<any[]> {
    const { data } = await supabaseAdmin
      .from('knowledge_collections')
      .select(`
        id, name,
        knowledge_sources!inner(count)
      `)
      .eq('workspace_id', workspaceId);
    return data || [];
  }

  private static async getCollectionConflictCounts(workspaceId: string): Promise<any[]> {
    const { data: sourceIds } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, collection_id')
      .eq('workspace_id', workspaceId);
    if (!sourceIds || sourceIds.length === 0) return [];
    const allSourceIds = sourceIds.map((s: any) => s.id);
    const { data: conflicts } = await supabaseAdmin
      .from('knowledge_conflicts')
      .select('source_ids');
    if (!conflicts) return [];

    const colConflictMap = new Map<string, number>();
    for (const s of sourceIds as any[]) {
      colConflictMap.set(s.collection_id, 0);
    }
    for (const c of conflicts as any[]) {
      for (const sid of (c.source_ids || [])) {
        if (allSourceIds.includes(sid)) {
          const found = sourceIds.find((s: any) => s.id === sid);
          if (found) {
            colConflictMap.set(found.collection_id, (colConflictMap.get(found.collection_id) || 0) + 1);
          }
          break;
        }
      }
    }
    return Array.from(colConflictMap.entries()).map(([id, conflict_count]) => ({ id, conflict_count }));
  }

  private static async getClaimCount(workspaceId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('knowledge_claims')
      .select('id', { count: 'exact', head: true })
      .in('source_id', supabaseAdmin.from('knowledge_sources').select('id').eq('workspace_id', workspaceId) as any);
    return count || 0;
  }

  private static async getConflictCount(workspaceId: string): Promise<number> {
    const { data: sourceIds } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id')
      .eq('workspace_id', workspaceId);
    if (!sourceIds || sourceIds.length === 0) return 0;
    const ids = sourceIds.map((s: any) => s.id);
    const { count } = await supabaseAdmin
      .from('knowledge_conflicts')
      .select('id', { count: 'exact', head: true })
      .overlaps('source_ids', ids);
    return count || 0;
  }

  private static async getCitationCompliance(workspaceId: string): Promise<{ total_outputs: number; outputs_with_citations: number; compliance_rate: number }> {
    try {
      const { count: totalOutputs } = await supabaseAdmin
        .from('retrieval_events')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .not('output_id', 'is', null);

      const { count: withCitations } = await supabaseAdmin
        .from('knowledge_citations')
        .select('id', { count: 'exact', head: true })
        .in('retrieval_event_id',
          supabaseAdmin.from('retrieval_events').select('id').eq('workspace_id', workspaceId).not('output_id', 'is', null) as any);

      const total = totalOutputs || 0;
      const cited = withCitations || 0;
      return {
        total_outputs: total,
        outputs_with_citations: cited,
        compliance_rate: total > 0 ? cited / total : 0,
      };
    } catch {
      return { total_outputs: 0, outputs_with_citations: 0, compliance_rate: 0 };
    }
  }

  private static async getReviewSlaPerformance(workspaceId: string): Promise<{ on_track: number; due_soon: number; overdue: number; escalated: number; sla_compliance_rate: number }> {
    try {
      const { data } = await supabaseAdmin
        .from('knowledge_sources')
        .select('review_sla_status')
        .eq('workspace_id', workspaceId)
        .not('review_sla_status', 'is', null);

      let onTrack = 0, dueSoon = 0, overdue = 0, escalated = 0;
      for (const s of (data || []) as any[]) {
        if (s.review_sla_status === 'on_track') onTrack++;
        else if (s.review_sla_status === 'due_soon') dueSoon++;
        else if (s.review_sla_status === 'overdue') overdue++;
        else if (s.review_sla_status === 'escalated') escalated++;
      }
      const total = onTrack + dueSoon + overdue + escalated;
      return {
        on_track: onTrack,
        due_soon: dueSoon,
        overdue,
        escalated,
        sla_compliance_rate: total > 0 ? (onTrack + dueSoon) / total : 1,
      };
    } catch {
      return { on_track: 0, due_soon: 0, overdue: 0, escalated: 0, sla_compliance_rate: 0 };
    }
  }

  private static async getConflictAge(workspaceId: string): Promise<{ avg_age_hours: number; max_age_hours: number; open_count: number }> {
    try {
      const { data: sourceIds } = await supabaseAdmin
        .from('knowledge_sources')
        .select('id')
        .eq('workspace_id', workspaceId);
      if (!sourceIds || sourceIds.length === 0) {
        return { avg_age_hours: 0, max_age_hours: 0, open_count: 0 };
      }
      const ids = sourceIds.map((s: any) => s.id);
      const { data } = await supabaseAdmin
        .from('knowledge_conflicts')
        .select('created_at')
        .eq('status', 'OPEN')
        .overlaps('source_ids', ids);

      if (!data || data.length === 0) {
        return { avg_age_hours: 0, max_age_hours: 0, open_count: 0 };
      }

      const now = Date.now();
      let totalAge = 0, maxAge = 0;
      for (const c of data as any[]) {
        const age = (now - new Date(c.created_at).getTime()) / 3600000;
        totalAge += age;
        if (age > maxAge) maxAge = age;
      }

      return {
        avg_age_hours: totalAge / data.length,
        max_age_hours: maxAge,
        open_count: data.length,
      };
    } catch {
      return { avg_age_hours: 0, max_age_hours: 0, open_count: 0 };
    }
  }
}
