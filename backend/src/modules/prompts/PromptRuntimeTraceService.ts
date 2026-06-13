 
import { supabaseAdmin } from '../../shared/supabase';
import { PromptEvidenceService } from './PromptEvidenceService';
import { PromptAuditService } from './PromptAuditService';
import { PromptDependencyService } from './PromptDependencyService';

// ─────────────────────────────────────────────────────────────────────────────
// PromptRuntimeTraceService — Phase 4 / Batch 4.2 (Runtime Evidence Ingestion)
//
// Records what a production execution actually used (prompt version, model,
// policy result, tools, KB sources) into the append-only prompt_runtime_traces
// table created in Batch 4.1.
//
// INGESTION-ONLY: the Runtime Engine remains the source of truth and authority.
// This service receives and records traces and reads them back. It does NOT
// enforce anything at runtime and never mutates the Runtime Engine.
//
// Tenant isolation: every write resolves prompt_version_id → prompts.workspace_id
// BEFORE insert and stamps workspace_id/tenant_id from the resolved prompt (never
// from raw input). Every read filters by workspace_id on the denormalized column,
// so a trace from another tenant can never be returned.
//
// Append-only constraint (Batch 4.1): prompt_runtime_traces blocks UPDATE/DELETE.
// Evidence is therefore preserved FIRST (PromptEvidenceService.record()) and the
// receipt is written into the row at insert time — there is no post-insert UPDATE.
//
// Non-blocking enrichment: a trace is the execution fact and must always persist.
// Evidence preservation, the dependency-health snapshot, and the violation audit
// entry are all best-effort; only a failure of the trace insert itself surfaces.
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_TRACE_RECORDED = 'prompt.runtime.trace.recorded';
const EVENT_RUNTIME_VIOLATION = 'prompt.runtime.violation';

export type RuntimeTraceErrorCode = 'MISSING_WORKSPACE' | 'VERSION_NOT_FOUND' | 'TENANT_MISMATCH';

export type RuntimeTraceResult =
  | { ok: true; trace: any }
  | { ok: false; code: RuntimeTraceErrorCode };

export interface IngestRuntimeTraceInput {
  workspace_id: string;
  prompt_version_id: string;
  execution_id?: string;
  environment?: string;
  model_id?: string;
  input_hash?: string;
  output_hash?: string;
  policy_result?: string;
  policy_result_json?: Record<string, unknown>;
  tool_calls?: unknown[];
  kb_sources?: unknown[];
  runtime_policy_id?: string;
  violation?: boolean;
  violation_reason?: string;
  deployment_id?: string;
  actor_id?: string;
  source_ip?: string;
  correlation_id?: string;
}

export interface RuntimeTraceListFilters {
  version_id?: string;
  violation_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface RuntimeTraceList {
  records: any[];
  total: number;
  limit: number;
  offset: number;
}

interface ResolvedVersionTenant {
  prompt_id: string;
  tenant_id: string;
  risk_tier: string | null;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function clampLimit(value: unknown): number {
  return Math.min(Math.max(Number(value) || 50, 1), 200);
}

function clampOffset(value: unknown): number {
  return Math.max(Number(value) || 0, 0);
}

export class PromptRuntimeTraceService {
  /**
   * Non-throwing tenant guard. Resolves prompt_version_id → prompt → workspace.
   * Returns the resolved prompt context, or a discriminated failure code. Uses
   * maybeSingle() so a missing row is a code, not a thrown error.
   */
  static async resolveVersionTenant(
    versionId: string,
    workspaceId: string,
  ): Promise<{ ok: true; ctx: ResolvedVersionTenant } | { ok: false; code: RuntimeTraceErrorCode }> {
    const { data: version, error: vErr } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, prompt_id')
      .eq('id', versionId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!version || !version.prompt_id) return { ok: false, code: 'VERSION_NOT_FOUND' };

    const { data: prompt, error: pErr } = await supabaseAdmin
      .from('prompts')
      .select('id, tenant_id, risk_tier')
      .eq('id', version.prompt_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!prompt) return { ok: false, code: 'TENANT_MISMATCH' };

    return {
      ok: true,
      ctx: {
        prompt_id: prompt.id,
        tenant_id: (prompt.tenant_id as string) || workspaceId,
        risk_tier: (prompt.risk_tier as string) ?? null,
      },
    };
  }

  /**
   * Capture the dependency-health snapshot for the executing version. Best-effort:
   * any failure returns {} so ingestion is never aborted by graph assembly.
   */
  private static async captureHealthSnapshot(
    promptId: string,
    workspaceId: string,
    versionId: string,
  ): Promise<Record<string, unknown>> {
    try {
      const graph = await PromptDependencyService.getGraph(promptId, workspaceId, { versionId });
      return (graph?.summary as unknown as Record<string, unknown>) || {};
    } catch {
      return {};
    }
  }

