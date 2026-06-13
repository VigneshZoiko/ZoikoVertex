import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import type { AuthRequest } from '../../shared/authMiddleware';
import { isOtpVerified } from '../../services/otp.service';
import { sendOrgWelcomeEmail } from '../../services/email.service';

export const setupWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const email  = req.user?.email;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { company_name, workspace_name } = req.body;
    if (!company_name?.trim()) return res.status(400).json({ error: 'Company name is required' });
    if (!workspace_name?.trim()) return res.status(400).json({ error: 'Workspace name is required' });

    // Prevent duplicate onboarding — user already has a non-deleted workspace
    const { data: existing } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('status')
        .eq('id', existing.workspace_id)
        .single();

      if (ws && ws.status !== 'DELETED') {
        return res.status(409).json({ error: 'User already belongs to a workspace' });
      }
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

    const { error: upsertErr } = await supabaseAdmin.from('users').upsert({
      id: userId,
      email,
      full_name: fullName,
      is_superadmin: false,
    });

    if (upsertErr) throw upsertErr;

    // 4. Add as WORKSPACE_OWNER
    const { error: memberErr } = await supabaseAdmin
      .from('workspace_members')
      .insert({ workspace_id: ws.id, user_id: userId, role: 'WORKSPACE_OWNER' });

    if (memberErr) throw memberErr;

    sendOrgWelcomeEmail(company_name.trim(), email || '', fullName);

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

/** Public endpoint for OTP-only signup (no Supabase session yet).
 *  Creates auth user + org + workspace in one step. */
export const completeOnboarding = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, fullName, company_name, workspace_name } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!company_name?.trim()) return res.status(400).json({ error: 'Company name is required' });
    if (!workspace_name?.trim()) return res.status(400).json({ error: 'Workspace name is required' });

    // Verify the email was OTP-verified within the last 30 minutes
    if (!isOtpVerified(email)) {
      return res.status(403).json({ error: 'Email not verified. Please complete OTP verification first.' });
    }

    const name = fullName || email.split('@')[0];
    const tempPassword = crypto.randomBytes(16).toString('hex');

    // 1. Create Supabase Auth user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      // If user already exists (e.g. retry after onboarding failure), reuse them
      if (createError.message?.toLowerCase().includes('already exists') ||
          createError.message?.toLowerCase().includes('already registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email === email);
        if (!existing) {
          return res.status(409).json({ exists: true, message: 'An account with this email already exists. Please sign in instead.' });
        }
        // Reset password so user can sign in
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: name },
        });
        // Proceed — the user already exists, just set up org/workspace
        const userId = existing.id;

        // 2. Upsert into public.users
        await supabaseAdmin.from('users').upsert(
          { id: userId, email, full_name: name, is_superadmin: false },
          { onConflict: 'id', ignoreDuplicates: false }
        );

        // 3. Create org
        const { data: org, error: orgErr } = await supabaseAdmin
          .from('organizations')
          .insert({ name: company_name.trim(), status: 'ACTIVE', plan_type: 'FREE' })
          .select('id')
          .single();
        if (orgErr) throw orgErr;

        // 4. Create workspace
        const { data: ws, error: wsErr } = await supabaseAdmin
          .from('workspaces')
          .insert({ name: workspace_name.trim(), org_id: org.id, status: 'ACTIVE', type: 'BRAND' })
          .select('id')
          .single();
        if (wsErr) throw wsErr;

        // 5. Add workspace member
        const { error: memberErr } = await supabaseAdmin
          .from('workspace_members')
          .insert({ workspace_id: ws.id, user_id: userId, role: 'WORKSPACE_OWNER' });
        if (memberErr) throw memberErr;

        sendOrgWelcomeEmail(company_name.trim(), email, name);

        return res.status(201).json({
          success: true,
          data: { user_id: userId, org_id: org.id, workspace_id: ws.id, role: 'WORKSPACE_OWNER', temp_password: tempPassword },
        });
      }

      logger.error(`[Onboarding] createUser error: ${createError.message}`);
      return res.status(500).json({ error: createError.message });
    }

    const userId = userData!.user!.id;

    // 2. Upsert into public.users
    const { error: upsertError } = await supabaseAdmin.from('users').upsert(
      { id: userId, email, full_name: name, is_superadmin: false },
      { onConflict: 'id', ignoreDuplicates: false }
    );
    if (upsertError) throw upsertError;

    // 3. Create org
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({ name: company_name.trim(), status: 'ACTIVE', plan_type: 'FREE' })
      .select('id')
      .single();
    if (orgErr) throw orgErr;

    // 4. Create workspace
    const { data: ws, error: wsErr } = await supabaseAdmin
      .from('workspaces')
      .insert({ name: workspace_name.trim(), org_id: org.id, status: 'ACTIVE', type: 'BRAND' })
      .select('id')
      .single();
    if (wsErr) throw wsErr;

    // 5. Add workspace member
    const { error: memberErr } = await supabaseAdmin
      .from('workspace_members')
      .insert({ workspace_id: ws.id, user_id: userId, role: 'WORKSPACE_OWNER' });
    if (memberErr) throw memberErr;

    sendOrgWelcomeEmail(company_name.trim(), email, name);

    logger.info(`[Onboarding] Complete for ${email}: user=${userId}, org=${org.id}, ws=${ws.id}`);

    res.status(201).json({
      success: true,
      data: { user_id: userId, org_id: org.id, workspace_id: ws.id, role: 'WORKSPACE_OWNER', temp_password: tempPassword },
    });
  } catch (err) {
    logger.error(`[Onboarding] completeOnboarding error: ${err}`);
    next(err);
  }
};
