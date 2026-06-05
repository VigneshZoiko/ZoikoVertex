import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';
import { KnowledgeChunkingService, type Chunk } from './KnowledgeChunkingService';
import { KnowledgeParsingService } from './KnowledgeParsingService';
import { KnowledgeScanService } from './KnowledgeScanService';
import { KnowledgeEmbeddingService } from './KnowledgeEmbeddingService';
import { KnowledgeNotificationService } from './KnowledgeNotificationService';
import { KnowledgeConflictService } from './KnowledgeConflictService';
import crypto from 'crypto';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PROCESSING', 'REVIEW_REQUIRED', 'RETIRED'],
  PROCESSING: ['REVIEW_REQUIRED', 'APPROVED', 'FAILED', 'QUARANTINED'],
  REVIEW_REQUIRED: ['APPROVED', 'REJECTED', 'DRAFT', 'QUARANTINED'],
  APPROVED: ['ACTIVE', 'REJECTED', 'RETIRED'],
  ACTIVE: ['RESTRICTED', 'EXPIRED', 'RETIRED', 'REVIEW_REQUIRED'],
  EXPIRED: ['REVIEW_REQUIRED', 'RETIRED', 'ACTIVE'],
  RESTRICTED: ['ACTIVE', 'RETIRED'],
  REJECTED: ['DRAFT', 'RETIRED'],
  RETIRED: ['ACTIVE', 'DRAFT'],
  FAILED: ['DRAFT', 'RETIRED'],
  QUARANTINED: ['REVIEW_REQUIRED', 'DRAFT', 'RETIRED'],
};

interface CreateSourceInput {
  collection_id: string;
  kb_id?: string;
  source_type?: string;
  title: string;
  content?: string;
  source_url?: string;
  file_path?: string;
  owner_id?: string;
  owner_name?: string;
  authority_level?: string;
  sensitivity_level?: string;
  risk_tier?: string;
  retrieval_policy?: string;
  locale?: string;
  jurisdiction?: string;
  product?: string;
  brand?: string;
  channel?: string;
  review_date?: string;
  expiry_date?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
  duplicate_fingerprint?: string;
}

export class KnowledgeSourceService {
  static validateStatusTransition(current: string, next: string): boolean {
    const allowed = VALID_STATUS_TRANSITIONS[current];
    if (!allowed) return false;
    return allowed.includes(next);
  }

