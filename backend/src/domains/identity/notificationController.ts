import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

/**
 * GET /api/v1/notifications
 * List notifications for the authenticated user
 */
export const listNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // If table doesn't exist yet, return empty array to avoid crashing
      if (error.code === '42P01') {
        return res.status(200).json({ success: true, data: [] });
      }
      throw error;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a specific notification as read
 */
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/notifications/mark-all-read
 * Mark all notifications as read for the user
 */
export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/notifications
 * Clear all notifications for the user
 */
export const clearNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/admin/workspace
 * List all notifications for users in the caller's workspace (admin only)
 */
export const listWorkspaceNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get all user IDs in this workspace
    const { data: members, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId);

    if (memberError) throw memberError;

    const userIds = (members || []).map(m => m.user_id);
    if (userIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (error.code === '42P01') {
        return res.status(200).json({ success: true, data: [] });
      }
      throw error;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/admin/summary
 * Returns notification counts grouped by type for the current user
 */
export const getNotificationSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('type, read')
      .eq('user_id', userId);

    if (error) {
      if (error.code === '42P01') {
        return res.status(200).json({ success: true, data: { total: 0, unread: 0, byType: {} } });
      }
      throw error;
    }

    const total = data?.length || 0;
    const unread = data?.filter(n => !n.read).length || 0;
    const byType: Record<string, number> = {};
    for (const n of data || []) {
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    res.status(200).json({ success: true, data: { total, unread, byType } });
  } catch (error) {
    next(error);
  }
};
