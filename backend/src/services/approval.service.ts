import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { internalEventBus } from '../shared/internalEventBus';
import { broadcastWebhookEvent } from '../domains/integrations/apiWebhookController';
import { logger } from '../shared/logger';
import type { AuthContext } from '../shared/serviceAuth';
import { requireAnyPermission } from '../shared/serviceAuth';

export type ApprovalItemStatus = 'PENDING_APPROVAL' | 'IN_REVIEW' | 'WAITING_ON_OTHERS' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'ESCALATED' | 'CONDITIONAL_APPROVAL' | 'BLOCKED' | 'CANCELLED' | 'COMPLETED' | 'ARCHIVED' | 'RETURNED_TO_CREATOR';
export type ApprovalItemType = 'SOCIAL_POST' | 'INBOX_REPLY' | 'CAMPAIGN_ASSET' | 'AGENT_ACTION' | 'WORKFLOW_OUTPUT' | 'VALIDATION_OVERRIDE' | 'EXCEPTION_OUTCOME' | 'RESTRICTED_OPERATION' | 'COMPLIANCE_SENSITIVE_ITEM' | 'PUBLISHING_ACTION';
export type DecisionValue = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'CONDITIONAL_APPROVAL' | 'ESCALATED' | 'RETURNED_TO_CREATOR';
export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'SKIPPED' | 'ESCALATED';
export type PathType = 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL' | 'QUORUM' | 'ROLE_BASED' | 'SPECIALIST' | 'CONDITIONAL' | 'EMERGENCY' | 'EXECUTIVE';
export type CallbackStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type EligibilityStatus = 'APPROVAL_ELIGIBLE' | 'REJECTION_ELIGIBLE' | 'CHANGES_REQUEST_ELIGIBLE' | 'CONDITIONAL_APPROVAL_ELIGIBLE' | 'ESCALATION_REQUIRED' | 'WAITING_ON_PRIOR_STAGE' | 'MISSING_REQUIRED_APPROVER' | 'VALIDATION_BLOCKED' | 'REVALIDATION_REQUIRED' | 'PERMISSION_DENIED' | 'ALREADY_DECIDED' | 'WORKFLOW_COMPLETED';

export interface ApprovalItem {
  id: string; tenant_id: string; workspace_id: string;
  source_module: string; source_entity_id: string;
  item_type: ApprovalItemType; title: string;
  content_snapshot?: string; content_snapshot_version?: number;
  approval_status: ApprovalItemStatus; approval_stage?: string;
  approval_rule_id?: string; approval_rule_version?: number;
  required_approval_level: number; assigned_approver_id?: string;
  submitted_by: string; validation_status?: string;
  risk_level: string; due_at?: string;
  submitted_at: string; completed_at?: string; archived_at?: string;
  metadata?: Record<string, unknown>;
  business_unit_id?: string | null;
  created_at: string; updated_at: string;
}

export interface ApprovalItemInput {
  tenant_id: string; workspace_id: string;
  source_module: string; source_entity_id: string;
  item_type: ApprovalItemType; title: string;
  content_snapshot?: string; approval_rule_id?: string;
  required_approval_level?: number; assigned_approver_id?: string;
  submitted_by: string; risk_level?: string; due_at?: string;
  metadata?: Record<string, unknown>;
  business_unit_id?: string | null;
}

export interface ApprovalDecision {
  id: string; approval_item_id: string; approver_id: string;
  decision: DecisionValue; decision_reason?: string; decision_note?: string;
  condition_text?: string; condition_owner?: string; condition_due_at?: string;
  decided_at: string; created_at: string;
}

export interface ApprovalPath {
  id: string; approval_item_id: string;
  path_type: PathType; current_stage: number; total_stages: number;
  required_roles: string[]; required_users: string[];
  quorum_required: number; fallback_approver?: string;
  escalation_target?: string; sla_due_at?: string;
  created_at: string; updated_at: string;
}

