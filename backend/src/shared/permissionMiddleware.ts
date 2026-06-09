import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

// authenticate middleware always runs first and populates req.user with
// is_superadmin, role, and workspace_id — no DB queries needed here.
export const requireRole = (...allowedRoles: string[]) => {
  const allowed = allowedRoles.map(r => r.toUpperCase());

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    if (req.user.is_superadmin) return next();

    const userRole = req.user.role?.toUpperCase();
    if (!userRole || !allowed.includes(userRole)) {
      return res.status(403).json({
        error: 'Access denied',
        required: allowedRoles,
        current: userRole || null,
      });
    }

    next();
  };
};
