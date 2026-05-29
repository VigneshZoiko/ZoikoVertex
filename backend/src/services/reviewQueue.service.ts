import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { internalEventBus } from '../shared/internalEventBus';

export type ReviewItemType = 'social_post' | 'campaign_asset' | 'inbox_reply' | 'agent_action' | 'workflow_output' | 'policy_flagged' | 'validation_failed' | 'exception_item' | 'scheduled_content';
export type ReviewStatus = 'PENDING_REVIEW' | 'ASSIGNED' | 'IN_REVIEW' | 'AWAITING_REVISION' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'BLOCKED' | 'EXPIRED' | 'RELEASED' | 'ARCHIVED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DecisionType = 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED' | 'ESCALATED' | 'BLOCKED' | 'OVERRIDE_APPLIED';
export type EligibilityState = 'ELIGIBLE_FOR_APPROVAL' | 'REVIEW_REQUIRED' | 'ELEVATED_APPROVAL_REQUIRED' | 'REVISION_REQUIRED' | 'ESCALATION_REQUIRED' | 'BLOCKED' | 'OVERRIDE_ELIGIBLE' | 'OVERRIDE_PROHIBITED';

export interface ReviewItem {
  id: string;
  tenant_id: string;
  workspace_id: string;
  item_type: ReviewItemType;
  source_module: string;
  source_entity_id: string;
  title: string;
  content_snapshot: Record<string, unknown>;
  platform?: string;
  campaign_id?: string;
  submitted_by: string;
  assigned_to?: string;
  status: ReviewStatus;
  priority: Priority;
  risk_level: RiskLevel;
  risk_category?: string;
  validation_status?: string;
  policy_flag_status?: string;
  source_grounding_status?: string;
  approval_rule_id?: string;
  due_at?: string;
  submitted_at: string;
  reviewed_at?: string;
  approved_at?: string;
  rejected_at?: string;
  escalated_at?: string;
  released_at?: string;
  archived_at?: string;
}

export interface ReviewItemInput {
  tenant_id: string;
  workspace_id: string;
  item_type: ReviewItemType;
  source_module: string;
  source_entity_id: string;
  title: string;
  content_snapshot?: Record<string, unknown>;
  platform?: string;
  campaign_id?: string;
  submitted_by: string;
  assigned_to?: string;
  priority?: Priority;
  risk_level?: RiskLevel;
  risk_category?: string;
  due_at?: string;
}

