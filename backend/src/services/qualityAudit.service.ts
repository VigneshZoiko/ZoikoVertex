import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { internalEventBus } from '../shared/internalEventBus';
import { logger } from '../shared/logger';
import { logToDatabase } from '../shared/databaseLogger';

export type AuditItemType = 'social_post' | 'inbox_reply' | 'campaign_asset' | 'agent_action' | 'workflow_output' | 'approval_decision' | 'validation_override' | 'escalation_outcome' | 'published_content_check' | 'sampled_item';
export type AuditStatus = 'AUDIT_PENDING' | 'IN_AUDIT' | 'PASSED' | 'FAILED' | 'NEEDS_CORRECTION' | 'CORRECTIVE_ACTION_OPEN' | 'CORRECTIVE_ACTION_COMPLETE' | 'ESCALATED' | 'CLOSED' | 'ARCHIVED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DefectSeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
export type DefectCategory = 'accuracy_issue' | 'brand_voice_issue' | 'compliance_issue' | 'unsupported_claim' | 'source_grounding_issue' | 'tone_issue' | 'platform_formatting_issue' | 'audience_mismatch' | 'approval_path_issue' | 'published_version_mismatch' | 'missing_evidence' | 'poor_ai_output' | 'human_edit_introduced_issue' | 'reviewer_missed_issue' | 'escalation_mishandled' | 'other';
export type CorrectiveActionStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'ESCALATED' | 'CLOSED';
export type EvidenceType = 'source_snapshot' | 'ai_draft' | 'human_edits' | 'approved_version' | 'published_version' | 'validation_results' | 'approval_history' | 'policy_flag' | 'platform_proof' | 'audit_decision' | 'defect_record' | 'corrective_action' | 'audit_export' | 'supplemental';
export type EligibilityState = 'PASS_ELIGIBLE' | 'FAIL_REQUIRED' | 'CORRECTION_REQUIRED' | 'EVIDENCE_MISSING' | 'PUBLISHED_MISMATCH' | 'ESCALATION_REQUIRED' | 'SCORE_OVERRIDE_ELIGIBLE' | 'SCORE_OVERRIDE_PROHIBITED';

