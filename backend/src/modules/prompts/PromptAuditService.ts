 
import * as crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { logToDatabase } from '../../shared/databaseLogger';

// ─────────────────────────────────────────────────────────────────────────────
// PromptAuditService
//
// Batch 2 — Prompt Governance Append-Only Audit Trail.
//
// A DEDICATED immutable governance ledger (prompt_audit_ledger) that is
// independent from system_logs and from the Evidence Vault.
//
//   Evidence Vault answers:  "What happened?"
//   Audit Ledger answers:    "Who did it, when, why, and what changed?"
//
// Every Prompt Governance lifecycle action writes one append-only record here.
// Records are never updated, deleted, or overwritten — there is no update or
// delete method, no update or delete endpoint, and the database tier rejects
// any UPDATE/DELETE via a mutation-blocking trigger.
//
// All reads are tenant-scoped: queries always filter by workspace_id so audit
// records never cross tenant boundaries.
// ─────────────────────────────────────────────────────────────────────────────

// Canonical set of lifecycle events that MUST produce an audit record.
export const PROMPT_AUDIT_EVENTS = {
  CREATED: 'prompt.created',
  UPDATED: 'prompt.updated',
  CLONED: 'prompt.cloned',
  VERSION_CREATED: 'prompt.version.created',
  TESTED_PASS: 'prompt.test.passed',
  TESTED_FAIL: 'prompt.test.failed',
  REVIEW_SUBMITTED: 'prompt.review.submitted',
  APPROVED: 'prompt.approval.recorded',
  REJECTED: 'prompt.approval.rejected',
  PRODUCTION_REQUESTED: 'prompt.production.requested',
  DEPLOYED: 'prompt.deployed',
  ROLLED_BACK: 'prompt.rollback.completed',
  PAUSED: 'prompt.paused',
  RESUMED: 'prompt.resumed',
  RETIRED: 'prompt.retired',
  ARCHIVED: 'prompt.archived',
  RESTORED: 'prompt.restored',
  RISK_CHANGE: 'prompt.risk.changed',
  OWNERSHIP_CHANGE: 'prompt.ownership.changed',
  KNOWLEDGE_BINDING_CHANGE: 'prompt.knowledge.binding_changed',
  TOOL_PERMISSION_CHANGE: 'prompt.tool_permission.changed',
  DEPENDENCY_CHANGE: 'prompt.dependency.changed',

  // Phase 5C — Adversarial Testing events
  ADVERSARIAL_STARTED: 'prompt.test.adversarial.started',
  ADVERSARIAL_PASSED: 'prompt.test.adversarial.passed',
  ADVERSARIAL_WARNING: 'prompt.test.adversarial.warning',
  ADVERSARIAL_FAILED: 'prompt.test.adversarial.failed',
  ADVERSARIAL_SCENARIO_FAIL: 'prompt.test.adversarial.scenario_fail',

  // Phase 5E — Scorecard events
  SCORECARD_GENERATED: 'prompt.scorecard.generated',
} as const;

