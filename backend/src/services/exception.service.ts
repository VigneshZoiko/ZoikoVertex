import { supabaseAdmin } from '../shared/supabase';
import type { AuthContext } from '../shared/serviceAuth';
import { requireAnyPermission } from '../shared/serviceAuth';
import { v4 as uuidv4 } from 'uuid';
import { broadcastWebhookEvent } from '../domains/integrations/apiWebhookController';
import { logger } from '../shared/logger';
import { internalEventBus } from '../shared/internalEventBus';
import { createValidationItem } from './validationDesk.service';
import { createAuditItem } from './qualityAudit.service';
import { createApprovalItem } from './approval.service';

export type ExceptionStatus = 'NEW' | 'TRIAGE' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_ON_SOURCE' | 'WAITING_ON_VALIDATION' | 'WAITING_ON_APPROVAL' | 'ESCALATED' | 'OVERRIDE_REQUESTED' | 'OVERRIDE_APPROVED' | 'OVERRIDE_DENIED' | 'BLOCKED' | 'RESOLVED' | 'CLOSED' | 'ARCHIVED' | 'CANCELLED';
export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExceptionCategory = 'VALIDATION_BLOCK' | 'APPROVAL_BLOCK' | 'RULE_CONFLICT' | 'CALLBACK_FAILURE' | 'INTEGRATION_FAILURE' | 'POLICY_BREACH' | 'EVIDENCE_GAP' | 'QUALITY_FAILURE' | 'SENSITIVE_ENGAGEMENT' | 'AGENT_SAFETY' | 'RESTRICTED_OPERATION' | 'SLA_BREACH' | 'MANUAL_OVERRIDE_REQUEST' | 'UNKNOWN';
export type RemediationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type OverrideStatus = 'REQUESTED' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export interface ExceptionCase {
  id: string; tenant_id: string; workspace_id: string;
  exception_title: string; exception_category: ExceptionCategory;
  exception_status: ExceptionStatus; severity: ExceptionSeverity;
  risk_level: string; source_module: string;
  source_entity_type?: string; source_entity_id?: string;
  source_owner_id?: string; exception_owner_id?: string;
  created_by: string; due_at?: string;
  resolved_at?: string; closed_at?: string; archived_at?: string;
  restricted_mode: boolean; current_blocker?: string;
  workflow_impact?: string; recommended_route?: string;
  required_authority: number; metadata?: Record<string, unknown>;
  created_at: string; updated_at: string;
}

export interface ExceptionCaseInput {
  tenant_id: string; workspace_id: string;
  exception_title: string; exception_category: ExceptionCategory;
  severity?: ExceptionSeverity; risk_level?: string;
  source_module: string; source_entity_type?: string; source_entity_id?: string;
  source_owner_id?: string; exception_owner_id?: string;
  created_by: string; due_at?: string;
  restricted_mode?: boolean; current_blocker?: string;
  workflow_impact?: string; recommended_route?: string;
  required_authority?: number; metadata?: Record<string, unknown>;
}

// ─── Exception Cases ──────────────────────────────────────────────────────

export async function createExceptionCase(input: ExceptionCaseInput, auth?: AuthContext): Promise<ExceptionCase> {
  requireAnyPermission(auth, 'exceptions:manage');
  const id = uuidv4();
  const { data, error } = await supabaseAdmin.from('exception_cases').insert({
    id, tenant_id: input.tenant_id, workspace_id: input.workspace_id,
    exception_title: input.exception_title,
    exception_category: input.exception_category,
    exception_status: 'NEW',
    severity: input.severity || 'MEDIUM',
    risk_level: input.risk_level || 'MEDIUM',
    source_module: input.source_module,
    source_entity_type: input.source_entity_type || null,
    source_entity_id: input.source_entity_id || null,
    source_owner_id: input.source_owner_id || null,
    exception_owner_id: input.exception_owner_id || null,
    created_by: input.created_by,
    due_at: input.due_at || null,
    restricted_mode: input.restricted_mode || false,
    current_blocker: input.current_blocker || null,
    workflow_impact: input.workflow_impact || null,
    recommended_route: input.recommended_route || null,
    required_authority: input.required_authority || 1,
    metadata: input.metadata || {},
  }).select().single();
  if (error) throw error;

  await createAuditLog({
    tenant_id: input.tenant_id, exception_id: id,
    action: 'case.created',
    new_value: `Exception "${input.exception_title}" created (${input.exception_category})`,
    performed_by: input.created_by,
  });

  broadcastWebhookEvent(input.workspace_id, 'exception.case_created', {
    exception_id: id, title: input.exception_title,
    category: input.exception_category, severity: input.severity,
  }).catch((err) => logger.warn({ error: String(err) }, 'Exception webhook broadcast failed (non-blocking)'));

  try {
    internalEventBus.emit('exception.case_created', {
      workspace_id: input.workspace_id,
      tenant_id: input.tenant_id,
      actor_id: input.created_by,
      exception_id: id,
    });
  } catch { /* non-blocking */ }

  return data as unknown as ExceptionCase;
}

