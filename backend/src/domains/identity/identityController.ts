import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logAuditEvent } from '../governance/evidenceController';
import { AuthRequest } from '../../shared/authMiddleware';

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

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Ensure user exists in public.users (needed for team member lookups)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({ id: userId, email, full_name: full_name ?? email.split('@')[0] });

    if (userError) throw userError;

    // 3. Set role in workspace_members
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
