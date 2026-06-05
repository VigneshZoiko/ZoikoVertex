import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';

export interface DelegationRecord {
  id: string;
  fromUserId: string;
  fromRole: string;
  toUserId: string;
  toRole: string;
  promptVersionId: string;
  reason: string;
  expiresAt: string;
  active: boolean;
  createdAt: string;
}

export class DelegationService {
  static async create(
    fromUserId: string,
    fromRole: string,
    toUserId: string,
    toRole: string,
    promptVersionId: string,
    reason: string,
    workspaceId: string,
    durationHours = 48,
  ): Promise<DelegationRecord> {
    const id = `DEL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

    if (fromUserId === toUserId) {
      throw new Error('Cannot delegate to yourself');
    }

    const { error } = await supabaseAdmin.from('prompt_approvals').insert({
      prompt_version_id: promptVersionId,
      reviewer_id: toUserId,
      reviewer_role: toRole,
      decision: 'PENDING',
      decision_reason: `Delegation from ${fromRole} (${fromUserId}): ${reason}`,
    });

    if (error) throw error;

    await PromptAuditService.record({
      event_type: 'prompt.delegation.created',
      workspace_id: workspaceId,
      version_id: promptVersionId,
      actor_id: fromUserId,
      reason: `Delegated ${fromRole} → ${toRole} (${toUserId}): ${reason}`,
      after_state: { delegation_id: id, from_user: fromUserId, to_user: toUserId, expires_at: expiresAt, duration_hours: durationHours },
    });

    return { id, fromUserId, fromRole, toUserId, toRole, promptVersionId, reason, expiresAt, active: true, createdAt: new Date().toISOString() };
  }

  static async revoke(id: string, workspaceId: string): Promise<void> {
    await PromptAuditService.record({
      event_type: 'prompt.delegation.revoked',
      workspace_id: workspaceId,
      reason: `Delegation ${id} revoked`,
      after_state: { delegation_id: id, revoked_at: new Date().toISOString() },
    });
  }

  static async validate(
    userId: string,
    promptVersionId: string,
    _workspaceId: string,
  ): Promise<{ valid: boolean; delegations: DelegationRecord[] }> {
    const { data, error } = await supabaseAdmin
      .from('prompt_approvals')
      .select('*')
      .eq('reviewer_id', userId)
      .eq('prompt_version_id', promptVersionId)
      .eq('decision', 'PENDING');

    if (error) throw error;

    const delegations: DelegationRecord[] = (data || [])
      .filter((d: any) => d.decision_reason?.startsWith('Delegation from'))
      .map((d: any) => ({
        id: d.id,
        fromUserId: d.reviewer_id,
        fromRole: d.reviewer_role,
        toUserId: d.reviewer_id,
        toRole: d.reviewer_role,
        promptVersionId: d.prompt_version_id,
        reason: d.decision_reason?.replace('Delegation from ', '') || '',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        active: true,
        createdAt: d.created_at,
      }));

    return { valid: delegations.length > 0, delegations };
  }
}