export interface ApprovalStage {
  id: string; approval_path_id: string;
  stage_order: number; stage_type: string;
  required_role?: string; required_user?: string;
  assigned_user?: string; stage_status: StageStatus;
  completed_by?: string; completed_at?: string; due_at?: string;
  created_at: string; updated_at: string;
}

export interface ApprovalComment {
  id: string; approval_item_id: string;
  comment_body: string; visibility: string;
  created_by: string; created_at: string;
}

export interface ApprovalEvidence {
  id: string; approval_item_id: string;
  evidence_type: string; evidence_reference: string;
  source_module: string; captured_at: string; created_at: string;
}

export interface ApprovalAuditEntry {
  id: string; tenant_id: string; approval_item_id: string;
  action: string; previous_value?: string; new_value?: string;
  performed_by: string; performed_at: string;
}

export interface ApprovalCallback {
  id: string; approval_item_id: string;
  source_module: string; source_entity_id: string;
  callback_status: CallbackStatus;
  callback_payload?: Record<string, unknown>;
  last_attempt_at?: string; retry_count: number;
  created_at: string; updated_at: string;
}

// ─── Approval Items ──────────────────────────────────────────────────────

export async function createApprovalItem(input: ApprovalItemInput, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const id = uuidv4();
  const { data, error } = await supabaseAdmin.from('approval_items').insert({
    id,
    tenant_id: input.tenant_id,
    workspace_id: input.workspace_id,
    source_module: input.source_module,
    source_entity_id: input.source_entity_id,
    item_type: input.item_type,
    title: input.title,
    content_snapshot: input.content_snapshot || null,
    approval_status: 'PENDING_APPROVAL',
    approval_rule_id: input.approval_rule_id || null,
    required_approval_level: input.required_approval_level || 1,
    assigned_approver_id: input.assigned_approver_id || null,
    submitted_by: input.submitted_by,
    risk_level: input.risk_level || 'LOW',
    due_at: input.due_at || null,
    metadata: input.metadata || {},
    business_unit_id: input.business_unit_id || null,
  }).select().single();
  if (error) throw error;

  await createAuditLog({
    tenant_id: input.tenant_id,
    approval_item_id: id,
    action: 'item.created',
    new_value: `Item "${input.title}" submitted for approval`,
    performed_by: input.submitted_by,
  });

  broadcastWebhookEvent(input.workspace_id, 'approval.item_created', {
    approval_item_id: id,
    title: input.title,
    item_type: input.item_type,
    source_module: input.source_module,
    risk_level: input.risk_level,
  }).catch((err) => logger.warn({ error: String(err) }, 'Webhook broadcast failed (non-blocking)'));

  return data as unknown as ApprovalItem;
}

