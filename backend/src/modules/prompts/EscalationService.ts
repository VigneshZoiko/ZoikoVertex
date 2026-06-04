import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';

export interface ApprovalEscalation {
  id: string;
  promptVersionId: string;
  escalatedBy: string;
  escalatedByRole: string;
  reason: string;
  targetRole: string;
  status: 'open' | 'resolved' | 'rejected';
  resolution: string | null;
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const ESCALATION_TARGETS: Record<string, string[]> = {
  REVIEWER: ['VALIDATOR', 'APPROVER'],
  VALIDATOR: ['APPROVER', 'GOVERNANCE_ADMIN'],
  APPROVER: ['GOVERNANCE_ADMIN', 'ADMIN'],
  GOVERNANCE_ADMIN: ['ADMIN'],
  ADMIN: ['SUPERADMIN'],
};

export class EscalationService {
  static async escalate(
    promptVersionId: string,
    escalatedBy: string,
    escalatedByRole: string,
    reason: string,
    workspaceId: string,
    targetRole?: string,
  ): Promise<ApprovalEscalation> {
    const id = `ESC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const targets = ESCALATION_TARGETS[escalatedByRole] || ['GOVERNANCE_ADMIN'];
    const effectiveTarget = targetRole || targets[0];

    if (!targets.includes(effectiveTarget) && escalatedByRole !== 'ADMIN') {
      throw new Error(`Role ${escalatedByRole} cannot escalate to ${effectiveTarget}. Allowed targets: ${targets.join(', ')}`);
    }

    await supabaseAdmin.from('prompt_approvals').insert({
      prompt_version_id: promptVersionId,
      reviewer_id: 'escalation-system',
      reviewer_role: effectiveTarget,
      decision: 'PENDING',
      decision_reason: `ESCALATED from ${escalatedByRole} (${escalatedBy}): ${reason}. Escalation ref: ${id}`,
    });

    await PromptAuditService.record({
      event_type: 'prompt.escalation.created',
      workspace_id: workspaceId,
      version_id: promptVersionId,
      actor_id: escalatedBy,
      actor_role: escalatedByRole,
      reason: `Escalation ${id}: ${reason}`,
      after_state: { escalation_id: id, target_role: effectiveTarget, from_role: escalatedByRole },
    });

    return {
      id, promptVersionId, escalatedBy, escalatedByRole, reason,
      targetRole: effectiveTarget, status: 'open', resolution: null,
      resolvedBy: null, createdAt: new Date().toISOString(), resolvedAt: null,
    };
  }

  static async resolve(
    escalationId: string,
    resolution: string,
    resolvedBy: string,
    workspaceId: string,
  ): Promise<void> {
    await PromptAuditService.record({
      event_type: 'prompt.escalation.resolved',
      workspace_id: workspaceId,
      actor_id: resolvedBy,
      reason: `Escalation ${escalationId} resolved: ${resolution}`,
      after_state: { escalation_id: escalationId, resolved_by: resolvedBy, resolved_at: new Date().toISOString() },
    });
  }

  static async getTargetRoles(role: string): Promise<string[]> {
    return ESCALATION_TARGETS[role] || ['GOVERNANCE_ADMIN'];
  }
}
