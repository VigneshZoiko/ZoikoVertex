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
  'VIEWER',
] as const;

const ProvisionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().optional(),
  role: z.enum(VALID_ROLES),
  workspace_id: z.string().uuid().optional(),
});

const ResendVerificationSchema = z.object({
  email: z.string().email(),
});

const IDENTITY_SERVICE = 'Identity';

const ESCALATION_ROLES = new Set(['WORKSPACE_OWNER', 'ADMIN']);

export const provisionUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, role, workspace_id: bodyWorkspaceId } = ProvisionSchema.parse(req.body);

    // Non-superadmins cannot create WORKSPACE_OWNER or ADMIN (privilege escalation)
    if (!req.user?.is_superadmin && ESCALATION_ROLES.has(role)) {
      return res.status(403).json({ error: 'Forbidden: Cannot provision users with ' + role + ' role' });
    }

    // Non-superadmins must provision within their own workspace (multi-tenancy enforcement)
    const workspace_id = req.user?.is_superadmin
      ? (bodyWorkspaceId ?? req.user?.workspace_id)
      : req.user?.workspace_id;

    if (!workspace_id) {
      return res.status(400).json({ error: 'Workspace context missing. Please reload and try again.' });
    }

    // 1. Check if this user already exists in the system (by email in public.users)
    //    If they do, reuse their existing ID — don't try to re-create them in Auth.
    //    This allows adding an existing user from another workspace to this workspace.
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // User exists globally — check if they are already in THIS workspace
      const { data: existingMember } = await supabaseAdmin
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspace_id)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return res.status(409).json({ error: 'This user is already a member of this workspace.' });
      }

      userId = existingUser.id;
    } else {
      // New user — create in Supabase Auth
      const { data: createData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (authError) throw authError;
      userId = createData.user.id;
    }

    // 2. Ensure user record exists in public.users (safe upsert)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({ id: userId, email, full_name: full_name ?? email.split('@')[0] });

    if (userError) throw userError;

    // 3. Add role in workspace_members
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .upsert({ workspace_id, user_id: userId, role });

    if (memberError) throw memberError;

    // 4. Send welcome email with credentials (fire-and-forget — don't fail provision if email fails)
    sendEmail({
      to: email,
      subject: 'Your ZoikoVertex account is ready',
      text: [
        `Hi ${full_name ?? email.split('@')[0]},`,
        ``,
        `Your ZoikoVertex account has been provisioned and is ready to use.`,
        ``,
        `Email: ${email}`,
        `Temporary Password: ${password}`,
        `Role: ${role.replace(/_/g, ' ')}`,
        ``,
        `Please log in and change your password as soon as possible.`,
        ``,
        `— The ZoikoVertex Team`,
      ].join('\n'),
    }).catch(() => {});

    await logAuditEvent({
      workspaceId: workspace_id,
      actorId: req.user?.id || 'SYSTEM',
      module: IDENTITY_SERVICE,
      action: `Provisioned user ${email} as ${role}`,
      metadata: { email, role, workspace_id }
    });

    res.status(201).json({
      success: true,
      message: 'User provisioned successfully. They can log in immediately with the provided credentials.',
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