export async function createReviewItem(input: ReviewItemInput): Promise<ReviewItem> {
  const id = uuidv4();
  const { data, error } = await supabaseAdmin
    .from('review_items')
    .insert({
      id,
      tenant_id: input.tenant_id,
      workspace_id: input.workspace_id,
      item_type: input.item_type,
      source_module: input.source_module,
      source_entity_id: input.source_entity_id,
      title: input.title,
      content_snapshot: input.content_snapshot || {},
      platform: input.platform || null,
      campaign_id: input.campaign_id || null,
      submitted_by: input.submitted_by,
      assigned_to: input.assigned_to || null,
      priority: input.priority || 'NORMAL',
      risk_level: input.risk_level || 'LOW',
      risk_category: input.risk_category || null,
      due_at: input.due_at || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ReviewItem;
}

export async function listReviewItems(params: {
  tenant_id: string;
  status?: string[];
  assigned_to?: string;
  risk_level?: string;
  priority?: string;
  item_type?: string;
  source_module?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabaseAdmin
    .from('review_items')
    .select('*', { count: 'exact' })
    .eq('tenant_id', params.tenant_id)
    .order('submitted_at', { ascending: false });

  if (params.status && params.status.length > 0) {
    query = query.in('status', params.status);
  }
  if (params.assigned_to) {
    query = query.eq('assigned_to', params.assigned_to);
  }
  if (params.risk_level) {
    query = query.eq('risk_level', params.risk_level);
  }
  if (params.priority) {
    query = query.eq('priority', params.priority);
  }
  if (params.item_type) {
    query = query.eq('item_type', params.item_type);
  }
  if (params.source_module) {
    query = query.eq('source_module', params.source_module);
  }
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,source_entity_id.ilike.%${params.search}%`);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data as unknown as ReviewItem[], total: count || 0 };
}

export async function getReviewItem(id: string, tenant_id: string): Promise<ReviewItem | null> {
  const { data, error } = await supabaseAdmin
    .from('review_items')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ReviewItem | null;
}

export async function updateReviewItemStatus(params: {
  id: string;
  tenant_id: string;
  status: ReviewStatus;
  feedback?: string;
  userId: string;
}) {
  const updateFields: Record<string, unknown> = { status: params.status, updated_at: new Date().toISOString() };

  if (params.status === 'IN_REVIEW') updateFields.reviewed_at = new Date().toISOString();
  if (params.status === 'APPROVED') updateFields.approved_at = new Date().toISOString();
  if (params.status === 'REJECTED') updateFields.rejected_at = new Date().toISOString();
  if (params.status === 'ESCALATED') updateFields.escalated_at = new Date().toISOString();
  if (params.status === 'RELEASED') updateFields.released_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('review_items')
    .update(updateFields)
    .eq('id', params.id)
    .eq('tenant_id', params.tenant_id)
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id: params.tenant_id,
    review_item_id: params.id,
    action: `status_changed_to_${params.status.toLowerCase()}`,
    new_value: { status: params.status, feedback: params.feedback },
    performed_by: params.userId,
  });

  const isTerminal = ['APPROVED', 'REJECTED', 'ESCALATED', 'BLOCKED', 'RELEASED'].includes(params.status);
  if (isTerminal) {
    try {
      internalEventBus.emit('review.decision_made', {
        workspace_id: params.tenant_id,
        tenant_id: params.tenant_id,
        actor_id: params.userId,
        item_id: params.id,
        decision: params.status,
      });
    } catch { /* non-blocking */ }
  }

  return data as unknown as ReviewItem;
}

export async function assignReviewItem(params: {
  id: string;
  tenant_id: string;
  assigned_to: string;
  assigned_by: string;
  team?: string;
  note?: string;
  due_at?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('review_items')
    .update({ assigned_to: params.assigned_to, status: 'ASSIGNED', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('tenant_id', params.tenant_id)
    .select()
    .single();
  if (error) throw error;

  await supabaseAdmin.from('review_assignments').insert({
    review_item_id: params.id,
    assigned_to: params.assigned_to,
    assigned_by: params.assigned_by,
    assigned_team: params.team || null,
    assignment_note: params.note || null,
    due_at: params.due_at || null,
  });

  await createAuditLog({
    tenant_id: params.tenant_id,
    review_item_id: params.id,
    action: 'assigned',
    new_value: { assigned_to: params.assigned_to, team: params.team },
    performed_by: params.assigned_by,
  });

  return data as unknown as ReviewItem;
}

export async function addReviewNote(params: {
  review_item_id: string;
  note_body: string;
  created_by: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('review_notes')
    .insert({
      review_item_id: params.review_item_id,
      note_body: params.note_body,
      created_by: params.created_by,
    })
    .select()
    .single();
  if (error) throw error;

  const { data: item } = await supabaseAdmin
    .from('review_items')
    .select('tenant_id')
    .eq('id', params.review_item_id)
    .single();

  if (item) {
    await createAuditLog({
      tenant_id: item.tenant_id,
      review_item_id: params.review_item_id,
      action: 'note_added',
      new_value: { note_body: params.note_body.substring(0, 200) },
      performed_by: params.created_by,
    });
  }

  return data;
}

export async function listReviewNotes(review_item_id: string) {
  const { data, error } = await supabaseAdmin
    .from('review_notes')
    .select('*')
    .eq('review_item_id', review_item_id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function listReviewDecisions(review_item_id: string) {
  const { data, error } = await supabaseAdmin
    .from('review_decisions')
    .select('*')
    .eq('review_item_id', review_item_id)
    .order('decided_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function listReviewAuditLog(review_item_id: string) {
  const { data, error } = await supabaseAdmin
    .from('review_audit_log')
    .select('*')
    .eq('review_item_id', review_item_id)
    .order('performed_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getReviewStats(tenantId: string, userId: string) {
  const query = supabaseAdmin
    .from('review_items')
    .select('status, risk_level, assigned_to')
    .eq('tenant_id', tenantId);

  const { data: all } = await query;
  if (!all) return defaultStats();

  const stats = defaultStats();
  for (const item of all) {
    if (item.status === 'PENDING_REVIEW' || item.status === 'ASSIGNED' || item.status === 'IN_REVIEW') {
      stats.pending_review++;
      if (item.risk_level === 'HIGH' || item.risk_level === 'CRITICAL') stats.high_critical_risk++;
    }
    if (item.status === 'AWAITING_REVISION' || item.status === 'RESUBMITTED') stats.awaiting_revision++;
    if (item.status === 'ESCALATED') stats.escalated++;
    if (item.status === 'APPROVED') stats.approved++;
    if (item.status === 'REJECTED') stats.rejected++;
    if (item.status === 'RELEASED') stats.released++;
    if (item.assigned_to === userId) stats.assigned_to_me++;
    if (item.risk_level === 'CRITICAL' && ['PENDING_REVIEW', 'ASSIGNED', 'IN_REVIEW'].includes(item.status)) {
      stats.critical_overdue++;
    }
  }

  return stats;
}

function defaultStats() {
  return {
    pending_review: 0,
    assigned_to_me: 0,
    high_critical_risk: 0,
    due_today: 0,
    awaiting_revision: 0,
    escalated: 0,
    approved: 0,
    rejected: 0,
    released: 0,
    critical_overdue: 0,
  };
}

async function createAuditLog(params: {
  tenant_id: string;
  review_item_id: string;
  action: string;
  previous_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  performed_by: string;
}) {
  const { error } = await supabaseAdmin.from('review_audit_log').insert({
    tenant_id: params.tenant_id,
    review_item_id: params.review_item_id,
    action: params.action,
    previous_value: params.previous_value || null,
    new_value: params.new_value || null,
    performed_by: params.performed_by,
  });
  if (error) console.error('[ReviewQueue] Audit log error:', error);
}

export function calculateEligibility(item: ReviewItem, role: string, userId?: string): EligibilityState {
  if (item.status === 'BLOCKED' || item.status === 'EXPIRED' || item.status === 'ARCHIVED') {
    return 'BLOCKED';
  }
  if (item.status === 'RELEASED') {
    return 'BLOCKED';
  }

  // Override prohibition check — critical legal/compliance items cannot be overridden
  if (item.validation_status === 'OVERRIDE_PROHIBITED' ||
      (item.risk_level === 'CRITICAL' && item.risk_category === 'legal')) {
    return 'OVERRIDE_PROHIBITED';
  }

  // Override eligibility — failed validation with override-eligible rules
  if (item.validation_status === 'OVERRIDE_ELIGIBLE' &&
      ['ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER'].includes(role)) {
    return 'OVERRIDE_ELIGIBLE';
  }

  if (item.risk_level === 'CRITICAL' && !['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN'].includes(role)) {
    return 'ELEVATED_APPROVAL_REQUIRED';
  }
  if (item.risk_level === 'HIGH' && item.validation_status === 'FAILED') {
    return 'REVISION_REQUIRED';
  }
  if (item.status === 'ESCALATED') {
    return 'ESCALATION_REQUIRED';
  }
  if (item.validation_status === 'BLOCKED') {
    return 'BLOCKED';
  }
  if (item.risk_level === 'CRITICAL' && item.validation_status !== 'PASSED') {
    return 'REVIEW_REQUIRED';
  }

  const canApprove = ['ADMIN', 'WORKSPACE_OWNER', 'REVIEWER', 'MANAGER', 'GOVERNANCE_ADMIN'].includes(role);
  const isAssignedToMe = item.assigned_to === null || item.assigned_to === userId;
  if (canApprove && isAssignedToMe && item.risk_level !== 'HIGH' && item.risk_level !== 'CRITICAL') {
    return 'ELIGIBLE_FOR_APPROVAL';
  }

  return 'REVIEW_REQUIRED';
}

export async function recordDecision(params: {
  review_item_id: string;
  decision_type: DecisionType;
  reason?: string;
  note?: string;
  decided_by: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('review_decisions')
    .insert({
      review_item_id: params.review_item_id,
      decision_type: params.decision_type,
      decision_reason: params.reason || null,
      decision_note: params.note || null,
      decided_by: params.decided_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function recordOverride(params: {
  review_item_id: string;
  override_reason: string;
  risk_acknowledgement?: string;
  overridden_by: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('review_overrides')
    .insert({
      review_item_id: params.review_item_id,
      override_reason: params.override_reason,
      risk_acknowledgement: params.risk_acknowledgement || null,
      overridden_by: params.overridden_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
