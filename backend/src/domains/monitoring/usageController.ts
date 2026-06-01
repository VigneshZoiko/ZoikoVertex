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

/**
 * GET /api/v1/monitoring/usage
 * Returns aggregated resource usage for a workspace.
 */
export const getResourceUsage = async (req: Request, res: Response, _next: NextFunction) => {
  const { workspaceId } = req.query as { workspaceId?: string };

  logger.info({ workspaceId: workspaceId ?? 'MISSING' }, '[Usage] endpoint hit');

  if (!workspaceId) {
    return res.status(400).json({ success: false, message: 'workspaceId is required' });
  }

  // ── 1. Tracked events from resource_usage ───────────────────────────────────
  let logs: any[] = [];
  let trackedSummary: Record<string, { quantity: number; cost: number; unit: string }> = {};

  try {
    const { data: rawLogs, error } = await supabaseAdmin
      .from('resource_usage')
      .select('id, resource_type, quantity, cost_usd, unit, reference_type, timestamp')
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (!error && rawLogs) {
      logs = rawLogs;
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

  logger.info({ summary: Object.keys(summary), workspaceId }, '[Usage] final summary');

  return res.json({
    success: true,
    data: { summary, recent_logs: logs },
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
    await supabaseAdmin.from('resource_usage').insert({
      workspace_id:   opts.workspaceId,
      resource_type:  opts.resourceType,
      quantity:       opts.quantity,
      cost_usd:       opts.costUsd ?? 0,
      unit:           opts.unit ?? unitDefaults[opts.resourceType] ?? 'units',
      reference_id:   opts.referenceId   ?? null,
      reference_type: opts.referenceType ?? null,
      metadata:       opts.metadata      ?? {},
      timestamp:      new Date().toISOString(),
    });
  } catch (err: any) {
    logger.warn({ err, resourceType: opts.resourceType }, '[Usage] trackUsage failed (non-fatal)');
  }
}
