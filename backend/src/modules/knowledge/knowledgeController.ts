/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { KnowledgeFileService } from './KnowledgeFileService';
import { KnowledgeCollectionService } from './KnowledgeCollectionService';
import { KnowledgeSourceService } from './KnowledgeSourceService';
import { KnowledgeChunkService } from './KnowledgeChunkService';
import { KnowledgeReviewService } from './KnowledgeReviewService';
import { KnowledgeConflictService } from './KnowledgeConflictService';
import { KnowledgeRetrievalService } from './KnowledgeRetrievalService';
import { KnowledgeAccessService } from './KnowledgeAccessService';
import { getParam, getQueryNumber, getQueryValue } from '../../shared/request';
import { trackUsage } from '../../domains/monitoring/usageController';

export class KnowledgeController {

  private static async getUserOrgId(userId: string | undefined, workspaceId?: string | null): Promise<string> {
    // API key auth path — resolve org from workspace_id
    if (workspaceId) {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('org_id')
        .eq('id', workspaceId)
        .single();
      if (ws?.org_id) return ws.org_id;
    }
    // JWT auth path — look up from workspace_members
    if (!userId) {
      throw new Error('Unauthorized: User ID is missing');
    }
    const { data: member, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select('workspaces(org_id)')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !member) throw new Error('User organization not found');
    return (member.workspaces as any)?.org_id;
  }

