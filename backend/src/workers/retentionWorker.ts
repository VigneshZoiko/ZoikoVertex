import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { logAuditEvent } from '../domains/governance/evidenceController';
import { PLAN_CAPS } from '../shared/commercialState';

// ─── Configuration ───────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000; // every 24 hours
const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 100; // small delay between batches to release event loop

// Default retention in months (mirrors the policy document ZV-PRIV-DATA-RET-001)
// These are used when workspace_retention_settings table hasn't been populated yet.
const DEFAULT_RETENTION = {
  audit_events_months:           84,  // 7 years
  evidence_vault_months:         84,  // 7 years
  forensic_cases_months:         84,  // 7 years after closure
  decisions_months:              84,  // 7 years (Decision Ledger = decisions table)
  identity_access_months:        84,  // 7 years
  content_history_months:        36,  // 3 years default
  inbox_messages_months:         12,  // 12 months default
  analytics_identifiable_months: 24,  // 24 months (not yet implemented — no analytics table)
  analytics_aggregated_months:   60,  // 60 months (not yet implemented — no analytics table)
  billing_records_months:        84,  // 7 years (wallet_transactions — deleted via wallet_id join)
  backups_days:                  90,  // 90 days rolling (handled by backup rotation, not DB deletes)
} as const;

// ─── Legal Hold Check ────────────────────────────────────────────────────────
// Returns a Set of object IDs under active legal hold so the worker skips them.
// legal_holds table verified in 16_forensic_cases.sql and related migrations.

async function getHeldObjectIds(workspaceId: string): Promise<Set<string>> {
  const held = new Set<string>();
  try {
    const { data: holds } = await supabaseAdmin
      .from('legal_holds')
      .select('object_id')
      .eq('workspace_id', workspaceId)
      .or(`status.eq.ACTIVE,status.eq.PENDING`);
    if (holds) {
      for (const h of holds) {
        if (h.object_id) held.add(h.object_id);
      }
    }
  } catch {
    // legal_holds table may not exist in all environments — carry on
  }
  return held;
}

// ─── Batch Deletion Helper ──────────────────────────────────────────────────
// Generic batch DELETE for any table that has workspace_id + a date column.
// Returns { deleted: number, held: number }.

async function batchDeleteFromTable(
  params: {
    table: string;
    workspaceId: string;
    dateColumn: string;
    cutoffDate: string;
    batchSize?: number;
  },
): Promise<{ deleted: number; held: number }> {
  const {
    table,
    workspaceId,
    dateColumn,
    cutoffDate,
    batchSize = BATCH_SIZE,
  } = params;

  let totalDeleted = 0;
  let totalHeld = 0;
  const heldIds = await getHeldObjectIds(workspaceId);

  while (true) {
    const query = supabaseAdmin
      .from(table)
      .select('id')
      .eq('workspace_id', workspaceId)
      .lt(dateColumn, cutoffDate);

    const { data: batch } = await query.limit(batchSize);

    if (!batch || batch.length === 0) break;

    const idsToDelete = batch.filter((r: any) => !heldIds.has(r.id)).map((r: any) => r.id);
    totalHeld += batch.length - idsToDelete.length;

    if (idsToDelete.length > 0) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .in('id', idsToDelete);

      if (error) {
        logger.error({ error, table, count: idsToDelete.length }, '[retention] Batch delete failed');
        return { deleted: totalDeleted, held: totalHeld };
      }
      totalDeleted += idsToDelete.length;
      logger.info({ table, deleted: idsToDelete.length, held: batch.length - idsToDelete.length, total: totalDeleted }, '[retention] Batch progress');
    }

    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

    if (batch.length < batchSize) break;
  }

  return { deleted: totalDeleted, held: totalHeld };
}

// ─── Logging Helper ──────────────────────────────────────────────────────────
// Persists result to retention_execution_log + audit trail.

async function logRetentionResult(
  workspaceId: string,
  category: string,
  deleted: number,
  held: number,
  retentionMonths: number,
  status: string = 'completed',
  errorMessage?: string,
) {
  try {
    await supabaseAdmin.from('retention_execution_log').insert({
      workspace_id: workspaceId,
      category,
      records_before: deleted + held,
      records_deleted: deleted,
      records_held: held,
      retention_months: retentionMonths,
      status,
      error_message: errorMessage || null,
    });
  } catch { /* non-blocking */ }

  if (deleted > 0 && status === 'completed') {
    try {
      await logAuditEvent({
        workspaceId,
        actorId: '00000000-0000-0000-0000-000000000000',
        actorType: 'SYSTEM',
        action: `RETENTION_DELETED_${deleted}_${category.toUpperCase()}`,
        objectType: 'RETENTION',
        module: 'Privacy',
        riskLevel: 'LOW',
        metadata: { category, records_deleted: deleted, records_held: held, retention_months: retentionMonths },
      });
    } catch { /* non-blocking */ }
  }
}

// ─── Category Enforcement Functions ─────────────────────────────────────────
// Each maps to a real table verified in the DB migration files.

