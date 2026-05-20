import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logger } from '../../shared/logger';
import { KnowledgeFileService } from './KnowledgeFileService';

export class KnowledgeController {
  
  /**
   * Helper to get orgId for the current user
   */
  private static async getUserOrgId(userId: string | undefined): Promise<string> {
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

  /**
   * List all knowledge bases for the user's organization
   */
  static async listBases(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id);
      
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

  /**
   * Create a new knowledge base
   */
  static async createBase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id);
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

  /**
   * List entries for a specific base
   */
  static async listEntries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { baseId } = req.params;
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id);

      // Verify base belongs to org
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

  /**
   * Create a new entry
   */
  static async createEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { baseId } = req.params;
      const { title, source_url, metadata } = req.body;
      let { content } = req.body;
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id);

      // Verify base belongs to org
      const { data: base } = await supabaseAdmin
        .from('knowledge_bases')
        .select('id')
        .eq('id', baseId)
        .eq('org_id', orgId)
        .single();

      if (!base) return res.status(404).json({ error: 'Knowledge base not found' });

      // If a file is uploaded, extract its content
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
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a base (and cascade delete entries)
   */
  static async deleteBase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { baseId } = req.params;
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id);

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

  /**
   * Delete an entry
   */
  static async deleteEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entryId } = req.params;
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id);

      // Join check to ensure entry's base belongs to org
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

  /**
   * Update an entry
   */
  static async updateEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entryId } = req.params;
      const { title, content, source_url } = req.body;
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id);

      // Join check to ensure entry's base belongs to org
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

  /**
   * ─── AI CONTEXT ENDPOINT ─────────────────────────────────────────────────────
   * Assembles a complete, structured knowledge context for the org's AI services.
   * Called internally by the intelligence controller before each generation run.
   * Returns brand voice, visual identity, SOPs, and AI library entries as one bundle.
   *
   * GET /api/v1/knowledge/ai-context
   * Query params:
   *   ?types=BRAND_GUIDELINES,SOP,AI_LIBRARY  (optional filter, defaults to all)
   *   ?limit=20 (per-base entry limit, default 20)
   */
  static async getAIContext(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = await KnowledgeController.getUserOrgId(req.user?.id);
      const requestedTypes = req.query.types
        ? String(req.query.types).split(',') as ('BRAND_GUIDELINES' | 'SOP' | 'AI_LIBRARY')[]
        : ['BRAND_GUIDELINES', 'SOP', 'AI_LIBRARY'];
      const entryLimit = Math.min(Number(req.query.limit) || 20, 50);

      // Fetch all relevant bases for this org
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

      // Fetch entries for all matched bases in one query
      const { data: entries, error: entriesErr } = await supabaseAdmin
        .from('knowledge_entries')
        .select('id, kb_id, title, content, metadata')
        .in('kb_id', baseIds)
        .order('created_at', { ascending: false })
        .limit(entryLimit * bases.length);

      if (entriesErr) throw entriesErr;

      // Build a lookup: baseId -> type
      const baseTypeMap: Record<string, string> = {};
      const baseNameMap: Record<string, string> = {};
      for (const b of (bases as any[])) {
        baseTypeMap[b.id] = b.type;
        baseNameMap[b.id] = b.name;
      }

      // Categorize entries
      const brandVoiceEntries: any[] = [];
      const brandVisual: Record<string, any> = {};
      const sopRules: any[] = [];
      const aiLibrary: any[] = [];

      for (const entry of (entries as any[])) {
        const type = baseTypeMap[entry.kb_id];
        const base = { base_name: baseNameMap[entry.kb_id] };

        switch (type) {
          case 'BRAND_GUIDELINES': {
            // Extract visual identity from metadata (stored by the brand form)
            const visual = entry.metadata?.visual_identity;
            if (visual) {
              // Merge all visual entries — last write wins per field
              Object.assign(brandVisual, {
                primary_color: visual.primary_color || brandVisual.primary_color,
                secondary_color: visual.secondary_color || brandVisual.secondary_color,
                font_family: visual.font_family || brandVisual.font_family,
                visual_style: visual.visual_style || brandVisual.visual_style,
              });
            }
            // The text content = brand voice/tone guidelines
            if (entry.content) {
              brandVoiceEntries.push({
                title: entry.title,
                guideline: entry.content,
                ...base,
              });
            }
            break;
          }
          case 'SOP': {
            sopRules.push({
              title: entry.title,
              rule: entry.content,
              ...base,
            });
            break;
          }
          case 'AI_LIBRARY': {
            aiLibrary.push({
              title: entry.title,
              content: entry.content,
              ...base,
            });
            break;
          }
        }
      }

      logger.info({ orgId, basesCount: bases.length, entriesCount: entries?.length }, '[Knowledge] AI context assembled');

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

  /**
   * ─── INTERNAL HELPER ─────────────────────────────────────────────────────────
   * Used by the intelligence controller server-side (no HTTP round trip).
   * Returns the same structured bundle without needing a request/response cycle.
   */
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
    for (const b of (bases as any[])) {
      baseTypeMap[b.id] = b.type;
      baseNameMap[b.id] = b.name;
    }

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
}
