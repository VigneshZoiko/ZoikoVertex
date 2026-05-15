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
