import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';

export interface SoDCheckResult {
  allowed: boolean;
  reason: string;
  existingRole: string | null;
  existingDecision: string | null;
}

const CONFLICTING_ROLES: Record<string, string[]> = {
  REVIEWER: ['APPROVER', 'GOVERNANCE_ADMIN'],
  VALIDATOR: ['GOVERNANCE_ADMIN'],
  APPROVER: ['REVIEWER', 'GOVERNANCE_ADMIN'],
};

const STAGE_ORDER = ['REVIEWER', 'VALIDATOR', 'APPROVER', 'GOVERNANCE_ADMIN'];

export class SeparationOfDutiesService {
  static async checkSelfApproval(
    promptVersionId: string,
    userId: string,
  ): Promise<SoDCheckResult> {
    const { data: version } = await supabaseAdmin
      .from('prompt_versions')
      .select('created_by')
      .eq('id', promptVersionId)
      .single();

    if (version?.created_by === userId) {
      return {
        allowed: false,
        reason: 'Self-approval is not permitted. The prompt author cannot approve their own prompt.',
        existingRole: null,
        existingDecision: null,
      };
    }

    return { allowed: true, reason: 'Self-approval check passed', existingRole: null, existingDecision: null };
  }

  static async checkRoleConflict(
    promptVersionId: string,
    role: string,
    userId: string,
  ): Promise<SoDCheckResult> {
    const normalizedRole = role.toUpperCase();
    const conflicting = CONFLICTING_ROLES[normalizedRole] || [];

    if (conflicting.length > 0) {
      const { data: existing } = await supabaseAdmin
        .from('prompt_approvals')
        .select('reviewer_role, decision')
        .eq('prompt_version_id', promptVersionId)
        .eq('reviewer_id', userId)
        .neq('decision', 'PENDING')
        .maybeSingle();

      if (existing && conflicting.includes(existing.reviewer_role)) {
        return {
          allowed: false,
          reason: `Role conflict: user already acted as ${existing.reviewer_role} (${existing.decision}) on this version. ${normalizedRole} cannot also approve.`,
          existingRole: existing.reviewer_role,
          existingDecision: existing.decision,
        };
      }
    }

    return { allowed: true, reason: 'No role conflict detected', existingRole: null, existingDecision: null };
  }

  static async checkStageOrder(
    promptVersionId: string,
    role: string,
  ): Promise<SoDCheckResult> {
    const normalizedRole = role.toUpperCase();
    const roleIdx = STAGE_ORDER.indexOf(normalizedRole);
    if (roleIdx <= 0) return { allowed: true, reason: 'First-stage role, no prior approvals needed', existingRole: null, existingDecision: null };

    const priorStages = STAGE_ORDER.slice(0, roleIdx);
    const { data: priorApprovals } = await supabaseAdmin
      .from('prompt_approvals')
      .select('reviewer_role, decision')
      .eq('prompt_version_id', promptVersionId)
      .in('reviewer_role', priorStages)
      .eq('decision', 'APPROVED');

    const approvedPriorRoles = new Set((priorApprovals || []).map((a: any) => a.reviewer_role));
    const missing = priorStages.filter((s) => !approvedPriorRoles.has(s));

    if (missing.length > 0) {
      return {
        allowed: false,
        reason: `Stage order violation: prior stages [${missing.join(', ')}] must approve before ${normalizedRole}`,
        existingRole: null,
        existingDecision: null,
      };
    }

    return { allowed: true, reason: 'Stage order check passed', existingRole: null, existingDecision: null };
  }

  static async checkAll(
    promptVersionId: string,
    role: string,
    userId: string,
    workspaceId: string,
  ): Promise<{ allowed: boolean; checks: Array<{ check: string; result: SoDCheckResult }> }> {
    const checks = [
      { check: 'self_approval', result: await this.checkSelfApproval(promptVersionId, userId) },
      { check: 'role_conflict', result: await this.checkRoleConflict(promptVersionId, role, userId) },
      { check: 'stage_order', result: await this.checkStageOrder(promptVersionId, role) },
    ];

    const allPassed = checks.every((c) => c.result.allowed);

    if (!allPassed) {
      await PromptAuditService.record({
        event_type: 'prompt.separation_of_duties.blocked',
        workspace_id: workspaceId,
        version_id: promptVersionId,
        actor_id: userId,
        reason: `SoD check failed for role ${role}: ${checks.filter((c) => !c.result.allowed).map((c) => c.check).join(', ')}`,
        after_state: { role, checks: checks.map((c) => ({ name: c.check, allowed: c.result.allowed, reason: c.result.reason })) },
      });
    }

    return { allowed: allPassed, checks };
  }
}
