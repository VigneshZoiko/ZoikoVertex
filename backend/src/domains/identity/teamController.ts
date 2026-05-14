import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const listMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Find the current user's workspace context
    const { data: member } = await supabaseAdmin
      .from('memberships')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });

    // 2. Fetch all members of that workspace from domain_users
    const { data: members, error } = await supabaseAdmin
      .from('memberships')
      .select(`
        id,
        user:domain_users(id, full_name, email)
      `)
      .eq('workspace_id', member.workspace_id);

    if (error) throw error;

    // 3. Format for the frontend (extracting user info)
    const formattedMembers = (members || []).map(m => m.user);

    res.json({ success: true, data: formattedMembers });
  } catch (error) {
    next(error);
  }
};

export const listRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('memberships')
      .select('workspace_id, role:roles(name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });
    
    // @ts-expect-error nested role join type not inferred by supabase client
    if (member.role?.name !== 'ADMIN') return res.status(403).json({ error: 'Only admins can view requests' });

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
      .from('memberships')
      .select('workspace_id, role_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

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
      .from('memberships')
      .select('workspace_id, role:roles(name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    // @ts-expect-error nested role join type not inferred by supabase client
    const isAdmin = member?.role?.name === 'ADMIN';

    if (!isAdmin) return res.status(403).json({ error: 'Only admins can update requests' });

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