export interface AuditItem {
  id: string;
  tenant_id: string;
  workspace_id: string;
  source_module: string;
  source_entity_id: string;
  item_type: AuditItemType;
  title: string;
  campaign_id?: string;
  platform?: string;
  original_status?: string;
  audit_status: AuditStatus;
  risk_level: RiskLevel;
  quality_score?: number;
  score_band?: string;
  defect_count: number;
  highest_defect_severity?: DefectSeverity;
  assigned_auditor?: string;
  original_reviewer?: string;
  agent_id?: string;
  content_snapshot?: Record<string, unknown>;
  ai_draft?: string;
  human_edited_version?: string;
  approved_version?: string;
  published_version?: string;
  validation_results?: Record<string, unknown>;
  approval_history?: Record<string, unknown>;
  published_mismatch: boolean;
  sampled_by?: string;
  sample_reason?: string;
  published_at?: string;
  sent_at?: string;
  audit_due_at?: string;
  audit_started_at?: string;
  audit_completed_at?: string;
  closed_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditItemInput {
  tenant_id: string;
  workspace_id: string;
  source_module: string;
  source_entity_id: string;
  item_type: AuditItemType;
  title: string;
  campaign_id?: string;
  platform?: string;
  original_status?: string;
  risk_level?: RiskLevel;
  content_snapshot?: Record<string, unknown>;
  ai_draft?: string;
  human_edited_version?: string;
  approved_version?: string;
  published_version?: string;
  validation_results?: Record<string, unknown>;
  approval_history?: Record<string, unknown>;
  assigned_auditor?: string;
  original_reviewer?: string;
  agent_id?: string;
  audit_due_at?: string;
  published_at?: string;
  sent_at?: string;
}

export interface ScorecardInput {
  audit_item_id: string;
  accuracy_score: number;
  brand_voice_score: number;
  compliance_readiness_score: number;
  source_grounding_score: number;
  platform_fit_score: number;
  tone_clarity_score: number;
  audience_relevance_score: number;
  review_integrity_score: number;
  publication_consistency_score: number;
  scored_by: string;
}

export interface DefectInput {
  audit_item_id: string;
  defect_category: DefectCategory;
  defect_severity: DefectSeverity;
  defect_description: string;
  evidence_reference?: string;
  responsible_source?: string;
  corrective_action_required?: boolean;
  owner?: string;
  due_at?: string;
  created_by: string;
}

export interface CorrectiveActionInput {
  audit_item_id: string;
  defect_id?: string;
  title: string;
  owner?: string;
  priority?: string;
  required_action: string;
  due_at?: string;
  created_by: string;
}

export interface AuditNoteInput {
  audit_item_id: string;
  parent_note_id?: string;
  note_body: string;
  created_by: string;
}

export interface EvidenceInput {
  audit_item_id: string;
  evidence_type: EvidenceType;
  evidence_reference: string;
  source_module?: string;
  created_by: string;
}

// ─── Audit Items ──────────────────────────────────────────────────────────

export async function createAuditItem(input: AuditItemInput): Promise<AuditItem> {
  const id = uuidv4();
  const { data, error } = await supabaseAdmin
    .from('quality_audit_items')
    .insert({
      id,
      tenant_id: input.tenant_id,
      workspace_id: input.workspace_id,
      source_module: input.source_module,
      source_entity_id: input.source_entity_id,
      item_type: input.item_type,
      title: input.title,
      campaign_id: input.campaign_id || null,
      platform: input.platform || null,
      original_status: input.original_status || null,
      risk_level: input.risk_level || 'LOW',
      content_snapshot: input.content_snapshot || {},
      ai_draft: input.ai_draft || null,
      human_edited_version: input.human_edited_version || null,
      approved_version: input.approved_version || null,
      published_version: input.published_version || null,
      validation_results: input.validation_results || {},
      approval_history: input.approval_history || {},
      assigned_auditor: input.assigned_auditor || null,
      original_reviewer: input.original_reviewer || null,
      agent_id: input.agent_id || null,
      audit_due_at: input.audit_due_at || null,
      published_at: input.published_at || null,
      sent_at: input.sent_at || null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, '[QualityAudit] createAuditItem failed');
    throw error;
  }

  await createAuditLog({
    tenant_id: input.tenant_id,
    audit_item_id: id,
    action: 'ITEM_CREATED',
    new_value: input.item_type,
    performed_by: input.tenant_id,
  });

  return data;
}

export async function listAuditItems(params: {
  tenant_id: string;
  audit_status?: string;
  assigned_auditor?: string;
  risk_level?: string;
  item_type?: string;
  source_module?: string;
  campaign_id?: string;
  defect_severity?: string;
  published_mismatch?: boolean;
  score_band?: string;
  overdue_only?: boolean;
  sampled_only?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<{ items: AuditItem[]; total: number }> {
  let query = supabaseAdmin
    .from('quality_audit_items')
    .select('*', { count: 'exact' });

  query = query.eq('tenant_id', params.tenant_id);

  if (params.audit_status) {
    const statuses = params.audit_status.split(',');
    query = query.in('audit_status', statuses);
  }
  if (params.assigned_auditor) query = query.eq('assigned_auditor', params.assigned_auditor);
  if (params.risk_level) query = query.eq('risk_level', params.risk_level);
  if (params.item_type) query = query.eq('item_type', params.item_type);
  if (params.source_module) query = query.eq('source_module', params.source_module);
  if (params.campaign_id) query = query.eq('campaign_id', params.campaign_id);
  if (params.defect_severity) query = query.eq('highest_defect_severity', params.defect_severity);
  if (params.published_mismatch !== undefined) query = query.eq('published_mismatch', params.published_mismatch);
  if (params.score_band) query = query.eq('score_band', params.score_band);
  if (params.overdue_only) query = query.not('audit_due_at', 'is', null).lt('audit_due_at', new Date().toISOString());
  if (params.sampled_only) query = query.not('sampled_by', 'is', null);

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,campaign_id.ilike.%${params.search}%,platform.ilike.%${params.search}%`);
  }

  const sortCol = params.sort_by || 'created_at';
  const sortDir = params.sort_order || 'desc';
  query = query.order(sortCol, { ascending: sortDir === 'asc' });

  const page = params.page || 1;
  const limit = params.limit || 25;
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error({ error }, '[QualityAudit] listAuditItems failed');
    throw error;
  }

  return { items: data || [], total: count || 0 };
}

export async function getAuditItem(id: string): Promise<AuditItem & {
  scorecard?: Record<string, unknown>;
  defects?: Record<string, unknown>[];
  corrective_actions?: Record<string, unknown>[];
  notes?: Record<string, unknown>[];
  evidence?: Record<string, unknown>[];
  audit_log?: Record<string, unknown>[];
}> {
  const { data: item, error } = await supabaseAdmin
    .from('quality_audit_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !item) {
    logger.error({ error }, '[QualityAudit] getAuditItem failed');
    throw error || new Error('Audit item not found');
  }

  const [scorecard, defects, correctiveActions, notes, evidence, auditLog] = await Promise.all([
    supabaseAdmin.from('quality_audit_scorecards').select('*').eq('audit_item_id', id).maybeSingle(),
    supabaseAdmin.from('quality_audit_defects').select('*').eq('audit_item_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('quality_audit_corrective_actions').select('*').eq('audit_item_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('quality_audit_notes').select('*').eq('audit_item_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('quality_audit_evidence').select('*').eq('audit_item_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('quality_audit_log').select('*').eq('audit_item_id', id).order('performed_at', { ascending: false }),
  ]);

  return {
    ...item,
    scorecard: scorecard.data || undefined,
    defects: defects.data || [],
    corrective_actions: correctiveActions.data || [],
    notes: notes.data || [],
    evidence: evidence.data || [],
    audit_log: auditLog.data || [],
  };
}

export async function updateAuditStatus(
  id: string,
  status: AuditStatus,
  performed_by: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const { data: current } = await supabaseAdmin
    .from('quality_audit_items')
    .select('audit_status')
    .eq('id', id)
    .single();

  const updateData: Record<string, unknown> = { audit_status: status, updated_at: new Date().toISOString() };
  if (status === 'IN_AUDIT') updateData.audit_started_at = new Date().toISOString();
  if (status === 'PASSED' || status === 'FAILED') updateData.audit_completed_at = new Date().toISOString();
  if (status === 'CLOSED') updateData.closed_at = new Date().toISOString();
  if (status === 'ARCHIVED') updateData.archived_at = new Date().toISOString();
  if (extra) Object.assign(updateData, extra);

  const { error } = await supabaseAdmin
    .from('quality_audit_items')
    .update(updateData)
    .eq('id', id);

  if (error) {
    logger.error({ error }, '[QualityAudit] updateAuditStatus failed');
    throw error;
  }

  await createAuditLog({
    tenant_id: extra?.tenant_id as string || performed_by,
    audit_item_id: id,
    action: `STATUS_${status}`,
    previous_value: current?.audit_status,
    new_value: status,
    performed_by,
  });

  const terminalStates: AuditStatus[] = ['PASSED', 'FAILED', 'CLOSED', 'ARCHIVED'];
  if (terminalStates.includes(status)) {
    try {
      internalEventBus.emit('quality.audit_completed', {
        workspace_id: 'default',
        tenant_id: extra?.tenant_id as string || performed_by,
        actor_id: performed_by,
        audit_item_id: id,
        result: status,
      });
    } catch { /* non-blocking */ }
  }
}

export async function assignAuditor(
  id: string,
  auditor_id: string,
  performed_by: string,
  tenant_id: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('quality_audit_items')
    .update({ assigned_auditor: auditor_id, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error({ error }, '[QualityAudit] assignAuditor failed');
    throw error;
  }

  await createAuditLog({
    tenant_id,
    audit_item_id: id,
    action: 'AUDITOR_ASSIGNED',
    new_value: auditor_id,
    performed_by,
  });
}

// ─── Scorecard ────────────────────────────────────────────────────────────

export async function upsertScorecard(input: ScorecardInput): Promise<Record<string, unknown>> {
  const { data: existing } = await supabaseAdmin
    .from('quality_audit_scorecards')
    .select('id')
    .eq('audit_item_id', input.audit_item_id)
    .maybeSingle();

  const payload = {
    ...input,
    scored_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('quality_audit_scorecards')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('quality_audit_scorecards')
      .insert({ id: uuidv4(), ...payload })
      .select()
      .single();
    if (error) throw error;
    result = data;
  }

  const overallScore = result.overall_score;
  await supabaseAdmin
    .from('quality_audit_items')
    .update({ quality_score: overallScore, updated_at: new Date().toISOString() })
    .eq('id', input.audit_item_id);

  return result;
}

export async function applyScoreOverride(
  audit_item_id: string,
  override_score: number,
  reason: string,
  note: string,
  overridden_by: string,
  tenant_id: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('quality_audit_scorecards')
    .update({
      score_override: override_score,
      score_override_reason: reason,
      score_override_note: note,
      score_overridden_by: overridden_by,
      score_overridden_at: new Date().toISOString(),
    })
    .eq('audit_item_id', audit_item_id);

  if (error) {
    logger.error({ error }, '[QualityAudit] applyScoreOverride failed');
    throw error;
  }

  await supabaseAdmin
    .from('quality_audit_items')
    .update({ quality_score: override_score, updated_at: new Date().toISOString() })
    .eq('id', audit_item_id);

  await createAuditLog({
    tenant_id,
    audit_item_id,
    action: 'SCORE_OVERRIDDEN',
    new_value: String(override_score),
    payload: { reason, note },
    performed_by: overridden_by,
  });
}

// ─── Defects ──────────────────────────────────────────────────────────────

export async function createDefect(input: DefectInput): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin
    .from('quality_audit_defects')
    .insert({
      id: uuidv4(),
      audit_item_id: input.audit_item_id,
      defect_category: input.defect_category,
      defect_severity: input.defect_severity,
      defect_description: input.defect_description,
      evidence_reference: input.evidence_reference || null,
      responsible_source: input.responsible_source || null,
      corrective_action_required: input.corrective_action_required || false,
      owner: input.owner || null,
      due_at: input.due_at || null,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, '[QualityAudit] createDefect failed');
    throw error;
  }

  await updateItemDefectCount(input.audit_item_id);
  return data;
}

export async function resolveDefect(
  defect_id: string,
  performed_by: string,
  tenant_id: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('quality_audit_defects')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', defect_id);

  if (error) {
    logger.error({ error }, '[QualityAudit] resolveDefect failed');
    throw error;
  }

  const defect = await supabaseAdmin.from('quality_audit_defects').select('audit_item_id').eq('id', defect_id).single();
  if (defect.data) {
    await updateItemDefectCount(defect.data.audit_item_id);
    await createAuditLog({
      tenant_id,
      audit_item_id: defect.data.audit_item_id,
      action: 'DEFECT_RESOLVED',
      new_value: defect_id,
      performed_by,
    });
  }
}

async function updateItemDefectCount(audit_item_id: string): Promise<void> {
  const { count } = await supabaseAdmin
    .from('quality_audit_defects')
    .select('*', { count: 'exact', head: true })
    .eq('audit_item_id', audit_item_id);

  const { data: defects } = await supabaseAdmin
    .from('quality_audit_defects')
    .select('defect_severity')
    .eq('audit_item_id', audit_item_id)
    .is('resolved_at', null)
    .order('defect_severity', { ascending: false })
    .limit(1);

  const severityOrder: Record<string, number> = { CRITICAL: 4, MAJOR: 3, MODERATE: 2, MINOR: 1 };
  const highest = defects && defects.length > 0
    ? defects.sort((a, b) => (severityOrder[b.defect_severity] || 0) - (severityOrder[a.defect_severity] || 0))[0].defect_severity
    : null;

  await supabaseAdmin
    .from('quality_audit_items')
    .update({
      defect_count: count || 0,
      highest_defect_severity: highest,
      updated_at: new Date().toISOString(),
    })
    .eq('id', audit_item_id);
}

// ─── Corrective Actions ───────────────────────────────────────────────────

export async function createCorrectiveAction(input: CorrectiveActionInput): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin
    .from('quality_audit_corrective_actions')
    .insert({
      id: uuidv4(),
      audit_item_id: input.audit_item_id,
      defect_id: input.defect_id || null,
      title: input.title,
      owner: input.owner || null,
      priority: input.priority || 'MEDIUM',
      required_action: input.required_action,
      due_at: input.due_at || null,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, '[QualityAudit] createCorrectiveAction failed');
    throw error;
  }

  await updateAuditStatus(input.audit_item_id, 'CORRECTIVE_ACTION_OPEN', input.created_by, {
    tenant_id: input.created_by,
  });

  await createAuditLog({
    tenant_id: input.created_by,
    audit_item_id: input.audit_item_id,
    action: 'CORRECTIVE_ACTION_CREATED',
    new_value: data.id,
    performed_by: input.created_by,
  });

  return data;
}

export async function updateCorrectiveAction(
  id: string,
  updates: { status?: CorrectiveActionStatus; owner?: string; due_at?: string; completed_at?: string; closed_at?: string },
  performed_by: string,
  tenant_id: string
): Promise<void> {
  const payload: Record<string, unknown> = { ...updates };
  if (updates.status === 'COMPLETED') payload.completed_at = new Date().toISOString();
  if (updates.status === 'CLOSED') payload.closed_at = new Date().toISOString();
  payload.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('quality_audit_corrective_actions')
    .update(payload)
    .eq('id', id);

  if (error) {
    logger.error({ error }, '[QualityAudit] updateCorrectiveAction failed');
    throw error;
  }

  const action = await supabaseAdmin.from('quality_audit_corrective_actions').select('audit_item_id').eq('id', id).single();
  if (action.data) {
    await createAuditLog({
      tenant_id,
      audit_item_id: action.data.audit_item_id,
      action: `CORRECTIVE_ACTION_${updates.status || 'UPDATED'}`,
      new_value: id,
      payload: updates,
      performed_by,
    });
  }
}

// ─── Notes ────────────────────────────────────────────────────────────────

export async function addAuditNote(input: AuditNoteInput): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin
    .from('quality_audit_notes')
    .insert({
      id: uuidv4(),
      audit_item_id: input.audit_item_id,
      parent_note_id: input.parent_note_id || null,
      note_body: input.note_body,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, '[QualityAudit] addAuditNote failed');
    throw error;
  }

  await logToDatabase('info', 'QualityAudit', `Note added to audit ${input.audit_item_id}`, {
    audit_item_id: input.audit_item_id,
    user: input.created_by,
  });

  return data;
}

// ─── Evidence ─────────────────────────────────────────────────────────────

export async function addEvidence(input: EvidenceInput): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin
    .from('quality_audit_evidence')
    .insert({
      id: uuidv4(),
      audit_item_id: input.audit_item_id,
      evidence_type: input.evidence_type,
      evidence_reference: input.evidence_reference,
      source_module: input.source_module || null,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, '[QualityAudit] addEvidence failed');
    throw error;
  }

  return data;
}

export async function getEvidence(audit_item_id: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabaseAdmin
    .from('quality_audit_evidence')
    .select('*')
    .eq('audit_item_id', audit_item_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─── Audit Log ────────────────────────────────────────────────────────────

async function createAuditLog(input: {
  tenant_id: string;
  audit_item_id: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  payload?: Record<string, unknown>;
  performed_by: string;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('quality_audit_log')
    .insert({
      id: uuidv4(),
      tenant_id: input.tenant_id,
      audit_item_id: input.audit_item_id,
      action: input.action,
      previous_value: input.previous_value || null,
      new_value: input.new_value || null,
      payload: input.payload || {},
      performed_by: input.performed_by,
    });

  if (error) {
    logger.error({ error }, '[QualityAudit] createAuditLog failed');
  }
}

export async function getAuditLog(audit_item_id: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabaseAdmin
    .from('quality_audit_log')
    .select('*')
    .eq('audit_item_id', audit_item_id)
    .order('performed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─── Callbacks ────────────────────────────────────────────────────────────

export async function processPendingCallbacks(tenant_id: string, limit: number = 10): Promise<{ processed: number; failed: number }> {
  const { data: pending } = await supabaseAdmin
    .from('quality_audit_callbacks')
    .select('*')
    .eq('callback_status', 'PENDING')
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
          audit_item_id: cb.audit_item_id,
          source_entity_id: cb.source_entity_id,
          callback_payload: cb.callback_payload,
        }),
      });

      await supabaseAdmin
        .from('quality_audit_callbacks')
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
        .from('quality_audit_callbacks')
        .update({
          callback_status: 'FAILED',
          last_attempt_at: new Date().toISOString(),
          retry_count: (cb.retry_count || 0) + 1,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cb.id);

      await createAuditLog({
        tenant_id,
        audit_item_id: cb.audit_item_id,
        action: 'CALLBACK_FAILED',
        new_value: errorMessage,
        performed_by: 'system',
      });
      failed++;
    }
  }

  return { processed, failed };
}

export async function createCallback(input: {
  audit_item_id: string;
  source_module: string;
  source_entity_id: string;
  callback_payload?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin
    .from('quality_audit_callbacks')
    .insert({
      id: uuidv4(),
      audit_item_id: input.audit_item_id,
      source_module: input.source_module,
      source_entity_id: input.source_entity_id,
      callback_payload: input.callback_payload || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function retryCallback(callback_id: string, performed_by: string, tenant_id: string): Promise<Record<string, unknown>> {
  const { data: cb, error: fetchErr } = await supabaseAdmin
    .from('quality_audit_callbacks')
    .select('*')
    .eq('id', callback_id)
    .single();

  if (fetchErr || !cb) throw fetchErr || new Error('Callback not found');

  const { data, error } = await supabaseAdmin
    .from('quality_audit_callbacks')
    .update({
      callback_status: 'PENDING',
      retry_count: (cb.retry_count || 0) + 1,
      last_attempt_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', callback_id)
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    tenant_id,
    audit_item_id: cb.audit_item_id,
    action: 'CALLBACK_RETRIED',
    new_value: callback_id,
    performed_by,
  });

  return data;
}

// ─── Stats ────────────────────────────────────────────────────────────────

export async function getAuditStats(tenant_id: string, filters?: { assigned_auditor?: string }): Promise<{
  total: number;
  in_audit: number;
  passed: number;
  failed: number;
  needs_correction: number;
  average_score: number | null;
  critical_defects: number;
  published_mismatches: number;
  corrective_actions_overdue: number;
  evidence_missing: number;
}> {
  let baseQuery = supabaseAdmin.from('quality_audit_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id);
  if (filters?.assigned_auditor) baseQuery = baseQuery.eq('assigned_auditor', filters.assigned_auditor);

  const { data: validItems } = await supabaseAdmin.from('quality_audit_items').select('id').eq('tenant_id', tenant_id).not('audit_status', 'in', '("ARCHIVED")');
  const validItemIds = validItems?.map(i => i.id) || [];

  const [totalResult, inAuditResult, passedResult, failedResult, needsCorrResult, scoreResult, criticalResult, mismatchResult, caOverdueResult, evidenceResult] = await Promise.all([
    baseQuery,
    supabaseAdmin.from('quality_audit_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('audit_status', 'IN_AUDIT'),
    supabaseAdmin.from('quality_audit_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('audit_status', 'PASSED'),
    supabaseAdmin.from('quality_audit_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('audit_status', 'FAILED'),
    supabaseAdmin.from('quality_audit_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).in('audit_status', ['NEEDS_CORRECTION', 'CORRECTIVE_ACTION_OPEN']),
    supabaseAdmin.from('quality_audit_items').select('quality_score').eq('tenant_id', tenant_id).not('quality_score', 'is', null),
    validItemIds.length > 0 ? supabaseAdmin.from('quality_audit_defects').select('*', { count: 'exact', head: true }).in('audit_item_id', validItemIds).eq('defect_severity', 'CRITICAL').is('resolved_at', null) : { count: 0, data: null, error: null },
    supabaseAdmin.from('quality_audit_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('published_mismatch', true),
    validItemIds.length > 0 ? supabaseAdmin.from('quality_audit_corrective_actions').select('*', { count: 'exact', head: true }).in('audit_item_id', validItemIds).in('status', ['OPEN', 'ASSIGNED', 'IN_PROGRESS']).lt('due_at', new Date().toISOString()) : { count: 0, data: null, error: null },
    supabaseAdmin.from('quality_audit_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant_id).eq('audit_status', 'IN_AUDIT').is('quality_score', null),
  ]);

  const scores = scoreResult.data as { quality_score: number }[] || [];
  const avg = scores.length > 0 ? scores.reduce((sum: number, s: { quality_score: number }) => sum + (s.quality_score || 0), 0) / scores.length : null;

  return {
    total: totalResult.count || 0,
    in_audit: inAuditResult.count || 0,
    passed: passedResult.count || 0,
    failed: failedResult.count || 0,
    needs_correction: needsCorrResult.count || 0,
    average_score: avg ? Math.round(avg * 100) / 100 : null,
    critical_defects: criticalResult.count || 0,
    published_mismatches: mismatchResult.count || 0,
    corrective_actions_overdue: caOverdueResult.count || 0,
    evidence_missing: evidenceResult.count || 0,
  };
}

// ─── Eligibility ──────────────────────────────────────────────────────────

export function calculateEligibility(params: {
  has_scorecard: boolean;
  has_unresolved_major_or_critical: boolean;
  published_mismatch: boolean;
  has_evidence: boolean;
  audit_status: string;
  risk_level: string;
  has_score_override: boolean;
}): { state: EligibilityState; pass_allowed: boolean; fail_allowed: boolean; correction_allowed: boolean; escalate_allowed: boolean; override_allowed: boolean } {
  const { has_scorecard, has_unresolved_major_or_critical, published_mismatch, has_evidence, audit_status, risk_level, has_score_override } = params;

  if (['PASSED', 'FAILED', 'CLOSED', 'ARCHIVED'].includes(audit_status)) {
    return {
      state: 'SCORE_OVERRIDE_PROHIBITED',
      pass_allowed: false,
      fail_allowed: false,
      correction_allowed: false,
      escalate_allowed: false,
      override_allowed: false,
    };
  }

  if (!has_evidence) {
    return {
      state: 'EVIDENCE_MISSING',
      pass_allowed: false,
      fail_allowed: true,
      correction_allowed: true,
      escalate_allowed: true,
      override_allowed: false,
    };
  }

  if (published_mismatch) {
    return {
      state: 'PUBLISHED_MISMATCH',
      pass_allowed: false,
      fail_allowed: true,
      correction_allowed: true,
      escalate_allowed: true,
      override_allowed: false,
    };
  }

  if (has_unresolved_major_or_critical && risk_level === 'CRITICAL') {
    return {
      state: 'ESCALATION_REQUIRED',
      pass_allowed: false,
      fail_allowed: true,
      correction_allowed: true,
      escalate_allowed: true,
      override_allowed: false,
    };
  }

  if (has_unresolved_major_or_critical) {
    return {
      state: 'FAIL_REQUIRED',
      pass_allowed: false,
      fail_allowed: true,
      correction_allowed: true,
      escalate_allowed: true,
      override_allowed: false,
    };
  }

  if (!has_scorecard) {
    return {
      state: 'CORRECTION_REQUIRED',
      pass_allowed: false,
      fail_allowed: true,
      correction_allowed: true,
      escalate_allowed: false,
      override_allowed: false,
    };
  }

  if (has_score_override) {
    return {
      state: 'SCORE_OVERRIDE_ELIGIBLE',
      pass_allowed: true,
      fail_allowed: true,
      correction_allowed: true,
      escalate_allowed: false,
      override_allowed: true,
    };
  }

  return {
    state: 'PASS_ELIGIBLE',
    pass_allowed: true,
    fail_allowed: true,
    correction_allowed: true,
    escalate_allowed: false,
    override_allowed: false,
  };
}

// ─── Sampling ─────────────────────────────────────────────────────────────

export async function generateSample(params: {
  tenant_id: string;
  workspace_id: string;
  created_by: string;
  source_module?: string;
  campaign_id?: string;
  platform?: string;
  risk_level?: string;
  count?: number;
}): Promise<AuditItem[]> {
  const count = params.count || 10;
  const items: AuditItem[] = [];

  for (let i = 0; i < count; i++) {
    const item = await createAuditItem({
      tenant_id: params.tenant_id,
      workspace_id: params.workspace_id,
      source_module: params.source_module || 'quality_audit',
      source_entity_id: `sample-${uuidv4()}`,
      item_type: 'sampled_item',
      title: `Audit Sample ${i + 1}`,
      campaign_id: params.campaign_id,
      platform: params.platform,
      risk_level: (params.risk_level as RiskLevel) || 'LOW',
      audit_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    items.push(item);
  }

  return items;
}
