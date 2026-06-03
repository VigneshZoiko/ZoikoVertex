/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../../shared/supabase';
import { PromptAuditService } from '../PromptAuditService';
import {
  createPackage,
  sealPackage,
  createExport,
  getExportReceipt,
  getPackage,
  getPackageManifest,
  verifyPackage,
} from '../../../services/evidenceVault.service';

// ─────────────────────────────────────────────────────────────────────────────
// PromptEvidenceExportService — Phase 4 / Batch 4.5 (Evidence Export Packages)
//
// Produces a permission-gated, reason-stamped, immutable evidence export for a
// prompt by REUSING the existing Evidence Vault primitives (createPackage →
// sealPackage → createExport). It creates NO new tables and NO parallel export
// ledger — the package, manifest, and export receipt all live in the Vault's own
// tables (vault_packages / vault_package_items / vault_exports).
//
// Package items are the prompt's vault evidence items, gathered from
// prompt_evidence_links.vault_item_uuid (the single canonical source — it already
// spans lifecycle, deployment, approval, runtime-trace, and incident evidence).
// Governance context (version/deployment/trace/incident/test counts) is attached
// to the package metadata for the manifest, not fabricated as items.
//
// Belonging is recorded by stamping metadata.prompt_id, so getPromptEvidenceExport
// can verify export.workspace_id + package.workspace_id + metadata.prompt_id
// before returning any receipt/manifest. Tenant isolation is enforced on the
// gather (workspace_id + prompt_id) and on every read.
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_EXPORTED = 'prompt.evidence.exported';
const PACKAGE_TYPE = 'prompt_governance_evidence';
const SOURCE_SYSTEM = 'prompt_governance';

// Bound the gather so a pathological prompt cannot build an unbounded package.
// Truncation (if it ever happens) is surfaced in metadata, never silent.
const GATHER_PAGE = 200;
const GATHER_MAX_ITEMS = 5000;

export type ExportErrorCode =
  | 'MISSING_WORKSPACE'
  | 'MISSING_REASON'
  | 'PROMPT_NOT_FOUND'
  | 'TENANT_MISMATCH'
  | 'NO_EVIDENCE'
  | 'EXPORT_NOT_FOUND';

export type ExportResult =
  | { ok: true; data: any }
  | { ok: false; code: ExportErrorCode };

export interface CreateExportInput {
  workspace_id: string;
  prompt_id: string;
  reason: string;
  disclosure_mode?: string;
  delivery_method?: string;
  expires_at?: string;
  actor_id?: string;
  actor_role?: string;
  source_ip?: string;
}

