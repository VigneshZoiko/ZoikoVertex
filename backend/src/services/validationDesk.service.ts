import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { internalEventBus } from '../shared/internalEventBus';
import { logger } from '../shared/logger';
import type { AuthContext } from '../shared/serviceAuth';
import { requireAnyPermission } from '../shared/serviceAuth';

export type ValidationItemType = 'social_post' | 'inbox_reply' | 'campaign_asset' | 'agent_action' | 'workflow_output' | 'revision_item' | 'escalated_item' | 'approval_bound_item' | 'platform_specific_content' | 'source_claim_item';
export type ValidationStatus = 'PENDING_VALIDATION' | 'IN_VALIDATION' | 'PASSED' | 'WARNING' | 'FAILED' | 'BLOCKED' | 'NEEDS_REVISION' | 'MANUAL_CHECK_REQUIRED' | 'ESCALATION_REQUIRED' | 'OVERRIDE_ELIGIBLE' | 'PASSED_WITH_OVERRIDE' | 'OVERRIDE_PROHIBITED' | 'REVALIDATION_NEEDED' | 'COMPLETED' | 'ARCHIVED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RuleCategory = 'brand_rules' | 'policy_rules' | 'compliance_checks' | 'source_grounding' | 'platform_readiness' | 'claim_safety' | 'tone_sensitivity' | 'approval_readiness' | 'manual_check';
export type RuleResult = 'PASSED' | 'WARNING' | 'FAILED' | 'BLOCKED' | 'NOT_APPLICABLE' | 'NOT_RUN' | 'MANUAL_CHECK_REQUIRED' | 'RESOLVED' | 'OVERRIDDEN';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type GroundingStatus = 'GROUNDED' | 'PARTIALLY_GROUNDED' | 'UNGROUNDED' | 'SOURCE_OUTDATED' | 'SOURCE_CONFLICT';

