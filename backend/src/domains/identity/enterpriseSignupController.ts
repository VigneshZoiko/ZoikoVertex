import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

export const enterpriseSignup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, workEmail, companyName, workspaceName, password } = req.body;

    logger.info(`[Auth] Enterprise Signup attempt for: ${workEmail}`);

    // 1. Create User in Auth (Bypassing Email Verification)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: workEmail,
      password: password,
      email_confirm: true, // This bypasses the rate limit/email requirement
      user_metadata: { full_name: fullName }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authUser.user.id;

    // 2. Create Organization (PENDING)
    const { data: orgData, error: orgError } = await supabaseAdmin.from("organizations").insert({
      name: companyName,
      status: "PENDING",
      plan_type: "FREE"
    }).select().single();

    if (orgError) throw orgError;

    // 3. Create Workspace (PENDING)
    const { data: wsData, error: wsError } = await supabaseAdmin.from("workspaces").insert({
      name: workspaceName,
      org_id: orgData.id,
      status: "PENDING",
      type: "BRAND"
    }).select().single();

    if (wsError) throw wsError;

    // 4. Ensure user exists in public.users
    await supabaseAdmin.from('users').upsert({
      id: userId,
      email: workEmail,
      full_name: fullName
    });

    // 5. Assign as ADMIN in workspace_members
    await supabaseAdmin.from('workspace_members').insert({
      workspace_id: wsData.id,
      user_id: userId,
      role: 'ADMIN'
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully (Pending Superadmin Approval).'
    });

  } catch (error) {
    logger.error(`[Auth] Signup Error: ${error}`);
    next(error);
  }
};