export class PromptEvidenceExportService {
  private static async resolvePrompt(promptId: string, workspaceId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .select('id, name, tenant_id, risk_tier')
      .eq('id', promptId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Gather all vault evidence item UUIDs for a prompt from prompt_evidence_links,
   * tenant-scoped and paged. Returns the unique uuids plus a truncated flag.
   */
  private static async collectVaultItemUuids(
    promptId: string,
    workspaceId: string,
  ): Promise<{ uuids: string[]; truncated: boolean }> {
    const uuids = new Set<string>();
    let offset = 0;
    let truncated = false;

    // prompt_evidence_links is the canonical chain; page until exhausted.
    // listByPrompt is tenant-agnostic by prompt, so we additionally guard
    // workspace_id by querying the link table directly here.
    for (;;) {
      const { data, error } = await supabaseAdmin
        .from('prompt_evidence_links')
        .select('vault_item_uuid')
        .eq('prompt_id', promptId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .range(offset, offset + GATHER_PAGE - 1);
      if (error) throw error;
      const rows = data || [];
      for (const r of rows) {
        if (r.vault_item_uuid) uuids.add(r.vault_item_uuid as string);
        if (uuids.size >= GATHER_MAX_ITEMS) {
          truncated = true;
          break;
        }
      }
      if (truncated || rows.length < GATHER_PAGE) break;
      offset += GATHER_PAGE;
    }

    return { uuids: Array.from(uuids), truncated };
  }

  /** Best-effort governance context counts for the manifest metadata. */
  private static async collectContext(promptId: string, workspaceId: string): Promise<Record<string, unknown>> {
    const countOf = async (table: string, extra?: (q: any) => any): Promise<number> => {
      try {
        let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
        q = extra ? extra(q) : q;
        const { count } = await q;
        return count || 0;
      } catch {
        return 0;
      }
    };

    // Versions are keyed by prompt_id; traces/incidents carry workspace_id+prompt_id.
    const [versions, runtimeTraces, incidents] = await Promise.all([
      countOf('prompt_versions', (q) => q.eq('prompt_id', promptId)),
      countOf('prompt_runtime_traces', (q) => q.eq('workspace_id', workspaceId).eq('prompt_id', promptId)),
      countOf('prompt_incidents', (q) => q.eq('workspace_id', workspaceId).eq('prompt_id', promptId)),
    ]);

    return { versions, runtime_traces: runtimeTraces, incidents };
  }

  /**
   * Create a sealed evidence export for a prompt. Reason is mandatory. Returns a
   * NO_EVIDENCE failure rather than creating an empty package.
   */
  static async createPromptEvidenceExport(input: CreateExportInput): Promise<ExportResult> {
    const workspaceId = String(input.workspace_id || '');
    if (!workspaceId) return { ok: false, code: 'MISSING_WORKSPACE' };
    const reason = String(input.reason || '').trim();
    if (!reason) return { ok: false, code: 'MISSING_REASON' };
    if (!input.prompt_id) return { ok: false, code: 'PROMPT_NOT_FOUND' };

    const prompt = await this.resolvePrompt(input.prompt_id, workspaceId);
    if (!prompt) return { ok: false, code: 'TENANT_MISMATCH' };
    const tenantId = (prompt.tenant_id as string) || workspaceId;
    const actorId = input.actor_id || 'system';

    // ── 1. Collect prompt evidence items (no empty packages) ─────────────────
    const { uuids, truncated } = await this.collectVaultItemUuids(input.prompt_id, workspaceId);
    if (uuids.length === 0) return { ok: false, code: 'NO_EVIDENCE' };

    const context = await this.collectContext(input.prompt_id, workspaceId);

    // ── 2. Create package (items = prompt vault evidence items) ──────────────
    const pkg = await createPackage({
      workspace_id: workspaceId,
      tenant_id: tenantId,
      package_type: PACKAGE_TYPE,
      title: `Prompt Evidence Export — ${prompt.name || input.prompt_id}`,
      description: reason,
      item_ids: uuids,
      created_by: actorId,
      metadata: {
        prompt_id: input.prompt_id,
        source_system: SOURCE_SYSTEM,
        reason,
        item_count: uuids.length,
        truncated,
        context,
        generated_by: actorId,
      },
    });

    // ── 3. Seal package (build + hash manifest) ──────────────────────────────
    const sealed = await sealPackage(pkg.id, actorId);

    // ── 4. Create export (reason captured as requester_reason) ───────────────
    const exportRow = await createExport({
      package_id: pkg.id,
      workspace_id: workspaceId,
      tenant_id: tenantId,
      requester_id: actorId,
      disclosure_mode: input.disclosure_mode || 'internal',
      requester_reason: reason,
      delivery_method: input.delivery_method,
      expires_at: input.expires_at,
    });

    // ── 5. Append-only governance audit ──────────────────────────────────────
    await PromptAuditService.record({
      event_type: EVENT_EXPORTED,
      workspace_id: workspaceId,
      prompt_id: input.prompt_id,
      actor_id: input.actor_id,
      actor_role: input.actor_role,
      reason,
      risk_level: (prompt.risk_tier as string) || undefined,
      evidence_reference: exportRow?.export_id || null,
      source_ip: input.source_ip || null,
      after_state: {
        package_id: pkg.package_id,
        package_uuid: pkg.id,
        export_id: exportRow?.export_id || null,
        export_uuid: exportRow?.id || null,
        item_count: uuids.length,
        manifest_hash: (sealed as any)?.manifest_hash || null,
        disclosure_mode: input.disclosure_mode || 'internal',
        truncated,
      },
    });

    // ── 6. Return receipt ─────────────────────────────────────────────────────
    return {
      ok: true,
      data: {
        export_id: exportRow?.export_id || null,
        export_uuid: exportRow?.id || null,
        package_id: pkg.package_id,
        package_uuid: pkg.id,
        manifest_hash: (sealed as any)?.manifest_hash || null,
        item_count: uuids.length,
        disclosure_mode: input.disclosure_mode || 'internal',
        status: exportRow?.status || null,
        truncated,
      },
    };
  }

  /**
   * Fetch an export receipt + manifest for a prompt. Verifies the export and its
   * package belong to the workspace AND the package belongs to the prompt (via
   * metadata.prompt_id) before returning anything.
   */
  static async getPromptEvidenceExport(
    exportUuid: string,
    promptId: string,
    workspaceId: string,
  ): Promise<ExportResult> {
    if (!workspaceId) return { ok: false, code: 'MISSING_WORKSPACE' };

    const exportRow = await getExportReceipt(exportUuid);
    if (!exportRow || exportRow.workspace_id !== workspaceId) {
      return { ok: false, code: 'EXPORT_NOT_FOUND' };
    }

    const pkg = await getPackage(exportRow.package_id);
    if (!pkg || pkg.workspace_id !== workspaceId) {
      return { ok: false, code: 'EXPORT_NOT_FOUND' };
    }
    if ((pkg.metadata as any)?.prompt_id !== promptId) {
      return { ok: false, code: 'EXPORT_NOT_FOUND' };
    }

    const manifest = await getPackageManifest(pkg.id);
    let integrity: any = null;
    try {
      integrity = await verifyPackage(pkg.id, 'system');
    } catch {
      integrity = null;
    }

    return {
      ok: true,
      data: {
        export: exportRow,
        package: {
          package_id: pkg.package_id,
          package_uuid: pkg.id,
          status: pkg.status,
          manifest_hash: (pkg as any).manifest_hash || null,
          item_count: pkg.item_count,
        },
        manifest,
        integrity,
      },
    };
  }
}