export interface ValidationItem {
  id: string;
  tenant_id: string;
  workspace_id: string;
  source_module: string;
  source_entity_id: string;
  item_type: ValidationItemType;
  title: string;
  campaign_id?: string;
  platform?: string;
  content_snapshot?: Record<string, unknown>;
  content_snapshot_version?: string;
  validation_status: ValidationStatus;
  highest_severity?: Severity;
  failed_rule_count: number;
  warning_count: number;
  blocked_rule_count: number;
  manual_check_count: number;
  validation_score?: number;
  source_grounding_status?: string;
  platform_readiness_status?: string;
  approval_readiness_status?: string;
  assigned_validator?: string;
  submitted_by: string;
  risk_level: RiskLevel;
  due_at?: string;
  submitted_at: string;
  validated_at?: string;
  completed_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationItemInput {
  tenant_id: string;
  workspace_id: string;
  source_module: string;
  source_entity_id: string;
  item_type: ValidationItemType;
  title: string;
  campaign_id?: string;
  platform?: string;
  content_snapshot?: Record<string, unknown>;
  content_snapshot_version?: string;
  assigned_validator?: string;
  submitted_by: string;
  risk_level?: RiskLevel;
  due_at?: string;
}

// ─── Validation Items ────────────────────────────────────────────────────

export async function createValidationItem(input: ValidationItemInput, auth?: AuthContext): Promise<ValidationItem> {
  requireAnyPermission(auth, 'validation:manage');
  const { data, error } = await supabaseAdmin
    .from('validation_items')
    .insert({
      id: uuidv4(),
      tenant_id: input.tenant_id,
      workspace_id: input.workspace_id,
      source_module: input.source_module,
      source_entity_id: input.source_entity_id,
      item_type: input.item_type,
      title: input.title,
      campaign_id: input.campaign_id || null,
      platform: input.platform || null,
      content_snapshot: input.content_snapshot || {},
      content_snapshot_version: input.content_snapshot_version || null,
      assigned_validator: input.assigned_validator || null,
      submitted_by: input.submitted_by,
      risk_level: input.risk_level || 'LOW',
      due_at: input.due_at || null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, '[ValidationDesk] createValidationItem failed');
    throw error;
  }
  return data;
}

export async function listValidationItems(params: {
  tenant_id: string;
  validation_status?: string;
  assigned_validator?: string;
  risk_level?: string;
  item_type?: string;
  source_module?: string;
  campaign_id?: string;
  highest_severity?: string;
  search?: string;
  override_only?: boolean;
  blocked_only?: boolean;
  revalidation_needed?: boolean;
  manual_check_required?: boolean;
  overdue_only?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<{ items: ValidationItem[]; total: number }> {
  let query = supabaseAdmin
    .from('validation_items')
    .select('*', { count: 'exact' });

  query = query.eq('tenant_id', params.tenant_id);

  if (params.validation_status) {
    const statuses = params.validation_status.split(',');
    query = query.in('validation_status', statuses);
  }
  if (params.assigned_validator) query = query.eq('assigned_validator', params.assigned_validator);
  if (params.risk_level) query = query.eq('risk_level', params.risk_level);
  if (params.item_type) query = query.eq('item_type', params.item_type);
  if (params.source_module) query = query.eq('source_module', params.source_module);
  if (params.campaign_id) query = query.eq('campaign_id', params.campaign_id);
  if (params.highest_severity) query = query.eq('highest_severity', params.highest_severity);
  if (params.override_only) query = query.in('validation_status', ['OVERRIDE_ELIGIBLE', 'PASSED_WITH_OVERRIDE']);
  if (params.blocked_only) query = query.eq('validation_status', 'BLOCKED');
  if (params.revalidation_needed) query = query.eq('validation_status', 'REVALIDATION_NEEDED');
  if (params.manual_check_required) query = query.eq('validation_status', 'MANUAL_CHECK_REQUIRED');
  if (params.overdue_only) query = query.not('due_at', 'is', null).lt('due_at', new Date().toISOString());

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,campaign_id.ilike.%${params.search}%,platform.ilike.%${params.search}%`);
  }

  const sortCol = params.sort_by || 'submitted_at';
  const sortDir = params.sort_order || 'desc';
  query = query.order(sortCol, { ascending: sortDir === 'asc' });

  const page = params.page || 1;
  const limit = params.limit || 25;
  query = query.range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;
  if (error) {
    logger.error({ error }, '[ValidationDesk] listValidationItems failed');
    throw error;
  }
  return { items: data || [], total: count || 0 };
}

export async function getValidationItem(id: string): Promise<ValidationItem & {
  runs?: Record<string, unknown>[];
  overrides?: Record<string, unknown>[];
  manual_checks?: Record<string, unknown>[];
  notes?: Record<string, unknown>[];
  audit_log?: Record<string, unknown>[];
}> {
  const { data: item, error } = await supabaseAdmin
    .from('validation_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !item) throw error || new Error('Validation item not found');

  const [runs, overrides, manualChecks, notes, auditLog] = await Promise.all([
    supabaseAdmin.from('validation_runs').select('*').eq('validation_item_id', id).order('started_at', { ascending: false }),
    supabaseAdmin.from('validation_overrides').select('*').eq('validation_item_id', id).order('overridden_at', { ascending: false }),
    supabaseAdmin.from('validation_manual_checks').select('*').eq('validation_item_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('validation_notes').select('*').eq('validation_item_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('validation_audit_log').select('*').eq('validation_item_id', id).order('performed_at', { ascending: false }),
  ]);

  return {
    ...item,
    runs: runs.data || [],
    overrides: overrides.data || [],
    manual_checks: manualChecks.data || [],
    notes: notes.data || [],
    audit_log: auditLog.data || [],
  };
}

export async function updateValidationStatus(id: string, status: ValidationStatus, performed_by: string, tenant_id: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'validation:manage');
  const { data: current } = await supabaseAdmin
    .from('validation_items')
    .select('validation_status')
    .eq('id', id)
    .single();

  const updateData: Record<string, unknown> = { validation_status: status, updated_at: new Date().toISOString() };
  if (status === 'IN_VALIDATION') updateData.validated_at = new Date().toISOString();
  if (['COMPLETED', 'PASSED', 'FAILED', 'BLOCKED'].includes(status)) updateData.completed_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('validation_items')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;

  await createAuditLog(tenant_id, id, `STATUS_${status}`, current?.validation_status, status, performed_by);

  try {
    internalEventBus.emit('validation.status_changed', {
      workspace_id: tenant_id,
      tenant_id,
      actor_id: performed_by,
      item_id: id,
      status,
    });
  } catch { /* non-blocking */ }
}

export async function assignValidator(id: string, validator_id: string, performed_by: string, tenant_id: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'validation:manage');
  const { error } = await supabaseAdmin
    .from('validation_items')
    .update({ assigned_validator: validator_id, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  await createAuditLog(tenant_id, id, 'VALIDATOR_ASSIGNED', undefined, validator_id, performed_by);
}

// ─── Validation Runs ─────────────────────────────────────────────────────

export async function createValidationRun(input: {
  validation_item_id: string;
  rule_set_id?: string;
  rule_set_version?: string;
  validation_engine_version?: string;
  content_snapshot_version?: string;
  run_by: string;
}, auth?: AuthContext): Promise<Record<string, unknown>> {
  requireAnyPermission(auth, 'validation:manage');
  const { data, error } = await supabaseAdmin
    .from('validation_runs')
    .insert({
      id: uuidv4(),
      validation_item_id: input.validation_item_id,
      rule_set_id: input.rule_set_id || null,
      rule_set_version: input.rule_set_version || null,
      validation_engine_version: input.validation_engine_version || null,
      content_snapshot_version: input.content_snapshot_version || null,
      run_by: input.run_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeValidationRun(
  run_id: string,
  results: {
    rule_results: Array<{
      rule_name: string;
      rule_category: RuleCategory;
      result: RuleResult;
      severity: Severity;
      explanation?: string;
      affected_text?: string;
      recommended_fix?: string;
      override_eligible?: boolean;
      manual_check_required?: boolean;
    }>;
    source_grounding?: Array<{
      claim_text: string;
      source_reference?: string;
      source_status?: string;
      source_confidence?: string;
      grounding_status: GroundingStatus;
      issue_summary?: string;
    }>;
  },
  auth?: AuthContext,
): Promise<{ score: number; failed_count: number; warning_count: number; blocked_count: number; manual_check_count: number; highest_severity: string | null }> {
  requireAnyPermission(auth, 'validation:manage');
  const now = new Date().toISOString();

  await supabaseAdmin
      .from('validation_runs')
      .update({ run_status: 'COMPLETED', completed_at: now, result_summary: `Completed with ${results.rule_results.length} checks` })
      .eq('id', run_id);

  const run = await supabaseAdmin.from('validation_runs').select('validation_item_id').eq('id', run_id).single();
  const itemId = run.data?.validation_item_id;

  let passed = 0, warnings = 0, failed = 0, blocked = 0, manualCheck = 0, n_a = 0, overrideEligible = 0;
  let highestSev: Severity | null = null;
  const sevOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

  for (const r of results.rule_results) {
    await supabaseAdmin.from('validation_rule_results').insert({
      id: uuidv4(), validation_run_id: run_id, rule_name: r.rule_name,
      rule_category: r.rule_category, result: r.result, severity: r.severity,
      explanation: r.explanation || null, affected_text: r.affected_text || null,
      recommended_fix: r.recommended_fix || null,
      override_eligible: r.override_eligible || false,
      manual_check_required: r.manual_check_required || false,
    });
    if (r.result === 'PASSED') passed++;
    else if (r.result === 'WARNING') warnings++;
    else if (r.result === 'FAILED') failed++;
    if (r.override_eligible) overrideEligible++;
    if (r.result === 'BLOCKED') blocked++;
    else if (r.result === 'MANUAL_CHECK_REQUIRED') manualCheck++;
    else if (r.result !== 'PASSED' && r.result !== 'WARNING' && r.result !== 'FAILED') n_a++;

    if (r.severity && (!highestSev || (sevOrder[r.severity] || 0) > (sevOrder[highestSev] || 0))) {
      highestSev = r.severity;
    }
  }

  for (const sg of results.source_grounding || []) {
    await supabaseAdmin.from('validation_source_grounding').insert({
      id: uuidv4(), validation_run_id: run_id, claim_text: sg.claim_text,
      source_reference: sg.source_reference || null, source_status: sg.source_status || null,
      source_confidence: sg.source_confidence || null,
      grounding_status: sg.grounding_status, issue_summary: sg.issue_summary || null,
    });
  }

  const totalChecks = results.rule_results.length;
  const score = totalChecks > 0 ? Math.round(((passed + n_a) / totalChecks) * 100) : 0;

  const groundingChecks = results.source_grounding || [];
  const hasGroundingFailures = groundingChecks.some(g => g.grounding_status !== 'GROUNDED');
  const groundingStatus = groundingChecks.length === 0 ? 'NOT_CHECKED'
    : groundingChecks.every(g => g.grounding_status === 'GROUNDED') ? 'GROUNDED'
    : groundingChecks.some(g => g.grounding_status === 'UNGROUNDED') ? 'UNGROUNDED'
    : groundingChecks.some(g => g.grounding_status === 'SOURCE_CONFLICT') ? 'SOURCE_CONFLICT'
    : 'PARTIALLY_GROUNDED';

  if (itemId) {
    await supabaseAdmin
      .from('validation_items')
      .update({
        validation_score: score,
        failed_rule_count: failed,
        warning_count: warnings,
        blocked_rule_count: blocked,
        manual_check_count: manualCheck,
        highest_severity: highestSev,
        source_grounding_status: groundingStatus,
        updated_at: now,
      })
      .eq('id', itemId);

    // Auto-set status based on validation outcome
    let derivedStatus: ValidationStatus | null = null;
    if (blocked > 0 && results.rule_results.some(r => r.result === 'BLOCKED' && !r.override_eligible)) {
      derivedStatus = 'OVERRIDE_PROHIBITED';
    } else if (blocked > 0 && overrideEligible > 0) {
      derivedStatus = 'OVERRIDE_ELIGIBLE';
    } else if (hasGroundingFailures && blocked === 0) {
      derivedStatus = 'FAILED';
    } else if (manualCheck > 0) {
      derivedStatus = 'MANUAL_CHECK_REQUIRED';
    } else if (failed > 0) {
      derivedStatus = 'FAILED';
    } else if (warnings > 0) {
      derivedStatus = 'WARNING';
    } else if (passed > 0 || n_a > 0) {
      derivedStatus = 'PASSED';
    }

    if (derivedStatus) {
      const { data: currentItem } = await supabaseAdmin
        .from('validation_items')
        .select('validation_status')
        .eq('id', itemId)
        .single();
      if (currentItem && currentItem.validation_status !== derivedStatus) {
        await supabaseAdmin
          .from('validation_items')
          .update({ validation_status: derivedStatus })
          .eq('id', itemId);
      }
    }
  }

  return { score, failed_count: failed, warning_count: warnings, blocked_count: blocked, manual_check_count: manualCheck, highest_severity: highestSev };
}

export async function getValidationRunResults(run_id: string): Promise<{ run: Record<string, unknown>; rule_results: Record<string, unknown>[]; source_grounding: Record<string, unknown>[] }> {
  const [runRes, rulesRes, groundingRes] = await Promise.all([
    supabaseAdmin.from('validation_runs').select('*').eq('id', run_id).single(),
    supabaseAdmin.from('validation_rule_results').select('*').eq('validation_run_id', run_id).order('created_at'),
    supabaseAdmin.from('validation_source_grounding').select('*').eq('validation_run_id', run_id).order('created_at'),
  ]);
  return { run: runRes.data || {}, rule_results: rulesRes.data || [], source_grounding: groundingRes.data || [] };
}

// ─── Overrides ───────────────────────────────────────────────────────────

export async function applyOverride(input: {
  validation_item_id: string;
  rule_result_id?: string;
  override_reason: string;
  risk_acknowledgement?: string;
  note?: string;
  overridden_by: string;
  tenant_id: string;
}, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'validation:manage');
  await supabaseAdmin.from('validation_overrides').insert({
    id: uuidv4(),
    validation_item_id: input.validation_item_id,
    rule_result_id: input.rule_result_id || null,
    override_reason: input.override_reason,
    risk_acknowledgement: input.risk_acknowledgement || null,
    note: input.note || null,
    overridden_by: input.overridden_by,
  });

  if (input.rule_result_id) {
    await supabaseAdmin
      .from('validation_rule_results')
      .update({ result: 'OVERRIDDEN', override_reason: input.override_reason, overridden_by: input.overridden_by, overridden_at: new Date().toISOString() })
      .eq('id', input.rule_result_id);
  }

  await updateValidationStatus(input.validation_item_id, 'PASSED_WITH_OVERRIDE', input.overridden_by, input.tenant_id);
  await createAuditLog(input.tenant_id, input.validation_item_id, 'OVERRIDE_APPLIED', undefined, input.override_reason, input.overridden_by);
}

// ─── Manual Checks ───────────────────────────────────────────────────────

export async function completeManualCheck(input: {
  rule_result_id?: string;
  assigned_validator: string;
  manual_check_result: string;
  note?: string;
  completed_by: string;
  tenant_id: string;
  validation_item_id: string;
}, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'validation:manage');
  await supabaseAdmin.from('validation_manual_checks').insert({
    id: uuidv4(),
    validation_item_id: input.validation_item_id,
    rule_result_id: input.rule_result_id || null,
    assigned_validator: input.assigned_validator,
    manual_check_result: input.manual_check_result,
    note: input.note || null,
    completed_by: input.completed_by,
    completed_at: new Date().toISOString(),
  });

  await createAuditLog(input.tenant_id, input.validation_item_id, 'MANUAL_CHECK_COMPLETED', undefined, input.manual_check_result, input.completed_by);
}

// ─── Notes ───────────────────────────────────────────────────────────────

export async function addNote(input: {
  validation_item_id: string;
  parent_note_id?: string;
  note_body: string;
  created_by: string;
}, auth?: AuthContext): Promise<Record<string, unknown>> {
  requireAnyPermission(auth, 'validation:manage');
  const { data, error } = await supabaseAdmin
    .from('validation_notes')
    .insert({
      id: uuidv4(),
      validation_item_id: input.validation_item_id,
      parent_note_id: input.parent_note_id || null,
      note_body: input.note_body,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Audit Log ───────────────────────────────────────────────────────────

async function createAuditLog(tenant_id: string, validation_item_id: string, action: string, previous_value?: string, new_value?: string, performed_by?: string): Promise<void> {
  await supabaseAdmin.from('validation_audit_log').insert({
    id: uuidv4(), tenant_id, validation_item_id, action,
    previous_value: previous_value || null, new_value: new_value || null,
    performed_by: performed_by || tenant_id,
  });
}

export async function getAuditLog(validation_item_id: string): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseAdmin
    .from('validation_audit_log')
    .select('*')
    .eq('validation_item_id', validation_item_id)
    .order('performed_at', { ascending: false });
  return data || [];
}

// ─── Revalidation ────────────────────────────────────────────────────────

export async function markRevalidationNeeded(id: string, tenant_id: string, reason: string, performed_by: string, auth?: AuthContext): Promise<void> {
  requireAnyPermission(auth, 'validation:manage');
  const { data: item } = await supabaseAdmin
    .from('validation_items')
    .select('validation_status')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .single();
  if (!item) throw new Error('Validation item not found');

  await updateValidationStatus(id, 'REVALIDATION_NEEDED', performed_by, tenant_id);
}

// ─── Callbacks ───────────────────────────────────────────────────────────

export async function createCallback(input: {
  validation_item_id: string;
  source_module: string;
  source_entity_id: string;
  callback_payload?: Record<string, unknown>;
  tenant_id: string;
}, auth?: AuthContext): Promise<Record<string, unknown>> {
  requireAnyPermission(auth, 'validation:manage');
  const { data, error } = await supabaseAdmin
    .from('validation_callbacks')
    .insert({
      id: uuidv4(),
      validation_item_id: input.validation_item_id,
      source_module: input.source_module,
      source_entity_id: input.source_entity_id,
      callback_payload: input.callback_payload || {},
      callback_status: 'PENDING',
      retry_count: 0,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function processPendingCallbacks(tenant_id: string, limit: number = 10): Promise<{ processed: number; failed: number }> {
  const { data: pending } = await supabaseAdmin
    .from('validation_callbacks')
    .select('*')
    .eq('callback_status', 'PENDING')
    .eq('tenant_id', tenant_id)
    .limit(limit);

  if (!pending || pending.length === 0) return { processed: 0, failed: 0 };

  let processed = 0, failed = 0;
  for (const cb of pending) {
    try {
      const sourceEndpoint = cb.source_module === 'review_queue'
        ? `${process.env.API_BASE_URL || ''}/api/v1/review-queue/callbacks`
        : `${process.env.API_BASE_URL || ''}/api/v1/${cb.source_module}/callbacks`;

      await fetch(sourceEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_id: cb.id,
          validation_item_id: cb.validation_item_id,
          source_entity_id: cb.source_entity_id,
          callback_payload: cb.callback_payload,
        }),
      });

      await supabaseAdmin
        .from('validation_callbacks')
        .update({
          callback_status: 'COMPLETED',
          last_attempt_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cb.id);

      processed++;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await supabaseAdmin
        .from('validation_callbacks')
        .update({
          callback_status: 'FAILED',
          last_attempt_at: new Date().toISOString(),
          retry_count: (cb.retry_count || 0) + 1,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cb.id);

      await createAuditLog(tenant_id, cb.validation_item_id, 'CALLBACK_FAILED', undefined, errorMessage, 'system');
      failed++;
    }
  }

  return { processed, failed };
}

export async function retryCallback(callback_id: string, performed_by: string, tenant_id: string, auth?: AuthContext): Promise<Record<string, unknown>> {
  requireAnyPermission(auth, 'validation:manage');
  const { data: cb } = await supabaseAdmin.from('validation_callbacks').select('*').eq('id', callback_id).single();
  if (!cb) throw new Error('Callback not found');

  const { data, error } = await supabaseAdmin
    .from('validation_callbacks')
    .update({
      callback_status: 'PENDING', retry_count: (cb.retry_count || 0) + 1,
      last_attempt_at: new Date().toISOString(), error_message: null, updated_at: new Date().toISOString(),
    })
    .eq('id', callback_id)
    .select()
    .single();

  if (error) throw error;
  await createAuditLog(tenant_id, cb.validation_item_id, 'CALLBACK_RETRIED', undefined, callback_id, performed_by);
  return data;
}

// ─── Stats ───────────────────────────────────────────────────────────────

export async function getValidationStats(tenant_id: string): Promise<{
  pending: number;
  passed: number;
  warnings: number;
  failed: number;
  blocked: number;
  escalation_required: number;
}> {
  const base = supabaseAdmin.from('validation_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id);

  const [pending, passed, warnings, failed, blocked, escalation] = await Promise.all([
    base.eq('validation_status', 'PENDING_VALIDATION'),
    supabaseAdmin.from('validation_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).in('validation_status', ['PASSED', 'PASSED_WITH_OVERRIDE']),
    supabaseAdmin.from('validation_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('validation_status', 'WARNING'),
    supabaseAdmin.from('validation_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('validation_status', 'FAILED'),
    supabaseAdmin.from('validation_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('validation_status', 'BLOCKED'),
    supabaseAdmin.from('validation_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('validation_status', 'ESCALATION_REQUIRED'),
  ]);

  return {
    pending: pending.count || 0,
    passed: passed.count || 0,
    warnings: warnings.count || 0,
    failed: failed.count || 0,
    blocked: blocked.count || 0,
    escalation_required: escalation.count || 0,
  };
}

// ─── Eligibility ─────────────────────────────────────────────────────────

export function calculateEligibility(params: {
  validation_status: string;
  has_blocked_rules: boolean;
  has_unresolved_manual_checks: boolean;
  has_stale_validation: boolean;
  has_override_eligible_rules: boolean;
}): {
  proceed_allowed: boolean;
  send_to_review_queue_allowed: boolean;
  send_to_approvals_allowed: boolean;
  revision_allowed: boolean;
  escalate_allowed: boolean;
  block_allowed: boolean;
  override_allowed: boolean;
  revalidation_allowed: boolean;
  state: string;
} {
  const { validation_status, has_blocked_rules, has_unresolved_manual_checks, has_stale_validation, has_override_eligible_rules } = params;

  if (['COMPLETED', 'ARCHIVED'].includes(validation_status)) {
    return { proceed_allowed: false, send_to_review_queue_allowed: false, send_to_approvals_allowed: false, revision_allowed: false, escalate_allowed: false, block_allowed: false, override_allowed: false, revalidation_allowed: false, state: 'LOCKED' };
  }

  if (has_stale_validation) {
    return { proceed_allowed: false, send_to_review_queue_allowed: false, send_to_approvals_allowed: false, revision_allowed: false, escalate_allowed: false, block_allowed: true, override_allowed: false, revalidation_allowed: true, state: 'REVALIDATION_REQUIRED' };
  }

  if (has_blocked_rules) {
    return { proceed_allowed: false, send_to_review_queue_allowed: false, send_to_approvals_allowed: false, revision_allowed: false, escalate_allowed: true, block_allowed: false, override_allowed: false, revalidation_allowed: false, state: 'BLOCKED' };
  }

  if (validation_status === 'ESCALATION_REQUIRED') {
    return { proceed_allowed: false, send_to_review_queue_allowed: false, send_to_approvals_allowed: false, revision_allowed: false, escalate_allowed: false, block_allowed: true, override_allowed: false, revalidation_allowed: false, state: 'ESCALATION_REQUIRED' };
  }

  if (has_unresolved_manual_checks) {
    return { proceed_allowed: false, send_to_review_queue_allowed: false, send_to_approvals_allowed: false, revision_allowed: false, escalate_allowed: true, block_allowed: true, override_allowed: false, revalidation_allowed: false, state: 'MANUAL_CHECK_REQUIRED' };
  }

  if (validation_status === 'NEEDS_REVISION') {
    return { proceed_allowed: false, send_to_review_queue_allowed: false, send_to_approvals_allowed: false, revision_allowed: false, escalate_allowed: true, block_allowed: true, override_allowed: false, revalidation_allowed: true, state: 'REVISION_REQUIRED' };
  }

  if (validation_status === 'FAILED') {
    return { proceed_allowed: false, send_to_review_queue_allowed: false, send_to_approvals_allowed: false, revision_allowed: true, escalate_allowed: true, block_allowed: true, override_allowed: has_override_eligible_rules, revalidation_allowed: true, state: 'FAILED' };
  }

  if (validation_status === 'WARNING') {
    return { proceed_allowed: true, send_to_review_queue_allowed: true, send_to_approvals_allowed: true, revision_allowed: true, escalate_allowed: true, block_allowed: true, override_allowed: has_override_eligible_rules, revalidation_allowed: false, state: 'WARNING_PROCEED_ELIGIBLE' };
  }

  if (['PASSED', 'PASSED_WITH_OVERRIDE'].includes(validation_status)) {
    return { proceed_allowed: true, send_to_review_queue_allowed: true, send_to_approvals_allowed: true, revision_allowed: false, escalate_allowed: false, block_allowed: false, override_allowed: false, revalidation_allowed: false, state: 'PROCEED_ELIGIBLE' };
  }

  return { proceed_allowed: false, send_to_review_queue_allowed: false, send_to_approvals_allowed: false, revision_allowed: false, escalate_allowed: false, block_allowed: false, override_allowed: false, revalidation_allowed: false, state: 'PENDING' };
}

export async function getValidationRuns(validation_item_id: string): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseAdmin
    .from('validation_runs')
    .select('*')
    .eq('validation_item_id', validation_item_id)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getGroundingResults(validation_item_id: string): Promise<Record<string, unknown>[]> {
  const { data: runs } = await supabaseAdmin
    .from('validation_runs')
    .select('id')
    .eq('validation_item_id', validation_item_id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (!runs || runs.length === 0) return [];
  const { data } = await supabaseAdmin
    .from('validation_source_grounding')
    .select('*')
    .eq('validation_run_id', runs[0].id)
    .order('created_at');
  return data || [];
}

export async function getValidationNotes(validation_item_id: string): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseAdmin
    .from('validation_notes')
    .select('*')
    .eq('validation_item_id', validation_item_id)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getManualChecks(validation_item_id: string): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseAdmin
    .from('validation_manual_checks')
    .select('*')
    .eq('validation_item_id', validation_item_id)
    .order('completed_at', { ascending: false });
  return data || [];
}

export async function getApprovalReadiness(validation_item_id: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabaseAdmin
    .from('validation_items')
    .select('validation_status, approval_readiness_status, platform_readiness_status, risk_level, validation_score')
    .eq('id', validation_item_id)
    .single();
  return data || null;
}

export async function getRuleHistory(validation_item_id: string): Promise<Record<string, unknown>[]> {
  const { data: runs } = await supabaseAdmin
    .from('validation_runs')
    .select('id')
    .eq('validation_item_id', validation_item_id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (!runs || runs.length === 0) return [];
  const { data } = await supabaseAdmin
    .from('validation_rule_results')
    .select('*')
    .eq('validation_run_id', runs[0].id)
    .order('created_at');
  return data || [];
}
