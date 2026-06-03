import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { supabaseAdmin } from './supabase';

export const requireRole = (...allowedRoles: string[]) => {
  const allowed = allowedRoles.map(r => r.toUpperCase());

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('is_superadmin')
        .eq('id', userId)
        .single();

      if (userData?.is_superadmin) return next();

      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      const userRole = member?.role?.toUpperCase();
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
