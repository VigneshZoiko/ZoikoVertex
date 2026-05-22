/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // Step 1: get workspace_members rows
    let memberQuery = supabaseAdmin
      .from('workspace_members')
      .select('id, role, user_id');

    if (!isSuperAdmin) {
      memberQuery = memberQuery.eq('workspace_id', workspaceId);
    }

    const { data: memberRows, error: memberErr } = await memberQuery;
    if (memberErr) throw memberErr;

    if (!memberRows || memberRows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Step 2: look up user profiles from the public users table
    const userIds = memberRows.map((m: any) => m.user_id).filter(Boolean);

    const { data: userRows } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds);

    const userMap = new Map((userRows || []).map((u: any) => [u.id, u]));

    // Step 3: merge — fall back to auth metadata for users not yet in public.users
    const formattedMembers = memberRows.map((m: any) => {
      const u = userMap.get(m.user_id);
      return {
        id: m.user_id,
        full_name: u?.full_name ?? null,
        email: u?.email ?? null,
        role: m.role,
      };
    });

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

export const deleteMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;
    const userId = String(req.params.id);

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    // Verify membership exists
    const memberQuery = supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId);

    if (workspaceId) memberQuery.eq('workspace_id', workspaceId);

    const { data: memberData, error: memberError } = await memberQuery.single();

    if (memberError || !memberData) {
      return res.status(404).json({ error: 'Member not found in workspace' });
    }

    const role = memberData.role || 'Member';

    // Fetch user details from public.users for historical name
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();

    const displayName = userData?.full_name || userData?.email?.split('@')[0] || userId;
    const historicalName = `${displayName} (ex-${role})`;

    // Mark deleted in public.users (may not exist for all users)
    await supabaseAdmin
      .from('users')
      .update({ full_name: historicalName, deleted_at: new Date().toISOString() })
      .eq('id', userId);

    const { error: removeError } = await supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId!);

    if (removeError) throw removeError;

    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch {
      // Ignore if user doesn't exist in auth
    }

    await logAuditEvent({
      workspaceId: workspaceId || '00000000-0000-0000-0000-000000000000',
      actorId,
      module: 'Team',
      action: `Deleted workspace member ${userData?.email || userId}`,
      metadata: { deleted_user_id: userId, historical_name: historicalName }
    });

    res.json({ success: true, message: 'Member account permanently deleted.' });
  } catch (error) {
    next(error);
  }
};
