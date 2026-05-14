import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from './supabase';
import { logger } from './logger';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
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

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email
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