export async function listApprovalItems(params: {
  tenant_id: string; status?: string[]; item_type?: string;
  source_module?: string; assigned_to?: string; submitted_by?: string;
  risk_level?: string; search?: string; overdue?: boolean;
  business_unit_id?: string;
  limit?: number; offset?: number;
}) {
  let query = supabaseAdmin
    .from('approval_items')
    .select('*', { count: 'exact' })
    .eq('tenant_id', params.tenant_id)
    .order('submitted_at', { ascending: false });

  if (params.status && params.status.length > 0) {
    query = query.in('approval_status', params.status);
  }
  if (params.item_type) query = query.eq('item_type', params.item_type);
  if (params.source_module) query = query.eq('source_module', params.source_module);
  if (params.assigned_to) query = query.eq('assigned_approver_id', params.assigned_to);
  if (params.submitted_by) query = query.eq('submitted_by', params.submitted_by);
  if (params.risk_level) query = query.eq('risk_level', params.risk_level);
  if (params.business_unit_id) query = query.eq('business_unit_id', params.business_unit_id);
  if (params.overdue) query = query.lt('due_at', new Date().toISOString()).not('approval_status', 'in', '("APPROVED","REJECTED","CANCELLED","COMPLETED","ARCHIVED")');
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,source_module.ilike.%${params.search}%`);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  if (limit > 0) query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data as unknown as ApprovalItem[], total: count || 0 };
}

export async function getApprovalItem(id: string, tenant_id: string): Promise<ApprovalItem | null> {
  const { data, error } = await supabaseAdmin
    .from('approval_items')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ApprovalItem | null;
}

export async function updateApprovalItem(id: string, tenant_id: string, updates: Partial<ApprovalItem>, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const { data, error } = await supabaseAdmin
    .from('approval_items')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ApprovalItem;
}

// ─── Stats ────────────────────────────────────────────────────────────────

export async function getApprovalStats(tenant_id: string) {
  const { data: all, error } = await supabaseAdmin
    .from('approval_items')
    .select('approval_status, risk_level, due_at, submitted_at')
    .eq('tenant_id', tenant_id);

  if (error) throw error;

  const now = new Date().toISOString();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const counts: Record<string, number> = {
    pending_approval: 0, in_review: 0, waiting_on_others: 0,
    approved: 0, rejected: 0, changes_requested: 0,
    escalated: 0, blocked: 0, overdue: 0,
  };

  for (const item of all || []) {
    const s = item.approval_status;
    if (s === 'PENDING_APPROVAL') counts.pending_approval++;
    else if (s === 'IN_REVIEW') counts.in_review++;
    else if (s === 'WAITING_ON_OTHERS') counts.waiting_on_others++;
    else if (s === 'APPROVED') counts.approved++;
    else if (s === 'REJECTED') counts.rejected++;
    else if (s === 'CHANGES_REQUESTED') counts.changes_requested++;
    else if (s === 'ESCALATED') counts.escalated++;
    else if (s === 'BLOCKED') counts.blocked++;

    const openStatuses = ['PENDING_APPROVAL', 'IN_REVIEW', 'WAITING_ON_OTHERS'];
    if (openStatuses.includes(s) && item.due_at && item.due_at < now) {
      counts.overdue++;
    }
  }

  const total = counts.approved + counts.rejected + counts.changes_requested;
  const approvalRate = total > 0 ? Math.round((counts.approved / total) * 100) : null;

  return { counts, approval_rate: approvalRate };
}

// ─── Eligibility ──────────────────────────────────────────────────────────

export function calculateEligibility(item: ApprovalItem, userId: string, role: string, isSuperAdmin: boolean): EligibilityStatus {
  if (isSuperAdmin) return 'APPROVAL_ELIGIBLE';

  const terminalStatuses: ApprovalItemStatus[] = ['APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'ARCHIVED'];
  if (terminalStatuses.includes(item.approval_status)) return 'ALREADY_DECIDED';

  if (item.approval_status === 'BLOCKED') return 'VALIDATION_BLOCKED';
  if (item.approval_status === 'WAITING_ON_OTHERS') return 'WAITING_ON_PRIOR_STAGE';

  if (item.assigned_approver_id && item.assigned_approver_id !== userId) {
    return 'PERMISSION_DENIED';
  }

  if (item.approval_status === 'ESCALATED') return 'ESCALATION_REQUIRED';

  return 'APPROVAL_ELIGIBLE';
}

// ─── Approve / Reject / Request Changes / Conditional / Escalate ─────────

async function recordDecision(input: {
  approval_item_id: string; approver_id: string;
  decision: DecisionValue; reason?: string; note?: string;
  condition_text?: string; condition_owner?: string; condition_due_at?: string;
}): Promise<ApprovalDecision> {
  const id = uuidv4();
  const { data, error } = await supabaseAdmin.from('approval_decisions').insert({
    id,
    approval_item_id: input.approval_item_id,
    approver_id: input.approver_id,
    decision: input.decision,
    decision_reason: input.reason || null,
    decision_note: input.note || null,
    condition_text: input.condition_text || null,
    condition_owner: input.condition_owner || null,
    condition_due_at: input.condition_due_at || null,
  }).select().single();
  if (error) throw error;
  return data as unknown as ApprovalDecision;
}

async function advanceStage(pathId: string): Promise<void> {
  const { data: path } = await supabaseAdmin
    .from('approval_paths')
    .select('*')
    .eq('id', pathId)
    .single();
  if (!path) return;
  const nextStage = Number(path.current_stage) + 1;
  if (nextStage > path.total_stages) return;
  await supabaseAdmin.from('approval_paths')
    .update({ current_stage: nextStage })
    .eq('id', pathId);

  await supabaseAdmin.from('approval_stages')
    .update({ stage_status: 'IN_PROGRESS' })
    .eq('approval_path_id', pathId)
    .eq('stage_order', nextStage);
}

async function completeStage(pathId: string, userId: string): Promise<void> {
  const { data: path } = await supabaseAdmin
    .from('approval_paths')
    .select('*')
    .eq('id', pathId)
    .single();
  if (!path) return;

  await supabaseAdmin.from('approval_stages')
    .update({ stage_status: 'COMPLETED', completed_by: userId, completed_at: new Date().toISOString() })
    .eq('approval_path_id', pathId)
    .eq('stage_order', path.current_stage);
}

export async function approveItem(itemId: string, tenant_id: string, userId: string, reason?: string, note?: string, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) throw new Error('Approval item not found');

  const decision = await recordDecision({
    approval_item_id: itemId, approver_id: userId,
    decision: 'APPROVED', reason, note,
  });

  let newStatus: ApprovalItemStatus = 'APPROVED';

  const { data: path } = await supabaseAdmin
    .from('approval_paths')
    .select('*')
    .eq('approval_item_id', itemId)
    .maybeSingle();

  if (path) {
    await completeStage(path.id, userId);

    if (path.path_type === 'SEQUENTIAL' || path.path_type === 'PARALLEL') {
      const { data: stages, error } = await supabaseAdmin
        .from('approval_stages')
        .select('*')
        .eq('approval_path_id', path.id)
        .order('stage_order', { ascending: true });

      if (!error && stages) {
        const incompleteStages = stages.filter(s => s.stage_status === 'PENDING' || s.stage_status === 'IN_PROGRESS');

        if (path.path_type === 'SEQUENTIAL' && incompleteStages.length > 0) {
          newStatus = 'WAITING_ON_OTHERS';
          await advanceStage(path.id);
        }

        if (path.path_type === 'PARALLEL' && incompleteStages.length > 0) {
          newStatus = 'WAITING_ON_OTHERS';
        }
      }
    }
  }

  if (newStatus === 'APPROVED') {
    await supabaseAdmin.from('approval_items')
      .update({ approval_status: 'APPROVED', completed_at: new Date().toISOString() })
      .eq('id', itemId);

    await triggerCallback(item, 'APPROVED');
  } else {
    await supabaseAdmin.from('approval_items')
      .update({ approval_status: newStatus })
      .eq('id', itemId);
  }

  await createAuditLog({
    tenant_id, approval_item_id: itemId,
    action: `item.approved by ${userId}`,
    previous_value: item.approval_status, new_value: newStatus,
    performed_by: userId,
  });

  broadcastWebhookEvent(item.workspace_id, 'approval.item_approved', {
    approval_item_id: itemId, title: item.title, decision_id: decision.id,
  }).catch((err) => logger.warn({ error: String(err) }, 'Webhook broadcast failed (non-blocking)'));

  try {
    internalEventBus.emit('approval.decision_made', {
      workspace_id: item.workspace_id,
      tenant_id,
      actor_id: userId,
      item_id: itemId,
      decision: 'APPROVED',
    });
  } catch { /* non-blocking */ }

  return getApprovalItem(itemId, tenant_id) as Promise<ApprovalItem>;
}

export async function rejectItem(itemId: string, tenant_id: string, userId: string, reason: string, note?: string, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) throw new Error('Approval item not found');

  if (!reason) throw new Error('Rejection requires a reason');

  const decision = await recordDecision({
    approval_item_id: itemId, approver_id: userId,
    decision: 'REJECTED', reason, note,
  });

  await supabaseAdmin.from('approval_items')
    .update({ approval_status: 'REJECTED', completed_at: new Date().toISOString() })
    .eq('id', itemId);

  await createAuditLog({
    tenant_id, approval_item_id: itemId,
    action: `item.rejected by ${userId}`,
    previous_value: item.approval_status, new_value: 'REJECTED',
    performed_by: userId,
  });

  broadcastWebhookEvent(item.workspace_id, 'approval.item_rejected', {
    approval_item_id: itemId, title: item.title, reason, decision_id: decision.id,
  }).catch((err) => logger.warn({ error: String(err) }, 'Webhook broadcast failed (non-blocking)'));

  await triggerCallback(item, 'REJECTED');

  try {
    internalEventBus.emit('approval.decision_made', {
      workspace_id: item.workspace_id,
      tenant_id,
      actor_id: userId,
      item_id: itemId,
      decision: 'REJECTED',
    });
  } catch { /* non-blocking */ }

  return getApprovalItem(itemId, tenant_id) as Promise<ApprovalItem>;
}

export async function requestChanges(itemId: string, tenant_id: string, userId: string, instruction: string, ownerId?: string, dueAt?: string, note?: string, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) throw new Error('Approval item not found');

  if (!instruction) throw new Error('Change request requires an instruction');

  const decision = await recordDecision({
    approval_item_id: itemId, approver_id: userId,
    decision: 'CHANGES_REQUESTED',
    reason: instruction, note,
    condition_owner: ownerId, condition_due_at: dueAt,
  });

  await supabaseAdmin.from('approval_items')
    .update({ approval_status: 'CHANGES_REQUESTED' })
    .eq('id', itemId);

  await createAuditLog({
    tenant_id, approval_item_id: itemId,
    action: `item.changes_requested by ${userId}`,
    previous_value: item.approval_status, new_value: 'CHANGES_REQUESTED',
    performed_by: userId,
  });

  broadcastWebhookEvent(item.workspace_id, 'approval.changes_requested', {
    approval_item_id: itemId, instruction, decision_id: decision.id,
  }).catch((err) => logger.warn({ error: String(err) }, 'Webhook broadcast failed (non-blocking)'));

  return getApprovalItem(itemId, tenant_id) as Promise<ApprovalItem>;
}

export async function approveWithConditions(itemId: string, tenant_id: string, userId: string, conditionText: string, ownerId: string, dueAt: string, note?: string, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) throw new Error('Approval item not found');

  await recordDecision({
    approval_item_id: itemId, approver_id: userId,
    decision: 'CONDITIONAL_APPROVAL',
    note, condition_text: conditionText, condition_owner: ownerId, condition_due_at: dueAt,
  });

  await supabaseAdmin.from('approval_items')
    .update({ approval_status: 'CONDITIONAL_APPROVAL', completed_at: new Date().toISOString() })
    .eq('id', itemId);

  await createAuditLog({
    tenant_id, approval_item_id: itemId,
    action: `item.conditional_approved by ${userId}`,
    previous_value: item.approval_status, new_value: 'CONDITIONAL_APPROVAL',
    performed_by: userId,
  });

  return getApprovalItem(itemId, tenant_id) as Promise<ApprovalItem>;
}

export async function escalateItem(itemId: string, tenant_id: string, userId: string, targetRole: string, reason: string, note?: string, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) throw new Error('Approval item not found');

  if (!targetRole || !reason) throw new Error('Escalation requires a target role and reason');

  const decision = await recordDecision({
    approval_item_id: itemId, approver_id: userId,
    decision: 'ESCALATED', reason, note,
  });

  await supabaseAdmin.from('approval_items')
    .update({ approval_status: 'ESCALATED' })
    .eq('id', itemId);

  await createAuditLog({
    tenant_id, approval_item_id: itemId,
    action: `item.escalated by ${userId} to ${targetRole}`,
    previous_value: item.approval_status, new_value: 'ESCALATED',
    performed_by: userId,
  });

  broadcastWebhookEvent(item.workspace_id, 'approval.item_escalated', {
    approval_item_id: itemId, target_role: targetRole, reason, decision_id: decision.id,
  }).catch((err) => logger.warn({ error: String(err) }, 'Webhook broadcast failed (non-blocking)'));

  return getApprovalItem(itemId, tenant_id) as Promise<ApprovalItem>;
}

export async function cancelApproval(itemId: string, tenant_id: string, userId: string, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) throw new Error('Approval item not found');

  await supabaseAdmin.from('approval_items')
    .update({ approval_status: 'CANCELLED', completed_at: new Date().toISOString() })
    .eq('id', itemId);

  await createAuditLog({
    tenant_id, approval_item_id: itemId,
    action: `item.cancelled by ${userId}`,
    previous_value: item.approval_status, new_value: 'CANCELLED',
    performed_by: userId,
  });

  return getApprovalItem(itemId, tenant_id) as Promise<ApprovalItem>;
}

// ─── Assignment ───────────────────────────────────────────────────────────

export async function assignApprover(itemId: string, tenant_id: string, userId: string, approverId: string, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) throw new Error('Approval item not found');

  const previousApprover = item.assigned_approver_id;
  await supabaseAdmin.from('approval_items')
    .update({ assigned_approver_id: approverId, approval_status: 'IN_REVIEW' })
    .eq('id', itemId);

  await createAuditLog({
    tenant_id, approval_item_id: itemId,
    action: 'item.approver_assigned',
    previous_value: previousApprover || 'none',
    new_value: approverId,
    performed_by: userId,
  });

  return getApprovalItem(itemId, tenant_id) as Promise<ApprovalItem>;
}

export async function reassignApprover(itemId: string, tenant_id: string, userId: string, newApproverId: string, auth?: AuthContext): Promise<ApprovalItem> {
  return assignApprover(itemId, tenant_id, userId, newApproverId, auth);
}

// ─── Path & Stages ─────────────────────────────────────────────────────────

export async function getApprovalPath(itemId: string): Promise<{ path: ApprovalPath | null; stages: ApprovalStage[] }> {
  const { data: path, error: pathErr } = await supabaseAdmin
    .from('approval_paths')
    .select('*')
    .eq('approval_item_id', itemId)
    .maybeSingle();

  if (pathErr) throw pathErr;

  let stages: ApprovalStage[] = [];
  if (path) {
    const { data: stagesData, error: stagesErr } = await supabaseAdmin
      .from('approval_stages')
      .select('*')
      .eq('approval_path_id', path.id)
      .order('stage_order', { ascending: true });
    if (stagesErr) throw stagesErr;
    stages = (stagesData || []) as unknown as ApprovalStage[];
  }

  return { path: path as unknown as ApprovalPath | null, stages };
}

export async function createApprovalPath(itemId: string, input: {
  path_type: PathType; total_stages: number;
  required_roles?: string[]; required_users?: string[];
  quorum_required?: number; fallback_approver?: string;
  escalation_target?: string; sla_due_at?: string;
}, auth?: AuthContext): Promise<ApprovalPath> {
  requireAnyPermission(auth, 'approvals:manage');
  const id = uuidv4();
  const { data, error } = await supabaseAdmin.from('approval_paths').insert({
    id, approval_item_id: itemId,
    path_type: input.path_type, current_stage: 1,
    total_stages: input.total_stages,
    required_roles: input.required_roles || [],
    required_users: input.required_users || [],
    quorum_required: input.quorum_required || 1,
    fallback_approver: input.fallback_approver || null,
    escalation_target: input.escalation_target || null,
    sla_due_at: input.sla_due_at || null,
  }).select().single();
  if (error) throw error;
  return data as unknown as ApprovalPath;
}

// ─── Decisions ────────────────────────────────────────────────────────────

export async function getApprovalDecisions(itemId: string): Promise<ApprovalDecision[]> {
  const { data, error } = await supabaseAdmin
    .from('approval_decisions')
    .select('*')
    .eq('approval_item_id', itemId)
    .order('decided_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ApprovalDecision[];
}

// ─── Comments ─────────────────────────────────────────────────────────────

export async function getApprovalComments(itemId: string): Promise<ApprovalComment[]> {
  const { data, error } = await supabaseAdmin
    .from('approval_comments')
    .select('*, creator:users!approval_comments_created_by_fkey(full_name, email)')
    .eq('approval_item_id', itemId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as ApprovalComment[];
}

export async function addApprovalComment(itemId: string, userId: string, body: string, visibility: string = 'internal_only', auth?: AuthContext): Promise<ApprovalComment> {
  requireAnyPermission(auth, 'approvals:manage');
  const id = uuidv4();
  const { data, error } = await supabaseAdmin.from('approval_comments').insert({
    id, approval_item_id: itemId, comment_body: body, visibility, created_by: userId,
  }).select().single();
  if (error) throw error;
  return data as unknown as ApprovalComment;
}

// ─── Evidence ─────────────────────────────────────────────────────────────

export async function getApprovalEvidence(itemId: string): Promise<ApprovalEvidence[]> {
  const { data, error } = await supabaseAdmin
    .from('approval_evidence')
    .select('*')
    .eq('approval_item_id', itemId)
    .order('captured_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ApprovalEvidence[];
}

export async function addApprovalEvidence(itemId: string, input: {
  evidence_type: string; evidence_reference: string; source_module: string;
}, auth?: AuthContext): Promise<ApprovalEvidence> {
  requireAnyPermission(auth, 'approvals:manage');
  const id = uuidv4();
  const { data, error } = await supabaseAdmin.from('approval_evidence').insert({
    id, approval_item_id: itemId,
    evidence_type: input.evidence_type,
    evidence_reference: input.evidence_reference,
    source_module: input.source_module,
  }).select().single();
  if (error) throw error;
  return data as unknown as ApprovalEvidence;
}

// ─── Audit Trail ──────────────────────────────────────────────────────────

export async function createAuditLog(input: {
  tenant_id: string; approval_item_id: string;
  action: string; previous_value?: string; new_value?: string; performed_by: string;
}): Promise<void> {
  await supabaseAdmin.from('approval_audit_log').insert({
    id: uuidv4(),
    tenant_id: input.tenant_id,
    approval_item_id: input.approval_item_id,
    action: input.action,
    previous_value: input.previous_value || null,
    new_value: input.new_value || null,
    performed_by: input.performed_by,
  });
}

export async function getApprovalAuditTrail(itemId: string): Promise<ApprovalAuditEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('approval_audit_log')
    .select('*')
    .eq('approval_item_id', itemId)
    .order('performed_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ApprovalAuditEntry[];
}

// ─── Callbacks ────────────────────────────────────────────────────────────

async function triggerCallback(item: ApprovalItem, decision: string): Promise<void> {
  const callbackPayload = {
    approval_item_id: item.id, title: item.title,
    decision, item_type: item.item_type,
    source_module: item.source_module, source_entity_id: item.source_entity_id,
    risk_level: item.risk_level, completed_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
    .from('approval_callbacks')
    .select('id')
    .eq('approval_item_id', item.id)
    .eq('source_module', item.source_module)
    .maybeSingle();

  if (existing) return;

  await supabaseAdmin.from('approval_callbacks').insert({
    id: uuidv4(), approval_item_id: item.id,
    source_module: item.source_module,
    source_entity_id: item.source_entity_id,
    callback_status: 'PENDING',
    callback_payload: callbackPayload,
  });

  internalEventBus.emit('approval.callback_pending', callbackPayload);
}

export async function processPendingCallbacks(): Promise<number> {
  const { data: pending, error } = await supabaseAdmin
    .from('approval_callbacks')
    .select('*')
    .eq('callback_status', 'PENDING')
    .limit(20);

  if (error || !pending) return 0;

  let processed = 0;
  for (const cb of pending) {
    try {
      const payload = cb.callback_payload || {};
      const { data: item } = await supabaseAdmin
        .from('approval_items')
        .select('workspace_id')
        .eq('id', cb.approval_item_id)
        .maybeSingle();

      if (item) {
        broadcastWebhookEvent(item.workspace_id, 'approval.callback_delivered', payload).catch((err) => logger.warn({ error: String(err) }, 'Webhook broadcast failed (non-blocking)'));
      }

      await supabaseAdmin.from('approval_callbacks')
        .update({ callback_status: 'COMPLETED', last_attempt_at: new Date().toISOString() })
        .eq('id', cb.id);

      processed++;
    } catch {
      await supabaseAdmin.from('approval_callbacks')
        .update({
          callback_status: 'FAILED',
          retry_count: (cb.retry_count || 0) + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', cb.id);
    }
  }
  return processed;
}

export async function retryCallback(callbackId: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'approvals:manage');
  const { data: cb, error } = await supabaseAdmin
    .from('approval_callbacks')
    .select('*')
    .eq('id', callbackId)
    .maybeSingle();
  if (error || !cb) throw new Error('Callback not found');

  await supabaseAdmin.from('approval_callbacks')
    .update({ callback_status: 'PENDING', retry_count: 0 })
    .eq('id', callbackId);
}

// ─── Return to Creator ─────────────────────────────────────────────────────

export async function returnToCreator(itemId: string, tenant_id: string, userId: string, reason: string, note?: string, auth?: AuthContext): Promise<ApprovalItem> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) throw new Error('Approval item not found');
  if (!reason) throw new Error('Return to creator requires a reason');

  const decision = await recordDecision({
    approval_item_id: itemId, approver_id: userId,
    decision: 'RETURNED_TO_CREATOR', reason, note,
  });

  await supabaseAdmin.from('approval_items')
    .update({ approval_status: 'RETURNED_TO_CREATOR' })
    .eq('id', itemId);

  await createAuditLog({
    tenant_id, approval_item_id: itemId,
    action: `item.returned_to_creator by ${userId}`,
    previous_value: item.approval_status, new_value: 'RETURNED_TO_CREATOR',
    performed_by: userId,
  });

  broadcastWebhookEvent(item.workspace_id, 'approval.returned_to_creator', {
    approval_item_id: itemId, reason, decision_id: decision.id,
  }).catch((err) => logger.warn({ error: String(err) }, 'Webhook broadcast failed (non-blocking)'));

  return getApprovalItem(itemId, tenant_id) as Promise<ApprovalItem>;
}

// ─── Export ────────────────────────────────────────────────────────────────

export async function exportApprovalRecord(itemId: string, tenant_id: string, auth?: AuthContext): Promise<Record<string, unknown> | null> {
  requireAnyPermission(auth, 'approvals:manage');
  const item = await getApprovalItem(itemId, tenant_id);
  if (!item) return null;

  const [decisions, pathData, comments, evidence, auditTrail] = await Promise.all([
    getApprovalDecisions(itemId),
    getApprovalPath(itemId),
    getApprovalComments(itemId),
    getApprovalEvidence(itemId),
    getApprovalAuditTrail(itemId),
  ]);

  return {
    item,
    decisions,
    path: pathData,
    comments,
    evidence,
    audit_trail: auditTrail,
    exported_at: new Date().toISOString(),
  };
}
