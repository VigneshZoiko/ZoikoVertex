import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const listAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .single();

    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });

    const { data: accounts, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('workspace_id', member.workspace_id)
      .order('platform', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: accounts || [] });
  } catch (error) {
    next(error);
  }
};