// ✅ audit_events — table verified in migration files (has workspace_id, created_at)
async function deleteExpiredAuditEvents(workspaceId: string, retentionMonths: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  const cutoffStr = cutoff.toISOString();

  const { deleted, held } = await batchDeleteFromTable({
    table: 'audit_events',
    workspaceId,
    dateColumn: 'created_at',
    cutoffDate: cutoffStr,
    batchSize: 500,
  });

  return { category: 'audit_events', deleted, held, retentionMonths };
}

// ✅ publish_intents — content history (has workspace_id, created_at, status)
// Only terminal statuses are deleted; PENDING_REVIEW is never touched.
async function deleteExpiredContentHistory(workspaceId: string, defaultMonths: number, publishedMonths?: number) {
  const heldIds = await getHeldObjectIds(workspaceId);
  let totalDeleted = 0;
  let totalHeld = 0;

  const batchProcess = async (statuses: string[], cutoffDate: string) => {
    for (const status of statuses) {
      while (true) {
        const { data: batch } = await supabaseAdmin
          .from('publish_intents')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('status', status)
          .lt('created_at', cutoffDate)
          .limit(500);

        if (!batch || batch.length === 0) break;

        const toDelete = batch.filter((r: any) => !heldIds.has(r.id)).map((r: any) => r.id);
        totalHeld += batch.length - toDelete.length;

        if (toDelete.length > 0) {
          await supabaseAdmin.from('publish_intents').delete().in('id', toDelete);
          totalDeleted += toDelete.length;
        }

        if (batch.length < 500) break;
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }
  };

  // Pass 1: non-published terminal states (3 year default retention)
  const cutoff1 = new Date();
  cutoff1.setMonth(cutoff1.getMonth() - defaultMonths);
  await batchProcess(['REJECTED', 'RETURNED', 'GOVERNANCE_BLOCKED'], cutoff1.toISOString());

  // Pass 2: published states (7 years evidence-linked retention)
  const effectivePublished = publishedMonths || 84;
  const cutoff2 = new Date();
  cutoff2.setMonth(cutoff2.getMonth() - effectivePublished);
  await batchProcess(['APPROVED', 'RELEASED'], cutoff2.toISOString());

  return { category: 'content_history', deleted: totalDeleted, held: totalHeld, retentionMonths: defaultMonths };
}

// ✅ inbox_messages — verified in 05_inbox_schema.sql (has workspace_id, created_at)
async function deleteExpiredInboxMessages(workspaceId: string, retentionMonths: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  const cutoffStr = cutoff.toISOString();

  const { deleted, held } = await batchDeleteFromTable({
    table: 'inbox_messages',
    workspaceId,
    dateColumn: 'created_at',
    cutoffDate: cutoffStr,
    batchSize: 200,
  });

  return { category: 'inbox_messages', deleted, held, retentionMonths };
}

// ✅ decisions — verified in 04_canonical_schema.sql (has workspace_id, created_at)
// Policy calls this "Decision Ledger" but the actual table name is "decisions".
async function deleteExpiredDecisions(workspaceId: string, retentionMonths: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  const cutoffStr = cutoff.toISOString();

  const { deleted, held } = await batchDeleteFromTable({
    table: 'decisions',
    workspaceId,
    dateColumn: 'created_at',
    cutoffDate: cutoffStr,
    batchSize: 500,
  });

  return { category: 'decisions', deleted, held, retentionMonths };
}

// ✅ identity_ledger_entries — verified in 25_identity_ledger_phase1.sql (has workspace_id, created_at)
async function deleteExpiredIdentityLogs(workspaceId: string, retentionMonths: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  const cutoffStr = cutoff.toISOString();

  const { deleted, held } = await batchDeleteFromTable({
    table: 'identity_ledger_entries',
    workspaceId,
    dateColumn: 'created_at',
    cutoffDate: cutoffStr,
    batchSize: 500,
  });

  return { category: 'identity_ledger_entries', deleted, held, retentionMonths };
}

// ✅ vault_evidence_items — verified in 21_evidence_vault_phase1.sql
// Has workspace_id, but date column is 'source_timestamp_utc' NOT 'created_at'.
async function deleteExpiredEvidenceVault(workspaceId: string, retentionMonths: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  const cutoffStr = cutoff.toISOString();

  const { deleted, held } = await batchDeleteFromTable({
    table: 'vault_evidence_items',
    workspaceId,
    dateColumn: 'source_timestamp_utc',
    cutoffDate: cutoffStr,
    batchSize: 500,
  });

  return { category: 'vault_evidence_items', deleted, held, retentionMonths };
}

// ⏳ forensic_cases — verified in 16_forensic_cases.sql
// Has workspace_id as TEXT ('WRK-001' format), NOT UUID. The field stores
// human-readable workspace codes, not the UUID from the workspaces table.
// Since the worker passes a UUID from workspaces.id, a WHERE clause on
// workspace_id would never match. Skipped until a proper workspace_id
// mapping or UUID column is added to the table.
async function checkExpiredForensicCases(workspaceId: string, retentionMonths: number) {
  logger.info({ workspaceId }, '[retention] Forensic cases retention skipped — workspace_id is TEXT (WRK-xxx), not UUID');
  return { category: 'forensic_cases', deleted: 0, held: 0, retentionMonths, skipped: true as const };
}

// ⏳ analytics_events — NO TABLE EXISTS in any migration file.
// Analytics retention is tracked in the UI but cannot be enforced until an
// analytics data table is created. Skipped with a logged notice.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkExpiredAnalytics(workspaceId: string) {
  logger.info({ workspaceId }, '[retention] Analytics retention skipped — no analytics_events table exists yet');
  return { category: 'analytics', deleted: 0, held: 0, retentionMonths: 24, skipped: true as const };
}

