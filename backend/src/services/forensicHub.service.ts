import { supabaseAdmin } from '../shared/supabase';
import { createAuditEvent } from './auditTrail.service';
import { internalEventBus } from '../shared/internalEventBus';
import { logger } from '../shared/logger';

const BUSINESS_HOURS_PER_DAY = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForensicCase {
  id: string;
  case_id: string;
  tenant_id: string;
  workspace_id: string;
  case_type: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  owner_user_id: string | null;
  participants?: CaseParticipant[];
  source: string;
  source_event_ids: string[];
  related_object_ids: any[];
  legal_hold_active: boolean;
  privilege_flag: boolean;
  retention_class: string;
  sla_due_at: string | null;
  closed_at: string | null;
  closure: any;
  schema_version: string;
  data_residency: string;
  chain_hash: string | null;
  prev_hash: string | null;
  block_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface CaseParticipant {
  id: string;
  case_id: string;
  user_id: string;
  role_in_case: string;
  added_by: string;
  added_reason: string | null;
  added_at: string;
}

export interface CaseEvidenceItem {
  id: string;
  case_id: string;
  source_type: string;
  source_id: string;
  relevance: string;
  vault_status: string;
  hash: string | null;
  chain_block_number: number | null;
  added_by: string;
  added_reason: string;
  pin_reason: string | null;
  pinned_at: string | null;
  is_pinned: boolean;
  removed_at: string | null;
  removal_reason: string | null;
  metadata: any;
  added_at: string;
  privilege_flag: boolean;
  privileged_by: string | null;
  privileged_at: string | null;
}

export interface CaseNote {
  id: string;
  case_id: string;
  note_class: string;
  content: string;
  author_id: string;
  is_edited: boolean;
  original_content: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface CaseAction {
  id: string;
  case_id: string;
  action_type: string;
  actor_id: string;
  reason: string;
  before_state: any;
  after_state: any;
  audit_event_id: string | null;
  created_at: string;
}

export interface CaseTask {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  owner_id: string;
  status: string;
  due_at: string | null;
  evidence_link: any;
  completion_proof: string | null;
  created_at: string;
  completed_at: string | null;
}

// ─── Valid state transitions ──────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['triage', 'closed'],
  triage: ['active_investigation', 'awaiting_information', 'escalated', 'closed'],
  active_investigation: ['awaiting_information', 'legal_review', 'remediation', 'escalated', 'closed'],
  awaiting_information: ['active_investigation', 'escalated', 'closed'],
  legal_review: ['active_investigation', 'remediation', 'legal_hold', 'closed'],
  legal_hold: ['active_investigation', 'legal_review', 'closed'],
  remediation: ['validation', 'active_investigation', 'escalated'],
  validation: ['closed', 'active_investigation'],
  escalated: ['active_investigation', 'legal_review', 'closed'],
  closed: ['reopened'],
  reopened: ['active_investigation', 'legal_review', 'closed'],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// ─── Field-Level ACL ──────────────────────────────────────────────────────────

const ACCESS_MATRIX: Record<string, Record<string, string>> = {
  case_title_id_status_type_severity: {
    admin: 'full', security: 'full', compliance: 'full', legal: 'full',
    campaign_manager: 'scoped', publisher: 'scoped', executive: 'full', external_auditor: 'approved_package',
  },
  actor_name_role: {
    admin: 'full', security: 'full', compliance: 'full', legal: 'full',
    campaign_manager: 'scoped', publisher: 'self_scoped', executive: 'full', external_auditor: 'hashed',
  },
  actor_email: {
    admin: 'full', security: 'full', compliance: 'full', legal: 'full',
    campaign_manager: 'self_scoped', publisher: 'self_only', executive: 'redacted', external_auditor: 'hashed',
  },
  ip_session_device: {
    admin: 'full', security: 'full', compliance: 'redacted', legal: 'full_if_legal',
    campaign_manager: 'denied', publisher: 'denied', executive: 'denied', external_auditor: 'hashed_if_approved',
  },
  raw_ai_prompt_output: {
    admin: 'redacted', security: 'full_if_scoped', compliance: 'full_if_scoped', legal: 'full_if_legal',
    campaign_manager: 'denied', publisher: 'denied', executive: 'redacted', external_auditor: 'denied',
  },
  legal_privileged_notes: {
    admin: 'denied_unless_added', security: 'denied_unless_added', compliance: 'denied_unless_added', legal: 'full',
    campaign_manager: 'denied', publisher: 'denied', executive: 'denied', external_auditor: 'denied_unless_approved',
  },
  evidence_hashes_manifest: {
    admin: 'full', security: 'full', compliance: 'full', legal: 'full',
    campaign_manager: 'scoped', publisher: 'scoped', executive: 'full', external_auditor: 'full_for_approved',
  },
  external_attachments: {
    admin: 'full_if_scoped', security: 'full_if_scoped', compliance: 'full_if_scoped', legal: 'full',
    campaign_manager: 'scoped_redacted', publisher: 'denied_unless_participant', executive: 'redacted', external_auditor: 'approved_package_only',
  },
  export_history: {
    admin: 'full', security: 'full', compliance: 'full', legal: 'full',
    campaign_manager: 'denied_unless_owner', publisher: 'denied', executive: 'summary', external_auditor: 'approved_package_only',
  },
};

const ROLE_ALIASES: Record<string, string[]> = {
  admin: ['WORKSPACE_OWNER', 'SUPER_ADMIN', 'ADMIN'],
  security: ['SECURITY_ADMIN', 'SECURITY_OFFICER'],
  compliance: ['COMPLIANCE_REVIEWER', 'COMPLIANCE_OFFICER'],
  legal: ['LEGAL_COUNSEL'],
  campaign_manager: ['CAMPAIGN_MANAGER'],
  publisher: ['PUBLISHER'],
  executive: ['EXECUTIVE_VIEWER'],
  external_auditor: ['EXTERNAL_AUDITOR'],
};

function resolveAccessRole(userRoles: string[]): string {
  for (const [alias, roles] of Object.entries(ROLE_ALIASES)) {
    if (roles.some(r => userRoles.includes(r))) return alias;
  }
  return 'publisher';
}

export function applyFieldAccess(userRoles: string[], fieldKey: string, value: any, userId?: string, resourceUserId?: string): any {
  const role = resolveAccessRole(userRoles);
  const rules = ACCESS_MATRIX[fieldKey];
  if (!rules) return value;
  const access = rules[role] || 'denied';
  switch (access) {
    case 'full': return value;
    case 'scoped': return value;
    case 'self_scoped': return value;
    case 'self_only': return userId && resourceUserId && userId === resourceUserId ? value : undefined;
    case 'redacted': return 'REDACTED_BY_ACCESS_POLICY';
    case 'hashed': return value ? `hash:${value.toString().substring(0, 16)}` : undefined;
    case 'hashed_if_approved': return value ? `hash:${value.toString().substring(0, 16)}` : undefined;
    case 'denied': return undefined;
    case 'denied_unless_added': return undefined;
    case 'denied_unless_owner': return undefined;
    case 'denied_unless_participant': return undefined;
    case 'full_if_scoped': return value;
    case 'full_if_legal': return role === 'legal' ? value : 'REDACTED_BY_ACCESS_POLICY';
    case 'scoped_redacted': return 'REDACTED_BY_ACCESS_POLICY';
    case 'approved_package': return undefined;
    case 'approved_package_only': return undefined;
    case 'full_for_approved': return value;
    case 'summary': return 'SUMMARY_ONLY';
    default: return undefined;
  }
}

// ─── Phase 2: SLA Calculation ──────────────────────────────────────────────────

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return result;
}

function calculateSlaDueAt(severity: string): string {
  const now = new Date();
  switch (severity) {
    case 'critical': return new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 min per spec
    case 'high': return addBusinessDays(now, 3).toISOString(); // 3 business days per spec
    case 'medium': return addBusinessDays(now, 10).toISOString(); // 10 business days per spec
    case 'low': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 calendar days per spec
    default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export function checkSlaBreach(slaDueAt: string | null): { breached: boolean; hoursOverdue: number } | null {
  if (!slaDueAt) return null;
  const now = new Date();
  const due = new Date(slaDueAt);
  const msDiff = now.getTime() - due.getTime();
  const hoursDiff = Math.round(msDiff / (1000 * 60 * 60));
  if (now <= due) return { breached: false, hoursOverdue: hoursDiff };
  return { breached: true, hoursOverdue: hoursDiff };
}

// ─── Phase 2: Enhanced Timeline with Deterministic Correlation ──────────────

export async function getEnhancedTimeline(caseId: string): Promise<any[]> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');

  const actions = await listActions(caseId);
  const evidence = await listEvidence(caseId);
  const timeline: any[] = [];

  // Add case actions to timeline
  for (const action of actions) {
    timeline.push({
      type: 'case_action',
      timestamp: action.created_at,
      label: action.action_type.replace(/_/g, ' '),
      actor: action.actor_id,
      detail: action.reason,
      confidence: 'deterministic',
      source_id: action.id,
      audit_event_id: action.audit_event_id,
      correlation_key: null,
    });
  }

  // Add evidence items to timeline with correlation
  for (const item of evidence) {
    const entry: any = {
      type: 'evidence',
      timestamp: item.added_at,
      label: `Evidence added: ${item.source_type.replace(/_/g, ' ')}`,
      actor: item.added_by,
      detail: item.added_reason,
      confidence: 'deterministic',
      source_id: item.source_id,
      vault_status: item.vault_status,
      correlation_key: null,
      is_pinned: item.is_pinned,
      relevance: item.relevance,
    };

    // If evidence is an audit event, fetch related events for correlation
    if (item.source_type === 'audit_event' && item.source_id) {
      try {
        const { data: auditEvent } = await supabaseAdmin
          .from('audit_events')
          .select('correlation, event_type, event_category, actor, object, timestamp_utc')
          .eq('event_id', item.source_id)
          .single();

        if (auditEvent) {
          entry.audit_source = {
            event_type: auditEvent.event_type,
            event_category: auditEvent.event_category,
            actor: auditEvent.actor,
            object: auditEvent.object,
            timestamp_utc: auditEvent.timestamp_utc,
          };

          // Determine correlation key from audit event
          const corr = auditEvent.correlation as Record<string, string> | undefined;
          if (corr) {
            if (corr.workflow_run_id) {
              entry.correlation_key = `workflow:${corr.workflow_run_id}`;
              entry.confidence = 'deterministic';
              entry.correlation_label = `Workflow Run: ${corr.workflow_run_id.substring(0, 12)}`;
            } else if (corr.approval_chain_id) {
              entry.correlation_key = `approval:${corr.approval_chain_id}`;
              entry.confidence = 'deterministic';
              entry.correlation_label = `Approval Chain: ${corr.approval_chain_id.substring(0, 12)}`;
            } else if (corr.campaign_id) {
              entry.correlation_key = `campaign:${corr.campaign_id}`;
              entry.confidence = 'high';
              entry.correlation_label = `Campaign: ${corr.campaign_id}`;
            } else if (corr.brand_id) {
              entry.correlation_key = `brand:${corr.brand_id}`;
              entry.confidence = 'high';
              entry.correlation_label = `Brand: ${corr.brand_id}`;
            }
          }

          // Temporal proximity check (same actor within 5 minutes)
          const auditEventObj = auditEvent.object as Record<string, string> | undefined;
          if (auditEventObj?.object_id) {
            const nearbyEvents = await supabaseAdmin
              .from('audit_events')
              .select('event_id, event_type, timestamp_utc')
              .eq('object->>object_id', auditEventObj.object_id)
              .gte('timestamp_utc', new Date(new Date(auditEvent.timestamp_utc).getTime() - 5 * 60 * 1000).toISOString())
              .lte('timestamp_utc', new Date(new Date(auditEvent.timestamp_utc).getTime() + 5 * 60 * 1000).toISOString())
              .limit(5);

            if (nearbyEvents.data && nearbyEvents.data.length > 1) {
              entry.nearby_events = nearbyEvents.data
                .filter((ne: any) => ne.event_id !== item.source_id)
                .map((ne: any) => ({ event_id: ne.event_id, event_type: ne.event_type }));
              if (!entry.correlation_key) {
                entry.confidence = 'medium';
                entry.correlation_label = `Temporal proximity (${entry.nearby_events.length} nearby)`;
              }
            }
          }
        }
      } catch (err) { logger.warn({ error: String(err) }, 'Correlation enrichment failed (non-blocking)'); }
    }

    timeline.push(entry);
  }

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return timeline;
}

// ─── Phase 2: Vault-Preserve Workflow ───────────────────────────────────────

export async function preserveToVault(params: {
  case_id: string; evidence_ids: string[];
  retention_class: string; preservation_reason: string;
  actor_id: string; workspace_id: string;
}): Promise<{ preserved: number; manifest_id: string }> {
  const caseRec = await getCase(params.case_id);
  if (!caseRec) throw new Error('Case not found');

  const evidenceItems = await listEvidence(params.case_id);
  const toPreserve = evidenceItems.filter(e => params.evidence_ids.includes(e.id) && e.vault_status === 'not_preserved');

  if (toPreserve.length === 0) throw new Error('No unpreserved evidence matching the given IDs');

  // Create manifest
  const manifestId = `MAN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

  // Mark evidence as preserved
  for (const item of toPreserve) {
    const meta = item.metadata || {};
    meta.vault_manifest_id = manifestId;
    meta.preserved_at = new Date().toISOString();
    await supabaseAdmin.from('case_evidence_items').update({
      vault_status: 'preserved',
      metadata: meta,
    }).eq('id', item.id);
  }

  // Emit audit event
  await emitForensicAuditEvent(
    'forensic.sent_to_vault', params.workspace_id, params.actor_id,
    `Evidence Preserved: ${caseRec.case_id}`,
    `${toPreserve.length} evidence items sent to vault. Retention: ${params.retention_class}.`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    { field_changed: 'vault_status', previous_value: 'not_preserved', new_value: 'preserved', change_reason: params.preservation_reason },
    { permission_used: 'forensic.evidence.preserve', override_reason: `Manifest: ${manifestId}` }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: params.case_id, action_type: 'vault_preserve', actor_id: params.actor_id,
    reason: params.preservation_reason,
    after_state: { preserved_count: toPreserve.length, manifest_id: manifestId, retention_class: params.retention_class },
  });

  return { preserved: toPreserve.length, manifest_id: manifestId };
}

// ─── Phase 2: Legal Hold ─────────────────────────────────────────────────────

export async function applyLegalHold(caseId: string, reason: string, actorId: string, scope?: string): Promise<ForensicCase> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');

  await supabaseAdmin.from('forensic_cases').update({
    legal_hold_active: true, privilege_flag: true,
    retention_class: 'legal_hold',
  }).eq('id', caseId);

  // Mark all evidence as legal hold
  await supabaseAdmin.from('case_evidence_items').update({
    vault_status: 'preserved',
    metadata: { legal_hold_at: new Date().toISOString(), legal_hold_reason: reason },
  }).eq('case_id', caseId);

  const auditId = await emitForensicAuditEvent(
    'forensic.legal_hold_applied', caseRec.workspace_id, actorId,
    `Legal Hold Applied: ${caseRec.case_id}`,
    `Legal hold applied. Reason: ${reason}${scope ? `. Scope: ${scope}` : ''}`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    { field_changed: 'legal_hold_active', previous_value: false, new_value: true, change_reason: reason },
    { permission_used: 'forensic.legal_hold.apply', override_reason: scope || reason }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: caseId, action_type: 'legal_hold', actor_id: actorId,
    reason, after_state: { legal_hold_active: true, scope },
    audit_event_id: auditId,
  });

  const updated = await getCase(caseId);
  if (!updated) throw new Error('Case not found after legal hold');
  return updated;
}

export async function releaseLegalHold(caseId: string, reason: string, actorId: string): Promise<ForensicCase> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');
  if (!caseRec.legal_hold_active) throw new Error('Case is not under legal hold');

  await supabaseAdmin.from('forensic_cases').update({
    legal_hold_active: false, privilege_flag: false,
    retention_class: caseRec.retention_class === 'legal_hold' ? 'standard' : caseRec.retention_class,
  }).eq('id', caseId);

  const auditId = await emitForensicAuditEvent(
    'forensic.legal_hold_released', caseRec.workspace_id, actorId,
    `Legal Hold Released: ${caseRec.case_id}`,
    `Legal hold released. Reason: ${reason}`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    { field_changed: 'legal_hold_active', previous_value: true, new_value: false, change_reason: reason },
    { permission_used: 'forensic.legal_hold.release' }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: caseId, action_type: 'legal_hold_released', actor_id: actorId,
    reason, after_state: { legal_hold_active: false }, audit_event_id: auditId,
  });

  const updated = await getCase(caseId);
  if (!updated) throw new Error('Case not found after legal hold release');
  return updated;
}

// ─── Phase 2: SLA Enforcement ────────────────────────────────────────────────

export async function getSlaReport(workspaceId?: string): Promise<any> {
  let base = supabaseAdmin.from('forensic_cases').select('id, case_id, title, severity, status, sla_due_at, owner_user_id, created_at');
  if (workspaceId) base = base.eq('workspace_id', workspaceId);
  const { data: cases } = await base.not('status', 'eq', 'closed').not('sla_due_at', 'is', null);
  if (!cases) return { breached: [], at_risk: [], ok: [] };

  const breached: any[] = [];
  const atRisk: any[] = [];
  const ok: any[] = [];

  for (const c of cases) {
    const check = checkSlaBreach(c.sla_due_at);
    if (!check) { ok.push(c); continue; }
    if (check.breached) breached.push({ ...c, hours_overdue: check.hoursOverdue });
    else if (check.hoursOverdue < 0 && Math.abs(check.hoursOverdue) < 4) atRisk.push(c); // within 4 hours of breach
    else ok.push(c);
  }

  return {
    total_open: cases.length,
    breached_count: breached.length,
    at_risk_count: atRisk.length,
    breached_cases: breached,
    at_risk_cases: atRisk,
  };
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export async function emitForensicAuditEvent(
  eventType: string, workspaceId: string, actorId: string,
  title: string, summary: string, object: { object_type: string; object_id: string; object_name?: string },
  change?: { field_changed?: string; previous_value?: unknown; new_value?: unknown; change_reason?: string },
  authority?: { permission_used?: string; policy_rule_id?: string; approval_required?: boolean; override_reason?: string; override_authority?: string },
): Promise<string | null> {
  try {
    const result = await createAuditEvent({
      workspace_id: workspaceId,
      event_category: 'evidence_legal',
      event_type: eventType,
      event_title: title,
      event_summary: summary,
      actor: { actor_id: actorId, actor_type: 'human_user' },
      object,
      change,
      authority,
      risk_level: 'medium',
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'EXTENDED' as const,
    });
    return result?.event_id || null;
  } catch {
    return null;
  }
}

function fromDb(row: any): ForensicCase {
  return {
    id: row.id, case_id: row.case_id, tenant_id: row.tenant_id, workspace_id: row.workspace_id,
    case_type: row.case_type, title: row.title, summary: row.summary || '',
    severity: row.severity, status: row.status, owner_user_id: row.owner_user_id,
    source: row.source, source_event_ids: row.source_event_ids || [],
    related_object_ids: row.related_object_ids || [],
    legal_hold_active: row.legal_hold_active || false, privilege_flag: row.privilege_flag || false,
    retention_class: row.retention_class, sla_due_at: row.sla_due_at, closed_at: row.closed_at,
    closure: row.closure, schema_version: row.schema_version, data_residency: row.data_residency || 'auto',
    chain_hash: row.chain_hash, prev_hash: row.prev_hash, block_number: row.block_number,
    created_at: row.created_at, updated_at: row.updated_at,
    participants: row.participants || [],
  };
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export async function listCases(filters: {
  workspace_id?: string; case_type?: string; severity?: string; status?: string;
  owner_user_id?: string; legal_hold_active?: boolean; source?: string;
  date_from?: string; date_to?: string; search?: string; limit?: number; offset?: number;
}): Promise<{ cases: ForensicCase[]; total: number }> {
  let query = supabaseAdmin.from('forensic_cases').select('*, participants:case_participants(*)', { count: 'exact' });

  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.case_type) query = query.eq('case_type', filters.case_type);
  if (filters.severity) query = query.eq('severity', filters.severity);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id);
  if (filters.legal_hold_active !== undefined) query = query.eq('legal_hold_active', filters.legal_hold_active);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', filters.date_to);
  if (filters.search) query = query.or(`title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { cases: (data || []).map(fromDb), total: count || 0 };
}

export async function getCase(caseId: string): Promise<ForensicCase | null> {
  const { data, error } = await supabaseAdmin
    .from('forensic_cases')
    .select('*, participants:case_participants(*)')
    .eq('id', caseId)
    .single();

  if (error || !data) return null;
  return fromDb(data);
}

export async function getCaseByCaseId(caseId: string): Promise<ForensicCase | null> {
  const { data, error } = await supabaseAdmin
    .from('forensic_cases')
    .select('*, participants:case_participants(*)')
    .eq('case_id', caseId)
    .single();

  if (error || !data) return null;
  return fromDb(data);
}

export async function createCase(params: {
  workspace_id: string; case_type: string; title: string; summary?: string;
  severity?: string; source?: string; source_event_ids?: string[];
  owner_user_id?: string; sla_due_at?: string; actor_id: string;
}): Promise<ForensicCase> {
  const { data, error } = await supabaseAdmin
    .from('forensic_cases')
    .insert({
      workspace_id: params.workspace_id,
      case_type: params.case_type,
      title: params.title,
      summary: params.summary || '',
      severity: params.severity || 'medium',
      status: 'new',
      source: params.source || 'manual',
      source_event_ids: params.source_event_ids || [],
      owner_user_id: params.owner_user_id || null,
      sla_due_at: params.sla_due_at || calculateSlaDueAt(params.severity || 'medium'),
    })
    .select('*, participants:case_participants(*)')
    .single();

  if (error) throw error;

  const caseRecord = fromDb(data);

  // Emit audit event
  const auditId = await emitForensicAuditEvent(
    'forensic.case_created', params.workspace_id, params.actor_id,
    `Case Created: ${caseRecord.case_id}`,
    `Forensic case "${caseRecord.title}" created as ${params.case_type}.`,
    { object_type: 'forensic_case', object_id: caseRecord.case_id },
    undefined,
    { permission_used: 'forensic.case.create' }
  );

  // Record action
  await supabaseAdmin.from('case_actions').insert({
    case_id: caseRecord.id,
    action_type: 'case_created',
    actor_id: params.actor_id,
    reason: `Case created: ${params.title}`,
    after_state: { status: 'new', severity: params.severity || 'medium', case_type: params.case_type },
    audit_event_id: auditId,
  });

  try {
    internalEventBus.emit('forensic.case_created', {
      workspace_id: params.workspace_id,
      tenant_id: params.workspace_id,
      actor_id: params.actor_id,
      case_id: caseRecord.case_id,
      title: params.title,
    });
  } catch (emitErr) { /* non-blocking */ }

  return caseRecord;
}

export async function updateCase(
  caseId: string, params: {
    title?: string; summary?: string; severity?: string; status?: string;
    owner_user_id?: string; sla_due_at?: string; retention_class?: string;
    closure?: any; actor_id: string; reason: string;
  }
): Promise<ForensicCase> {
  const existing = await getCase(caseId);
  if (!existing) throw new Error('Case not found');

  const before: Record<string, any> = {};
  const after: Record<string, any> = {};
  const updateData: Record<string, any> = {};

  if (params.title !== undefined) { before.title = existing.title; after.title = params.title; updateData.title = params.title; }
  if (params.summary !== undefined) { before.summary = existing.summary; after.summary = params.summary; updateData.summary = params.summary; }
  if (params.severity !== undefined) {
    if (params.severity !== existing.severity) {
      before.severity = existing.severity; after.severity = params.severity; updateData.severity = params.severity;
      updateData.sla_due_at = calculateSlaDueAt(params.severity);
      const auditId = await emitForensicAuditEvent(
        'forensic.severity_changed', existing.workspace_id, params.actor_id,
        `Severity Changed: ${existing.case_id}`,
        `Severity changed from ${existing.severity} to ${params.severity}.`,
        { object_type: 'forensic_case', object_id: existing.case_id },
        { field_changed: 'severity', previous_value: existing.severity, new_value: params.severity, change_reason: params.reason },
        { permission_used: 'forensic.case.update_severity' }
      );
      await supabaseAdmin.from('case_actions').insert({
        case_id: caseId, action_type: 'severity_changed', actor_id: params.actor_id,
        reason: params.reason, before_state: { severity: existing.severity }, after_state: { severity: params.severity }, audit_event_id: auditId,
      });
    }
  }

  if (params.status !== undefined && params.status !== existing.status) {
    if (!isValidTransition(existing.status, params.status)) {
      throw new Error(`Invalid status transition: ${existing.status} -> ${params.status}`);
    }
    before.status = existing.status; after.status = params.status; updateData.status = params.status;
    if (params.status === 'closed') updateData.closed_at = new Date().toISOString();
    if (params.status === 'closed' && params.closure) updateData.closure = params.closure;

    const eventType = existing.status === 'closed' && params.status === 'reopened' ? 'forensic.case_reopened' : 'forensic.status_changed';
    const auditId = await emitForensicAuditEvent(
      eventType, existing.workspace_id, params.actor_id,
      `Status Changed: ${existing.case_id}`,
      `Status changed from ${existing.status} to ${params.status}.`,
      { object_type: 'forensic_case', object_id: existing.case_id },
      { field_changed: 'status', previous_value: existing.status, new_value: params.status, change_reason: params.reason },
      { permission_used: 'forensic.case.update_status' }
    );
    await supabaseAdmin.from('case_actions').insert({
      case_id: caseId, action_type: 'status_changed', actor_id: params.actor_id,
      reason: params.reason, before_state: { status: existing.status }, after_state: { status: params.status },
      audit_event_id: auditId,
    });
  }

  if (params.owner_user_id !== undefined && params.owner_user_id !== existing.owner_user_id) {
    before.owner_user_id = existing.owner_user_id; after.owner_user_id = params.owner_user_id; updateData.owner_user_id = params.owner_user_id;
    const auditId = await emitForensicAuditEvent(
      'forensic.case_assigned', existing.workspace_id, params.actor_id,
      `Case Assigned: ${existing.case_id}`,
      `Owner assigned to ${params.owner_user_id}.`,
      { object_type: 'forensic_case', object_id: existing.case_id },
      { field_changed: 'owner_user_id', previous_value: existing.owner_user_id, new_value: params.owner_user_id, change_reason: params.reason },
      { permission_used: 'forensic.case.assign' }
    );
    await supabaseAdmin.from('case_actions').insert({
      case_id: caseId, action_type: 'assignment', actor_id: params.actor_id,
      reason: params.reason, before_state: { owner_user_id: existing.owner_user_id }, after_state: { owner_user_id: params.owner_user_id },
      audit_event_id: auditId,
    });
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from('forensic_cases').update(updateData).eq('id', caseId);
    if (error) throw error;
  }

  const updated = await getCase(caseId);
  if (!updated) throw new Error('Case not found after update');
  return updated;
}

export async function addParticipant(caseId: string, userId: string, roleInCase: string, addedBy: string, reason?: string): Promise<CaseParticipant> {
  const { data, error } = await supabaseAdmin.from('case_participants').insert({
    case_id: caseId, user_id: userId, role_in_case: roleInCase, added_by: addedBy, added_reason: reason || null,
  }).select().single();
  if (error) throw error;
  return data;
}

// ─── Evidence ─────────────────────────────────────────────────────────────────

export async function addEvidence(params: {
  case_id: string; source_type: string; source_id: string;
  relevance?: string; hash?: string; chain_block_number?: number;
  added_by: string; added_reason: string; metadata?: any;
}): Promise<CaseEvidenceItem> {
  const caseRec = await getCase(params.case_id);
  if (!caseRec) throw new Error('Case not found');

  const { data, error } = await supabaseAdmin.from('case_evidence_items').insert({
    case_id: params.case_id, source_type: params.source_type, source_id: params.source_id,
    relevance: params.relevance || 'contextual', hash: params.hash || null,
    chain_block_number: params.chain_block_number || null,
    added_by: params.added_by, added_reason: params.added_reason, metadata: params.metadata || {},
  }).select().single();

  if (error) throw error;

  const auditId = await emitForensicAuditEvent(
    'forensic.evidence_added', caseRec.workspace_id, params.added_by,
    `Evidence Added: ${caseRec.case_id}`,
    `Evidence item ${params.source_type}:${params.source_id} added.`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    undefined,
    { permission_used: 'forensic.evidence.add' }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: params.case_id, action_type: 'evidence_added', actor_id: params.added_by,
    reason: params.added_reason, after_state: { source_type: params.source_type, source_id: params.source_id },
    audit_event_id: auditId,
  });

  return data;
}

export async function pinEvidence(evidenceId: string, pinReason: string, actorId: string): Promise<void> {
  const { data: item } = await supabaseAdmin.from('case_evidence_items').select('*, case:case_id(*)').eq('id', evidenceId).single();
  if (!item) throw new Error('Evidence item not found');

  await supabaseAdmin.from('case_evidence_items').update({
    is_pinned: true, pin_reason: pinReason, pinned_at: new Date().toISOString(),
  }).eq('id', evidenceId);

  const auditId = await emitForensicAuditEvent(
    'forensic.evidence_pinned', item.case.workspace_id, actorId,
    `Evidence Pinned: ${item.case.case_id}`,
    `Evidence ${item.source_type}:${item.source_id} pinned as key evidence.`,
    { object_type: 'forensic_case', object_id: item.case.case_id },
    undefined,
    { permission_used: 'forensic.evidence.pin' }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: item.case_id, action_type: 'evidence_pinned', actor_id: actorId,
    reason: pinReason, after_state: { evidence_id: item.id, pinned: true }, audit_event_id: auditId,
  });
}

