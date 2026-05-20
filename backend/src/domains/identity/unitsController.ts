import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const listUnits = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    let query = supabaseAdmin
      .from('business_units')
      .select('id, name, description, color, created_at')
      .order('created_at', { ascending: true });

    if (!isSuperAdmin) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

export const createUnit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    const { name, description, color, target_workspace_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const finalWorkspaceId = isSuperAdmin ? (target_workspace_id || workspaceId) : workspaceId;
    if (!finalWorkspaceId) return res.status(400).json({ error: 'Workspace required' });

    const { data, error } = await supabaseAdmin
      .from('business_units')
      .insert({
        workspace_id: finalWorkspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        created_by: userId,
      })
      .select('id, name, description, color, created_at')
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteUnit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let query = supabaseAdmin
      .from('business_units')
      .delete()
      .eq('id', id);

    if (!isSuperAdmin) {
      if (!workspaceId) return res.status(403).json({ error: 'Workspace context missing' });
      query = query.eq('workspace_id', workspaceId);
    }

    const { error } = await query;
    if (error) throw error;

    res.json({ success: true, message: 'Business unit deleted.' });
  } catch (error) {
    next(error);
  }
};