export async function listExceptionCases(params: {
  tenant_id: string; status?: string[]; severity?: string;
  category?: string; source_module?: string; owner_id?: string;
  search?: string; overdue?: boolean; restricted_mode?: boolean;
  limit?: number; offset?: number;
}) {
  let query = supabaseAdmin
    .from('exception_cases')
    .select('*', { count: 'exact' })
    .eq('tenant_id', params.tenant_id)
    .order('created_at', { ascending: false });

  if (params.status && params.status.length > 0) query = query.in('exception_status', params.status);
  if (params.severity) query = query.eq('severity', params.severity);
  if (params.category) query = query.eq('exception_category', params.category);
  if (params.source_module) query = query.eq('source_module', params.source_module);
  if (params.owner_id) query = query.eq('exception_owner_id', params.owner_id);
  if (params.restricted_mode) query = query.eq('restricted_mode', true);
  if (params.overdue) query = query.lt('due_at', new Date().toISOString()).not('exception_status', 'in', '("RESOLVED","CLOSED","ARCHIVED","CANCELLED")');
  if (params.search) {
    query = query.or(`exception_title.ilike.%${params.search}%,source_module.ilike.%${params.search}%`);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  if (limit > 0) query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { cases: data as unknown as ExceptionCase[], total: count || 0 };
}

export async function getExceptionCase(id: string, tenant_id: string): Promise<ExceptionCase | null> {
  const { data, error } = await supabaseAdmin
    .from('exception_cases')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ExceptionCase | null;
}

export async function updateExceptionCase(id: string, tenant_id: string, updates: Partial<ExceptionCase>, auth?: AuthContext): Promise<ExceptionCase> {
  requireAnyPermission(auth, 'exceptions:manage');
  const { data, error } = await supabaseAdmin
    .from('exception_cases')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ExceptionCase;
}

export async function getExceptionStats(tenant_id: string) {
  const { data: all, error } = await supabaseAdmin
    .from('exception_cases')
    .select('exception_status, severity, due_at, restricted_mode')
    .eq('tenant_id', tenant_id);

  if (error) throw error;

  const now = new Date().toISOString();
  const counts: Record<string, number> = {
    open: 0, triage: 0, assigned: 0, in_progress: 0,
    escalated: 0, resolved: 0, closed: 0, overdue: 0,
    critical: 0,
  };

  for (const c of all || []) {
    const s = c.exception_status;
    if (s === 'NEW' || s === 'TRIAGE') counts.triage++;
    else if (s === 'ASSIGNED') counts.assigned++;
    else if (s === 'IN_PROGRESS') counts.in_progress++;
    else if (s === 'ESCALATED') counts.escalated++;
    else if (s === 'RESOLVED') counts.resolved++;
    else if (s === 'CLOSED') counts.closed++;
    else counts.open++;

    if (c.severity === 'CRITICAL') counts.critical++;

    const openStatuses = ['NEW', 'TRIAGE', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'BLOCKED'];
    if (openStatuses.includes(s) && c.due_at && c.due_at < now) {
      counts.overdue++;
    }
  }

  return { counts };
}

// ─── Assignment ───────────────────────────────────────────────────────────

export async function assignOwner(exceptionId: string, tenant_id: string, userId: string, ownerId: string, auth?: AuthContext): Promise<ExceptionCase> {
  requireAnyPermission(auth, 'exceptions:manage');
  const ec = await getExceptionCase(exceptionId, tenant_id);
  if (!ec) throw new Error('Exception case not found');

  const prev = ec.exception_owner_id;
  await supabaseAdmin.from('exception_cases')
    .update({ exception_owner_id: ownerId, exception_status: 'ASSIGNED' })
    .eq('id', exceptionId);

  await createAuditLog({
    tenant_id, exception_id: exceptionId,
    action: 'case.owner_assigned',
    previous_value: prev || 'none', new_value: ownerId,
    performed_by: userId,
  });

  return getExceptionCase(exceptionId, tenant_id) as Promise<ExceptionCase>;
}

export async function updateSeverity(exceptionId: string, tenant_id: string, userId: string, severity: ExceptionSeverity, auth?: AuthContext): Promise<ExceptionCase> {
  requireAnyPermission(auth, 'exceptions:manage');
  const ec = await getExceptionCase(exceptionId, tenant_id);
  if (!ec) throw new Error('Exception case not found');

  await supabaseAdmin.from('exception_cases')
    .update({ severity })
    .eq('id', exceptionId);

  await createAuditLog({
    tenant_id, exception_id: exceptionId,
    action: 'case.severity_changed',
    previous_value: ec.severity, new_value: severity,
    performed_by: userId,
  });

  return getExceptionCase(exceptionId, tenant_id) as Promise<ExceptionCase>;
}

export async function updateStatus(exceptionId: string, tenant_id: string, userId: string, status: ExceptionStatus, auth?: AuthContext): Promise<ExceptionCase> {
  requireAnyPermission(auth, 'exceptions:manage');
  const ec = await getExceptionCase(exceptionId, tenant_id);
  if (!ec) throw new Error('Exception case not found');

  const updates: Partial<ExceptionCase> = { exception_status: status };
  if (status === 'RESOLVED') updates.resolved_at = new Date().toISOString();
  if (status === 'CLOSED') updates.closed_at = new Date().toISOString();
  if (status === 'ARCHIVED') updates.archived_at = new Date().toISOString();

  await supabaseAdmin.from('exception_cases').update(updates).eq('id', exceptionId);

  await createAuditLog({
    tenant_id, exception_id: exceptionId,
    action: `case.status_changed_to_${status.toLowerCase()}`,
    previous_value: ec.exception_status, new_value: status,
    performed_by: userId,
  });

  return getExceptionCase(exceptionId, tenant_id) as Promise<ExceptionCase>;
}

// ─── Blocker Management ───────────────────────────────────────────────────

export async function addBlocker(exceptionId: string, input: {
  blocker_type: string; blocker_description: string;
  blocker_severity?: string; triggered_by?: string;
  related_rule_id?: string; related_validation_id?: string;
  related_approval_id?: string; related_callback_id?: string;
  blocking_dependency?: string; required_action?: string;
  required_owner_id?: string; automatic_remediation_available?: boolean;
}, auth?: AuthContext): Promise<{ id: string }> {
  requireAnyPermission(auth, 'exceptions:manage');
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('exception_blockers').insert({
    id, exception_id: exceptionId,
    ...input,
    blocker_severity: input.blocker_severity || 'MEDIUM',
    automatic_remediation_available: input.automatic_remediation_available || false,
  }).select().single();
  if (error) throw error;
  return { id };
}

export async function getBlockers(exceptionId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('exception_blockers')
    .select('*')
    .eq('exception_id', exceptionId)
    .order('triggered_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Remediation ──────────────────────────────────────────────────────────

export async function addRemediation(exceptionId: string, input: {
  remediation_owner_id?: string; remediation_action: string;
  due_at?: string; target_destination?: string;
  required_validation?: boolean; required_approval?: boolean;
  required_evidence?: string; notes?: string;
}, auth?: AuthContext): Promise<{ id: string }> {
  requireAnyPermission(auth, 'exceptions:manage');
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('exception_remediation').insert({
    id, exception_id: exceptionId,
    ...input,
    required_validation: input.required_validation || false,
    required_approval: input.required_approval || false,
  }).select().single();
  if (error) throw error;
  return { id };
}

export async function completeRemediation(remediationId: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'exceptions:manage');
  await supabaseAdmin.from('exception_remediation')
    .update({ completion_status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', remediationId);
}

export async function getRemediations(exceptionId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('exception_remediation')
    .select('*')
    .eq('exception_id', exceptionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ─── Escalation ───────────────────────────────────────────────────────────

export async function escalateCase(exceptionId: string, tenant_id: string, userId: string, input: {
  reason: string; severity?: string; target_role?: string; target_user_id?: string; note?: string;
}, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'exceptions:manage');
  const id = uuidv4();
  await supabaseAdmin.from('exception_escalations').insert({
    id, exception_id: exceptionId,
    escalation_reason: input.reason,
    severity: input.severity || 'MEDIUM',
    escalated_by: userId,
    escalated_to_role: input.target_role || null,
    escalated_to_user_id: input.target_user_id || null,
    escalation_note: input.note || null,
  });

  await updateStatus(exceptionId, tenant_id, userId, 'ESCALATED');

  await createAuditLog({
    tenant_id, exception_id: exceptionId,
    action: 'case.escalated',
    new_value: `Escalated to ${input.target_role || input.target_user_id || 'unknown'}: ${input.reason}`,
    performed_by: userId,
  });
}

// ─── Override ─────────────────────────────────────────────────────────────

export async function requestOverride(exceptionId: string, input: {
  override_reason: string; requested_by: string;
  requested_outcome: string; risk_acknowledgement?: string;
  evidence_attached?: string[]; expires_at?: string;
}, auth?: AuthContext): Promise<{ id: string }> {
  requireAnyPermission(auth, 'exceptions:manage');
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('exception_overrides').insert({
    id, exception_id: exceptionId,
    ...input, override_status: 'REQUESTED',
    evidence_attached: input.evidence_attached || [],
  }).select().single();
  if (error) throw error;

  await supabaseAdmin.from('exception_cases')
    .update({ exception_status: 'OVERRIDE_REQUESTED' })
    .eq('id', exceptionId);

  return { id };
}

export async function decideOverride(overrideId: string, decision: 'APPROVED' | 'DENIED', authorityId: string, note?: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'exceptions:manage');
  await supabaseAdmin.from('exception_overrides')
    .update({
      override_status: decision,
      approving_authority_id: authorityId,
      override_decision_note: note || null,
      decided_by: authorityId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', overrideId);
}

// ─── Evidence ─────────────────────────────────────────────────────────────

export async function addEvidence(exceptionId: string, input: {
  evidence_type: string; evidence_reference: string;
  source_module: string; created_by: string;
}, auth?: AuthContext): Promise<{ id: string }> {
  requireAnyPermission(auth, 'exceptions:manage');
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('exception_evidence').insert({
    id, exception_id: exceptionId,
    ...input,
  }).select().single();
  if (error) throw error;
  return { id };
}

export async function getEvidence(exceptionId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('exception_evidence')
    .select('*')
    .eq('exception_id', exceptionId)
    .order('captured_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Resolution ───────────────────────────────────────────────────────────

export async function resolveCase(exceptionId: string, tenant_id: string, userId: string, input: {
  outcome: string; summary?: string; root_cause?: string;
  corrective_action?: string; preventive_action?: string;
  final_destination?: string; evidence_attached?: string[];
  post_resolution_audit_required?: boolean;
}, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'exceptions:manage');
  const id = uuidv4();
  await supabaseAdmin.from('exception_resolutions').insert({
    id, exception_id: exceptionId,
    resolution_outcome: input.outcome,
    resolution_summary: input.summary || null,
    root_cause: input.root_cause || null,
    corrective_action: input.corrective_action || null,
    preventive_action: input.preventive_action || null,
    final_destination: input.final_destination || null,
    evidence_attached: input.evidence_attached || [],
    post_resolution_audit_required: input.post_resolution_audit_required || false,
    resolved_by: userId,
  });

  await updateStatus(exceptionId, tenant_id, userId, 'RESOLVED');
}

// ─── Audit Trail ──────────────────────────────────────────────────────────

export async function createAuditLog(input: {
  tenant_id: string; exception_id: string;
  action: string; previous_value?: string; new_value?: string;
  performed_by: string; note?: string; metadata?: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdmin.from('exception_audit_log').insert({
    id: uuidv4(), ...input, note: input.note || null, metadata: input.metadata || {},
  });
}

export async function getAuditTrail(exceptionId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('exception_audit_log')
    .select('*')
    .eq('exception_id', exceptionId)
    .order('performed_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Send to Other Modules ────────────────────────────────────────────────

export async function sendToValidation(exceptionId: string, tenant_id: string, userId: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'exceptions:manage');
  const ec = await getExceptionCase(exceptionId, tenant_id);
  if (!ec) throw new Error('Exception case not found');
  await updateStatus(exceptionId, tenant_id, userId, 'WAITING_ON_VALIDATION');
  try {
    await createValidationItem({
      tenant_id,
      workspace_id: ec.workspace_id,
      source_module: ec.source_module,
      source_entity_id: `exception-${exceptionId}`,
      item_type: 'escalated_item',
      title: `Validation: ${ec.exception_title}`,
      submitted_by: userId,
      risk_level: (ec.risk_level as any) || 'MEDIUM',
    });
  } catch (err) {
    logger.warn({ err, exceptionId }, '[Exception] Failed to create validation item');
  }
  internalEventBus.emit('exception.sent_to_validation', { exception_id: exceptionId, source_module: ec.source_module });
}

export async function sendToApprovals(exceptionId: string, tenant_id: string, userId: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'exceptions:manage');
  const ec = await getExceptionCase(exceptionId, tenant_id);
  if (!ec) throw new Error('Exception case not found');
  await updateStatus(exceptionId, tenant_id, userId, 'WAITING_ON_APPROVAL');
  try {
    await createApprovalItem({
      tenant_id,
      workspace_id: ec.workspace_id,
      source_module: ec.source_module,
      source_entity_id: `exception-${exceptionId}`,
      item_type: 'EXCEPTION_OUTCOME',
      title: `Approval: ${ec.exception_title}`,
      submitted_by: userId,
      risk_level: (ec.risk_level as string) || 'MEDIUM',
    });
  } catch (err) {
    logger.warn({ err, exceptionId }, '[Exception] Failed to create approval item');
  }
  internalEventBus.emit('exception.sent_to_approvals', { exception_id: exceptionId, source_module: ec.source_module });
}

export async function sendToQualityAudit(exceptionId: string, tenant_id: string, _userId: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'exceptions:manage');
  const ec = await getExceptionCase(exceptionId, tenant_id);
  if (!ec) throw new Error('Exception case not found');
  try {
    const auditItem = await createAuditItem({
      tenant_id,
      workspace_id: ec.workspace_id,
      source_module: ec.source_module,
      source_entity_id: `exception-${exceptionId}`,
      item_type: 'escalation_outcome',
      title: `Audit: ${ec.exception_title}`,
      risk_level: (ec.risk_level as any) || 'MEDIUM',
    });
    logger.info({ auditItemId: auditItem.id, exceptionId }, '[Exception] Created quality audit item from exception');
  } catch (err) {
    logger.warn({ err, exceptionId }, '[Exception] Failed to create quality audit item');
  }
  internalEventBus.emit('exception.sent_to_quality_audit', { exception_id: exceptionId, source_module: ec.source_module });
}

// ─── Export ───────────────────────────────────────────────────────────────

export async function exportExceptionRecord(exceptionId: string, tenant_id: string, auth?: AuthContext): Promise<Record<string, unknown> | null> {
  requireAnyPermission(auth, 'exceptions:manage');
  const ec = await getExceptionCase(exceptionId, tenant_id);
  if (!ec) return null;

  const [blockers, remediations, escalations, overrides, evidenceList, auditTrail] = await Promise.all([
    getBlockers(exceptionId), getRemediations(exceptionId),
    supabaseAdmin.from('exception_escalations').select('*').eq('exception_id', exceptionId),
    supabaseAdmin.from('exception_overrides').select('*').eq('exception_id', exceptionId),
    getEvidence(exceptionId), getAuditTrail(exceptionId),
  ]);

  return {
    case: ec, blockers, remediations,
    escalations: escalations.data || [],
    overrides: overrides.data || [],
    evidence: evidenceList,
    audit_trail: auditTrail,
    exported_at: new Date().toISOString(),
  };
}
