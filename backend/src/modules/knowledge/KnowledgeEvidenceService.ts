import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';
import { preserveEvidence } from '../../services/evidenceVault.service';

export interface EvidenceBundle {
  source_id: string;
  version: number;
  chunks: Array<{
    chunk_id: string;
    text: string;
    citation_anchor: string;
    heading_path: string;
  }>;
  claims: Array<{
    claim_id: string;
    claim_type: string;
    claim_text: string;
    confidence: number;
  }>;
  scan_results: any;
  metadata: Record<string, unknown>;
}

export class KnowledgeEvidenceService {
  static async createEvidenceBundle(sourceId: string): Promise<{ evidence_id?: string; error?: string }> {
    try {
      const { data: source, error: sourceError } = await supabaseAdmin
        .from('knowledge_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (sourceError || !source) {
        return { error: 'Source not found' };
      }

      const { data: chunks } = await supabaseAdmin
        .from('knowledge_chunks')
        .select('id, text, citation_anchor, heading_path')
        .eq('source_id', sourceId)
        .order('chunk_index', { ascending: true });

      const { data: claims } = await supabaseAdmin
        .from('knowledge_claims')
        .select('id, claim_type, claim_text, confidence')
        .eq('source_id', sourceId);

      const bundle: EvidenceBundle = {
        source_id: sourceId,
        version: source.version || 1,
        chunks: (chunks || []).map((c: any) => ({
          chunk_id: c.id,
          text: c.text,
          citation_anchor: c.citation_anchor,
          heading_path: c.heading_path || '',
        })),
        claims: (claims || []).map((c: any) => ({
          claim_id: c.id,
          claim_type: c.claim_type,
          claim_text: c.claim_text,
          confidence: c.confidence,
        })),
        scan_results: source.scan_results || {},
        metadata: {
          title: source.title,
          source_type: source.source_type,
          authority_level: source.authority_level,
          sensitivity_level: source.sensitivity_level,
          jurisdiction: source.jurisdiction,
          locale: source.locale,
          uploaded_at: source.created_at,
        },
      };

      internalEventBus.emit('knowledge.evidence_bundle_created', {
        source_id: sourceId,
        chunk_count: bundle.chunks.length,
        claim_count: bundle.claims.length,
        version: bundle.version,
        workspace_id: source.workspace_id,
      });

      preserveEvidence({
        source_type: source.source_type || 'MANUAL_ARTICLE',
        source_id: sourceId,
        source_system: 'knowledge_base',
        evidence_type: 'knowledge_bundle',
        risk_level: (source.risk_tier || 'MEDIUM').toLowerCase(),
        sensitivity: (source.sensitivity_level || 'INTERNAL').toLowerCase(),
        payload: JSON.stringify(bundle),
        payload_size: Buffer.byteLength(JSON.stringify(bundle)),
        mime_type: 'application/json',
        retention_class: 'standard',
        preserved_by: source.created_by || 'system',
        preservation_reason: `Evidence bundle for source "${source.title}"`,
        workspace_id: source.workspace_id || 'unknown',
        tenant_id: source.workspace_id || 'unknown',
      }).catch((e: any) => logger.warn({ err: e, sourceId }, 'Failed to preserve evidence in vault'));

      logger.info({ source_id: sourceId, chunks: bundle.chunks.length }, 'Evidence bundle created');
      return { evidence_id: sourceId };
    } catch (error) {
      logger.error({ error, sourceId }, 'Failed to create evidence bundle');
      return { error: (error as Error).message };
    }
  }

  static async getEvidenceBundle(sourceId: string): Promise<{ bundle?: EvidenceBundle; error?: string }> {
    try {
      const bundle = await this.createEvidenceBundle(sourceId);
      return bundle;
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  static async exportEvidenceBundle(sourceId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<{ data?: any; error?: string }> {
    const bundleResult = await this.getEvidenceBundle(sourceId);
    if (bundleResult.error) return bundleResult;
    const bundle = bundleResult.bundle!;

    switch (format) {
      case 'json':
        return { data: JSON.stringify(bundle, null, 2) };
      case 'csv': {
        let csv = 'type,id,text,anchor,heading\n';
        for (const chunk of bundle.chunks) {
          csv += `chunk,${chunk.chunk_id},"${chunk.text.replace(/"/g, '""')}",${chunk.citation_anchor},${chunk.heading_path}\n`;
        }
        for (const claim of bundle.claims) {
          csv += `claim,${claim.claim_id},"${claim.claim_text.replace(/"/g, '""')}",${claim.claim_type},${claim.confidence}\n`;
        }
        return { data: csv };
      }
      case 'pdf':
        return { error: 'PDF export requires PDFKit integration' };
      default:
        return { error: `Unsupported format: ${format}` };
    }
  }
}
