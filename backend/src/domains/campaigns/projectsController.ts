import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

const STATUSES = ['DRAFT', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'] as const;

const CreateSchema = z.object({
  name:          z.string().min(2).max(200),
  description:   z.string().max(1000).optional(),
  campaign_id:   z.string().uuid().nullable().optional(),
  platforms:     z.array(z.string()).default([]),
  assigned_to:   z.string().uuid().nullable().optional(),
  due_date:      z.string().nullable().optional(),
  content_count: z.number().int().min(0).default(0),
});

const UpdateSchema = CreateSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
});

export const listProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    let query = supabaseAdmin
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const { status, campaign_id } = req.query;
    if (status && status !== 'ALL')   query = query.eq('status', String(status));
    if (campaign_id)                   query = query.eq('campaign_id', String(campaign_id));

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with campaign names
    const campaignIds = [...new Set((data || []).map((p: { campaign_id: string | null }) => p.campaign_id).filter(Boolean))];
    const campaignMap: Record<string, string> = {};

    if (campaignIds.length > 0) {
      const { data: camps } = await supabaseAdmin
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds as string[]);
      (camps || []).forEach((c: { id: string; name: string }) => { campaignMap[c.id] = c.name; });
    }

    // Enrich with assignee names
    const assigneeIds = [...new Set((data || []).map((p: { assigned_to: string | null }) => p.assigned_to).filter(Boolean))];
    const assigneeMap: Record<string, string> = {};

    if (assigneeIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .in('id', assigneeIds as string[]);
      (users || []).forEach((u: { id: string; full_name?: string; email?: string }) => {
        assigneeMap[u.id] = u.full_name || u.email || u.id;
      });
    }

    res.json({
      success: true,
      data: (data || []).map((p: Record<string, unknown>) => ({
        ...p,
        campaign_name: p.campaign_id ? (campaignMap[p.campaign_id as string] || null) : null,
        assignee_name: p.assigned_to ? (assigneeMap[p.assigned_to as string] || null) : null,
      })),
    });
  } catch (err) { next(err); }
};

export const getProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!userId)      return res.status(401).json({ error: 'Unauthorized' });
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({ ...parsed.data, workspace_id: workspaceId, created_by: userId })
      .select().single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select().single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};
