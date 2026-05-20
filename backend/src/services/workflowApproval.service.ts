import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface ApprovalRecord {
  id: string;
  instance_id: string;
  step_id: string;
  required_role: string;
  approver_id: string;
  approver_name: string;
  decision: string;
  decision_reason: string;
  decided_at: string;
  evidence_ref: string;
}

export async function getApprovalsForInstance(instanceId: string) {
  const { data, error } = await supabaseAdmin
    .from('approval_records')
    .select('*')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ApprovalRecord[];
}

export async function createApproval(params: {
  instance_id: string;
  step_id: string;
  required_role: string;
}) {
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('approval_records').insert({
    id,
    instance_id: params.instance_id,
    step_id: params.step_id,
    required_role: params.required_role,
    decision: 'PENDING',
  });
  if (error) throw error;
  return { id };
}

export async function recordDecision(params: {
  approvalId: string;
  approverId: string;
  approverName: string;
  decision: string;
  decisionReason?: string;
  editedOutputRef?: string;
  requestedChanges?: string;
}) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('approval_records')
    .select('*')
    .eq('id', params.approvalId)
    .single();
  if (fetchError || !existing) throw Object.assign(new Error('Approval record not found'), { statusCode: 404 });
  if (existing.decision !== 'PENDING') {
    throw Object.assign(new Error('Decision already recorded for this approval'), { statusCode: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from('approval_records').update({
    approver_id: params.approverId,
    approver_name: params.approverName,
    decision: params.decision,
    decision_reason: params.decisionReason || null,
    edited_output_ref: params.editedOutputRef || null,
    requested_changes: params.requestedChanges || null,
    decided_at: now,
  }).eq('id', params.approvalId);
  if (error) throw error;
  return { id: params.approvalId, decision: params.decision };
}

export async function getApprovalStats(workspaceId: string) {
  const { data: pendingApprovals, error: paErr } = await supabaseAdmin
    .from('approval_records')
    .select('required_role, decision', { count: 'exact' })
    .eq('decision', 'PENDING');

  if (paErr) throw paErr;

  const totalPending = (pendingApprovals || []).filter((a) => a.decision === 'PENDING').length;
  const pendingValidation = (pendingApprovals || []).filter((a) => a.required_role === 'VALIDATOR' && a.decision === 'PENDING').length;
  const pendingAuthorization = (pendingApprovals || []).filter((a) => a.required_role === 'AUTHORIZER' && a.decision === 'PENDING').length;
  const pendingGovernance = (pendingApprovals || []).filter((a) => a.required_role === 'GOVERNANCE' && a.decision === 'PENDING').length;

  return {
    counts: {
      total_pending: totalPending,
      pending_validation: pendingValidation,
      pending_authorization: pendingAuthorization,
      pending_governance: pendingGovernance,
    },
  };
}

export async function listPendingApprovals(params: {
  workspace_id: string;
  required_role?: string;
  limit: number;
  offset: number;
}) {
  let query = supabaseAdmin
    .from('approval_records')
    .select('*, workflow_instances!inner(workflow_id, status, workflow_templates!inner(name, workspace_id))', { count: 'exact' })
    .eq('workflow_instances.workflow_templates.workspace_id', params.workspace_id)
    .eq('decision', 'PENDING')
    .order('created_at', { ascending: true })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.required_role) query = query.eq('required_role', params.required_role);

  const { data, error, count } = await query;
  if (error) throw error;
  return { approvals: data || [], total: count || 0 };
}
