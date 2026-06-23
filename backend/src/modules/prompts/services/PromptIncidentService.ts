 
import * as crypto from 'crypto';
import { supabaseAdmin } from '../../../shared/supabase';
import { PromptEvidenceService } from '../PromptEvidenceService';
import { PromptAuditService } from '../PromptAuditService';

// ─────────────────────────────────────────────────────────────────────────────
// PromptIncidentService — Phase 4 / Batch 4.4 (Prompt Incident Lifecycle)
//
// Prompt-Governance-owned incident logic. INDEPENDENT of agentIncidents.service
// and operationsIncident.service (different domains — not reused).
//
// The prompt_incidents row (Batch 4.1) is mutable for its lifecycle
// (open → investigating → resolved → closed; closed is terminal) but is
// DELETE-blocked at the DB tier. Immutable history is preserved by mirroring
// EVERY lifecycle action to the append-only prompt_audit_ledger via
// PromptAuditService.record(), and by preserving an Evidence Vault record via
// PromptEvidenceService.record() (both non-blocking).
//
// Tenant isolation: open validates prompt/version/trace belong to the workspace
// and stamps workspace_id/tenant_id from the resolved prompt (never from input);
// every read/update loads the incident with an explicit workspace_id match, so a
// cross-tenant incident is never returned or mutated.
//
// deployment_id / rollback_deployment_id / rollback_to_version_id are ADVISORY
// linkage only — stored if provided, not validated. This service NEVER triggers
// a rollback or any deployment/runtime behavior.
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_OPENED = 'prompt.incident.opened';
const EVENT_UPDATED = 'prompt.incident.updated';
const EVENT_CLOSED = 'prompt.incident.closed';

export const INCIDENT_STATUS = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

// Allowed forward transitions. `closed` is terminal (no outbound transitions).
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ['investigating', 'resolved', 'closed'],
  investigating: ['resolved', 'closed'],
  resolved: ['investigating', 'closed'],
  closed: [],
};

// Field changes that warrant preserving a fresh Evidence Vault record on update.
const MEANINGFUL_FIELDS = ['status', 'severity', 'remediation', 'owner_id', 'affected_scope'] as const;

export type IncidentErrorCode =
  | 'MISSING_WORKSPACE'
  | 'PROMPT_NOT_FOUND'
  | 'TENANT_MISMATCH'
  | 'VERSION_NOT_FOUND'
  | 'TRACE_NOT_FOUND'
  | 'INCIDENT_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'ALREADY_CLOSED';

export type IncidentResult =
  | { ok: true; incident: any }
  | { ok: false; code: IncidentErrorCode };

export interface OpenIncidentInput {
  workspace_id: string;
  prompt_id: string;
  prompt_version_id?: string;
  runtime_trace_id?: string;
  deployment_id?: string;           // advisory — stored, not validated
  rollback_deployment_id?: string;  // advisory
  rollback_to_version_id?: string;  // advisory
  severity?: string;
  category?: string;
  trigger?: string;
  runtime_policy_id?: string;
  detected_by?: string;
  owner_id?: string;
  remediation?: string;
  affected_scope?: Record<string, unknown>;
  actor_id?: string;
  actor_role?: string;
  source_ip?: string;
}

export interface UpdateIncidentInput {
  status?: string;
  severity?: string;
  category?: string;
  owner_id?: string;
  remediation?: string;
  post_incident_note?: string;
  affected_scope?: Record<string, unknown>;
  actor_id?: string;
  actor_role?: string;
  source_ip?: string;
}

export interface CloseIncidentInput {
  closed_by?: string;
  post_incident_note?: string;
  remediation?: string;
  actor_id?: string;
  actor_role?: string;
  source_ip?: string;
}

