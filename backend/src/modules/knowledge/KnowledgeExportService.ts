import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';

export interface ExportManifest {
  workspace_id: string;
  exported_at: string;
  exported_by: string;
  collection_ids: string[];
  source_ids: string[];
  format: string;
  include_chunks: boolean;
  include_claims: boolean;
  include_evidence: boolean;
}

export class KnowledgeExportService {
  static async exportSources(
    workspaceId: string,
    userId: string,
    sourceIds: string[],
    options: {
      format?: 'json' | 'csv';
      include_chunks?: boolean;
      include_claims?: boolean;
      include_scan_results?: boolean;
    } = {},
  ): Promise<{ data?: any; manifest?: ExportManifest; error?: string }> {
    const format = options.format || 'json';

    try {
      const { data: membership } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      const role = (membership as any)?.role || 'viewer';
      const canExport = role === 'admin' || role === 'owner' || role === 'manager';
      if (!canExport) {
        return { error: 'Export requires admin, owner, or manager role' };
      }

      const { data: sources, error } = await supabaseAdmin
        .from('knowledge_sources')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('id', sourceIds);

      if (error) throw error;
      if (!sources || sources.length === 0) {
        return { error: 'No sources found' };
      }

      const exports: any[] = [];

      for (const source of sources as any[]) {
        const exportItem: any = {
          id: source.id,
          title: source.title,
          source_type: source.source_type,
          status: source.status,
          version: source.version,
          authority_level: source.authority_level,
          sensitivity_level: source.sensitivity_level,
          risk_tier: source.risk_tier,
          jurisdiction: source.jurisdiction,
          locale: source.locale,
          product: source.product,
          brand: source.brand,
          channel: source.channel,
          source_url: source.source_url,
          created_at: source.created_at,
          updated_at: source.updated_at,
          created_by: source.created_by,
        };

        if (options.include_chunks) {
          const { data: chunks } = await supabaseAdmin
            .from('knowledge_chunks')
            .select('chunk_index, text, heading_path, citation_anchor, hash')
            .eq('source_id', source.id)
            .order('chunk_index', { ascending: true });
          exportItem.chunks = chunks || [];
        }

        if (options.include_claims) {
          const { data: claims } = await supabaseAdmin
            .from('knowledge_claims')
            .select('claim_type, claim_text, confidence, is_unsupported, conflicting_with')
            .eq('source_id', source.id);
          exportItem.claims = claims || [];
        }

        if (options.include_scan_results) {
          exportItem.scan_results = source.scan_results;
        }

        exports.push(exportItem);
      }

      const manifest: ExportManifest = {
        workspace_id: workspaceId,
        exported_at: new Date().toISOString(),
        exported_by: userId,
        collection_ids: [...new Set((sources as any[]).map((s: any) => s.collection_id))],
        source_ids: sourceIds,
        format,
        include_chunks: !!options.include_chunks,
        include_claims: !!options.include_claims,
        include_evidence: !!options.include_scan_results,
      };

      internalEventBus.emit('knowledge.exported', {
        workspace_id: workspaceId,
        exported_by: userId,
        source_ids: sourceIds,
        format,
        count: exports.length,
        exported_at: manifest.exported_at,
      });

      if (format === 'csv') {
        let csv = 'id,title,source_type,status,version,authority_level,created_at\n';
        for (const item of exports) {
          csv += `${item.id},"${item.title}",${item.source_type},${item.status},${item.version},${item.authority_level},${item.created_at}\n`;
        }
        return { data: csv, manifest };
      }

      return { data: { manifest, exports }, manifest };
    } catch (error) {
      logger.error({ error, sourceIds }, 'Export failed');
      return { error: (error as Error).message };
    }
  }

  static async exportCollection(
    workspaceId: string,
    userId: string,
    collectionId: string,
    options: { format?: 'json' | 'csv'; include_chunks?: boolean; include_claims?: boolean } = {},
  ): Promise<{ data?: any; manifest?: ExportManifest; error?: string }> {
    const { data: sources } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('collection_id', collectionId);

    if (!sources || sources.length === 0) {
      return { error: 'No sources found in collection' };
    }

    return this.exportSources(
      workspaceId,
      userId,
      sources.map((s: any) => s.id),
      options,
    );
  }

  static async getExportHistory(workspaceId: string): Promise<any[]> {
    const { data } = await supabaseAdmin
      .from('audit_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'knowledge.exported')
      .order('created_at', { ascending: false })
      .limit(20);
    return data || [];
  }
}
