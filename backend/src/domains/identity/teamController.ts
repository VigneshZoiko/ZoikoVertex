import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const listMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .single();

    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });

    const { data: members, error } = await supabaseAdmin
      .from('workspace_members')
      .select('role, users ( full_name, email )')
      .eq('workspace_id', member.workspace_id);

    if (error) throw error;

    res.json({ success: true, data: members || [] });
  } catch (error) {
    next(error);
  }
};

export const listRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .single();

    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });
    if (member.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can view requests' });

    const { data: requests, error } = await supabaseAdmin
      .from('account_requests')
      .select('id, full_name, email, role, users!account_requests_requested_by_fkey ( full_name )')
      .eq('workspace_id', member.workspace_id)
      .eq('status', 'PENDING');

    if (error) throw error;

    res.json({ success: true, data: requests || [] });
  } catch (error) {
    next(error);
  }
};

export const createRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .single();

    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });

    const { full_name, email, role, temporary_password } = req.body;

    const { error } = await supabaseAdmin.from('account_requests').insert({
      workspace_id: member.workspace_id,
      requested_by: userId,
      full_name,
      email,
      role,
      temporary_password,
    });

    if (error) throw error;

    res.json({ success: true, message: 'Request submitted for approval.' });
  } catch (error) {
    next(error);
  }
};

export const updateRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!member || member.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can update requests' });

    const { error } = await supabaseAdmin
      .from('account_requests')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: `Request ${status.toLowerCase()}.` });
  } catch (error) {
    next(error);
  }
};
