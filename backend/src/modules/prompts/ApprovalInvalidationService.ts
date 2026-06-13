 
import { supabaseAdmin } from '../../shared/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// ApprovalInvalidationService
//
// Batch 3B.2 — highest-priority governance rule (Doc 3 §7 / §18 QA):
// "Approval status must be invalidated when risk-impacting sections are changed
//  after approval."
//
// A prompt version's approval becomes INVALID when any of its risk-impacting
// dependencies — agent binding, workflow binding, knowledge binding, or tool
// permission — is mutated AFTER the latest APPROVED decision for that version.
//
// Detection compares timestamps:
//     MAX(dependency.updated_at)  >  MAX(approval.created_at WHERE APPROVED)
//
// This file is PURE governance logic + a single persistence write to the
// existing prompts.approval_invalidated_at / _reason columns (added in 3B.1).
// It does NOT touch controllers, routes, UI, or graph services, and it does NOT
// wire audit/evidence — controller integration comes in a later file.
//
// NOTE on deletes: timestamp comparison detects creates and edits of existing
// bindings. A binding *deletion* leaves no row to compare, so the controller
// (later) will call invalidate() explicitly on delete. This service exposes
// invalidate() for that purpose.
// ─────────────────────────────────────────────────────────────────────────────

// Prompt statuses for which an approval can be invalidated. Other states
// (DRAFT, REJECTED, ARCHIVED, RETIRED) are ignored — there is no live approval
// to invalidate. Stored enum values are lowercase.
const INVALIDATION_ELIGIBLE_STATUSES = new Set<string>([
  'approved',            // generic APPROVED
  'approved_for_staging', // APPROVED_STAGING
  'production_pending',   // PRODUCTION_PENDING
]);

const DEPENDENCY_TABLES: Array<{ table: string; label: string }> = [
  { table: 'prompt_bindings', label: 'agent/workflow dependency' },
  { table: 'prompt_knowledge_bindings', label: 'knowledge binding' },
  { table: 'prompt_tool_permissions', label: 'tool permission' },
];

export interface ApprovalValidity {
  valid: boolean;
  invalidated: boolean;
  invalidatedAt?: string;
  reason?: string;
}

interface VersionContext {
  versionId: string;
  promptId: string | null;
  status: string;
  approvalInvalidatedAt: string | null;
  approvalInvalidatedReason: string | null;
}

export class ApprovalInvalidationService {
  // ── internal helpers ──────────────────────────────────────────────────────

  /** Resolve the prompt that owns a version, with its status + persisted flag. */
  private static async getVersionContext(versionId: string): Promise<VersionContext | null> {
    const { data: version, error: vErr } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, prompt_id')
      .eq('id', versionId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!version) return null;

    const { data: prompt, error: pErr } = await supabaseAdmin
      .from('prompts')
      .select('id, status, approval_invalidated_at, approval_invalidated_reason')
      .eq('id', version.prompt_id)
      .maybeSingle();
    if (pErr) throw pErr;

    return {
      versionId,
      promptId: version.prompt_id ?? null,
      status: String(prompt?.status || '').toLowerCase(),
      approvalInvalidatedAt: prompt?.approval_invalidated_at ?? null,
      approvalInvalidatedReason: prompt?.approval_invalidated_reason ?? null,
    };
  }

