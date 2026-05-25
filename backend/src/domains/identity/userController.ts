import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { ROLE_PERMISSIONS_MAP } from '../../shared/rolePermissions';

export const getUserContext = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_superadmin, full_name')
      .eq('id', userId)
      .single();

    let role: string | null = null;
    let workspaceId: string | null = null;

    if (!userData?.is_superadmin) {
      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id, role, workspaces(name, org_id, status, organizations(name, status, plan_type))')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (member) {
        console.log('Member found for user:', userId, 'Role:', member.role);
        workspaceId = member.workspace_id;
        role = member.role;
        
        // Handle potential array return from joined queries (common in some supabase client versions)
        const ws = Array.isArray(member.workspaces) ? member.workspaces[0] : member.workspaces;
        const org = Array.isArray(ws?.organizations) ? ws.organizations[0] : ws?.organizations;

        const orgStatus = org?.status;
        const planType = org?.plan_type;
        const orgId = ws?.org_id;
        const orgName = org?.name;
        const wsName = ws?.name;
        const wsStatus = ws?.status;

        return res.json({
          success: true,
          data: {
            user_id: userId,
            email: req.user?.email || null,
            full_name: userData?.full_name || null,
            is_superadmin: false,
            workspace_id: workspaceId,
            workspace_name: wsName || null,
            workspace_status: wsStatus || 'ACTIVE',
            org_id: orgId || null,
            org_name: orgName || 'ZoikoGroup',
            plan_type: planType || 'FREE',
            role,
            org_status: orgStatus || 'ACTIVE',
            permissions: ROLE_PERMISSIONS_MAP[role?.toUpperCase() || ''] || [],
          },
        });
      }
      console.log('No member found for user:', userId);
    }

    // Non-superadmin with no workspace membership — infer deletion or unassigned
    const effectiveOrgStatus = (!userData?.is_superadmin && !workspaceId) ? 'NO_WORKSPACE' : 'ACTIVE';

    res.json({
      success: true,
      data: {
        user_id: userId,
        email: req.user?.email || null,
        full_name: userData?.full_name || null,
        is_superadmin: userData?.is_superadmin || false,
        workspace_id: workspaceId,
        workspace_status: null,
        org_id: null,
        org_name: 'ZoikoGroup',
        role,
        org_status: effectiveOrgStatus,
        permissions: userData?.is_superadmin ? ['*'] : (ROLE_PERMISSIONS_MAP[String(role || '').toUpperCase()] || []),
      },
    });
  } catch (error) {
    next(error);
  }
};
