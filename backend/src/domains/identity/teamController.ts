 
import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logAuditEvent } from '../governance/evidenceController';
import { createAuditEvent } from '../../services/auditTrail.service';
import { syncActorAfterRoleChange } from '../../services/identityLedger.service';
import { preserveEvidence } from '../../services/evidenceVault.service';

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

    // Step 3: merge — only include members that have a user record
    const formattedMembers = memberRows
      .filter((m: any) => userMap.has(m.user_id))
      .map((m: any) => {
        const u = userMap.get(m.user_id);
        return {
          id: m.user_id,
          workspace_member_id: m.id,
          full_name: u.full_name ?? u.email?.split('@')[0] ?? 'Unknown',
          email: u.email,
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
      .select('id, full_name, email, role, requested_by')
      .eq('status', 'PENDING');

    if (!isSuperAdmin) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: rawRequests, error } = await query;
    if (error) throw error;

    const requests = rawRequests || [];
    const requestedByUserIds = [...new Set(requests.map((r: any) => r.requested_by).filter(Boolean))];
    const userMap = new Map<string, string>();

    if (requestedByUserIds.length > 0) {
      try {
        const { data: usersData } = await supabaseAdmin
          .from('users')
          .select('id, full_name')
          .in('id', requestedByUserIds);
        if (usersData) {
          usersData.forEach((u: any) => {
            userMap.set(u.id, u.full_name);
          });
        }
      } catch {
        // ignore
      }
    }

    const formattedRequests = requests.map((r: any) => ({
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      role: r.role,
      requested_by_user: r.requested_by ? { full_name: userMap.get(r.requested_by) || null } : null,
    }));

    res.json({ success: true, data: formattedRequests });

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

    const reqWsId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    await logAuditEvent({
      workspaceId: reqWsId,
      actorId: userId,
      module: 'Team',
      action: `Updated account request ${id} to ${status}`,
      metadata: { request_id: id, status }
    });
    createAuditEvent({
      workspace_id: reqWsId,
      event_category: 'user_identity',
      event_type: status === 'APPROVED' ? 'member_added' : 'member_request_rejected',
      event_title: status === 'APPROVED' ? 'Member Added' : 'Member Request Rejected',
      event_summary: `Account request ${id} ${status.toLowerCase()}`,
      actor: { actor_id: userId, actor_type: 'human_user' },
      object: { object_type: 'account_request', object_id: String(id) },
      risk_level: 'medium',
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'STANDARD',
      correlation: {},
    }).catch(() => {});

    res.json({ success: true, message: `Request ${status.toLowerCase()}.` });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    const { id: userId } = req.params;
    const { role } = req.body;

    if (!role) return res.status(400).json({ error: 'Role is required' });

    if (userId === actorId) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    let memberQuery = supabaseAdmin
      .from('workspace_members')
      .select('role, workspace_id')
      .eq('user_id', userId);

    if (!isSuperAdmin) memberQuery = memberQuery.eq('workspace_id', workspaceId || '');

    const { data: memberData, error: memberError } = await memberQuery.maybeSingle();

    if (memberError || !memberData) {
      return res.status(404).json({ error: 'Member not found in workspace' });
    }

    if (memberData.role === 'WORKSPACE_OWNER') {
      return res.status(400).json({ error: 'Cannot change the role of a Workspace Owner' });
    }

    // WORKSPACE_OWNER is always superadmin-only
    if (!isSuperAdmin && role === 'WORKSPACE_OWNER') {
      return res.status(403).json({ error: 'Forbidden: Cannot assign WORKSPACE_OWNER role' });
    }

    // Max-1 ADMIN rule: only one Admin per workspace.
    // Skip the count if the member is already ADMIN (no-op change).
    if (role === 'ADMIN' && memberData.role !== 'ADMIN') {
      const targetWsId = workspaceId || (memberData as any).workspace_id;
      const { count: adminCount } = await supabaseAdmin
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', targetWsId)
        .eq('role', 'ADMIN');
      if ((adminCount ?? 0) >= 1) {
        return res.status(409).json({
          error: 'Only one Admin is allowed per workspace. Remove the existing Admin first.',
        });
      }
    }

    let updateQuery = supabaseAdmin
      .from('workspace_members')
      .update({ role })
      .eq('user_id', userId);

    if (!isSuperAdmin) updateQuery = updateQuery.eq('workspace_id', workspaceId || '');

    const { error: updateError } = await updateQuery;
    if (updateError) throw updateError;

    const effectiveWsId = workspaceId || (memberData as any).workspace_id;
    await logAuditEvent({
      workspaceId: effectiveWsId,
      actorId,
      module: 'Team',
      action: `Changed role of user ${userId} from ${memberData.role} to ${role}`,
      metadata: { user_id: userId, old_role: memberData.role, new_role: role }
    });
    createAuditEvent({
      workspace_id: effectiveWsId,
      event_category: 'user_identity',
      event_type: 'user.role_changed',
      event_title: 'Member Role Changed',
      event_summary: `Role changed from ${memberData.role} to ${role} for user ${userId}`,
      actor: { actor_id: actorId, actor_type: 'human_user' },
      object: { object_type: 'workspace_member', object_id: String(userId) },
      change: { field_changed: 'role', previous_value: memberData.role, new_value: role },
      risk_level: 'medium',
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'STANDARD',
      correlation: {},
    }).catch(() => {});

    // Sync Identity Ledger so the new role is immediately reflected
    syncActorAfterRoleChange({
      workspace_id: effectiveWsId,
      user_id: String(userId),
      new_role: role,
    }).catch(() => {});

    // Preserve evidence of role change in Evidence Vault
    const payload = JSON.stringify({
      action: 'role_changed',
      user_id: userId,
      previous_role: memberData.role,
      new_role: role,
      changed_by: actorId,
      changed_at: new Date().toISOString(),
    });
    preserveEvidence({
      workspace_id: effectiveWsId,
      tenant_id: effectiveWsId,
      source_type: 'identity_proof',
      source_id: String(userId),
      source_system: 'team_management',
      evidence_type: 'role_change',
      risk_level: ['ADMIN', 'WORKSPACE_OWNER'].includes(role) ? 'high' : 'medium',
      sensitivity: 'internal',
      preservation_reason: `Role changed from ${memberData.role} to ${role} for user ${userId} by ${actorId}`,
      preserved_by: actorId,
      payload,
      payload_size: payload.length,
      mime_type: 'application/json',
      retention_class: 'standard',
      metadata: {
        user_id: userId,
        previous_role: memberData.role,
        new_role: role,
        changed_by: actorId,
      },
    }).catch((err) => {
      console.error('[Evidence] preserveEvidence failed for role change:', err?.message);
    });

    res.json({ success: true, message: `Role updated to ${role}.` });
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
    let memberQuery = supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId);

    if (workspaceId) memberQuery = memberQuery.eq('workspace_id', workspaceId);

    const { data: memberData, error: memberError } = await memberQuery.single();

    if (memberError || !memberData) {
      return res.status(404).json({ error: 'Member not found in workspace' });
    }

    // Fetch user details for audit log (don't mutate shared users table)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();

    const displayName = userData?.full_name || userData?.email?.split('@')[0] || userId;

    const { error: removeError } = await supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId || '');

    if (removeError) throw removeError;

    // Don't delete from users table (shared across workspaces) or from Auth

    const deletedWsId = workspaceId || '00000000-0000-0000-0000-000000000000';
    await logAuditEvent({
      workspaceId: deletedWsId,
      actorId,
      module: 'Team',
      action: `Deleted workspace member ${userData?.email || userId}`,
      metadata: { deleted_user_id: userId, name: displayName }
    });
    createAuditEvent({
      workspace_id: deletedWsId,
      event_category: 'user_identity',
      event_type: 'member_removed',
      event_title: 'Member Removed',
      event_summary: `Workspace member ${displayName} (${userData?.email || userId}) removed`,
      actor: { actor_id: actorId, actor_type: 'human_user' },
      object: { object_type: 'workspace_member', object_id: String(userId) },
      risk_level: 'high',
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'STANDARD',
      correlation: {},
    }).catch(() => {});

    const removalPayload = JSON.stringify({ removed_user_id: userId, name: displayName, email: userData?.email, removed_by: actorId, removed_at: new Date().toISOString() });
    preserveEvidence({
      workspace_id: deletedWsId,
      tenant_id: deletedWsId,
      source_type: 'identity_proof',
      source_id: String(userId),
      source_system: 'team_management',
      evidence_type: 'member_removed',
      risk_level: 'high',
      sensitivity: 'internal',
      preservation_reason: `Member ${displayName} (${userData?.email || userId}) removed from workspace by ${actorId}`,
      preserved_by: actorId,
      payload: removalPayload,
      payload_size: removalPayload.length,
      mime_type: 'application/json',
      retention_class: 'standard',
      metadata: { removed_user_id: userId, removed_by: actorId },
    }).catch(() => {});

    res.json({ success: true, message: 'Member account permanently deleted.' });
  } catch (error) {
    next(error);
  }
};
