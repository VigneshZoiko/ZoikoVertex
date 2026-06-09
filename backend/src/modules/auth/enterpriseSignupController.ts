import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { sendEmail } from '../../services/email.service';

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

    // 2. Generate a signup link — this creates the user AND returns a verification URL.
    //    Using generateLink instead of createUser+resend because resend() is unreliable
    //    for newly admin-created users. generateLink handles both in one call.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: workEmail,
      password: password,
      options: { data: { full_name: fullName } },
    });

    if (linkError) {
      // "User already registered" → tell the caller clearly
      if (linkError.message?.toLowerCase().includes('already registered') ||
          linkError.message?.toLowerCase().includes('already exists')) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
      }
      return res.status(400).json({ error: linkError.message });
    }

    const userId = linkData.user.id;
    const verificationUrl = linkData.properties?.action_link ?? '';

    // 3. Create Organization
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

    // 5. Ensure user row exists in public.users (trigger handles this on insert,
    //    but upsert here as a safety net for generateLink which may not fire it)
    await supabaseAdmin.from('users').upsert(
      { id: userId, email: workEmail, full_name: fullName },
      { onConflict: 'id', ignoreDuplicates: false }
    );

    // 6. Assign as ADMIN
    await supabaseAdmin.from('workspace_members').insert({
      workspace_id: wsData.id,
      user_id: userId,
      role: 'ADMIN',
    });

    // 7. Send branded verification email via Resend
    if (verificationUrl) {
      await sendEmail({
        to: workEmail,
        subject: 'Verify your ZoikoVertex account',
        text: [
          `Hi ${fullName},`,
          ``,
          `Thanks for signing up for ZoikoVertex! Please verify your email address to activate your account.`,
          ``,
          `Click the link below to verify:`,
          verificationUrl,
          ``,
          `This link expires in 24 hours. If you did not create this account, you can safely ignore this email.`,
          ``,
          `— The ZoikoVertex Team`,
        ].join('\n'),
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
            <h2 style="color:#111827;margin-bottom:8px;">Verify your email</h2>
            <p style="color:#6b7280;font-size:15px;line-height:1.6;">Hi ${fullName},</p>
            <p style="color:#6b7280;font-size:15px;line-height:1.6;">Thanks for signing up for ZoikoVertex! Click the button below to verify your email address and activate your account.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${verificationUrl}" style="background:#20E7F2;color:#080E1A;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">This link expires in 24 hours. If you did not create a ZoikoVertex account, you can safely ignore this email.</p>
          </div>
        `,
      });
      logger.info(`[Auth] Verification email sent to ${workEmail}`);
    } else {
      logger.warn(`[Auth] No verification URL returned for ${workEmail} — email not sent`);
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
    });

  } catch (error) {
    logger.error(`[Auth] Signup Error: ${error}`);
    next(error);
  }
};
