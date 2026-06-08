import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const listAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.json({ success: true, data: [] });

    const { data: accounts, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('platform', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: accounts || [] });
  } catch (error) {
    next(error);
  }
};