export interface IncidentListFilters {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export interface IncidentList {
  records: any[];
  total: number;
  limit: number;
  offset: number;
}

import { isUuid } from '../../../shared/validation';

function clampLimit(value: unknown): number {
  return Math.min(Math.max(Number(value) || 50, 1), 200);
}

function clampOffset(value: unknown): number {
  return Math.max(Number(value) || 0, 0);
}

export class PromptIncidentService {
  /** Resolve the prompt within the workspace. */
  private static async resolvePrompt(promptId: string, workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .select('id, tenant_id, risk_tier')
      .eq('id', promptId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Open an incident. Validates tenancy of prompt / version / trace, preserves
   * evidence first, inserts the row with the opening evidence receipt, then
   * writes the append-only `prompt.incident.opened` audit event.
   */
  static async openIncident(input: OpenIncidentInput): Promise<IncidentResult> {
    const workspaceId = String(input.workspace_id || '');
    if (!workspaceId) return { ok: false, code: 'MISSING_WORKSPACE' };
    if (!input.prompt_id) return { ok: false, code: 'PROMPT_NOT_FOUND' };

    // ── 1. Tenant validation ────────────────────────────────────────────────
    const prompt = await this.resolvePrompt(input.prompt_id, workspaceId);
    if (!prompt) return { ok: false, code: 'TENANT_MISMATCH' };
    const tenantId = (prompt.tenant_id as string) || workspaceId;
    const riskTier = (prompt.risk_tier as string) ?? undefined;

    if (input.prompt_version_id) {
      const { data: version, error: vErr } = await supabaseAdmin
        .from('prompt_versions')
        .select('id, prompt_id')
        .eq('id', input.prompt_version_id)
        .maybeSingle();
      if (vErr) throw vErr;
      if (!version) return { ok: false, code: 'VERSION_NOT_FOUND' };
      if (version.prompt_id !== input.prompt_id) return { ok: false, code: 'TENANT_MISMATCH' };
    }

    if (input.runtime_trace_id) {
      const { data: trace, error: tErr } = await supabaseAdmin
        .from('prompt_runtime_traces')
        .select('id, prompt_id, workspace_id')
        .eq('id', input.runtime_trace_id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!trace) return { ok: false, code: 'TRACE_NOT_FOUND' };
      if (trace.prompt_id !== input.prompt_id) return { ok: false, code: 'TENANT_MISMATCH' };
    }

    const incidentRef = `PINC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const affectedScope = input.affected_scope || {};

    // ── 2. Preserve opening evidence FIRST (non-blocking) ────────────────────
    const receipt = await PromptEvidenceService.record({
      event_type: EVENT_OPENED,
      prompt_id: input.prompt_id,
      prompt_version_id: input.prompt_version_id,
      workspace_id: workspaceId,
      actor_id: input.actor_id,
      risk_tier: riskTier,
      reason: input.trigger || 'Prompt incident opened',
      payload: {
        incident_ref: incidentRef,
        severity: input.severity || 'medium',
        category: input.category || null,
        trigger: input.trigger || null,
        runtime_trace_id: input.runtime_trace_id || null,
        deployment_id: input.deployment_id || null,
        affected_scope: affectedScope,
        workspace_id: workspaceId,
      },
    });

    // ── 3. Insert incident row with opening evidence receipt ─────────────────
    const { data: incident, error: insErr } = await supabaseAdmin
      .from('prompt_incidents')
      .insert({
        incident_ref: incidentRef,
        workspace_id: workspaceId,
        tenant_id: tenantId,
        prompt_id: input.prompt_id,
        prompt_version_id: input.prompt_version_id || null,
        runtime_trace_id: isUuid(input.runtime_trace_id) ? input.runtime_trace_id : null,
        deployment_id: isUuid(input.deployment_id) ? input.deployment_id : null,
        rollback_deployment_id: isUuid(input.rollback_deployment_id) ? input.rollback_deployment_id : null,
        rollback_to_version_id: isUuid(input.rollback_to_version_id) ? input.rollback_to_version_id : null,
        severity: input.severity || 'medium',
        category: input.category || null,
        trigger: input.trigger || null,
        status: INCIDENT_STATUS.OPEN,
        runtime_policy_id: isUuid(input.runtime_policy_id) ? input.runtime_policy_id : null,
        detected_by: input.detected_by || null,
        owner_id: isUuid(input.owner_id) ? input.owner_id : null,
        remediation: input.remediation || '',
        affected_scope: affectedScope,
        evidence_id: receipt?.vault_item_uuid || null,
        evidence_ref: receipt?.vault_item_id || null,
        evidence_hash: receipt?.evidence_hash || null,
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // ── 4. Append-only audit ─────────────────────────────────────────────────
    await PromptAuditService.record({
      event_type: EVENT_OPENED,
      workspace_id: workspaceId,
      prompt_id: input.prompt_id,
      version_id: input.prompt_version_id,
      actor_id: input.actor_id,
      actor_role: input.actor_role,
      reason: input.trigger || 'Prompt incident opened',
      risk_level: riskTier,
      evidence_reference: receipt?.vault_item_id || null,
      source_ip: input.source_ip || null,
      after_state: {
        incident_id: incident?.id || null,
        incident_ref: incidentRef,
        status: INCIDENT_STATUS.OPEN,
        severity: incident?.severity || null,
        runtime_trace_id: incident?.runtime_trace_id || null,
        deployment_id: incident?.deployment_id || null,
      },
    });

    return { ok: true, incident };
  }

  /** Fetch a single incident, workspace-scoped. */
  static async getIncident(incidentId: string, workspaceId: string): Promise<any | null> {
    const { data, error } = await supabaseAdmin
      .from('prompt_incidents')
      .select('*')
      .eq('id', incidentId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Update an incident. Enforces the lifecycle transition graph, preserves
   * evidence when a meaningful field changes, and always writes the append-only
   * `prompt.incident.updated` audit event. A status change to `closed` sets the
   * closure fields. Never deletes.
   */
  static async updateIncident(
    incidentId: string,
    workspaceId: string,
    patch: UpdateIncidentInput,
  ): Promise<IncidentResult> {
    if (!workspaceId) return { ok: false, code: 'MISSING_WORKSPACE' };
    const current = await this.getIncident(incidentId, workspaceId);
    if (!current) return { ok: false, code: 'INCIDENT_NOT_FOUND' };

    // ── Transition validation ─────────────────────────────────────────────────
    let closing = false;
    if (patch.status && patch.status !== current.status) {
      if (current.status === INCIDENT_STATUS.CLOSED) return { ok: false, code: 'ALREADY_CLOSED' };
      const allowed = ALLOWED_TRANSITIONS[current.status] || [];
      if (!allowed.includes(patch.status)) return { ok: false, code: 'INVALID_TRANSITION' };
      closing = patch.status === INCIDENT_STATUS.CLOSED;
    }

    const update: Record<string, unknown> = {};
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.severity !== undefined) update.severity = patch.severity;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.owner_id !== undefined) update.owner_id = isUuid(patch.owner_id) ? patch.owner_id : null;
    if (patch.remediation !== undefined) update.remediation = patch.remediation;
    if (patch.post_incident_note !== undefined) update.post_incident_note = patch.post_incident_note;
    if (patch.affected_scope !== undefined) update.affected_scope = patch.affected_scope;
    if (closing) {
      update.closed_at = new Date().toISOString();
      update.closed_by = isUuid(patch.actor_id) ? patch.actor_id : null;
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('prompt_incidents')
      .update(update)
      .eq('id', incidentId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    if (updErr) throw updErr;

    const meaningfulChanged = MEANINGFUL_FIELDS.some(
      (f) => (patch as any)[f] !== undefined && (patch as any)[f] !== (current as any)[f],
    );
    const eventType = closing ? EVENT_CLOSED : EVENT_UPDATED;

    let receipt = null;
    if (meaningfulChanged || closing) {
      receipt = await PromptEvidenceService.record({
        event_type: eventType,
        prompt_id: current.prompt_id,
        prompt_version_id: current.prompt_version_id || undefined,
        workspace_id: workspaceId,
        actor_id: patch.actor_id,
        risk_tier: current.risk_tier || undefined,
        reason: closing ? 'Prompt incident closed' : 'Prompt incident updated',
        payload: {
          incident_ref: current.incident_ref,
          before_status: current.status,
          after_status: updated?.status || current.status,
          severity: updated?.severity || current.severity,
          workspace_id: workspaceId,
        },
      });
    }

    await PromptAuditService.record({
      event_type: eventType,
      workspace_id: workspaceId,
      prompt_id: current.prompt_id,
      version_id: current.prompt_version_id || undefined,
      actor_id: patch.actor_id,
      actor_role: patch.actor_role,
      reason: closing ? 'Prompt incident closed' : 'Prompt incident updated',
      evidence_reference: receipt?.vault_item_id || null,
      source_ip: patch.source_ip || null,
      before_state: {
        status: current.status,
        severity: current.severity,
        owner_id: current.owner_id,
      },
      after_state: {
        status: updated?.status || null,
        severity: updated?.severity || null,
        owner_id: updated?.owner_id || null,
        closed_at: updated?.closed_at || null,
      },
    });

    return { ok: true, incident: updated };
  }

  /**
   * Close an incident: set status=closed, closed_at, closed_by; preserve evidence
   * and write the append-only `prompt.incident.closed` audit event. Idempotency:
   * an already-closed incident returns ALREADY_CLOSED.
   */
  static async closeIncident(
    incidentId: string,
    workspaceId: string,
    input: CloseIncidentInput,
  ): Promise<IncidentResult> {
    if (!workspaceId) return { ok: false, code: 'MISSING_WORKSPACE' };
    const current = await this.getIncident(incidentId, workspaceId);
    if (!current) return { ok: false, code: 'INCIDENT_NOT_FOUND' };
    if (current.status === INCIDENT_STATUS.CLOSED) return { ok: false, code: 'ALREADY_CLOSED' };

    const update: Record<string, unknown> = {
      status: INCIDENT_STATUS.CLOSED,
      closed_at: new Date().toISOString(),
      closed_by: isUuid(input.closed_by) ? input.closed_by : isUuid(input.actor_id) ? input.actor_id : null,
    };
    if (input.post_incident_note !== undefined) update.post_incident_note = input.post_incident_note;
    if (input.remediation !== undefined) update.remediation = input.remediation;

    const { data: closed, error: updErr } = await supabaseAdmin
      .from('prompt_incidents')
      .update(update)
      .eq('id', incidentId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    if (updErr) throw updErr;

    const receipt = await PromptEvidenceService.record({
      event_type: EVENT_CLOSED,
      prompt_id: current.prompt_id,
      prompt_version_id: current.prompt_version_id || undefined,
      workspace_id: workspaceId,
      actor_id: input.actor_id || input.closed_by,
      risk_tier: current.risk_tier || undefined,
      reason: 'Prompt incident closed',
      payload: {
        incident_ref: current.incident_ref,
        before_status: current.status,
        post_incident_note: input.post_incident_note || null,
        workspace_id: workspaceId,
      },
    });

    await PromptAuditService.record({
      event_type: EVENT_CLOSED,
      workspace_id: workspaceId,
      prompt_id: current.prompt_id,
      version_id: current.prompt_version_id || undefined,
      actor_id: input.actor_id || input.closed_by,
      actor_role: input.actor_role,
      reason: 'Prompt incident closed',
      evidence_reference: receipt?.vault_item_id || null,
      source_ip: input.source_ip || null,
      before_state: { status: current.status },
      after_state: { status: INCIDENT_STATUS.CLOSED, closed_at: closed?.closed_at || null, closed_by: closed?.closed_by || null },
    });

    return { ok: true, incident: closed };
  }

  /**
   * List incidents for a prompt. Workspace-scoped (cross-tenant rows can never be
   * returned). Optional status / severity filters and pagination.
   */
  static async listByPrompt(
    promptId: string,
    workspaceId: string,
    filters: IncidentListFilters = {},
  ): Promise<IncidentList> {
    const limit = clampLimit(filters.limit);
    const offset = clampOffset(filters.offset);

    let query = supabaseAdmin
      .from('prompt_incidents')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('prompt_id', promptId);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.severity) query = query.eq('severity', filters.severity);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return { records: data || [], total: count || 0, limit, offset };
  }
}