  static async list(collectionId?: string, filters?: { status?: string; authority_level?: string; risk_tier?: string }) {
    let query = supabaseAdmin.from('knowledge_sources').select('*');

    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.authority_level) {
      query = query.eq('authority_level', filters.authority_level);
    }
    if (filters?.risk_tier) {
      query = query.eq('risk_tier', filters.risk_tier);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async listAll(workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  static async create(input: CreateSourceInput) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .insert({
        collection_id: input.collection_id,
        kb_id: input.kb_id || input.collection_id,
        source_type: input.source_type || 'MANUAL_ARTICLE',
        title: input.title,
        content: input.content || '',
        source_url: input.source_url || '',
        file_path: input.file_path || '',
        owner_id: input.owner_id,
        owner_name: input.owner_name || '',
        authority_level: input.authority_level || 'DRAFT_INTERNAL',
        sensitivity_level: input.sensitivity_level || 'INTERNAL',
        risk_tier: input.risk_tier || 'MEDIUM',
        retrieval_policy: input.retrieval_policy || 'ALLOWED',
        locale: input.locale || '',
        jurisdiction: input.jurisdiction || '',
        product: input.product || '',
        brand: input.brand || '',
        channel: input.channel || '',
        review_date: input.review_date || null,
        expiry_date: input.expiry_date || null,
        metadata: input.metadata || {},
        duplicate_fingerprint: input.duplicate_fingerprint || null,
        status: 'DRAFT',
        version: 1,
        created_by: input.created_by || input.owner_id,
        evidence_id: crypto.randomUUID(),
      })
      .select()
      .single();
    if (error) throw error;

    internalEventBus.emit('knowledge.created', {
      source_id: data!.id,
      collection_id: input.collection_id,
      title: input.title,
      source_type: input.source_type,
      created_by: input.created_by,
    });

    return data;
  }

  static async processSource(id: string, workspaceId: string): Promise<void> {
    try {
      await this.updateStatus(id, 'PROCESSING');

      const source = await this.getById(id);
      if (!source) throw new Error('Source not found');

      const text = source.content || '';
      const metadata = (source.metadata || {}) as Record<string, any>;

      if (metadata.ocr_required) {
        await this.updateStatus(id, 'FAILED');
        await KnowledgeSourceService.update(id, { metadata: { ...metadata, ocr_fallback_needed: true } });
        await KnowledgeNotificationService.send({
          workspace_id: workspaceId,
          source_id: id,
          notification_type: 'parsing_failed',
          severity: 'medium',
          title: 'OCR processing required',
          message: 'This file appears to be a scanned document. OCR processing is required but not yet available. Manual text entry or a different file format is recommended.',
          action_url: `/knowledge/sources/${id}`,
        });
        return;
      }

      const parsed = KnowledgeParsingService.parseText(text, source.title);

      const claims = KnowledgeParsingService.extractClaimPassages(text);
      if (claims.length > 0) {
        const claimInserts = claims.map(c => ({
          source_id: id,
          claim_type: c.type as any,
          claim_text: c.text,
          confidence: c.confidence,
        }));
        const { error: claimError } = await supabaseAdmin
          .from('knowledge_claims')
          .insert(claimInserts);
        if (claimError) logger.warn({ error: claimError }, 'Failed to insert parsed claims');

        await supabaseAdmin
          .from('knowledge_sources')
          .update({ parsed_claims: claims as any })
          .eq('id', id);
      }

      const fingerprint = source.duplicate_fingerprint;
      let scannedPassed = true;
      let scannedBlocked = false;

      if (fingerprint) {
        const scanResult = await KnowledgeScanService.runAllScans(id, text, fingerprint, source.title, source.collection_id);
        scannedPassed = scanResult.overallPassed;
        scannedBlocked = scanResult.overallBlocked;

        if (scannedBlocked) {
          await this.updateStatus(id, 'QUARANTINED');
          await KnowledgeNotificationService.notifyQuarantine(
            workspaceId,
            id,
            scanResult.allFindings.filter(f => f.severity === 'critical').map(f => f.label),
          );
          return;
        }
      }

      const { data: collection } = await supabaseAdmin
        .from('knowledge_collections')
        .select('chunking_defaults')
        .eq('id', source.collection_id)
        .single();

      const chunkingDefaults = (collection as any)?.chunking_defaults || {};
      const chunks = KnowledgeChunkingService.chunk(
        id,
        text,
        parsed,
        {
          maxChunkSize: chunkingDefaults.max_chunk_size || 1000,
          chunkOverlap: chunkingDefaults.chunk_overlap || 200,
          strategy: chunkingDefaults.strategy || 'semantic',
        },
        source.title,
      );

      if (source.source_type === 'MANUAL_ARTICLE') {
        const { error: chunkError } = await supabaseAdmin
          .from('knowledge_chunks')
          .insert(chunks.map((c: Chunk) => ({
            source_id: id,
            chunk_index: c.chunk_index,
            text: c.text,
            heading_path: c.heading_path || '',
            token_count: c.token_count || 0,
            citation_anchor: c.citation_anchor,
            hash: c.hash,
            sensitivity_level: c.sensitivity_level || 'INTERNAL',
            version_id: source.version || 1,
          })));
        if (chunkError) {
          logger.error({ error: chunkError }, 'Failed to insert chunks');
          throw chunkError;
        }

        if (process.env.OPENAI_API_KEY) {
          try {
            await KnowledgeEmbeddingService.embedChunks(id);
          } catch (embedError) {
            logger.warn({ error: embedError }, 'Embedding generation failed (non-blocking)');
          }
        }
      }

      const autoApprove = !scannedBlocked && source.authority_level !== 'AI_GENERATED';
      const isHighRisk = source.risk_tier === 'HIGH' || source.risk_tier === 'CRITICAL';
      if (autoApprove) {
        await this.updateStatus(id, 'APPROVED');
        if (isHighRisk) {
          await KnowledgeNotificationService.send({
            workspace_id: workspaceId,
            source_id: id,
            notification_type: 'approval_required',
            severity: 'high',
            title: 'High-risk source approved for activation',
            message: `"${source.title}" (${source.risk_tier} risk) has been auto-approved. Review and confirm activation before agents can retrieve it.`,
            actionable: true,
            action_url: `/knowledge/sources/${id}`,
          });
        }
        await this.updateStatus(id, 'ACTIVE');
      } else {
        await this.updateStatus(id, 'REVIEW_REQUIRED');
      }

      if (claims.length > 0) {
        await KnowledgeSourceService.flagUnsupportedClaims(id, workspaceId, claims);
      }

      if (!scannedPassed && !scannedBlocked) {
        await KnowledgeNotificationService.send({
          workspace_id: workspaceId,
          source_id: id,
          notification_type: 'scan_failed',
          severity: 'medium',
          title: 'Scan found issues',
          message: 'Source has scan findings but was not blocked. Review recommended.',
          action_url: `/knowledge/sources/${id}`,
        });
      }

      internalEventBus.emit('knowledge.processed', {
        source_id: id,
        status: autoApprove ? 'ACTIVE' : 'REVIEW_REQUIRED',
        chunk_count: chunks.length,
        claim_count: claims.length,
        auto_approved: autoApprove,
        scanned: scannedPassed || scannedBlocked,
      });
    } catch (error) {
      logger.error({ error, sourceId: id }, 'Source processing failed');
      await this.updateStatus(id, 'FAILED');
      await KnowledgeNotificationService.notifyParsingFailed(workspaceId, id, (error as Error).message);
    }
  }

  static async flagUnsupportedClaims(
    sourceId: string,
    workspaceId: string,
    claims: Array<{ type: string; text: string; confidence: number }>,
  ): Promise<void> {
    try {
      const { data: approvedClaims } = await supabaseAdmin
        .from('knowledge_claims')
        .select('claim_type, claim_text')
        .in('source_id', supabaseAdmin
          .from('knowledge_sources')
          .select('id')
          .eq('workspace_id', workspaceId)
          .in('status', ['ACTIVE', 'APPROVED']) as any);

      const approvedTexts = new Set((approvedClaims || []).map((c: any) => c.claim_text.toLowerCase().trim()));

      const unsupported: Array<{ type: string; text: string }> = [];
      for (const claim of claims) {
        const normalized = claim.text.toLowerCase().trim();
        if (normalized.length > 20 && ![...approvedTexts].some(t => normalized.includes(t) || t.includes(normalized))) {
          unsupported.push({ type: claim.type, text: claim.text });
        }
      }

      if (unsupported.length > 0) {
        const unsupportedMeta = unsupported.map(u => ({ type: u.type, text: u.text.substring(0, 200) }));
        await supabaseAdmin
          .from('knowledge_sources')
          .update({ metadata: supabaseAdmin.rpc('coalesce_jsonb', {
            base: null,
            update: { unsupported_claims: unsupportedMeta, unsupported_claim_count: unsupported.length },
          } as any) as any })
          .eq('id', sourceId);

        await KnowledgeConflictService.create({
          source_ids: [sourceId],
          severity: 'medium',
          summary: `${unsupported.length} unsupported claim(s) detected — no matching evidence found in approved sources`,
        });
      }
    } catch (error) {
      logger.warn({ error, sourceId }, 'Failed to flag unsupported claims');
    }
  }

  static async update(id: string, input: Partial<CreateSourceInput>) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateStatus(id: string, status: string, evidenceId?: string): Promise<any> {
    const source = await this.getById(id);
    if (source && !this.validateStatusTransition(source.status, status)) {
      throw new Error(`Invalid status transition: ${source.status} → ${status}`);
    }

    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (evidenceId) updateData.evidence_id = evidenceId;

    if (status === 'ACTIVE') {
      updateData.last_retrieved_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    internalEventBus.emit('knowledge.status_changed', {
      source_id: id,
      previous_status: source?.status,
      new_status: status,
      evidence_id: evidenceId,
    });

    return data;
  }

  static async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('knowledge_sources')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }

  static async incrementVersion(id: string) {
    const { data: current } = await supabaseAdmin
      .from('knowledge_sources')
      .select('*')
      .eq('id', id)
      .single();

    const newVersion = (current?.version || 0) + 1;

    await supabaseAdmin
      .from('knowledge_source_versions')
      .insert({
        source_id: id,
        version: current?.version || 1,
        title: current?.title || '',
        content: current?.content || '',
        source_type: current?.source_type,
        source_url: current?.source_url,
        authority_level: current?.authority_level,
        sensitivity_level: current?.sensitivity_level,
        risk_tier: current?.risk_tier,
        jurisdiction: current?.jurisdiction,
        locale: current?.locale,
        product: current?.product,
        brand: current?.brand,
        channel: current?.channel,
        metadata: current?.metadata || {},
        status: current?.status,
        created_by: current?.updated_by || current?.created_by,
      });

    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return data;
  }

  static async getVersionHistory(sourceId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('knowledge_source_versions')
      .select('*')
      .eq('source_id', sourceId)
      .order('version', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async getVersionDiff(sourceId: string, versionA: number, versionB: number): Promise<{
    versionA: any;
    versionB: any;
    title_changed: boolean;
    content_changed: boolean;
    same: boolean;
  }> {
    const versions = await this.getVersionHistory(sourceId);
    const vA = versions.find((v: any) => v.version === versionA);
    const vB = versions.find((v: any) => v.version === versionB);

    if (!vA || !vB) {
      throw new Error(`Version ${!vA ? versionA : versionB} not found`);
    }

    return {
      versionA: vA,
      versionB: vB,
      title_changed: vA.title !== vB.title,
      content_changed: vA.content !== vB.content,
      same: vA.title === vB.title && vA.content === vB.content,
    };
  }

  static async rollbackToVersion(sourceId: string, targetVersion: number): Promise<any> {
    const versions = await this.getVersionHistory(sourceId);
    const target = versions.find((v: any) => v.version === targetVersion);
    if (!target) throw new Error(`Version ${targetVersion} not found`);

    const current = await this.getById(sourceId);

    await this.incrementVersion(sourceId);

    const { data, error } = await supabaseAdmin
      .from('knowledge_sources')
      .update({
        title: target.title,
        content: target.content,
        source_url: target.source_url || '',
        authority_level: target.authority_level,
        sensitivity_level: target.sensitivity_level,
        risk_tier: target.risk_tier,
        jurisdiction: target.jurisdiction,
        locale: target.locale,
        product: target.product,
        brand: target.brand,
        channel: target.channel,
        metadata: target.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceId)
      .select()
      .single();
    if (error) throw error;

    logger.info({ sourceId, fromVersion: current.version, toVersion: targetVersion }, 'Source rolled back');

    return data;
  }

  static async enforceMetadata(sourceId: string, requiredFields: string[]): Promise<{ valid: boolean; missing: string[] }> {
    const source = await this.getById(sourceId);
    if (!source) throw new Error('Source not found');

    const missing: string[] = [];
    for (const field of requiredFields) {
      const value = (source as any)[field];
      if (value === null || value === undefined || value === '') {
        missing.push(field);
      }
    }

    return { valid: missing.length === 0, missing };
  }

  static async recordRetrieval(id: string): Promise<void> {
    await supabaseAdmin
      .from('knowledge_sources')
      .update({
        last_retrieved_at: new Date().toISOString(),
        retrieval_count: supabaseAdmin.rpc('increment_int', { x: 1 }) as any,
      })
      .eq('id', id);
  }
}
