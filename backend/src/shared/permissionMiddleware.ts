import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { supabaseAdmin } from './supabase';
import { getPermissionsForRole } from './rolePermissions';

async function resolveWorkspaceRole(userId: string): Promise<string | null> {
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('is_superadmin, role')
    .eq('id', userId)
    .single();

  if (userData?.is_superadmin) return 'SUPERADMIN';

  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  return member?.role?.toUpperCase() || userData?.role?.toUpperCase() || null;
}

export const requireRole = (...allowedRoles: string[]) => {
  const allowed = allowedRoles.map(r => r.toUpperCase());

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const userRole = await resolveWorkspaceRole(userId);
      if (!userRole || !allowed.includes(userRole)) {
        return res.status(403).json({
          error: 'Access denied',
          required: allowedRoles,
          current: userRole || null,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const userRole = await resolveWorkspaceRole(userId);
      if (!userRole) {
        return res.status(403).json({
          error: 'Access denied',
          required_permissions: requiredPermissions,
          current_role: null,
        });
      }

      const permissions = getPermissionsForRole(userRole);
      if (
        !permissions.includes('*') &&
        !requiredPermissions.every((permission) => permissions.includes(permission))
      ) {
        return res.status(403).json({
          error: 'Permission denied',
          required_permissions: requiredPermissions,
          current_role: userRole,
          granted_permissions: permissions,
        });
      }

      if (req.user) {
        req.user.role = userRole;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
