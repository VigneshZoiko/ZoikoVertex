import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

const TYPES     = ['ORGANIC', 'PAID_ADS', 'EMAIL', 'MIXED'] as const;
const STATUSES  = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const;

const CreateSchema = z.object({
  name:              z.string().min(2).max(200),
  description:       z.string().max(1000).optional(),
  campaign_type:     z.enum(TYPES).default('ORGANIC'),
  objective:         z.string().min(2).max(500),
  platforms:         z.array(z.string()).default([]),
  budget_total:      z.number().positive().nullable().optional(),
  budget_daily:      z.number().positive().nullable().optional(),
  start_at:          z.string().nullable().optional(),
  end_at:            z.string().nullable().optional(),
  kpi_reach:         z.number().int().positive().nullable().optional(),
  kpi_engagement:    z.number().int().positive().nullable().optional(),
  kpi_conversions:   z.number().int().positive().nullable().optional(),
});

const UpdateSchema = CreateSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
});

export const listCampaigns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    let query = supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const { status } = req.query;
    if (status && status !== 'ALL') query = query.eq('status', String(status));

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with project counts
    const ids = (data || []).map(c => c.id);
    const counts: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: projectRows } = await supabaseAdmin
        .from('projects')
        .select('campaign_id')
        .in('campaign_id', ids);
      (projectRows || []).forEach((p: { campaign_id: string }) => {
        counts[p.campaign_id] = (counts[p.campaign_id] || 0) + 1;
      });
    }

    res.json({
      success: true,
      data: (data || []).map(c => ({ ...c, project_count: counts[c.id] || 0 })),
    });
  } catch (err) { next(err); }
};

export const getCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const createCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!userId)      return res.status(401).json({ error: 'Unauthorized' });
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const { data: ws } = await supabaseAdmin
      .from('workspaces').select('org_id').eq('id', workspaceId).single();
    if (!ws?.org_id) return res.status(400).json({ error: 'Organization not found' });

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({ ...parsed.data, workspace_id: workspaceId, org_id: ws.org_id, created_by: userId })
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select().single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) { next(err); }
};

export const getCampaignPosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    // Verify campaign belongs to this workspace
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (campErr || !campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .select('id, content, platform, status, media_urls, created_at, project_id, creator_id')
      .eq('campaign_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with project names
    const projectIds = [...new Set((data || []).map((p: { project_id: string | null }) => p.project_id).filter(Boolean))];
    const projectMap: Record<string, string> = {};
    if (projectIds.length > 0) {
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id, name')
        .in('id', projectIds as string[]);
      (projects || []).forEach((p: { id: string; name: string }) => { projectMap[p.id] = p.name; });
    }

    // Enrich with creator names
    const creatorIds = [...new Set((data || []).map((p: { creator_id: string | null }) => p.creator_id).filter(Boolean))];
    const creatorMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .in('id', creatorIds as string[]);
      (users || []).forEach((u: { id: string; full_name?: string; email?: string }) => {
        creatorMap[u.id] = u.full_name || u.email || u.id;
      });
    }

    res.json({
      success: true,
      data: (data || []).map((p: Record<string, unknown>) => ({
        ...p,
        project_name: p.project_id ? (projectMap[p.project_id as string] || null) : null,
        creator_name: p.creator_id ? (creatorMap[p.creator_id as string] || null) : null,
      })),
    });
  } catch (err) { next(err); }
};
