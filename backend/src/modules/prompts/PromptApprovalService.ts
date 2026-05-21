import { supabaseAdmin } from '../../shared/supabase';

export class PromptApprovalService {
  static async listByVersion(versionId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_approvals')
      .select('*')
      .eq('prompt_version_id', versionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async create(input: {
    prompt_version_id: string;
    reviewer_id?: string;
    reviewer_role: string;
    decision: string;
    decision_reason?: string;
    conditions?: string;
    evidence_id?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('prompt_approvals')
      .insert({
        prompt_version_id: input.prompt_version_id,
        reviewer_id: input.reviewer_id || null,
        reviewer_role: input.reviewer_role,
        decision: input.decision,
        decision_reason: input.decision_reason || '',
        conditions: input.conditions || '',
        evidence_id: input.evidence_id || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getApprovalStats() {
    const { count: pendingGovernance, error: pgErr } = await supabaseAdmin
      .from('prompts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'REVIEW_REQUESTED');
    if (pgErr) throw pgErr;

    const { count: productionPending, error: ppErr } = await supabaseAdmin
      .from('prompts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PRODUCTION_PENDING');
    if (ppErr) throw ppErr;

    const totalPending = (pendingGovernance || 0) + (productionPending || 0);

    return {
      counts: {
        pending_governance: pendingGovernance || 0,
        total_pending: totalPending,
        production_pending: productionPending || 0,
      },
    };
  }
}
