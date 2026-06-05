import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';

export interface ThreeKeyApproval {
  id: string;
  promptVersionId: string;
  keysRequired: number;
  keysCompleted: number;
  keys: Array<{
    role: string;
    userId: string;
    userName: string;
    decision: 'pending' | 'approved' | 'rejected';
    timestamp: string | null;
    reason: string | null;
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  expiresAt: string;
}

const TIER_4_REQUIRED_KEYS = [
  { order: 1, role: 'COMPLIANCE_REVIEWER', label: 'Compliance Key' },
  { order: 2, role: 'GOVERNANCE_ADMIN', label: 'Governance Key' },
  { order: 3, role: 'ADMIN', label: 'Executive Key' },
];

export class ThreeKeyService {
  static async initialize(promptVersionId: string, workspaceId: string): Promise<ThreeKeyApproval> {
    const approvalId = `3KEY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const keys = TIER_4_REQUIRED_KEYS.map((k) => ({
      role: k.role,
      userId: '',
      userName: '',
      decision: 'pending' as const,
      timestamp: null,
      reason: null,
    }));

    await supabaseAdmin.from('prompt_approvals').insert({
      prompt_version_id: promptVersionId,
      reviewer_id: 'three-key-system',
      reviewer_role: 'THREE_KEY_SYSTEM',
      decision: 'PENDING',
      decision_reason: `Three-Key approval initialized: ${approvalId}`,
    });

    await PromptAuditService.record({
      event_type: 'prompt.three_key.initialized',
      workspace_id: workspaceId,
      version_id: promptVersionId,
      reason: `Three-Key approval ${approvalId} initialized with ${keys.length} keys`,
      after_state: { approval_id: approvalId, keys_required: keys.length, expires_at: expiresAt },
    });

    return { id: approvalId, promptVersionId, keysRequired: keys.length, keysCompleted: 0, keys, status: 'pending', expiresAt };
  }

  static async submitKey(
    approvalId: string,
    promptVersionId: string,
    role: string,
    userId: string,
    userName: string,
    decision: 'approved' | 'rejected',
    reason: string,
    workspaceId: string,
  ): Promise<{ success: boolean; status: ThreeKeyApproval['status']; message: string }> {
    const existingApprovals = await supabaseAdmin
      .from('prompt_approvals')
      .select('reviewer_role, decision')
      .eq('prompt_version_id', promptVersionId)
      .neq('decision', 'PENDING');

    const existingDecisions = (existingApprovals.data || []).reduce((acc: Record<string, string>, a: any) => {
      acc[a.reviewer_role] = a.decision;
      return acc;
    }, {});

    if (existingDecisions[role]) {
      return { success: false, status: 'in_progress', message: `Role ${role} has already submitted a decision` };
    }

    const { error } = await supabaseAdmin.from('prompt_approvals').insert({
      prompt_version_id: promptVersionId,
      reviewer_id: userId,
      reviewer_role: role,
      decision: decision === 'approved' ? 'APPROVED' : 'REJECTED',
      decision_reason: reason,
    });
    if (error) throw error;

    existingDecisions[role] = decision === 'approved' ? 'APPROVED' : 'REJECTED';
    const approvedCount = Object.values(existingDecisions).filter((d) => d === 'APPROVED').length;
    const rejectedCount = Object.values(existingDecisions).filter((d) => d === 'REJECTED').length;

    if (rejectedCount > 0) {
      return { success: true, status: 'failed', message: `Three-Key approval failed: ${role} rejected` };
    }

    if (approvedCount >= 3) {
      await PromptAuditService.record({
        event_type: 'prompt.three_key.completed',
        workspace_id: workspaceId,
        version_id: promptVersionId,
        reason: `Three-Key approval completed: ${approvedCount}/3 keys approved`,
        after_state: { approval_id: approvalId, keys_approved: approvedCount },
      });
      return { success: true, status: 'completed', message: 'Three-Key approval completed successfully' };
    }

    return { success: true, status: 'in_progress', message: `${approvedCount}/3 keys approved` };
  }

  static async getStatus(promptVersionId: string): Promise<{ completed: boolean; approvedCount: number; keys: Array<{ role: string; decision: string; timestamp: string }> }> {
    const { data: approvals } = await supabaseAdmin
      .from('prompt_approvals')
      .select('reviewer_role, decision, created_at')
      .eq('prompt_version_id', promptVersionId)
      .neq('decision', 'PENDING')
      .order('created_at', { ascending: false });

    const keys = (approvals || []).map((a: any) => ({
      role: a.reviewer_role,
      decision: a.decision,
      timestamp: a.created_at,
    }));

    const approvedCount = keys.filter((k) => k.decision === 'APPROVED').length;
    return { completed: approvedCount >= 3, approvedCount, keys };
  }
}
