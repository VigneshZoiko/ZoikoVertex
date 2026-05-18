import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from './supabase';
import { logger } from './logger';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    workspace_id?: string | null;
    is_superadmin?: boolean;
  };
  file?: Express.Multer.File;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn({ error }, '[Auth] Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Fetch workspace_id and superadmin status
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_superadmin')
      .eq('id', user.id)
      .single();

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const isSuperAdmin = userData?.is_superadmin || false;

    // Attach user to request
    // Superadmins with no workspace membership get a default dev workspace so
    // all workspace-scoped endpoints work without returning 403.
    req.user = {
      id: user.id,
      email: user.email,
      workspace_id: member?.workspace_id || (isSuperAdmin ? '00000000-0000-0000-0000-000000000000' : null),
      is_superadmin: isSuperAdmin
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const provisionGuard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Service-to-service path: match against shared secret
    if (env.INTERNAL_SERVICE_SECRET && token === env.INTERNAL_SERVICE_SECRET) {
      return next();
    }

    // SUPERADMIN user path: validate JWT then check is_superadmin
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      logger.warn({ error }, '[Auth] Unauthorized provision attempt');
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = { id: user.id, email: user.email };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_superadmin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_superadmin) {
      return res.status(403).json({ error: 'Forbidden: SuperAdmin privileges required' });
    }

    next();
  } catch (err) {
    next(err);
  }
};
