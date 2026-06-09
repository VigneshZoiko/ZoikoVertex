import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../../shared/supabase';
import { logAuditEvent } from '../governance/evidenceController';
import { AuthRequest } from '../../shared/authMiddleware';
import { sendEmail } from '../../services/email.service';

const VALID_ROLES = [
  'WORKSPACE_OWNER', 'ADMIN', 'MANAGER', 'SECURITY_ADMIN', 'GOVERNANCE_ADMIN',
  'AGENT_ARCHITECT', 'AGENT_OPERATOR', 'KNOWLEDGE_MANAGER', 'CAMPAIGN_MANAGER',
  'CREATOR', 'BRAND_REVIEWER', 'REVIEWER', 'VALIDATOR', 'APPROVER', 'PUBLISHER',
  'COMPLIANCE_REVIEWER', 'AUDITOR', 'ANALYST', 'PRIVACY_ADMIN', 'DEVELOPER',
  'EXTERNAL_COLLABORATOR', 'VIEWER',
] as const;

const ProvisionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().optional(),
  role: z.enum(VALID_ROLES),
  workspace_id: z.string().uuid(),
});

const ResendVerificationSchema = z.object({
  email: z.string().email(),
});

const IDENTITY_SERVICE = 'Identity';

export const provisionUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, role, workspace_id } = ProvisionSchema.parse(req.body);

    await logAuditEvent({
      workspaceId: workspace_id,
      actorId: req.user?.id || 'SYSTEM',
      module: IDENTITY_SERVICE,
      action: `Provisioned user ${email} as ${role}`,
      metadata: { email, role, workspace_id }
    });

    // 1. Create user via generateLink — creates the user AND returns a verification URL in one call
    const { data: linkData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { data: { full_name } },
    });

    if (authError) throw authError;

    const userId = linkData.user.id;
    const verificationUrl = linkData.properties?.action_link ?? '';

    // 2. Send branded verification email via Resend
    if (verificationUrl) {
      await sendEmail({
        to: email,
        subject: 'Verify your ZoikoVertex account',
        text: [
          `Hi ${full_name ?? email.split('@')[0]},`,
          ``,
          `You have been provisioned an account on ZoikoVertex. Please verify your email to activate it.`,
          ``,
          verificationUrl,
          ``,
          `This link expires in 24 hours.`,
          ``,
          `— The ZoikoVertex Team`,
        ].join('\n'),
      });
    }

    // 3. Ensure user exists in public.users (needed for team member lookups)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({ id: userId, email, full_name: full_name ?? email.split('@')[0] });

    if (userError) throw userError;

    // 4. Set role in workspace_members
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
      message: 'User provisioned successfully. Please check your email to verify your account.',
      data: { userId }
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = ResendVerificationSchema.parse(req.body);

    // Use Supabase's built-in resend — same path as initial signUp, no Resend/SMTP needed
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (resendError) throw resendError;

    res.status(200).json({
      success: true,
      message: 'Verification email resent successfully',
    });
  } catch (error) {
    next(error);
  }
};