  /** Latest APPROVED decision timestamp for a version (or null if never approved). */
  static async getLatestApprovalAt(versionId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('prompt_approvals')
      .select('created_at')
      .eq('prompt_version_id', versionId)
      .eq('decision', 'APPROVED')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0]?.created_at ?? null;
  }

  /** Latest mutation timestamp across one binding table for a version. */
  private static async getLatestMutationAt(table: string, versionId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('updated_at, created_at')
      .eq('prompt_version_id', versionId)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    // Prefer updated_at (covers edits); fall back to created_at.
    return row.updated_at || row.created_at || null;
  }

  /**
   * Latest dependency mutation across all three binding tables, with the label
   * of the table that produced it (used for the invalidation reason).
   */
  static async getLatestDependencyMutation(versionId: string): Promise<{ at: string | null; label: string | null }> {
    let latest: string | null = null;
    let label: string | null = null;
    for (const { table, label: tableLabel } of DEPENDENCY_TABLES) {
      const at = await this.getLatestMutationAt(table, versionId);
      if (at && (!latest || new Date(at).getTime() > new Date(latest).getTime())) {
        latest = at;
        label = tableLabel;
      }
    }
    return { at: latest, label };
  }

  // ── output contract ─────────────────────────────────────────────────────────

  /**
   * Compute (without persisting) whether the version's approval should be
   * considered invalid because a risk-impacting dependency changed after the
   * latest approval. Returns the validity contract.
   */
  static async evaluate(versionId: string): Promise<ApprovalValidity> {
    const ctx = await this.getVersionContext(versionId);
    if (!ctx) return { valid: true, invalidated: false };

    // Not in an approval-bearing state → nothing to invalidate.
    if (!INVALIDATION_ELIGIBLE_STATUSES.has(ctx.status)) {
      return { valid: true, invalidated: false };
    }

    const approvedAt = await this.getLatestApprovalAt(versionId);
    if (!approvedAt) {
      // No approval on record → not invalidated (there is nothing to invalidate).
      return { valid: true, invalidated: false };
    }

    const { at: mutatedAt, label } = await this.getLatestDependencyMutation(versionId);
    if (!mutatedAt) {
      return { valid: true, invalidated: false };
    }

    const changedAfterApproval = new Date(mutatedAt).getTime() > new Date(approvedAt).getTime();
    if (!changedAfterApproval) {
      return { valid: true, invalidated: false };
    }

    return {
      valid: false,
      invalidated: true,
      invalidatedAt: mutatedAt,
      reason: `Approval invalidated: ${label || 'dependency'} changed after approval (changed ${mutatedAt}, approved ${approvedAt}).`,
    };
  }

  /**
   * Persist invalidation onto the owning prompt. Sets approval_invalidated_at
   * (defaults to now if not supplied) and approval_invalidated_reason. Returns
   * the resulting validity contract. Idempotent — re-invalidating updates the
   * reason/timestamp. Does not emit audit/evidence (wired by the controller
   * layer later).
   */
  static async invalidate(versionId: string, reason: string, invalidatedAt?: string): Promise<ApprovalValidity> {
    const ctx = await this.getVersionContext(versionId);
    if (!ctx || !ctx.promptId) return { valid: true, invalidated: false };

    const at = invalidatedAt || new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('prompts')
      .update({ approval_invalidated_at: at, approval_invalidated_reason: reason })
      .eq('id', ctx.promptId);
    if (error) throw error;

    return { valid: false, invalidated: true, invalidatedAt: at, reason };
  }

  /**
   * Return the PERSISTED validity flag for a version (reads
   * prompts.approval_invalidated_at / _reason). Use this for display; use
   * evaluate() to recompute from current timestamps.
   */
  static async getValidity(versionId: string): Promise<ApprovalValidity> {
    const ctx = await this.getVersionContext(versionId);
    if (!ctx) return { valid: true, invalidated: false };

    if (ctx.approvalInvalidatedAt) {
      return {
        valid: false,
        invalidated: true,
        invalidatedAt: ctx.approvalInvalidatedAt,
        reason: ctx.approvalInvalidatedReason || 'Approval invalidated by a dependency change after approval.',
      };
    }
    return { valid: true, invalidated: false };
  }

  /**
   * Clear a persisted invalidation flag (e.g. after re-approval). Provided for
   * completeness so the later controller layer can reset state on re-approval.
   */
  static async clear(versionId: string): Promise<void> {
    const ctx = await this.getVersionContext(versionId);
    if (!ctx || !ctx.promptId) return;
    const { error } = await supabaseAdmin
      .from('prompts')
      .update({ approval_invalidated_at: null, approval_invalidated_reason: null })
      .eq('id', ctx.promptId);
    if (error) throw error;
  }
}
