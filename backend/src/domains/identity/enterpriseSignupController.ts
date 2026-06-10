import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

const SignupSchema = z.object({
  fullName:      z.string().min(1, 'Full name is required'),
  workEmail:     z.string().email('Invalid email address'),
  companyName:   z.string().min(1, 'Company name is required'),
  workspaceName: z.string().min(1, 'Workspace name is required'),
  password:      z.string().min(8, 'Password must be at least 8 characters'),
});

export const enterpriseSignup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate request body
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return res.status(400).json({ error: firstError.message });
    }
    const { fullName, workEmail, companyName, workspaceName, password } = parsed.data;

    logger.info(`[Auth] Enterprise Signup attempt for: ${workEmail}`);

    // 2. Use the anon client signUp — this is the ONLY Supabase call that triggers
    //    the built-in confirmation email. Admin createUser/generateLink deliberately skip it.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: workEmail,
      password,
      options: {
        data: { full_name: fullName },
        // emailRedirectTo tells Supabase where to send the user after clicking verify
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (signUpError) {
      logger.error(`[Auth] signUp error: ${signUpError.message}`);
      if (signUpError.message?.toLowerCase().includes('already registered') ||
          signUpError.message?.toLowerCase().includes('already exists')) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
      }
      return res.status(400).json({ error: signUpError.message });
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'Signup failed — no user returned. Please try again.' });
    }

    // 3. Create Organization (use admin client for privileged DB writes)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: companyName, status: 'ACTIVE', plan_type: 'FREE' })
      .select()
      .single();

    if (orgError) throw orgError;

    // 4. Create Workspace
    const { data: wsData, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .insert({ name: workspaceName, org_id: orgData.id, status: 'ACTIVE', type: 'BRAND' })
      .select()
      .single();

    if (wsError) throw wsError;

    // 5. Upsert public.users row (trigger may have already done this, this is a safety net)
    const { error: upsertError } = await supabaseAdmin.from('users').upsert(
      { id: userId, email: workEmail, full_name: fullName },
      { onConflict: 'id', ignoreDuplicates: false }
    );
    if (upsertError) {
      logger.warn(`[Auth] public.users upsert warning for ${workEmail}: ${upsertError.message}`);
    }

    // 6. Assign as ADMIN in workspace
    const { error: memberError } = await supabaseAdmin.from('workspace_members').insert({
      workspace_id: wsData.id,
      user_id: userId,
      role: 'ADMIN',
    });

    if (memberError) {
      logger.error(`[Auth] workspace_members insert failed for ${workEmail}: ${memberError.message}`);
      // Roll back: delete workspace and org so the user can try again cleanly
      await supabaseAdmin.from('workspaces').delete().eq('id', wsData.id);
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      return res.status(500).json({ error: 'Account setup failed. Please try again or contact support.' });
    }

    logger.info(`[Auth] Signup complete for ${workEmail} — verification email sent by Supabase`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
    });

  } catch (error) {
    logger.error(`[Auth] Signup Error: ${error}`);
    next(error);
  }
};