  private static async getWorkspaceId(userId: string | undefined, workspaceIdFromAuth?: string | null): Promise<string> {
    // API key auth path — workspace_id is already populated
    if (workspaceIdFromAuth) return workspaceIdFromAuth;
    // JWT auth path — look up from workspace_members
    if (!userId) throw new Error('Unauthorized');
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!member) throw new Error('Workspace not found');
    return member.workspace_id;
  }

  // ─── Legacy Endpoints (preserved for backward compat) ─────────────────────

  static async listBases(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id, req.user?.workspace_id);
      const { data, error } = await supabaseAdmin
        .from('knowledge_bases')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createBase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id, req.user?.workspace_id);
      const { name, description, type } = req.body;
      const { data, error } = await supabaseAdmin
        .from('knowledge_bases')
        .insert([{ org_id: orgId, name, description, type }])
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listEntries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const baseId = getParam(req, 'baseId');
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id, req.user?.workspace_id);
      const { data: base } = await supabaseAdmin
        .from('knowledge_bases')
        .select('id')
        .eq('id', baseId)
        .eq('org_id', orgId)
        .single();
      if (!base) return res.status(404).json({ error: 'Knowledge base not found' });
      const { data, error } = await supabaseAdmin
        .from('knowledge_entries')
        .select('*')
        .eq('kb_id', baseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const baseId = getParam(req, 'baseId');
      const { title, source_url, metadata } = req.body;
      let { content } = req.body;
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id, req.user?.workspace_id);

      // ── FIX: the frontend creates collections via POST /knowledge/collections
      //    which writes to `knowledge_collections`. Legacy entries endpoint
      //    looked only at `knowledge_bases`, returning 404 for every new
      //    collection. Look in both tables (collections is the canonical home
      //    going forward; knowledge_bases is the legacy fallback).
      const { data: collection } = await supabaseAdmin
        .from('knowledge_collections')
        .select('id, workspace_id')
        .eq('id', baseId)
        .maybeSingle();

      let base: { id: string } | null = collection ? { id: collection.id } : null;
      if (!base) {
        const { data: legacyBase } = await supabaseAdmin
          .from('knowledge_bases')
          .select('id')
          .eq('id', baseId)
          .eq('org_id', orgId)
          .maybeSingle();
        base = legacyBase || null;
      }
      if (!base) return res.status(404).json({ error: 'Knowledge base not found' });
      if (req.file) {
        content = await KnowledgeFileService.extractText(req.file.path, req.file.mimetype);
      }
      const { data, error } = await supabaseAdmin
        .from('knowledge_entries')
        .insert([{
          kb_id: baseId,
          title: title || (req.file ? req.file.originalname : 'Untitled'),
          content,
          source_url,
          metadata: {
            ...(metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : {}),
            original_filename: req.file?.originalname,
            file_size: req.file?.size,
            mime_type: req.file?.mimetype
          }
        }])
        .select()
        .single();
      if (error) throw error;

      // Track storage usage (non-blocking)
      if (req.file?.size && req.user?.workspace_id) {
        const sizeMb = req.file.size / (1024 * 1024);
        trackUsage({
          workspaceId: req.user.workspace_id,
          resourceType: 'STORAGE_MB',
          quantity: sizeMb,
          unit: 'MB',
          referenceId: data?.id,
          referenceType: 'knowledge_entry',
          metadata: { filename: req.file.originalname, mime_type: req.file.mimetype },
        });
      }

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const baseId = getParam(req, 'baseId');
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id, req.user?.workspace_id);
      const { error } = await supabaseAdmin
        .from('knowledge_bases')
        .delete()
        .eq('id', baseId)
        .eq('org_id', orgId);
      if (error) throw error;
      res.json({ success: true, message: 'Knowledge base deleted' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const entryId = getParam(req, 'entryId');
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id, req.user?.workspace_id);
      const { data: entry } = await supabaseAdmin
        .from('knowledge_entries')
        .select('id, knowledge_bases!inner(org_id)')
        .eq('id', entryId)
        .eq('knowledge_bases.org_id', orgId)
        .single();
      if (!entry) return res.status(404).json({ error: 'Entry not found' });
      const { error } = await supabaseAdmin
        .from('knowledge_entries')
        .delete()
        .eq('id', entryId);
      if (error) throw error;
      res.json({ success: true, message: 'Knowledge entry deleted' });
    } catch (error) {
      next(error);
    }
  }

  static async updateEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entryId } = req.params;
      const { title, content, source_url } = req.body;
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id, req.user?.workspace_id);

      const { data: entry } = await supabaseAdmin
        .from('knowledge_entries')
        .select('id, knowledge_bases!inner(org_id)')
        .eq('id', entryId)
        .eq('knowledge_bases.org_id', orgId)
        .single();

      if (!entry) return res.status(404).json({ error: 'Entry not found' });

      const { data, error } = await supabaseAdmin
        .from('knowledge_entries')
        .update({ title, content, source_url, updated_at: new Date().toISOString() })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }


  static async getAIContext(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id, req.user?.workspace_id);
      const typesValue = getQueryValue(req, 'types');
      const requestedTypes = typesValue
        ? typesValue.split(',') as ('BRAND_GUIDELINES' | 'SOP' | 'AI_LIBRARY')[]
        : ['BRAND_GUIDELINES', 'SOP', 'AI_LIBRARY'];
      const entryLimit = Math.min(getQueryNumber(req, 'limit', 20), 50);

      const { data: bases, error: basesErr } = await supabaseAdmin
        .from('knowledge_bases')
        .select('id, name, type')
        .eq('org_id', orgId)
        .in('type', requestedTypes);
      if (basesErr) throw basesErr;
      if (!bases || bases.length === 0) {
        return res.json({ success: true, data: { brand_voice: null, brand_visual: null, sop_rules: [], ai_library: [] } });
      }

      const baseIds = bases.map((b: any) => b.id);
      const { data: entries, error: entriesErr } = await supabaseAdmin
        .from('knowledge_entries')
        .select('id, kb_id, title, content, metadata')
        .in('kb_id', baseIds)
        .order('created_at', { ascending: false })
        .limit(entryLimit * bases.length);
      if (entriesErr) throw entriesErr;

      const baseTypeMap: Record<string, string> = {};
      const baseNameMap: Record<string, string> = {};
      for (const b of (bases as any[])) {
        baseTypeMap[b.id] = b.type;
        baseNameMap[b.id] = b.name;
      }

      const brandVoiceEntries: any[] = [];
      const brandVisual: Record<string, any> = {};
      const sopRules: any[] = [];
      const aiLibrary: any[] = [];

      for (const entry of (entries as any[])) {
        const type = baseTypeMap[entry.kb_id];
        const base = { base_name: baseNameMap[entry.kb_id] };
        switch (type) {
          case 'BRAND_GUIDELINES': {
            const visual = entry.metadata?.visual_identity;
            if (visual) {
              Object.assign(brandVisual, {
                primary_color: visual.primary_color || brandVisual.primary_color,
                secondary_color: visual.secondary_color || brandVisual.secondary_color,
                font_family: visual.font_family || brandVisual.font_family,
                visual_style: visual.visual_style || brandVisual.visual_style,
              });
            }
            if (entry.content) brandVoiceEntries.push({ title: entry.title, guideline: entry.content, ...base });
            break;
          }
          case 'SOP': sopRules.push({ title: entry.title, rule: entry.content, ...base }); break;
          case 'AI_LIBRARY': aiLibrary.push({ title: entry.title, content: entry.content, ...base }); break;
        }
      }

      res.json({
        success: true,
        data: {
          brand_voice: brandVoiceEntries.length > 0 ? brandVoiceEntries : null,
          brand_visual: Object.keys(brandVisual).length > 0 ? brandVisual : null,
          sop_rules: sopRules,
          ai_library: aiLibrary,
          meta: {
            org_id: orgId,
            bases_loaded: bases.length,
            entries_loaded: entries?.length ?? 0,
            generated_at: new Date().toISOString(),
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async buildAIContextForOrg(orgId: string): Promise<{
    brand_voice: any[] | null;
    brand_visual: Record<string, any> | null;
    sop_rules: any[];
    ai_library: any[];
  }> {
    const { data: bases } = await supabaseAdmin
      .from('knowledge_bases')
      .select('id, name, type')
      .eq('org_id', orgId);
    if (!bases || bases.length === 0) {
      return { brand_voice: null, brand_visual: null, sop_rules: [], ai_library: [] };
    }
    const baseIds = bases.map((b: any) => b.id);
    const { data: entries } = await supabaseAdmin
      .from('knowledge_entries')
      .select('id, kb_id, title, content, metadata')
      .in('kb_id', baseIds)
      .order('created_at', { ascending: false })
      .limit(60);
    const baseTypeMap: Record<string, string> = {};
    const baseNameMap: Record<string, string> = {};
    for (const b of (bases as any[])) { baseTypeMap[b.id] = b.type; baseNameMap[b.id] = b.name; }
    const brandVoiceEntries: any[] = [];
    const brandVisual: Record<string, any> = {};
    const sopRules: any[] = [];
    const aiLibrary: any[] = [];
    for (const entry of (entries || []) as any[]) {
      const type = baseTypeMap[entry.kb_id];
      switch (type) {
        case 'BRAND_GUIDELINES': {
          const visual = entry.metadata?.visual_identity;
          if (visual) Object.assign(brandVisual, visual);
          if (entry.content) brandVoiceEntries.push({ title: entry.title, guideline: entry.content });
          break;
        }
        case 'SOP': sopRules.push({ title: entry.title, rule: entry.content }); break;
        case 'AI_LIBRARY': aiLibrary.push({ title: entry.title, content: entry.content }); break;
      }
    }
    return {
      brand_voice: brandVoiceEntries.length > 0 ? brandVoiceEntries : null,
      brand_visual: Object.keys(brandVisual).length > 0 ? brandVisual : null,
      sop_rules: sopRules,
      ai_library: aiLibrary,
    };
  }

  // ─── New Governed Endpoints (aligned to knowledge_base_guide.md) ──────────

  // Collections
  static async listCollections(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await KnowledgeController.getWorkspaceId(req.user?.id, req.user?.workspace_id);
      const collections = await KnowledgeCollectionService.list(workspaceId);
      res.json({ success: true, data: collections });
    } catch (error) {
      next(error);
    }
  }

  static async getCollection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeCollectionService.getById(getParam(req, 'id'));
      if (!data) return res.status(404).json({ error: 'Collection not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createCollection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await KnowledgeController.getWorkspaceId(req.user?.id, req.user?.workspace_id);
      const data = await KnowledgeCollectionService.create({
        ...req.body,
        workspace_id: workspaceId,
        owner_id: req.user?.id,
        owner_name: req.user?.email || req.user?.id,
        created_by: req.user?.id,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async updateCollection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeCollectionService.update(getParam(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCollection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await KnowledgeCollectionService.delete(getParam(req, 'id'));
      res.json({ success: true, message: 'Collection deleted' });
    } catch (error) {
      next(error);
    }
  }

  // Sources
  static async listSources(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await KnowledgeController.getWorkspaceId(req.user?.id, req.user?.workspace_id);
      const data = await KnowledgeSourceService.listAll(workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeSourceService.getById(getParam(req, 'id'));
      if (!data) return res.status(404).json({ error: 'Source not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await KnowledgeController.getWorkspaceId(req.user?.id, req.user?.workspace_id);
      let content = req.body.content || '';
      let metadata = req.body.metadata ? (typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata) : {};

      if (req.file) {
        content = await KnowledgeFileService.extractText(req.file.path, req.file.mimetype);
        metadata = {
          ...metadata,
          original_filename: req.file.originalname,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
        };
      }

      const data = await KnowledgeSourceService.create({
        collection_id: getParam(req, 'collectionId'),
        title: req.body.title || (req.file ? req.file.originalname : 'Untitled'),
        content,
        source_url: req.body.source_url || '',
        source_type: req.body.source_type || (req.file ? req.file.mimetype?.split('/')[1]?.toUpperCase() : 'MANUAL_ARTICLE'),
        owner_id: workspaceId,
        owner_name: req.user?.email || req.user?.id,
        authority_level: req.body.authority_level || 'DRAFT_INTERNAL',
        sensitivity_level: req.body.sensitivity_level || 'INTERNAL',
        risk_tier: req.body.risk_tier || 'MEDIUM',
        retrieval_policy: req.body.retrieval_policy || 'ALLOWED',
        locale: req.body.locale || '',
        jurisdiction: req.body.jurisdiction || '',
        product: req.body.product || '',
        brand: req.body.brand || '',
        channel: req.body.channel || '',
        review_date: req.body.review_date || null,
        expiry_date: req.body.expiry_date || null,
        metadata,
        created_by: req.user?.id,
      });

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async updateSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeSourceService.update(getParam(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async approveSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sourceId = getParam(req, 'id');
      const source = await KnowledgeSourceService.getById(sourceId);
      if (!source) return res.status(404).json({ error: 'Source not found' });

      const updated = await KnowledgeSourceService.updateStatus(sourceId, 'APPROVED');

      await KnowledgeReviewService.create({
        source_id: sourceId,
        reviewer_id: req.user?.id || '',
        review_type: 'APPROVAL',
        decision: 'APPROVED',
        comments: req.body.comments || '',
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async rejectSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sourceId = getParam(req, 'id');
      const source = await KnowledgeSourceService.getById(sourceId);
      if (!source) return res.status(404).json({ error: 'Source not found' });

      const updated = await KnowledgeSourceService.updateStatus(sourceId, 'REJECTED');

      await KnowledgeReviewService.create({
        source_id: sourceId,
        reviewer_id: req.user?.id || '',
        review_type: 'APPROVAL',
        decision: 'REJECTED',
        comments: req.body.comments || '',
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async retireSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sourceId = getParam(req, 'id');
      const updated = await KnowledgeSourceService.updateStatus(sourceId, 'RETIRED');
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async activateSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sourceId = getParam(req, 'id');
      const updated = await KnowledgeSourceService.updateStatus(sourceId, 'ACTIVE');
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async publishSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sourceId = getParam(req, 'id');
      const updated = await KnowledgeSourceService.updateStatus(sourceId, 'ACTIVE');
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async restrictSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sourceId = getParam(req, 'id');
      const updated = await KnowledgeSourceService.updateStatus(sourceId, 'RESTRICTED');
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async quarantineSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sourceId = getParam(req, 'id');
      const updated = await KnowledgeSourceService.updateStatus(sourceId, 'QUARANTINED');
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await KnowledgeSourceService.delete(getParam(req, 'id'));
      res.json({ success: true, message: 'Source deleted' });
    } catch (error) {
      next(error);
    }
  }

  // Stats
  static async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await KnowledgeController.getWorkspaceId(req.user?.id, req.user?.workspace_id);
      const stats = await KnowledgeCollectionService.getStats(workspaceId);

      const conflictCount = await KnowledgeConflictService.getCount();
      stats.conflict_flags = conflictCount;

      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // Conflicts
  static async listConflicts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeConflictService.list({
        status: getQueryValue(req, 'status'),
        severity: getQueryValue(req, 'severity'),
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getConflict(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeConflictService.getById(getParam(req, 'id'));
      if (!data) return res.status(404).json({ error: 'Conflict not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async resolveConflict(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeConflictService.resolve(getParam(req, 'id'), req.body.resolution || 'Resolved by user');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createConflict(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeConflictService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Retrieval Logs
  static async listRetrievalLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeRetrievalService.listLogs({
        agent_id: getQueryValue(req, 'agent_id'),
        agent_name: getQueryValue(req, 'agent_name'),
        limit: getQueryNumber(req, 'limit', 50),
        offset: getQueryNumber(req, 'offset', 0),
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async logRetrievalEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeRetrievalService.logEvent(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Reviews
  static async listReviews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeReviewService.list({
        source_id: getQueryValue(req, 'source_id'),
        reviewer_id: getQueryValue(req, 'reviewer_id'),
        decision: getQueryValue(req, 'decision'),
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Chunks
  static async listChunks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeChunkService.listBySource(getParam(req, 'sourceId'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Search
  static async searchSources(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = getQueryValue(req, 'q');
      if (!query) return res.status(400).json({ error: 'Search query is required' });
      const data = await KnowledgeRetrievalService.searchSources(query, getQueryValue(req, 'collection_id'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Access Policy
  static async getAccessPolicy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeAccessService.getPolicy(getQueryValue(req, 'collection_id'), getQueryValue(req, 'source_id'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async upsertAccessPolicy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await KnowledgeAccessService.upsert(req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