function riskTierToLevel(riskTier?: string | null): string {
  const t = String(riskTier || '').toLowerCase();
  if (t.includes('tier_4') || t.includes('critical')) return 'critical';
  if (t.includes('tier_3') || t.includes('high')) return 'high';
  if (t.includes('tier_1') || t === 'low') return 'low';
  if (['low', 'medium', 'high', 'critical'].includes(t)) return t;
  return 'medium';
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// ── State-size guard ─────────────────────────────────────────────────────────
// Audit rows must stay small and bounded. Before/after/context payloads are
// CLAMPED before insert so a large prompt body, a big knowledge_sources array,
// or an arbitrary client field cannot explode ledger storage. These columns are
// jsonb but are deliberately NOT GIN-indexed (only scalar columns are indexed),
// so clamping here protects both row size and write throughput.
const MAX_STRING_LEN = 1024;        // per-string-value cap
const MAX_ARRAY_ITEMS = 50;         // per-array cap
const MAX_STATE_BYTES = 8 * 1024;   // overall per-field cap (~8KB)

function clampValue(v: unknown): unknown {
  if (typeof v === 'string' && v.length > MAX_STRING_LEN) {
    return `${v.slice(0, MAX_STRING_LEN)}…[truncated ${v.length - MAX_STRING_LEN} chars]`;
  }
  return v;
}

function clampState(state?: Record<string, unknown>): Record<string, unknown> {
  if (!state || typeof state !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (Array.isArray(v)) {
      const trimmed = v.slice(0, MAX_ARRAY_ITEMS).map(clampValue);
      if (v.length > MAX_ARRAY_ITEMS) trimmed.push(`…[${v.length - MAX_ARRAY_ITEMS} more items]`);
      out[k] = trimmed;
    } else if (v && typeof v === 'object') {
      out[k] = clampValue(JSON.stringify(v));
    } else {
      out[k] = clampValue(v);
    }
  }
  const serialized = JSON.stringify(out);
  if (serialized.length > MAX_STATE_BYTES) {
    return { _truncated: true, _original_bytes: serialized.length, preview: serialized.slice(0, MAX_STATE_BYTES) };
  }
  return out;
}

export interface RecordAuditInput {
  event_type: string;
  workspace_id?: string;
  prompt_id?: string;
  version_id?: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  reason?: string;
  risk_level?: string;        // either a risk tier (tier_3_high) or a level (high)
  approval_context?: Record<string, unknown>;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  evidence_reference?: string | null;
  source_ip?: string | null;
  correlation_id?: string | null;
}

export interface AuditListFilters {
  event_type?: string;
  version_id?: string;
  actor_id?: string;
  risk_level?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export class PromptAuditService {
  /**
   * Append an immutable audit record. Non-blocking: any failure is logged and
   * swallowed so a lifecycle action is never broken by audit capture. Returns
   * the inserted record (or null on failure / missing tenancy).
   */
  static async record(input: RecordAuditInput): Promise<any | null> {
    const workspaceId = String(input.workspace_id || '');
    if (!workspaceId) return null; // cannot record without tenancy scope

    const auditRef = `PAUD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    try {
      const { data, error } = await supabaseAdmin
        .from('prompt_audit_ledger')
        .insert({
          audit_ref: auditRef,
          workspace_id: workspaceId,
          tenant_id: workspaceId,
          prompt_id: isUuid(input.prompt_id) ? input.prompt_id : null,
          version_id: isUuid(input.version_id) ? input.version_id : null,
          actor_id: isUuid(input.actor_id) ? input.actor_id : null,
          actor_name: input.actor_name || (isUuid(input.actor_id) ? String(input.actor_id) : 'system'),
          actor_role: String(input.actor_role || 'system').toUpperCase(),
          event_type: input.event_type,
          reason: clampValue(input.reason || '') as string,
          approval_context: clampState(input.approval_context),
          risk_level: riskTierToLevel(input.risk_level),
          before_state: clampState(input.before_state),
          after_state: clampState(input.after_state),
          evidence_reference: input.evidence_reference || null,
          source_ip: input.source_ip || null,
          correlation_id: input.correlation_id || crypto.randomUUID(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      await logToDatabase('error', 'prompt-governance', 'prompt.audit.record_failed', {
        event_type: input.event_type,
        prompt_id: input.prompt_id,
        version_id: input.version_id,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  private static applyFilters(query: any, filters: AuditListFilters) {
    if (filters.event_type) query = query.eq('event_type', filters.event_type);
    if (filters.version_id) query = query.eq('version_id', filters.version_id);
    if (filters.actor_id) query = query.eq('actor_id', filters.actor_id);
    if (filters.risk_level) query = query.eq('risk_level', String(filters.risk_level).toLowerCase());
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);
    return query;
  }

  /**
   * Workspace-wide audit list (tenant-scoped) with filtering + pagination.
   */
  static async list(
    workspaceId: string,
    filters: AuditListFilters & { prompt_id?: string } = {},
  ): Promise<{ records: any[]; total: number; limit: number; offset: number }> {
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    const offset = Math.max(Number(filters.offset) || 0, 0);

    let query = supabaseAdmin
      .from('prompt_audit_ledger')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId);
    if (filters.prompt_id) query = query.eq('prompt_id', filters.prompt_id);
    query = this.applyFilters(query, filters);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { records: data || [], total: count || 0, limit, offset };
  }

  /**
   * Per-prompt audit list (tenant-scoped) with filtering + pagination.
   */
  static async getByPrompt(
    promptId: string,
    workspaceId: string,
    filters: AuditListFilters = {},
  ): Promise<{ records: any[]; total: number; limit: number; offset: number }> {
    return this.list(workspaceId, { ...filters, prompt_id: promptId });
  }

  /**
   * Chronological timeline for a single prompt. Tenant-scoped and BOUNDED:
   * returns at most `limit` of the most-recent events (default 500, hard max
   * 1000) so the endpoint can never stream an unbounded result set into the UI.
   * `truncated` signals the prompt has more history than was returned.
   */
  static async getTimeline(
    promptId: string,
    workspaceId: string,
    limit = 500,
  ): Promise<{ records: any[]; total: number; truncated: boolean; limit: number }> {
    const cap = Math.min(Math.max(Number(limit) || 500, 1), 1000);
    // Fetch the most-recent `cap` rows (DESC, index-served), then present them
    // in chronological (ascending) order for the timeline view.
    const { data, error, count } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false })
      .range(0, cap - 1);
    if (error) throw error;
    const records = (data || []).slice().reverse();
    const total = count || records.length;
    return { records, total, truncated: total > records.length, limit: cap };
  }

  /**
   * Fetch a single audit record by its id. Tenant-scoped — a record from
   * another workspace is never returned.
   */
  static async getById(auditId: string, workspaceId: string): Promise<any | null> {
    const { data, error } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('*')
      .eq('id', auditId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}
