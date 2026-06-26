import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DraftPayload {
  title?: string;
  topic?: string;
  content_type?: string;
  universal_caption?: string;
  platform_captions?: Record<string, string>;
  media_urls?: string[];
  media_type?: string;
  target_account_ids?: string[];
  platform_post_types?: Record<string, string[]>;
  ai_tone?: string;
  ai_length?: string;
  ai_style?: string;
  ai_audience?: string;
  use_emojis?: boolean;
  metrics?: { viral_score?: number; sentiment_score?: number } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWorkspaceId(req: AuthRequest): string {
  if (!req.user?.workspace_id) {
    throw Object.assign(new Error('Workspace ID is required'), { statusCode: 400 });
  }
  return req.user.workspace_id;
}

function getUserId(req: AuthRequest): string {
  if (!req.user?.id) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return req.user.id;
}

function hasOversightRole(role?: string): boolean {
  return !!(role && ['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'].includes(role.toUpperCase()));
}

// ─── List drafts ───────────────────────────────────────────────────────────

export async function listDrafts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const userRole = req.user?.role || '';
    const { status, limit, offset } = req.query as Record<string, string>;
    const hasOversight = hasOversightRole(userRole);

    let query = supabaseAdmin
      .from('publish_drafts')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId);

    // Privacy: non-admin users only see their own drafts
    if (!hasOversight) {
      query = query.eq('creator_id', userId);
    }

    // Optional status filter
    if (status && ['ACTIVE', 'ARCHIVED', 'CONVERTED'].includes(status.toUpperCase())) {
      query = query.eq('status', status.toUpperCase());
    }

    // Order by most recently updated
    query = query.order('updated_at', { ascending: false });

    // Pagination
    const limitNum = Math.min(parseInt(limit || '50', 10) || 50, 100);
    const offsetNum = parseInt(offset || '0', 10) || 0;
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.set('Cache-Control', 'private, max-age=10');
    res.json({
      success: true,
      data: data || [],
      count: count || 0,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get single draft ──────────────────────────────────────────────────────

export async function getDraft(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const userRole = req.user?.role || '';
    const hasOversight = hasOversightRole(userRole);

    let query = supabaseAdmin
      .from('publish_drafts')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    // Privacy filter
    if (!hasOversight) {
      query = query.eq('creator_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Draft not found' });
      }
      throw error;
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─── Create / Save draft ───────────────────────────────────────────────────

export async function saveDraft(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const {
      title = '',
      topic = '',
      content_type = 'Entertainment',
      universal_caption = '',
      platform_captions = {},
      media_urls = [],
      media_type = null,
      target_account_ids = [],
      platform_post_types = {},
      ai_tone = 'professional',
      ai_length = 'medium',
      ai_style = '',
      ai_audience = 'General',
      use_emojis = true,
      metrics = null,
    } = req.body as DraftPayload;

    // Validate required fields (at minimum, need some content to save)
    const hasContent = universal_caption.trim().length > 0
      || Object.values(platform_captions).some(v => v.trim().length > 0)
      || media_urls.length > 0
      || topic.trim().length > 0;

    if (!hasContent) {
      return res.status(400).json({
        success: false,
        error: 'Cannot save an empty draft. Add some content first.',
      });
    }

    // Determine org_id from workspace
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('org_id')
      .eq('id', workspaceId)
      .single();

    const draftRecord = {
      workspace_id: workspaceId,
      creator_id: userId,
      org_id: workspace?.org_id || null,
      title: title.trim(),
      topic: topic.trim(),
      content_type,
      universal_caption,
      platform_captions,
      media_urls,
      media_type: media_type || (media_urls.length > 0 ? 'image' : null),
      target_account_ids,
      platform_post_types,
      status: 'ACTIVE',
      ai_tone,
      ai_length,
      ai_style,
      ai_audience,
      use_emojis,
      metrics,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('publish_drafts')
      .insert(draftRecord)
      .select()
      .single();

    if (error) throw error;

    logger.info({ draftId: data.id, userId }, 'Draft saved');

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─── Update draft ──────────────────────────────────────────────────────────

export async function updateDraft(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    // Verify ownership first
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('publish_drafts')
      .select('id, creator_id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }

    // Only creator or oversight can update
    const userRole = req.user?.role || '';
    if (existing.creator_id !== userId && !hasOversightRole(userRole)) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this draft' });
    }

    const allowedFields = [
      'title', 'topic', 'content_type', 'universal_caption', 'platform_captions',
      'media_urls', 'media_type', 'target_account_ids', 'platform_post_types',
      'ai_tone', 'ai_length', 'ai_style', 'ai_audience', 'use_emojis', 'metrics', 'status',
    ];

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const { data, error } = await supabaseAdmin
      .from('publish_drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info({ draftId: id, userId }, 'Draft updated');
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─── Delete draft (soft-delete via status) ─────────────────────────────────

export async function deleteDraft(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('publish_drafts')
      .select('id, creator_id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }

    const userRole = req.user?.role || '';
    if (existing.creator_id !== userId && !hasOversightRole(userRole)) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this draft' });
    }

    // Soft delete: set status to ARCHIVED
    const { error } = await supabaseAdmin
      .from('publish_drafts')
      .update({ status: 'ARCHIVED', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    logger.info({ draftId: id, userId }, 'Draft archived');
    res.json({ success: true, message: 'Draft archived' });
  } catch (err) {
    next(err);
  }
}

// ─── Get draft count (for sidebar badge) ───────────────────────────────────

export async function getDraftCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const userRole = req.user?.role || '';
    const hasOversight = hasOversightRole(userRole);

    let query = supabaseAdmin
      .from('publish_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'ACTIVE');

    if (!hasOversight) {
      query = query.eq('creator_id', userId);
    }

    const { count, error } = await query;

    if (error) throw error;

    res.json({ success: true, count: count || 0 });
  } catch (err) {
    next(err);
  }
}
