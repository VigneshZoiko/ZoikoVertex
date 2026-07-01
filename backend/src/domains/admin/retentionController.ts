import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { runRetentionEnforcement } from '../../workers/retentionWorker';
import { logger } from '../../shared/logger';

// ─── Schema ──────────────────────────────────────────────────────────────────

const UpdateRetentionSchema = z.object({
  audit_events_months:          z.number().int().min(1).max(120).optional(),
  evidence_vault_months:        z.number().int().min(1).max(120).optional(),
  forensic_cases_months:        z.number().int().min(1).max(120).optional(),
  decision_ledger_months:       z.number().int().min(1).max(120).optional(),
  identity_access_months:       z.number().int().min(1).max(120).optional(),
  content_history_months:       z.number().int().min(1).max(120).optional(),
  inbox_messages_months:        z.number().int().min(1).max(120).optional(),
  analytics_identifiable_months: z.number().int().min(1).max(120).optional(),
  analytics_aggregated_months:  z.number().int().min(1).max(120).optional(),
  billing_records_months:       z.number().int().min(1).max(120).optional(),
  backups_days:                 z.number().int().min(1).max(365).optional(),
});

const DEFAULT_RETENTION = {
  audit_events_months:           84,
  evidence_vault_months:         84,
  forensic_cases_months:         84,
  decision_ledger_months:        84,
  identity_access_months:        84,
  content_history_months:        36,
  inbox_messages_months:         12,
  analytics_identifiable_months: 24,
  analytics_aggregated_months:   60,
  billing_records_months:        84,
  backups_days:                  90,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateSettings(workspaceId: string) {
  // Try to fetch existing settings
  const { data: existing } = await supabaseAdmin
    .from('workspace_retention_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (existing) return existing;

  // Create with defaults
  const { data: created, error } = await supabaseAdmin
    .from('workspace_retention_settings')
    .insert({
      workspace_id: workspaceId,
      ...DEFAULT_RETENTION,
    })
    .select()
    .single();

  if (error) {
    logger.warn({ error, workspaceId }, '[retention] Failed to create default settings — table may not exist');
    return null;
  }
  return created;
}

// ─── GET /api/v1/retention/settings ──────────────────────────────────────────

export const getRetentionSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const settings = await getOrCreateSettings(workspaceId);
    if (!settings) {
      // Fall back to defaults if table doesn't exist yet
      return res.json({ success: true, data: { workspace_id: workspaceId, ...DEFAULT_RETENTION, is_default: true } });
    }

    res.json({ success: true, data: { ...settings, is_default: false } });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/v1/retention/settings ──────────────────────────────────────────

export const updateRetentionSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = UpdateRetentionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Ensure row exists first
    await getOrCreateSettings(workspaceId);

    const { error } = await supabaseAdmin
      .from('workspace_retention_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    // Log to audit trail
    try {
      const { logAuditEvent } = await import('../governance/evidenceController');
      await logAuditEvent({
        workspaceId,
        actorId: req.user?.id || 'system',
        actorType: 'USER',
        action: 'UPDATED_RETENTION_SETTINGS',
        objectType: 'WORKSPACE',
        objectId: workspaceId,
        module: 'Privacy',
        metadata: { updates },
      });
    } catch { /* non-blocking */ }

    res.json({ success: true, message: 'Retention settings updated' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/retention/run-now ──────────────────────────────────────────
// Manually trigger the retention worker (admin only, rate-limited)

export const triggerRetentionRun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    // Run in background — don't block the response
    runRetentionEnforcement(workspaceId).catch((err) => {
      logger.error({ err, workspaceId }, '[retention] Manual run failed');
    });

    res.json({ success: true, message: 'Retention enforcement started. Results will be logged.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/retention/logs ──────────────────────────────────────────────
// Recent retention execution logs for this workspace

export const getRetentionLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const { data, error } = await supabaseAdmin
      .from('retention_execution_log')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') return res.json({ success: true, data: [] });
      throw error;
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

// ─── Default settings export (for frontend display) ──────────────────────────

export const DEFAULT_RETENTION_DISPLAY = [
  { key: 'audit_events_months',          label: 'Audit Events',                   months: 84,  description: 'Governance audit trail', badge: '7 years' },
  { key: 'evidence_vault_months',        label: 'Evidence Vault Records',         months: 84,  description: 'Sealed or evidence-linked proof', badge: '7 years' },
  { key: 'forensic_cases_months',        label: 'Forensic Cases',                months: 84,  description: 'After case closure', badge: '7 years' },
  { key: 'decision_ledger_months',       label: 'Decision Ledger',               months: 84,  description: 'Decision rationale storage', badge: '7 years' },
  { key: 'identity_access_months',       label: 'Identity & Access Logs',        months: 84,  description: 'Privileged/admin/break-glass access', badge: '7 years' },
  { key: 'content_history_months',       label: 'Content History',               months: 36,  description: 'Published content records (7 years if evidence-linked)', badge: '3 years' },
  { key: 'inbox_messages_months',        label: 'Inbox Messages',                months: 12,  description: 'Social inbox archive (24 months enterprise)', badge: '12 months' },
  { key: 'analytics_identifiable_months', label: 'Analytics Data (Identifiable)', months: 24,  description: 'Campaign performance data', badge: '24 months' },
  { key: 'analytics_aggregated_months',  label: 'Analytics Data (Aggregated)',   months: 60,  description: 'Anonymized trend intelligence', badge: '60 months' },
  { key: 'billing_records_months',       label: 'Billing, Tax & Contracts',      months: 84,  description: 'Tax, accounting & contract records', badge: '7 years' },
  { key: 'backups_days',                 label: 'Backups',                       months: 3,   description: 'Rolling resilience copies', badge: '90 days' },
];
