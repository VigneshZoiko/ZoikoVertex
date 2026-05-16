import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logAuditEvent } from '../governance/evidenceController';

export const listMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    let query = supabaseAdmin
      .from('workspace_members')
      .select(`
        id,
        user:users(id, full_name, email)
      `);

    if (!isSuperAdmin) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: members, error } = await query;
    if (error) throw error;

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

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    let query = supabaseAdmin
      .from('account_requests')
      .select('id, full_name, email, role, requested_by_user:users!account_requests_requested_by_fkey ( full_name )')
      .eq('status', 'PENDING');

    if (!isSuperAdmin) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: requests, error } = await query;
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

    const workspaceId = req.user?.workspace_id;
    if (!workspaceId && !req.user?.is_superadmin) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    const { full_name, email, role, temporary_password, target_workspace_id } = req.body;
    
    // Superadmins can specify a target workspace
    const finalWorkspaceId = req.user?.is_superadmin ? (target_workspace_id || workspaceId) : workspaceId;

    if (!finalWorkspaceId) return res.status(400).json({ error: 'Target workspace required' });

    const { error } = await supabaseAdmin.from('account_requests').insert({
      workspace_id: finalWorkspaceId,
      requested_by: userId,
      full_name,
      email,
      role,
      temporary_password,
    });

    if (error) throw error;
    
    await logAuditEvent({
      workspaceId: finalWorkspaceId,
      actorId: userId,
      module: 'Team',
      action: `Created account request for ${email}`,
      metadata: { full_name, email, role }
    });

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

    // Superadmins bypass role check
    if (!req.user?.is_superadmin) {
      // For standard users, we'd check their role in the workspace, 
      // but requireRole middleware should have already gated this.
    }

    const { error } = await supabaseAdmin
      .from('account_requests')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      workspaceId: req.user?.workspace_id || '00000000-0000-0000-0000-000000000000',
      actorId: userId,
      module: 'Team',
      action: `Updated account request ${id} to ${status}`,
      metadata: { request_id: id, status }
    });

    res.json({ success: true, message: `Request ${status.toLowerCase()}.` });
  } catch (error) {
    next(error);
  }
};
