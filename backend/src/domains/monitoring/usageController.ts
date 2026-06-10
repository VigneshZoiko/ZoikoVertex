/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

// Safe .in() wrapper — Supabase postgrest-js throws on empty array inputs
async function safeCountIn(table: string, column: string, ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  try {
    const { count, error } = await (supabaseAdmin as any)
      .from(table)
      .select('id', { count: 'exact', head: true })
      .in(column, ids);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function safeCount(table: string, column: string, value: string): Promise<number> {
  try {
    const { count, error } = await (supabaseAdmin as any)
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(column, value);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ── Billing cycle helpers ────────────────────────────────────────────────────

function getBillingCycle(periodEndIso?: string | null, createdAtIso?: string | null): {
  start: Date; end: Date; days_remaining: number;
} {
  const now = new Date();

  if (periodEndIso) {
    const end = new Date(periodEndIso);
    if (end > now) {
      // Active Stripe period
      const start = new Date(end);
      start.setMonth(start.getMonth() - 1);
      const days_remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
      return { start, end, days_remaining };
    }
  }

  // Fallback: anchor to day-of-month from workspace creation
  const anchor = createdAtIso ? new Date(createdAtIso) : now;
  const anchorDay = Math.min(anchor.getDate(), 28); // cap at 28 to avoid month overflows
  const start = new Date(now.getFullYear(), now.getMonth(), anchorDay, 0, 0, 0, 0);
  if (start > now) start.setMonth(start.getMonth() - 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const days_remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
  return { start, end, days_remaining };
}

/**
 * GET /api/v1/monitoring/usage
 * Returns aggregated resource usage for a workspace, scoped to the current billing cycle.
 */
export const getResourceUsage = async (req: Request, res: Response, _next: NextFunction) => {
  const { workspaceId } = req.query as { workspaceId?: string };

  logger.info({ workspaceId: workspaceId ?? 'MISSING' }, '[Usage] endpoint hit');

  if (!workspaceId) {
    return res.status(400).json({ success: false, message: 'workspaceId is required' });
  }

  // ── 0. Determine billing cycle ───────────────────────────────────────────────
  let billingCycle = getBillingCycle(null, null);
  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('current_period_end')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const { data: wsRow } = await supabaseAdmin
      .from('workspaces')
      .select('created_at')
      .eq('id', workspaceId)
      .maybeSingle();

    billingCycle = getBillingCycle(
      (wallet as any)?.current_period_end ?? null,
      wsRow?.created_at ?? null,
    );
  } catch (err: any) {
    logger.warn({ err }, '[Usage] billing cycle lookup failed, using defaults');
  }

  // ── 1. Tracked events from resource_usage (scoped to billing cycle) ─────────
  let logs: any[] = [];
  let trackedSummary: Record<string, { quantity: number; cost: number; unit: string }> = {};

  try {
    const { data: rawLogs, error } = await supabaseAdmin
      .from('resource_usage')
      .select('id, resource_type, quantity, cost_usd, unit, metadata, timestamp')
      .eq('workspace_id', workspaceId)
      .gte('timestamp', billingCycle.start.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);

    if (!error && rawLogs) {
      logs = rawLogs.map((r: any) => ({
        ...r,
        reference_type: r.metadata?.reference_type ?? null,
      }));
      trackedSummary = logs.reduce((acc, log) => {
        const type = log.resource_type;
        if (!acc[type]) acc[type] = { quantity: 0, cost: 0, unit: log.unit };
        acc[type].quantity += parseFloat(log.quantity) || 0;
        acc[type].cost     += parseFloat(log.cost_usd) || 0;
        return acc;
      }, {} as typeof trackedSummary);
    }
  } catch (err: any) {
    logger.warn({ err }, '[Usage] resource_usage query failed (non-fatal)');
  }

  // ── 2. Derived from existing tables ─────────────────────────────────────────
  let campaignCount = 0;
  let publishCount  = 0;
  let knowledgeCount = 0;
  let totalFileSizeMb = 0;
  let mediaAssetCount = 0;
  let mediaStorageMb = 0;

  try {
    // Campaigns in workspace
    campaignCount = await safeCount('campaigns', 'workspace_id', workspaceId);
    // Also count scheduled posts directly by workspace_id
    const scheduledPostCount = await safeCount('scheduled_posts', 'workspace_id', workspaceId);
    if (scheduledPostCount > 0) publishCount += scheduledPostCount;
    logger.info({ workspaceId, campaignCount, scheduledPostCount }, '[Usage] campaigns');

    // Campaign IDs → publish_intents count
    if (campaignCount > 0) {
      const { data: campRows } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(500);

      const campIds = (campRows ?? []).map((c: any) => String(c.id)).filter(Boolean);
      publishCount = await safeCountIn('publish_intents', 'campaign_id', campIds);
      logger.info({ publishCount, campIds: campIds.length }, '[Usage] publish_intents');
    }

    // Knowledge entries via org_id
    const { data: wsRow } = await supabaseAdmin
      .from('workspaces')
      .select('org_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (wsRow?.org_id) {
      const { data: kbRows } = await supabaseAdmin
        .from('knowledge_bases')
        .select('id')
        .eq('org_id', wsRow.org_id)
        .limit(200);

      const kbIds = (kbRows ?? []).map((kb: any) => String(kb.id)).filter(Boolean);
      logger.info({ kbIds: kbIds.length, orgId: wsRow.org_id }, '[Usage] knowledge_bases');

      if (kbIds.length > 0) {
        const { data: entries, count } = await supabaseAdmin
          .from('knowledge_entries')
          .select('metadata', { count: 'exact' })
          .in('kb_id', kbIds)
          .limit(500);

        knowledgeCount = count ?? 0;
        totalFileSizeMb = (entries ?? []).reduce((acc: number, row: any) => {
          return acc + (Number(row.metadata?.file_size ?? 0) / (1024 * 1024));
        }, 0);
        logger.info({ knowledgeCount, totalFileSizeMb }, '[Usage] knowledge_entries');
      }
    }
  } catch (err: any) {
    logger.error({ err }, '[Usage] derived queries failed');
  }

  // ── 2b. Media Vault (media_library table + Supabase Storage) ─────────────────
  try {
    const { count: mCount } = await supabaseAdmin
      .from('media_library')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    mediaAssetCount = mCount ?? 0;

    // Get workspace member user IDs to list their storage folders
    const { data: members } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .limit(50);

    const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);

    await Promise.all(
      userIds.map(async (uid: string) => {
        try {
          const { data: storageFiles } = await supabaseAdmin.storage
            .from('media')
            .list(uid, { limit: 500 });

          if (storageFiles) {
            mediaStorageMb += storageFiles.reduce((acc: number, f: any) => {
              return acc + ((f.metadata?.size ?? 0) / (1024 * 1024));
            }, 0);
          }
        } catch {
          // individual user folder listing is best-effort
        }
      })
    );

    logger.info({ mediaAssetCount, mediaStorageMb: mediaStorageMb.toFixed(2) }, '[Usage] media_library');
  } catch (err: any) {
    logger.warn({ err }, '[Usage] media vault query failed (non-fatal)');
  }

  // ── 3. Merge ─────────────────────────────────────────────────────────────────
  const summary: Record<string, { quantity: number; cost: number; unit: string }> = { ...trackedSummary };

  if ((!summary['SOCIAL_API_CALLS'] || summary['SOCIAL_API_CALLS'].quantity === 0) && publishCount > 0) {
    summary['SOCIAL_API_CALLS'] = { quantity: publishCount, cost: 0, unit: 'calls' };
  }
  if ((!summary['CONTENT_POSTS'] || summary['CONTENT_POSTS'].quantity === 0) && campaignCount > 0) {
    summary['CONTENT_POSTS'] = { quantity: campaignCount, cost: 0, unit: 'campaigns' };
  }
  if ((!summary['STORAGE_MB'] || summary['STORAGE_MB'].quantity === 0) && knowledgeCount > 0) {
    summary['STORAGE_MB'] = {
      quantity: totalFileSizeMb > 0 ? Math.round(totalFileSizeMb * 100) / 100 : knowledgeCount,
      cost: 0,
      unit: totalFileSizeMb > 0 ? 'MB' : 'documents',
    };
  }

  // Media Vault — always shown if any assets exist
  if (mediaAssetCount > 0 || mediaStorageMb > 0) {
    const roundedMb = Math.round(mediaStorageMb * 100) / 100;
    summary['MEDIA_ASSETS'] = {
      quantity: mediaAssetCount,
      cost: 0,
      unit: roundedMb > 0 ? `files · ${roundedMb} MB` : 'files',
    };
    // Also fold media storage into STORAGE_MB total
    if (roundedMb > 0) {
      if (summary['STORAGE_MB']) {
        summary['STORAGE_MB'].quantity = Math.round((summary['STORAGE_MB'].quantity + roundedMb) * 100) / 100;
      } else {
        summary['STORAGE_MB'] = { quantity: roundedMb, cost: 0, unit: 'MB' };
      }
    }
  }

  logger.info({ summary: Object.keys(summary), workspaceId }, '[Usage] final summary');

  return res.json({
    success: true,
    data: {
      summary,
      recent_logs: logs,
      billing_period: {
        start: billingCycle.start.toISOString(),
        end: billingCycle.end.toISOString(),
        days_remaining: billingCycle.days_remaining,
      },
    },
  });
};

/**
 * trackUsage — non-blocking. Call from any controller after a billable resource is consumed.
 */
export async function trackUsage(opts: {
  workspaceId: string;
  resourceType: 'AI_TOKENS' | 'SOCIAL_API_CALLS' | 'STORAGE_MB' | 'CONTENT_POSTS' | 'AGENT_RUNS';
  quantity: number;
  costUsd?: number;
  unit?: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const unitDefaults: Record<string, string> = {
    AI_TOKENS: 'tokens', SOCIAL_API_CALLS: 'calls',
    STORAGE_MB: 'MB', CONTENT_POSTS: 'posts', AGENT_RUNS: 'runs',
  };
  try {
    const meta: Record<string, any> = { ...(opts.metadata ?? {}) };
    if (opts.referenceType) meta.reference_type = opts.referenceType;
    if (opts.referenceId)   meta.reference_id   = opts.referenceId;
    await supabaseAdmin.from('resource_usage').insert({
      workspace_id:  opts.workspaceId,
      resource_type: opts.resourceType,
      quantity:      opts.quantity,
      cost_usd:      opts.costUsd ?? 0,
      unit:          opts.unit ?? unitDefaults[opts.resourceType] ?? 'units',
      metadata:      meta,
      timestamp:     new Date().toISOString(),
    });
    logger.info({ workspaceId: opts.workspaceId, resourceType: opts.resourceType, quantity: opts.quantity }, '[Usage] tracked');
  } catch (err: any) {
    logger.error({ err: err?.message, code: err?.code, resourceType: opts.resourceType }, '[Usage] trackUsage INSERT FAILED');
  }
}
