import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

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
        .from('memberships')
        .select(`
          workspace_id, 
          role:roles(name), 
          workspaces(
            org_id, 
            organizations(status)
          )
        `)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (member) {
        workspaceId = member.workspace_id;
        const roleName = (member.role as any)?.name || 'MEMBER';
        const orgId = (member.workspaces as any)?.org_id;
        
        // @ts-expect-error nested join type not inferred by supabase client
        const orgStatus = member.workspaces?.organizations?.status;
        
        res.json({
          success: true,
          data: {
            user_id: userId,
            full_name: userData?.full_name || null,
            is_superadmin: false,
            workspace_id: workspaceId,
            org_id: orgId,
            role: roleName,
            org_status: orgStatus || 'ACTIVE'
          },
        });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        user_id: userId,
        full_name: userData?.full_name || null,
        is_superadmin: userData?.is_superadmin || false,
        workspace_id: workspaceId,
        org_id: null,
        role,
        org_status: 'ACTIVE'
      },
    });
  } catch (error) {
    next(error);
  }
};
