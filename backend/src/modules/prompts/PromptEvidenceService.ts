/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../shared/supabase';
import { preserveEvidence } from '../../services/evidenceVault.service';
import { logToDatabase } from '../../shared/databaseLogger';

// ─────────────────────────────────────────────────────────────────────────────
// PromptEvidenceService
//
// Batch 1 / Phase 9 — Evidence Vault Integration.
//
// Every Prompt Governance lifecycle event (creation, modification, approval,
// rejection, deployment, rollback, retirement, testing, policy result) is
// preserved as an IMMUTABLE record in the shared Evidence Vault
// (vault_evidence_items) via preserveEvidence(), which content-hashes the
// payload, assigns a retention class, and emits an append-only audit event.
//
// A row in prompt_evidence_links ties the preserved vault record back to the
// prompt + version that produced it so the Prompt Governance UI can retrieve a
// prompt's full evidence chain and export it.
// ─────────────────────────────────────────────────────────────────────────────

const EVIDENCE_SOURCE_SYSTEM = 'prompt_governance';

// Events that carry regulatory weight get a longer (regulated) retention class.
const REGULATED_EVENTS = new Set<string>([
  'prompt.approval.recorded',
  'prompt.approval.rejected',
  'prompt.production.requested',
  'prompt.deployed',
  'prompt.rollback.completed',
  'prompt.retired',
]);

function riskTierToLevel(riskTier?: string | null): string {
  const t = String(riskTier || '').toLowerCase();
  if (t.includes('tier_4') || t.includes('critical')) return 'critical';
  if (t.includes('tier_3') || t.includes('high')) return 'high';
  if (t.includes('tier_1') || t === 'low') return 'low';
  return 'medium';
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export interface RecordEvidenceInput {
  event_type: string;
  prompt_id?: string;
  prompt_version_id?: string;
  workspace_id?: string;
  actor_id?: string;
  risk_tier?: string;
  reason?: string;
  payload: Record<string, unknown>;
}

export interface PromptEvidenceReceipt {
  vault_item_id: string;       // EVI-... human-readable id
  vault_item_uuid: string;     // vault_evidence_items.id (used as evidence_id FK on approvals/deployments)
  evidence_hash: string | null;
}

export class PromptEvidenceService {
  /**
   * Preserve a prompt governance event as an immutable Evidence Vault record and
   * link it to the originating prompt/version. Non-blocking: any failure is logged
   * and swallowed so lifecycle operations are never broken by evidence capture.
   */
  static async record(input: RecordEvidenceInput): Promise<PromptEvidenceReceipt | null> {
    const workspaceId = String(input.workspace_id || (input.payload?.workspace_id as string) || '');
    if (!workspaceId) return null; // cannot preserve without tenancy scope

    const promptId = (input.prompt_id || (input.payload?.prompt_id as string) || null) ?? null;
    const promptVersionId = (input.prompt_version_id || (input.payload?.prompt_version_id as string) || null) ?? null;
    const actorRaw = String(input.actor_id || (input.payload?.actor_id as string) || 'system');
    const riskLevel = riskTierToLevel(input.risk_tier || (input.payload?.risk_tier as string));
    const sourceId = String(promptVersionId || promptId || 'unknown');
    const retentionClass = REGULATED_EVENTS.has(input.event_type) ? 'regulated' : 'standard';

    try {
      const item = await preserveEvidence({
        source_type: 'prompt_governance_event',
        source_id: sourceId,
        source_system: EVIDENCE_SOURCE_SYSTEM,
        evidence_type: input.event_type,
        risk_level: riskLevel,
        sensitivity: 'internal',
        contains_ai_output: true,
        payload: JSON.stringify({ event_type: input.event_type, ...input.payload }),
        retention_class: retentionClass,
        preserved_by: actorRaw,
        preservation_reason: input.reason || `Prompt governance event: ${input.event_type}`,
        workspace_id: workspaceId,
        tenant_id: workspaceId,
        metadata: {
          prompt_id: promptId,
          prompt_version_id: promptVersionId,
          event_type: input.event_type,
        },
      });

      await supabaseAdmin.from('prompt_evidence_links').insert({
        prompt_id: promptId,
        prompt_version_id: promptVersionId,
        workspace_id: workspaceId,
        tenant_id: workspaceId,
        event_type: input.event_type,
        vault_item_id: item.item_id,
        vault_item_uuid: item.id,
        evidence_hash: item.preservation_receipt_hash,
        risk_level: riskLevel,
        actor_id: isUuid(actorRaw) ? actorRaw : null,
        reason: input.reason || '',
        metadata: input.payload || {},
      });

      return {
        vault_item_id: item.item_id,
        vault_item_uuid: item.id,
        evidence_hash: item.preservation_receipt_hash,
      };
    } catch (err) {
      // Evidence preservation must never block a governance action.
      await logToDatabase('error', 'prompt-governance', 'prompt.evidence.preserve_failed', {
        event_type: input.event_type,
        prompt_id: promptId,
        prompt_version_id: promptVersionId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Return the immutable evidence chain for a prompt, joined with the vault
   * record (state, retention, captured timestamp) for display/export.
   * Supports event/version/risk/date/actor filtering and pagination.
   */
  static async listByPrompt(
    promptId: string,
    filters: {
      event_type?: string;
      prompt_version_id?: string;
      risk_level?: string;
      actor_id?: string;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ records: any[]; total: number; limit: number; offset: number }> {
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    const offset = Math.max(Number(filters.offset) || 0, 0);

    let query = supabaseAdmin
      .from('prompt_evidence_links')
      .select('*', { count: 'exact' })
      .eq('prompt_id', promptId);

    if (filters.event_type) query = query.eq('event_type', filters.event_type);
    if (filters.prompt_version_id) query = query.eq('prompt_version_id', filters.prompt_version_id);
    if (filters.risk_level) query = query.eq('risk_level', filters.risk_level);
    if (filters.actor_id) query = query.eq('actor_id', filters.actor_id);
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);

    const { data: links, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    if (!links || links.length === 0) return { records: [], total: count || 0, limit, offset };

    const uuids = Array.from(
      new Set(links.map((l: any) => l.vault_item_uuid).filter(Boolean)),
    );
    let itemsById: Record<string, any> = {};
    if (uuids.length > 0) {
      const { data: items } = await supabaseAdmin
        .from('vault_evidence_items')
        .select('id, item_id, vault_state, retention_class, retention_until, legal_hold, captured_at, hash_algorithm, preservation_receipt_hash')
        .in('id', uuids);
      itemsById = (items || []).reduce((acc: Record<string, any>, it: any) => {
        acc[it.id] = it;
        return acc;
      }, {});
    }

    const records = links.map((l: any) => ({
      id: l.id,
      event_type: l.event_type,
      prompt_id: l.prompt_id,
      prompt_version_id: l.prompt_version_id,
      actor_id: l.actor_id,
      vault_item_id: l.vault_item_id,
      vault_item_uuid: l.vault_item_uuid,
      evidence_hash: l.evidence_hash,
      risk_level: l.risk_level,
      reason: l.reason,
      metadata: l.metadata,
      created_at: l.created_at,
      vault: itemsById[l.vault_item_uuid] || null,
    }));

    return { records, total: count || 0, limit, offset };
  }
}