  /**
   * Ingest a single runtime trace. Validates tenancy, preserves evidence first,
   * captures a dependency-health snapshot, then inserts the append-only row with
   * the evidence receipt already populated (no post-insert UPDATE). Records a
   * governance audit entry ONLY when violation === true.
   */
  static async ingestRuntimeTrace(input: IngestRuntimeTraceInput): Promise<RuntimeTraceResult> {
    const workspaceId = String(input.workspace_id || '');
    if (!workspaceId) return { ok: false, code: 'MISSING_WORKSPACE' };
    if (!input.prompt_version_id) return { ok: false, code: 'VERSION_NOT_FOUND' };

    // ── 1. Tenant guard ──────────────────────────────────────────────────────
    const resolved = await this.resolveVersionTenant(input.prompt_version_id, workspaceId);
    if (!resolved.ok) return resolved;
    const { prompt_id: promptId, tenant_id: tenantId, risk_tier: riskTier } = resolved.ctx;

    const isViolation = input.violation === true;
    const eventType = isViolation ? EVENT_RUNTIME_VIOLATION : EVENT_TRACE_RECORDED;

    // ── 2. Dependency-health snapshot (best-effort) ──────────────────────────
    const dependencyHealthSnapshot = await this.captureHealthSnapshot(promptId, workspaceId, input.prompt_version_id);

    // ── 3. Preserve runtime evidence FIRST (non-blocking; null receipt is fine).
    //      Append-only traces cannot be updated post-insert, so the receipt must
    //      be available before the row is written.
    const evidencePayload: Record<string, unknown> = {
      execution_id: input.execution_id || '',
      environment: input.environment || 'production',
      model_id: input.model_id || null,
      input_hash: input.input_hash || null,
      output_hash: input.output_hash || null,
      policy_result: input.policy_result || null,
      runtime_policy_id: input.runtime_policy_id || null,
      violation: isViolation,
      violation_reason: input.violation_reason || null,
      deployment_id: input.deployment_id || null,
      workspace_id: workspaceId,
    };
    const receipt = await PromptEvidenceService.record({
      event_type: eventType,
      prompt_id: promptId,
      prompt_version_id: input.prompt_version_id,
      workspace_id: workspaceId,
      actor_id: input.actor_id,
      risk_tier: riskTier || undefined,
      reason: isViolation ? (input.violation_reason || 'Runtime policy violation') : 'Runtime execution trace',
      payload: evidencePayload,
    });

    // ── 4. Insert the append-only trace with the evidence receipt populated ──
    const { data: trace, error: insErr } = await supabaseAdmin
      .from('prompt_runtime_traces')
      .insert({
        workspace_id: workspaceId,
        tenant_id: tenantId,
        prompt_id: promptId,
        prompt_version_id: input.prompt_version_id,
        execution_id: input.execution_id || '',
        environment: input.environment || 'production',
        model_id: input.model_id || null,
        input_hash: input.input_hash || null,
        output_hash: input.output_hash || null,
        policy_result: input.policy_result || null,
        policy_result_json: input.policy_result_json || {},
        tool_calls: input.tool_calls || [],
        kb_sources: input.kb_sources || [],
        runtime_policy_id: isUuid(input.runtime_policy_id) ? input.runtime_policy_id : null,
        violation: isViolation,
        violation_reason: input.violation_reason || null,
        dependency_health_snapshot: dependencyHealthSnapshot,
        deployment_id: isUuid(input.deployment_id) ? input.deployment_id : null,
        evidence_id: receipt?.vault_item_uuid || null,
        evidence_ref: receipt?.vault_item_id || null,
        evidence_hash: receipt?.evidence_hash || null,
        actor_id: isUuid(input.actor_id) ? input.actor_id : null,
        source_ip: input.source_ip || null,
        correlation_id: input.correlation_id || receipt?.vault_item_uuid || null,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // ── 5. Governance audit — VIOLATIONS ONLY (benign traces are not audited) ─
    if (isViolation) {
      await PromptAuditService.record({
        event_type: EVENT_RUNTIME_VIOLATION,
        workspace_id: workspaceId,
        prompt_id: promptId,
        version_id: input.prompt_version_id,
        actor_id: input.actor_id,
        actor_role: 'runtime',
        reason: input.violation_reason || 'Runtime policy violation',
        risk_level: riskTier || undefined,
        evidence_reference: receipt?.vault_item_id || null,
        source_ip: input.source_ip || null,
        correlation_id: (trace?.correlation_id as string) || null,
        after_state: {
          execution_id: input.execution_id || '',
          policy_result: input.policy_result || null,
          runtime_policy_id: input.runtime_policy_id || null,
          violation_reason: input.violation_reason || null,
          trace_id: trace?.id || null,
        },
      });
    }

    return { ok: true, trace };
  }

  /**
   * List runtime traces for a prompt. Workspace-scoped (cross-tenant rows can
   * never be returned). Supports version filter, violation-only, and pagination.
   */
  static async listByPrompt(
    promptId: string,
    workspaceId: string,
    filters: RuntimeTraceListFilters = {},
  ): Promise<RuntimeTraceList> {
    const limit = clampLimit(filters.limit);
    const offset = clampOffset(filters.offset);

    let query = supabaseAdmin
      .from('prompt_runtime_traces')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('prompt_id', promptId);

    if (filters.version_id) query = query.eq('prompt_version_id', filters.version_id);
    if (filters.violation_only) query = query.eq('violation', true);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return { records: data || [], total: count || 0, limit, offset };
  }

  /**
   * List runtime traces for a single prompt version. Workspace-scoped on the
   * denormalized column, so cross-tenant rows can never be returned. Supports
   * violation-only and pagination.
   */
  static async listByVersion(
    versionId: string,
    workspaceId: string,
    filters: RuntimeTraceListFilters = {},
  ): Promise<RuntimeTraceList> {
    const limit = clampLimit(filters.limit);
    const offset = clampOffset(filters.offset);

    let query = supabaseAdmin
      .from('prompt_runtime_traces')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('prompt_version_id', versionId);

    if (filters.violation_only) query = query.eq('violation', true);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return { records: data || [], total: count || 0, limit, offset };
  }
}
