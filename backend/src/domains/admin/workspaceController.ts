import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

const UpdateSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

export const getWorkspaceSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, org_id, created_at, organizations(name, status, plan_type)')
      .eq('id', workspaceId)
      .single();

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const [{ count: memberCount }, { count: accountCount }] = await Promise.all([
      supabaseAdmin.from('workspace_members').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabaseAdmin.from('connected_accounts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'active'),
    ]);

    const org = Array.isArray(workspace.organizations) ? workspace.organizations[0] : workspace.organizations as Record<string, string> | null;

    res.json({
      success: true,
      data: {
        id:           workspace.id,
        name:         workspace.name,
        org_id:       workspace.org_id,
        org_name:     org?.name || null,
        plan_type:    org?.plan_type || 'FREE',
        org_status:   org?.status || 'ACTIVE',
        created_at:   workspace.created_at,
        member_count: memberCount ?? 0,
        account_count: accountCount ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspaceSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = UpdateSettingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    if (!parsed.data.name) return res.status(400).json({ error: 'Nothing to update' });

    const { error } = await supabaseAdmin
      .from('workspaces')
      .update({ name: parsed.data.name })
      .eq('id', workspaceId);

    if (error) throw error;

    res.json({ success: true, message: 'Workspace name updated' });
  } catch (error) {
    next(error);
  }
};

export const exportWorkspaceData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const [membersRes, accountsRes, auditRes] = await Promise.all([
      supabaseAdmin.from('workspace_members').select('user_id, role, created_at').eq('workspace_id', workspaceId),
      supabaseAdmin.from('connected_accounts').select('platform, account_name, account_handle, status, created_at').eq('workspace_id', workspaceId),
      supabaseAdmin.from('audit_events').select('action, actor_id, object_type, created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1000),
    ]);

    res.json({
      success: true,
      data: {
        exported_at:        new Date().toISOString(),
        workspace_id:       workspaceId,
        members:            membersRes.data || [],
        connected_accounts: accountsRes.data || [],
        audit_trail:        auditRes.data || [],
      },
    });
  } catch (error) {
    next(error);
  }
};
