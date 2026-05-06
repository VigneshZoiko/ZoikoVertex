import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

const ProvisionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().optional(),
  role: z.string(),
  workspace_id: z.string().uuid(),
});

export const provisionUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, role, workspace_id } = ProvisionSchema.parse(req.body);
    
    logger.info({ email, role, workspace_id }, '[Identity] Provisioning request');

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Set role in workspace_members
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .upsert({
        workspace_id,
        user_id: userId,
        role: role
      });

    if (memberError) throw memberError;

    res.status(201).json({ 
      success: true, 
      message: 'User provisioned successfully',
      data: { userId }
    });
  } catch (error) {
    next(error);
  }
};