export async function listEvidence(caseId: string): Promise<CaseEvidenceItem[]> {
  const { data, error } = await supabaseAdmin.from('case_evidence_items')
    .select('*').eq('case_id', caseId).is('removed_at', null).order('added_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function addNote(params: {
  case_id: string; note_class: string; content: string; author_id: string;
}): Promise<CaseNote> {
  const caseRec = await getCase(params.case_id);
  if (!caseRec) throw new Error('Case not found');

  const { data, error } = await supabaseAdmin.from('case_notes').insert({
    case_id: params.case_id, note_class: params.note_class, content: params.content, author_id: params.author_id,
  }).select().single();

  if (error) throw error;

  const auditId = await emitForensicAuditEvent(
    'forensic.note_added', caseRec.workspace_id, params.author_id,
    `Note Added: ${caseRec.case_id}`,
    `Note (${params.note_class}) added to case.`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    undefined,
    { permission_used: 'forensic.note.add' }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: params.case_id, action_type: 'note_added', actor_id: params.author_id,
    reason: `Note added (${params.note_class})`, after_state: { note_class: params.note_class, note_id: data.id },
    audit_event_id: auditId,
  });

  return data;
}

export async function listNotes(caseId: string, userRoles: string[]): Promise<CaseNote[]> {
  let query = supabaseAdmin.from('case_notes').select('*').eq('case_id', caseId).order('created_at', { ascending: false });
  const role = resolveAccessRole(userRoles);
  // Legal privileged notes hidden from non-legal roles
  if (role !== 'legal') {
    query = query.neq('note_class', 'legal_privileged');
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────

export async function addTask(params: {
  case_id: string; title: string; description?: string; owner_id: string;
  due_at?: string; evidence_link?: any;
}): Promise<CaseTask> {
  const { data, error } = await supabaseAdmin.from('case_tasks').insert({
    case_id: params.case_id, title: params.title, description: params.description || null,
    owner_id: params.owner_id, due_at: params.due_at || null, evidence_link: params.evidence_link || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function listTasks(caseId: string): Promise<CaseTask[]> {
  const { data, error } = await supabaseAdmin.from('case_tasks')
    .select('*').eq('case_id', caseId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateTask(taskId: string, params: { status?: string; completion_proof?: string }): Promise<void> {
  const updateData: Record<string, any> = {};
  if (params.status !== undefined) { updateData.status = params.status; if (params.status === 'completed') updateData.completed_at = new Date().toISOString(); }
  if (params.completion_proof !== undefined) updateData.completion_proof = params.completion_proof;
  const { error } = await supabaseAdmin.from('case_tasks').update(updateData).eq('id', taskId);
  if (error) throw error;
}

// ─── Actions (immutable history) ───────────────────────────────────────────────

export async function listActions(caseId: string): Promise<CaseAction[]> {
  const { data, error } = await supabaseAdmin.from('case_actions')
    .select('*').eq('case_id', caseId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Close Case ────────────────────────────────────────────────────────────────

export async function closeCase(caseId: string, params: {
  outcome: string; rationale: string; findings?: string; approval?: string;
  actor_id: string;
}): Promise<ForensicCase> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');
  if (!isValidTransition(caseRec.status, 'closed')) {
    throw new Error(`Cannot close case in status: ${caseRec.status}`);
  }

  const closure = {
    outcome: params.outcome,
    rationale: params.rationale,
    findings: params.findings || '',
    closed_by: params.actor_id,
    approval: params.approval || null,
    evidence_count: (await listEvidence(caseId)).length,
    closed_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from('forensic_cases').update({
    status: 'closed', closed_at: new Date().toISOString(), closure,
  }).eq('id', caseId);
  if (error) throw error;

  const auditId = await emitForensicAuditEvent(
    'forensic.case_closed', caseRec.workspace_id, params.actor_id,
    `Case Closed: ${caseRec.case_id}`,
    `Case closed with outcome: ${params.outcome}.`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    { field_changed: 'status', previous_value: caseRec.status, new_value: 'closed', change_reason: params.rationale },
    { permission_used: 'forensic.case.close', override_reason: `Outcome: ${params.outcome}` }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: caseId, action_type: 'closure', actor_id: params.actor_id,
    reason: params.rationale, before_state: { status: caseRec.status }, after_state: { status: 'closed', closure },
    audit_event_id: auditId,
  });

  try {
    internalEventBus.emit('forensic.case_closed', {
      workspace_id: caseRec.workspace_id,
      actor_id: params.actor_id,
      case_id: caseRec.case_id,
    });
  } catch (emitErr) { /* non-blocking */ }

  const updated = await getCase(caseId);
  if (!updated) throw new Error('Case not found after close');
  return updated;
}

// ─── Timeline Reconstruction ──────────────────────────────────────────────────

export async function getTimeline(caseId: string): Promise<any[]> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');

  const actions = await listActions(caseId);
  const evidence = await listEvidence(caseId);

  const timeline: any[] = [];

  for (const action of actions) {
    timeline.push({
      type: 'case_action',
      timestamp: action.created_at,
      label: action.action_type.replace(/_/g, ' '),
      actor: action.actor_id,
      detail: action.reason,
      confidence: 'deterministic',
      source_id: action.id,
      audit_event_id: action.audit_event_id,
    });
  }

  for (const item of evidence) {
    timeline.push({
      type: 'evidence',
      timestamp: item.added_at,
      label: `Evidence added: ${item.source_type}`,
      actor: item.added_by,
      detail: item.added_reason,
      confidence: 'deterministic',
      source_id: item.source_id,
      vault_status: item.vault_status,
    });
  }

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return timeline;
}

// ─── Stats / Metrics ──────────────────────────────────────────────────────────

export async function getForensicStats(workspaceId?: string): Promise<any> {
  let base = supabaseAdmin.from('forensic_cases').select('*', { count: 'exact', head: true });
  if (workspaceId) base = base.eq('workspace_id', workspaceId);

  const total = (await base).count || 0;

  const byStatus = (await supabaseAdmin.from('forensic_cases').select('status').then(r => {
    const counts: Record<string, number> = {};
    (r.data || []).forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  })) || {};

  const critical = (await supabaseAdmin.from('forensic_cases').select('id', { count: 'exact', head: true })
    .eq('severity', 'critical')).count || 0;

  const legalHold = (await supabaseAdmin.from('forensic_cases').select('id', { count: 'exact', head: true })
    .eq('legal_hold_active', true)).count || 0;

  // SLA breach count
  const slaBreached = (await supabaseAdmin
    .from('forensic_cases')
    .select('id', { count: 'exact', head: true })
    .not('status', 'eq', 'closed')
    .not('sla_due_at', 'is', null)
    .lt('sla_due_at', new Date().toISOString())
  ).count || 0;

  return {
    total_cases: total,
    critical_cases: critical,
    legal_hold_cases: legalHold,
    sla_breached: slaBreached,
    open_cases: (byStatus['new'] || 0) + (byStatus['triage'] || 0) + (byStatus['active_investigation'] || 0),
    awaiting_info: byStatus['awaiting_information'] || 0,
    legal_review: byStatus['legal_review'] || 0,
    closed_cases: byStatus['closed'] || 0,
    by_status: byStatus,
  };
}

// ─── Reopen Case ───────────────────────────────────────────────────────────────

export async function reopenCase(caseId: string, reason: string, actorId: string): Promise<ForensicCase> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');
  if (!isValidTransition(caseRec.status, 'reopened')) {
    throw new Error(`Cannot reopen case in status: ${caseRec.status}`);
  }

  const { error } = await supabaseAdmin.from('forensic_cases').update({
    status: 'reopened', closed_at: null, closure: null,
  }).eq('id', caseId);
  if (error) throw error;

  const auditId = await emitForensicAuditEvent(
    'forensic.case_reopened', caseRec.workspace_id, actorId,
    `Case Reopened: ${caseRec.case_id}`,
    `Previously closed case reopened. Reason: ${reason}`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    { field_changed: 'status', previous_value: 'closed', new_value: 'reopened', change_reason: reason },
    { permission_used: 'forensic.case.reopen' }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: caseId, action_type: 'case_reopened', actor_id: actorId,
    reason, before_state: { status: 'closed' }, after_state: { status: 'reopened' }, audit_event_id: auditId,
  });

  const updated = await getCase(caseId);
  if (!updated) throw new Error('Case not found after reopen');
  return updated;
}

// ─── Phase 3: Export Builder ────────────────────────────────────────────────────

export interface CaseExport {
  id: string; case_id: string; export_type: string; package_type: string;
  format: string; redaction_profile: string; status: string; reason: string;
  requested_by: string; approved_by: string | null; rejected_reason: string | null;
  scope: any; manifest: any; redaction_log: any[];
  hash: string | null; file_size: number | null; file_path: string | null;
  delivery_method: string | null; delivered_at: string | null;
  expires_at: string | null; generated_at: string | null;
  created_at: string; updated_at: string;
}

const EXPORT_TYPES: Record<string, { formats: string[]; required_scope: string[]; requires_approval: boolean }> = {
  internal_investigation: { formats: ['pdf', 'json', 'csv'], required_scope: ['summary', 'timeline', 'evidence', 'tasks', 'closure'], requires_approval: false },
  legal: { formats: ['pdf', 'zip'], required_scope: ['summary', 'timeline', 'evidence', 'notes_privileged', 'legal_hold', 'hashes'], requires_approval: true },
  regulator: { formats: ['pdf', 'json', 'csv', 'zip'], required_scope: ['summary', 'timeline', 'evidence', 'manifest', 'hashes', 'redaction_log', 'approval'], requires_approval: true },
  customer_assurance: { formats: ['pdf'], required_scope: ['summary', 'evidence_non_privileged', 'mitigation'], requires_approval: true },
  board: { formats: ['pdf'], required_scope: ['executive_summary', 'risk_assessment', 'timeline', 'remediation'], requires_approval: true },
};

export async function createExport(params: {
  case_id: string; package_type: string; format: string; redaction_profile: string;
  reason: string; actor_id: string; scope?: any; delivery_method?: string;
}): Promise<CaseExport> {
  const caseRec = await getCase(params.case_id);
  if (!caseRec) throw new Error('Case not found');

  const pkgConfig = EXPORT_TYPES[params.package_type];
  if (!pkgConfig) throw new Error(`Unknown package type: ${params.package_type}`);
  if (!pkgConfig.formats.includes(params.format)) {
    throw new Error(`Format ${params.format} not supported for package type ${params.package_type}`);
  }

  const status = pkgConfig.requires_approval ? 'draft' : 'pending_approval';

  const { data, error } = await supabaseAdmin.from('case_exports').insert({
    case_id: params.case_id,
    export_type: params.package_type,
    package_type: params.package_type,
    format: params.format,
    redaction_profile: params.redaction_profile || 'standard',
    status,
    reason: params.reason,
    requested_by: params.actor_id,
    scope: params.scope || {},
    delivery_method: params.delivery_method || null,
  }).select().single();

  if (error) throw error;

  await emitForensicAuditEvent(
    'forensic.export_requested', caseRec.workspace_id, params.actor_id,
    `Export Requested: ${caseRec.case_id}`,
    `Export package (${params.package_type}/${params.format}) requested. Reason: ${params.reason}`,
    { object_type: 'forensic_case', object_id: caseRec.case_id },
    undefined,
    { permission_used: 'forensic.export.create' }
  );

  await supabaseAdmin.from('case_actions').insert({
    case_id: params.case_id, action_type: 'export_created', actor_id: params.actor_id,
    reason: params.reason, after_state: { export_id: data.id, package_type: params.package_type, format: params.format },
  });

  return data;
}

export async function listExports(caseId: string): Promise<CaseExport[]> {
  const { data, error } = await supabaseAdmin.from('case_exports')
    .select('*').eq('case_id', caseId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveExport(exportId: string, actorId: string): Promise<CaseExport> {
  const { data: exp } = await supabaseAdmin.from('case_exports').select('*').eq('id', exportId).single();
  if (!exp) throw new Error('Export not found');
  if (exp.status !== 'pending_approval') throw new Error(`Cannot approve export in status: ${exp.status}`);

  await supabaseAdmin.from('case_exports').update({
    status: 'approved', approved_by: actorId,
  }).eq('id', exportId);

  await emitForensicAuditEvent(
    'forensic.export_approved', '', actorId,
    `Export Approved: ${exp.id.substring(0, 8)}`,
    `Export package ${exp.package_type}/${exp.format} approved by ${actorId}.`,
    { object_type: 'case_export', object_id: exp.id },
    { field_changed: 'status', previous_value: 'pending_approval', new_value: 'approved' },
    { permission_used: 'forensic.export.approve' }
  );

  const { data: updated } = await supabaseAdmin.from('case_exports').select('*').eq('id', exportId).single();
  if (!updated) throw new Error('Export not found after approval');
  return updated;
}

export async function rejectExport(exportId: string, reason: string, _actorId: string): Promise<CaseExport> {
  const { data: exp } = await supabaseAdmin.from('case_exports').select('*').eq('id', exportId).single();
  if (!exp) throw new Error('Export not found');
  if (exp.status !== 'pending_approval') throw new Error(`Cannot reject export in status: ${exp.status}`);

  await supabaseAdmin.from('case_exports').update({
    status: 'rejected', rejected_reason: reason,
  }).eq('id', exportId);

  const { data: updated } = await supabaseAdmin.from('case_exports').select('*').eq('id', exportId).single();
  if (!updated) throw new Error('Export not found after rejection');
  return updated;
}

export async function generateExportPackage(exportId: string, actorId: string): Promise<CaseExport> {
  const { data: exp } = await supabaseAdmin.from('case_exports').select('*').eq('id', exportId).single();
  if (!exp) throw new Error('Export not found');
  if (exp.status !== 'approved' && exp.status !== 'draft') {
    throw new Error(`Cannot generate export in status: ${exp.status}`);
  }

  await supabaseAdmin.from('case_exports').update({ status: 'generating' }).eq('id', exportId);

  const caseRec = await getCase(exp.case_id);
  if (!caseRec) throw new Error('Case not found');

  const evidence = await listEvidence(exp.case_id);
  const actions = await listActions(exp.case_id);
  const timeline = await getEnhancedTimeline(exp.case_id);
  const tasks = await listTasks(exp.case_id);
  const notes = await listNotes(exp.case_id, [actorId]);

  // Build manifest
  const hashes = evidence.filter(e => e.hash).map(e => e.hash);
  const manifest = {
    export_id: exportId,
    case_id: exp.case_id,
    package_type: exp.package_type,
    format: exp.format,
    redaction_profile: exp.redaction_profile,
    generated_at: new Date().toISOString(),
    generated_by: actorId,
    summary: { title: caseRec.title, type: caseRec.case_type, severity: caseRec.severity, status: caseRec.status, outcome: caseRec.closure?.outcome || null },
    evidence_count: evidence.length,
    action_count: actions.length,
    timeline_entries: timeline.length,
    task_count: tasks.length,
    note_count: notes.length,
    evidence_hashes: hashes,
    legal_hold_active: caseRec.legal_hold_active,
    chain_hash: caseRec.chain_hash || null,
  };

  // Compute package hash
  const contentHash = Buffer.from(JSON.stringify(manifest)).toString('base64').substring(0, 32);
  const manifestHash = `PKG-${Date.now().toString(36)}-${contentHash.substring(0, 8)}`.toUpperCase();

  await supabaseAdmin.from('case_exports').update({
    status: 'ready', manifest, hash: manifestHash, generated_at: new Date().toISOString(),
    file_size: JSON.stringify(manifest).length,
  }).eq('id', exportId);

  await emitForensicAuditEvent(
    'forensic.export_generated', caseRec.workspace_id, actorId,
    `Export Generated: ${caseRec.case_id}`,
    `Export package generated. Manifest: ${manifestHash}`,
    { object_type: 'case_export', object_id: exportId },
    { field_changed: 'status', previous_value: 'generating', new_value: 'ready', change_reason: `Manifest: ${manifestHash}` },
    { permission_used: 'forensic.export.generate' }
  );

  const { data: updated } = await supabaseAdmin.from('case_exports').select('*').eq('id', exportId).single();
  if (!updated) throw new Error('Export not found after generation');
  return updated;
}

// ─── Phase 3: Entity Graph ──────────────────────────────────────────────────────

export async function getEntityGraph(caseId: string): Promise<{ nodes: any[]; edges: any[] }> {
  const caseRec = await getCase(caseId);
  if (!caseRec) throw new Error('Case not found');

  const nodes: any[] = [];
  const edges: any[] = [];
  const nodeSet = new Set<string>();

  const addNode = (id: string, type: string, label: string, meta?: any) => {
    if (nodeSet.has(id)) return;
    nodeSet.add(id);
    nodes.push({ id, type, label, metadata: meta || {} });
  };

  const addEdge = (from: string, to: string, relation: string, label?: string) => {
    edges.push({ from, to, relation, label: label || relation });
  };

  // Case node
  addNode(caseRec.id, 'case', caseRec.title, {
    case_id: caseRec.case_id, type: caseRec.case_type, severity: caseRec.severity, status: caseRec.status,
  });

  // Owner
  if (caseRec.owner_user_id) {
    addNode(caseRec.owner_user_id, 'user', `Owner: ${caseRec.owner_user_id}`);
    addEdge(caseRec.owner_user_id, caseRec.id, 'owns');
  }

  // Participants
  const participants = caseRec.participants || [];
  for (const p of participants) {
    addNode(p.user_id, 'user', `Participant: ${p.user_id} (${p.role_in_case})`);
    addEdge(p.user_id, caseRec.id, 'participates', p.role_in_case);
  }

  // Evidence → source entities
  const evidence = await listEvidence(caseId);
  for (const item of evidence) {
    const eid = `evidence:${item.id}`;
    addNode(eid, 'evidence', `${item.source_type}: ${item.source_id.substring(0, 16)}`, {
      relevance: item.relevance, vault_status: item.vault_status, is_pinned: item.is_pinned,
    });
    addEdge(caseRec.id, eid, 'contains', item.relevance);

    if (item.source_type === 'audit_event' && item.source_id) {
      addNode(item.source_id, 'audit_event', `Event: ${item.source_id.substring(0, 16)}`);
      addEdge(eid, item.source_id, 'references');
    }
    if (item.added_by) {
      addNode(item.added_by, 'user', `Added by: ${item.added_by}`);
      addEdge(item.added_by, eid, 'added');
    }
  }

  // Actions → actors
  for (const action of await listActions(caseId)) {
    addNode(action.actor_id, 'user', `Actor: ${action.actor_id}`);
    addEdge(action.actor_id, caseRec.id, action.action_type);
  }

  return { nodes, edges };
}

// ─── Phase 3: Privilege Controls ────────────────────────────────────────────────

export async function markEvidencePrivileged(evidenceId: string, actorId: string): Promise<void> {
  const { data: item } = await supabaseAdmin.from('case_evidence_items')
    .select('*, case:case_id(*)').eq('id', evidenceId).single();
  if (!item) throw new Error('Evidence item not found');

  await supabaseAdmin.from('case_evidence_items').update({
    privilege_flag: true, privileged_by: actorId, privileged_at: new Date().toISOString(),
  }).eq('id', evidenceId);

  await emitForensicAuditEvent(
    'forensic.privilege_applied', item.case.workspace_id, actorId,
    `Privilege Applied: ${item.case.case_id}`,
    `Evidence item ${item.id.substring(0, 8)} marked as privileged.`,
    { object_type: 'forensic_case', object_id: item.case.case_id },
    { field_changed: 'privilege_flag', previous_value: false, new_value: true },
    { permission_used: 'forensic.privilege.apply' }
  );
}

export async function unpinEvidence(evidenceId: string, reason: string, actorId: string): Promise<void> {
  const { data: item } = await supabaseAdmin.from('case_evidence_items')
    .select('*, case:case_id(*)').eq('id', evidenceId).single();
  if (!item) throw new Error('Evidence item not found');

  await supabaseAdmin.from('case_evidence_items').update({
    is_pinned: false, pin_reason: null, pinned_at: null,
    removed_at: new Date().toISOString(), removal_reason: reason,
  }).eq('id', evidenceId);

  await emitForensicAuditEvent(
    'forensic.evidence_unpinned', item.case.workspace_id, actorId,
    `Evidence Unpinned: ${item.case.case_id}`,
    `Evidence unpinned. Reason: ${reason}`,
    { object_type: 'forensic_case', object_id: item.case.case_id },
    { field_changed: 'is_pinned', previous_value: true, new_value: false, change_reason: reason },
    { permission_used: 'forensic.evidence.unpin' }
  );
}