// ⏳ wallet_transactions — has wallet_id (NOT workspace_id), so per-workspace
// deletion requires a join through the wallets table. Skipped until proper
// workspace-scoped billing retention can be implemented.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkExpiredBillingRecords(workspaceId: string) {
  logger.info({ workspaceId }, '[retention] Billing retention skipped — wallet_transactions lacks workspace_id column; requires wallet join');
  return { category: 'billing', deleted: 0, held: 0, retentionMonths: 84, skipped: true as const };
}

// ─── Per-Workspace Enforcement ───────────────────────────────────────────────

async function enforceForWorkspace(workspaceId: string) {
  // Load retention settings for this workspace
  let settings: Record<string, any> = { ...DEFAULT_RETENTION };
  let explicitContentHistory = false;
  try {
    const { data: wsSettings, error } = await supabaseAdmin
      .from('workspace_retention_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();
    if (wsSettings && !error) {
      settings = { ...settings, ...wsSettings };
      explicitContentHistory = wsSettings.content_history_months != null;
    }
  } catch {
    // Table not yet created — use hardcoded policy defaults
  }

  // ZV-COM-BILL-001 §4/§12 — plan-based standard-history window: Growth = 12mo,
  // Scale = 24mo. Only applies to non-evidence content history; the 84-month
  // evidence/published retention is unaffected. Explicit per-workspace settings
  // (e.g. an Enterprise contract) always win. Fails to the safe default.
  if (!explicitContentHistory) {
    try {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('plan_type')
        .eq('id', workspaceId)
        .single();
      const plan = (ws?.plan_type ?? 'FREE').toUpperCase();
      const planMonths = PLAN_CAPS[plan]?.historyMonths;
      // Only Growth(12)/Scale(24) define a positive window. null (Free/Starter —
      // not yet approved) and -1 (Enterprise — contract/unlimited) keep the default.
      if (typeof planMonths === 'number' && planMonths > 0) {
        settings.content_history_months = planMonths;
      }
    } catch {
      // keep default on any lookup error
    }
  }

  // Run all categories in parallel. Each is independently try/caught so a
  // failure in one category never blocks the others.
  const results = await Promise.allSettled([
    deleteExpiredAuditEvents(workspaceId, settings.audit_events_months as number),
    deleteExpiredContentHistory(workspaceId, settings.content_history_months as number),
    deleteExpiredDecisions(workspaceId, settings.decisions_months as number),
    deleteExpiredIdentityLogs(workspaceId, settings.identity_access_months as number),
    deleteExpiredEvidenceVault(workspaceId, settings.evidence_vault_months as number),
    deleteExpiredInboxMessages(workspaceId, settings.inbox_messages_months as number),
    checkExpiredForensicCases(workspaceId, settings.forensic_cases_months as number),
    // Skipped: analytics (no table), billing (needs wallet join), backups (handled by rotation)
  ]);

  // Log results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const r = result.value;
      await logRetentionResult(
        workspaceId,
        r.category,
        r.deleted,
        r.held,
        r.retentionMonths,
        'completed',
      );
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      logger.error({ error: msg, workspaceId }, '[retention] Category enforcement failed');
      await logRetentionResult(workspaceId, 'unknown', 0, 0, 0, 'failed', msg);
    }
  }
}

// ─── Global Enforcement ──────────────────────────────────────────────────────

let workerRunning = false;

export async function runRetentionEnforcement(workspaceId?: string): Promise<void> {
  if (workspaceId) {
    logger.info({ workspaceId }, '[retention] Starting enforcement for workspace');
    await enforceForWorkspace(workspaceId);
    logger.info({ workspaceId }, '[retention] Completed enforcement for workspace');
    return;
  }

  // All workspaces
  const { data: workspaces } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .neq('status', 'DELETED');

  if (!workspaces || workspaces.length === 0) return;

  logger.info({ count: workspaces.length }, '[retention] Starting global enforcement');

  for (const ws of workspaces) {
    try {
      await enforceForWorkspace(ws.id);
    } catch (err) {
      logger.error({ err, workspaceId: ws.id }, '[retention] Workspace enforcement failed');
    }
  }

  logger.info('[retention] Global enforcement completed');
}

async function runPass() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    await runRetentionEnforcement();
  } catch (err) {
    logger.error({ err }, '[retention] Worker pass error');
  } finally {
    workerRunning = false;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initRetentionWorker(): void {
  logger.info('[retention] Starting (poll every 24h)');
  runPass();
  setInterval(runPass, POLL_INTERVAL_MS);
}
