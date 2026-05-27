import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import type { AuthRequest } from '../../shared/authMiddleware';

export const setupWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const email  = req.user?.email;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { company_name, workspace_name } = req.body;
    if (!company_name?.trim()) return res.status(400).json({ error: 'Company name is required' });
    if (!workspace_name?.trim()) return res.status(400).json({ error: 'Workspace name is required' });

    // Prevent duplicate onboarding — user already has a workspace
    const { data: existing } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'User already belongs to a workspace' });
    }

    // 1. Create organisation (ACTIVE, FREE plan)
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({ name: company_name.trim(), status: 'ACTIVE', plan_type: 'FREE' })
      .select('id')
      .single();

    if (orgErr) throw orgErr;

    // 2. Create workspace under that org
    const { data: ws, error: wsErr } = await supabaseAdmin
      .from('workspaces')
      .insert({ name: workspace_name.trim(), org_id: org.id, status: 'ACTIVE', type: 'BRAND' })
      .select('id')
      .single();

    if (wsErr) throw wsErr;

    // 3. Upsert user record (SSO users may not have a row in public.users yet)
    const fullName = (req.user as any)?.user_metadata?.full_name
      || (req.user as any)?.raw_user_meta_data?.full_name
      || email?.split('@')[0]
      || 'User';

    await supabaseAdmin.from('users').upsert({
      id: userId,
      email,
      full_name: fullName,
      is_superadmin: false,
    });

    // 4. Add as WORKSPACE_OWNER
    const { error: memberErr } = await supabaseAdmin
      .from('workspace_members')
      .insert({ workspace_id: ws.id, user_id: userId, role: 'WORKSPACE_OWNER' });

    if (memberErr) throw memberErr;

    logger.info(`[Onboarding] Workspace created for ${email}: org=${org.id}, ws=${ws.id}`);

    res.status(201).json({
      success: true,
      data: { org_id: org.id, workspace_id: ws.id, role: 'WORKSPACE_OWNER' },
    });
  } catch (err) {
    logger.error(`[Onboarding] Error: ${err}`);
    next(err);
  }
};
