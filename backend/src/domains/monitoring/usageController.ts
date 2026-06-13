 
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { PLAN_LIMITS, STORAGE_ADDON_PACKS } from '../../shared/planLimits';
import { AuthRequest } from '../../shared/authMiddleware';

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
 * GET /api/v1/monitoring/quota
 * Returns AI token quota, current cycle usage, and overage for a workspace.
 */
export const getTokenQuota = async (req: Request, res: Response, _next: NextFunction) => {
  const { workspaceId } = req.query as { workspaceId?: string };

  if (!workspaceId) {
    return res.status(400).json({ success: false, message: 'workspaceId is required' });
  }

  // ── 1. Resolve plan ──────────────────────────────────────────────────────────
  let planType = 'FREE';
  let billingCycle = getBillingCycle(null, null);
  try {
    const { data: wsRow } = await supabaseAdmin
      .from('workspaces')
      .select('created_at, plan_type')
      .eq('id', workspaceId)
      .maybeSingle();

    if (wsRow?.plan_type) planType = (wsRow.plan_type as string).toUpperCase();

    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('current_period_end')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    billingCycle = getBillingCycle(
      (wallet as any)?.current_period_end ?? null,
      wsRow?.created_at ?? null,
    );
  } catch (err: any) {
    logger.warn({ err }, '[Quota] plan/cycle lookup failed, using defaults');
  }

  const limits = PLAN_LIMITS[planType] ?? PLAN_LIMITS.FREE;
  const monthlyQuota = limits.aiTokensMonthly;   // -1 = unlimited
  const overageRate  = limits.aiOverageRatePerK;

  // ── 2. Sum AI_TOKENS for current billing cycle ────────────────────────────────
  let tokensUsed = 0;
  try {
    const { data: rows, error } = await supabaseAdmin
      .from('resource_usage')
      .select('quantity')
      .eq('workspace_id', workspaceId)
      .eq('resource_type', 'AI_TOKENS')
      .gte('timestamp', billingCycle.start.toISOString());

    if (!error && rows) {
      tokensUsed = rows.reduce((acc: number, r: any) => acc + (parseFloat(r.quantity) || 0), 0);
    }
  } catch (err: any) {
    logger.warn({ err }, '[Quota] AI_TOKENS sum failed (non-fatal)');
  }

  // ── 3. Compute quota metrics ─────────────────────────────────────────────────
  const unlimited      = monthlyQuota === -1;
  const tokensRemaining = unlimited ? -1 : Math.max(0, monthlyQuota - tokensUsed);
  const overageTokens  = unlimited ? 0 : Math.max(0, tokensUsed - monthlyQuota);
  const overageCostUsd = overageTokens > 0 ? (overageTokens / 1000) * overageRate : 0;
  const usedPct        = unlimited ? 0 : monthlyQuota > 0 ? Math.min(100, (tokensUsed / monthlyQuota) * 100) : 0;

  logger.info({ workspaceId, planType, tokensUsed, monthlyQuota, overageTokens }, '[Quota] resolved');

  return res.json({
    success: true,
    data: {
      plan: planType.toLowerCase(),
      quota: {
        monthly_tokens: monthlyQuota,
        unlimited,
        overage_rate_per_k: overageRate,
      },
      usage: {
        tokens_used: Math.round(tokensUsed),
        tokens_remaining: unlimited ? null : tokensRemaining,
        used_pct: Math.round(usedPct * 10) / 10,
      },
      overage: {
        tokens: overageTokens,
        cost_usd: Math.round(overageCostUsd * 10000) / 10000,
      },
      billing_period: {
        start: billingCycle.start.toISOString(),
        end: billingCycle.end.toISOString(),
        days_remaining: billingCycle.days_remaining,
      },
    },
  });
};

// ── Shared helper: compute actual workspace storage in MB ────────────────────
async function computeStorageMb(workspaceId: string): Promise<number> {
  let totalMb = 0;

  try {
    // Knowledge entries file sizes
    const { data: wsRow } = await supabaseAdmin
      .from('workspaces').select('org_id').eq('id', workspaceId).maybeSingle();

    if (wsRow?.org_id) {
      const { data: kbRows } = await supabaseAdmin
        .from('knowledge_bases').select('id').eq('org_id', wsRow.org_id).limit(200);

      const kbIds = (kbRows ?? []).map((kb: any) => String(kb.id)).filter(Boolean);
      if (kbIds.length > 0) {
        const { data: entries } = await supabaseAdmin
          .from('knowledge_entries').select('metadata').in('kb_id', kbIds).limit(1000);

        totalMb += (entries ?? []).reduce((acc: number, row: any) =>
          acc + (Number(row.metadata?.file_size ?? 0) / (1024 * 1024)), 0);
      }
    }

    // Media Supabase storage
    const { data: members } = await supabaseAdmin
      .from('workspace_members').select('user_id').eq('workspace_id', workspaceId).limit(50);

    await Promise.all(
      (members ?? []).map(async (m: any) => {
        try {
          const { data: files } = await supabaseAdmin.storage.from('media').list(m.user_id, { limit: 500 });
          totalMb += (files ?? []).reduce((acc: number, f: any) =>
            acc + ((f.metadata?.size ?? 0) / (1024 * 1024)), 0);
        } catch { /* best-effort */ }
      })
    );
  } catch (err: any) {
    logger.warn({ err }, '[Storage] computeStorageMb failed (non-fatal)');
  }

  return Math.round(totalMb * 100) / 100;
}

/**
 * GET /api/v1/monitoring/storage-quota
 * Returns storage quota, current usage, purchased add-ons, and overage for a workspace.
 */
export const getStorageQuota = async (req: Request, res: Response, _next: NextFunction) => {
  const { workspaceId } = req.query as { workspaceId?: string };

  if (!workspaceId) {
    return res.status(400).json({ success: false, message: 'workspaceId is required' });
  }

  // ── 1. Resolve plan + billing cycle ─────────────────────────────────────────
  let planType = 'FREE';
  let billingCycle = getBillingCycle(null, null);
  try {
    const { data: wsRow } = await supabaseAdmin
      .from('workspaces').select('created_at, plan_type').eq('id', workspaceId).maybeSingle();

    if (wsRow?.plan_type) planType = (wsRow.plan_type as string).toUpperCase();

    const { data: wallet } = await supabaseAdmin
      .from('wallets').select('current_period_end').eq('workspace_id', workspaceId).maybeSingle();

    billingCycle = getBillingCycle((wallet as any)?.current_period_end ?? null, wsRow?.created_at ?? null);
  } catch (err: any) {
    logger.warn({ err }, '[StorageQuota] plan/cycle lookup failed');
  }

  const limits    = PLAN_LIMITS[planType] ?? PLAN_LIMITS.FREE;
  const baseGb    = limits.storageGbIncluded;
  const unlimited = baseGb === -1;

  // ── 2. Purchased add-ons for current billing cycle ───────────────────────────
  let addons: any[] = [];
  let addonGb = 0;
  try {
    const cycleStart = billingCycle.start.toISOString().split('T')[0];
    const { data: rows } = await supabaseAdmin
      .from('storage_addons')
      .select('id, pack_gb, cost_usd, purchased_at')
      .eq('workspace_id', workspaceId)
      .eq('billing_cycle_start', cycleStart)
      .order('purchased_at', { ascending: true });

    addons  = rows ?? [];
    addonGb = addons.reduce((acc, r) => acc + (r.pack_gb ?? 0), 0);
  } catch (err: any) {
    logger.warn({ err }, '[StorageQuota] addon lookup failed');
  }

  // ── 3. Actual storage usage ──────────────────────────────────────────────────
  const usedMb = await computeStorageMb(workspaceId);
  const usedGb  = usedMb / 1024;

  // ── 4. Quota metrics ─────────────────────────────────────────────────────────
  const totalGb     = unlimited ? -1 : baseGb + addonGb;
  const totalMb     = unlimited ? -1 : totalGb * 1024;
  const remainingMb = unlimited ? -1 : Math.max(0, totalMb - usedMb);
  const overageMb   = unlimited ? 0  : Math.max(0, usedMb - totalMb);
  const usedPct     = unlimited ? 0  : totalMb > 0 ? Math.min(100, (usedMb / totalMb) * 100) : 0;

  logger.info({ workspaceId, planType, usedMb, totalGb, overageMb }, '[StorageQuota] resolved');

  return res.json({
    success: true,
    data: {
      plan: planType.toLowerCase(),
      quota: {
        base_gb:   baseGb,
        addons_gb: addonGb,
        total_gb:  totalGb,
        unlimited,
      },
      usage: {
        used_mb:       usedMb,
        used_gb:       Math.round(usedGb * 100) / 100,
        used_pct:      Math.round(usedPct * 10) / 10,
        remaining_mb:  unlimited ? null : remainingMb,
      },
      overage: {
        mb:      Math.round(overageMb * 100) / 100,
        gb:      Math.round((overageMb / 1024) * 1000) / 1000,
      },
      addons,
      addon_packs: STORAGE_ADDON_PACKS,
      billing_period: {
        start:          billingCycle.start.toISOString(),
        end:            billingCycle.end.toISOString(),
        days_remaining: billingCycle.days_remaining,
      },
    },
  });
};

/**
 * POST /api/v1/monitoring/storage-addon
 * Purchase a storage add-on pack. Deducts from wallet balance atomically.
 */
export const purchaseStorageAddon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ success: false, error: 'Workspace context missing' });

    const { pack_gb } = req.body as { pack_gb?: number };
    const pack = STORAGE_ADDON_PACKS.find((p) => p.gb === pack_gb);
    if (!pack) {
      return res.status(400).json({
        success: false,
        error: `Invalid pack_gb. Valid values: ${STORAGE_ADDON_PACKS.map((p) => p.gb).join(', ')}`,
      });
    }

    // ── Get wallet ────────────────────────────────────────────────────────────
    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from('wallets').select('id, balance, overcharge_enabled').eq('workspace_id', workspaceId).maybeSingle();

    if (walletErr || !wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found for this workspace' });
    }

    // Overcharge must be enabled before purchasing add-ons
    if (!wallet.overcharge_enabled) {
      return res.status(402).json({
        success:             false,
        error:               'Please enable overcharge billing in your billing settings before purchasing storage add-ons.',
        overcharge_required: true,
        billing_link:        '/admin/billing',
      });
    }

    if ((wallet.balance ?? 0) < pack.priceUsd) {
      return res.status(402).json({
        success:   false,
        error:     'Insufficient wallet balance. Top up your wallet to purchase this add-on.',
        required:  pack.priceUsd,
        available: wallet.balance ?? 0,
        billing_link: '/admin/billing',
      });
    }

    // ── Atomic deduction via RPC ──────────────────────────────────────────────
    const { data: deductResult, error: deductErr } = await supabaseAdmin
      .rpc('deduct_wallet_balance', { p_wallet_id: wallet.id, p_amount: pack.priceUsd });

    if (deductErr || !deductResult?.[0]?.success) {
      return res.status(402).json({ success: false, error: 'Payment failed — insufficient balance' });
    }

    // ── Record add-on ─────────────────────────────────────────────────────────
    let billingCycle = getBillingCycle(null, null);
    try {
      const { data: wsRow } = await supabaseAdmin
        .from('workspaces').select('created_at').eq('id', workspaceId).maybeSingle();
      billingCycle = getBillingCycle(null, wsRow?.created_at ?? null);
    } catch { /* use default */ }

    const cycleStart = billingCycle.start.toISOString().split('T')[0];

    const { data: addon, error: addonErr } = await supabaseAdmin
      .from('storage_addons')
      .insert({
        workspace_id:        workspaceId,
        pack_gb:             pack.gb,
        cost_usd:            pack.priceUsd,
        billing_cycle_start: cycleStart,
      })
      .select()
      .single();

    if (addonErr) throw addonErr;

    // ── Track billing event + wallet history ──────────────────────────────────
    await trackUsage({
      workspaceId,
      resourceType: 'STORAGE_MB',
      quantity:     pack.gb * 1024,
      costUsd:      pack.priceUsd,
      unit:         'MB',
      referenceId:  addon.id,
      referenceType: 'storage_addon',
      metadata:     { pack_gb: pack.gb, addon_id: addon.id },
    });

    const addonDesc = `Storage add-on: +${pack.gb}GB`;

    // Appear in Credits tab transaction history
    supabaseAdmin.from('wallet_transactions').insert({
      wallet_id:   wallet.id,
      amount:      pack.priceUsd,
      net_amount:  pack.priceUsd,
      type:        'DEBIT',
      status:      'AVAILABLE',
      description: addonDesc,
      currency:    'USD',
    }).then(() => {}, () => {});

    // Billing audit log
    supabaseAdmin.from('billing_events').insert({
      workspace_id:        workspaceId,
      event_type:          'addon_purchase',
      amount_usd:          pack.priceUsd,
      description:         addonDesc,
      metadata:            { pack_gb: pack.gb, addon_id: addon.id },
      billing_cycle_start: cycleStart,
    }).then(() => {}, () => {});

    logger.info({ workspaceId, pack_gb: pack.gb, cost: pack.priceUsd }, '[StorageAddon] purchased');

    return res.status(201).json({
      success: true,
      message: `+${pack.gb}GB storage added successfully`,
      data: {
        addon,
        new_wallet_balance: deductResult[0].new_balance,
      },
    });
  } catch (error) {
    next(error);
  }
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

    // Fire overage settlement in background for every AI token event
    if (opts.resourceType === 'AI_TOKENS') {
      settleAiOverage(opts.workspaceId, opts.quantity).catch(() => {});
    }
  } catch (err: any) {
    logger.error({ err: err?.message, code: err?.code, resourceType: opts.resourceType }, '[Usage] trackUsage INSERT FAILED');
  }
}

/**
 * settleAiOverage — fire-and-forget background billing.
 * Called after every AI_TOKENS trackUsage. If workspace is in overage and
 * overcharge is enabled, deducts the overage cost from wallet atomically.
 * If wallet is empty → suspends workspace + creates notification.
 */
async function settleAiOverage(workspaceId: string, tokensThisCall: number): Promise<void> {
  try {
    const { data: wsRow } = await supabaseAdmin
      .from('workspaces')
      .select('plan_type, billing_status, created_at')
      .eq('id', workspaceId)
      .maybeSingle();

    const planType = ((wsRow?.plan_type as string) ?? 'FREE').toUpperCase();
    const limits   = PLAN_LIMITS[planType] ?? PLAN_LIMITS.FREE;

    // Unlimited or no overage rate → nothing to settle
    if (limits.aiTokensMonthly === -1 || limits.aiOverageRatePerK === 0) return;

    // Already suspended this cycle → skip (block is handled at request time)
    if (wsRow?.billing_status === 'suspended') return;

    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, overcharge_enabled')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!wallet?.overcharge_enabled) return;

    const billingCycle = getBillingCycle(null, wsRow?.created_at ?? null);

    // Sum current cycle tokens (includes this call — already inserted)
    const { data: rows } = await supabaseAdmin
      .from('resource_usage')
      .select('quantity')
      .eq('workspace_id', workspaceId)
      .eq('resource_type', 'AI_TOKENS')
      .gte('timestamp', billingCycle.start.toISOString());

    const totalTokens = (rows ?? []).reduce((acc: number, r: any) => acc + (parseFloat(r.quantity) || 0), 0);

    // Still within quota → nothing owed
    if (totalTokens <= limits.aiTokensMonthly) return;

    // Calculate overage portion attributable to THIS call only
    const tokensBeforeCall = totalTokens - tokensThisCall;
    const overageTokens    = tokensBeforeCall >= limits.aiTokensMonthly
      ? tokensThisCall                                      // entire call was already in overage
      : totalTokens - limits.aiTokensMonthly;              // only tail portion crossed quota

    const charge = Math.round((overageTokens / 1000) * limits.aiOverageRatePerK * 10000) / 10000;
    if (charge <= 0) return;

    const cycleStart = billingCycle.start.toISOString().split('T')[0];

    // Attempt atomic wallet deduction
    const { data: result } = await supabaseAdmin
      .rpc('deduct_wallet_balance', { p_wallet_id: wallet.id, p_amount: charge });

    if (result?.[0]?.success) {
      const overageDesc = `AI overage: ${Math.round(overageTokens).toLocaleString()} tokens @ $${limits.aiOverageRatePerK}/1K`;
      await supabaseAdmin.from('billing_events').insert({
        workspace_id:        workspaceId,
        event_type:          'ai_overage_charge',
        amount_usd:          charge,
        description:         overageDesc,
        metadata:            { overage_tokens: overageTokens, rate: limits.aiOverageRatePerK, total_tokens: totalTokens, quota: limits.aiTokensMonthly },
        billing_cycle_start: cycleStart,
      });
      // Appear in Credits tab transaction history
      supabaseAdmin.from('wallet_transactions').insert({
        wallet_id:  wallet.id,
        amount:     charge,
        net_amount: charge,
        type:       'DEBIT',
        status:     'AVAILABLE',
        description: overageDesc,
        currency:   'USD',
      }).then(() => {}, () => {});
      logger.info({ workspaceId, charge, overageTokens }, '[Billing] AI overage charged');
    } else {
      // Wallet empty → suspend workspace
      await supabaseAdmin.from('workspaces')
        .update({ billing_status: 'suspended' })
        .eq('id', workspaceId);

      await supabaseAdmin.from('billing_events').insert({
        workspace_id:        workspaceId,
        event_type:          'suspension',
        amount_usd:          0,
        description:         'Workspace suspended: wallet empty, could not charge AI overage',
        metadata:            { charge_attempted: charge, overage_tokens: overageTokens, wallet_balance: wallet.balance ?? 0 },
        billing_cycle_start: cycleStart,
      });

      // Notify workspace admins
      const { data: admins } = await supabaseAdmin
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .in('role', ['ADMIN', 'WORKSPACE_OWNER']);

      if (admins?.length) {
        await supabaseAdmin.from('notifications').insert(
          admins.map((a: any) => ({
            user_id: a.user_id,
            title:   '⚠️ Services Suspended — No Credits',
            body:    `Your workspace ran out of credits while processing AI overage charges. Top up your wallet to resume. Services will also resume automatically at your next billing cycle reset on ${billingCycle.end.toLocaleDateString()}.`,
            type:    'BILLING',
            link:    '/admin/billing',
            read:    false,
          }))
        );
      }

      logger.warn({ workspaceId, charge }, '[Billing] Workspace suspended — wallet empty');
    }
  } catch (err: any) {
    logger.error({ err: err?.message, workspaceId }, '[Billing] settleAiOverage failed');
  }
}

/**
 * checkAiTokenQuota — Express middleware.
 * - Blocks suspended workspaces (unless cycle has reset → auto-resumes).
 * - FREE plan / overcharge disabled: hard block at quota.
 * - Overcharge enabled: pass through — settleAiOverage handles billing.
 * - Enterprise/unlimited: always pass through.
 */
export const checkAiTokenQuota = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) { next(); return; }

  const planType = (req.user?.workspace_plan ?? 'FREE').toUpperCase();
  const limits   = PLAN_LIMITS[planType] ?? PLAN_LIMITS.FREE;

  // Unlimited → always pass
  if (limits.aiTokensMonthly === -1) { next(); return; }

  try {
    const { data: wsRow } = await supabaseAdmin
      .from('workspaces')
      .select('billing_status, created_at')
      .eq('id', workspaceId)
      .maybeSingle();

    const billingCycle = getBillingCycle(null, wsRow?.created_at ?? null);
    const cycleStart   = billingCycle.start.toISOString();

    // ── Suspension check ───────────────────────────────────────────────────────
    if (wsRow?.billing_status === 'suspended') {
      // Check if the suspension was from a previous billing cycle → auto-resume
      const { count } = await supabaseAdmin
        .from('billing_events')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('event_type', 'suspension')
        .gte('created_at', cycleStart);

      if ((count ?? 0) > 0) {
        // Suspension is from THIS cycle → block with clear message
        res.status(402).json({
          success:          false,
          error:            'No credits remaining. Top up your wallet to resume services, or wait until your billing cycle resets.',
          billing_status:   'suspended',
          reset_date:       billingCycle.end.toISOString(),
          action_required:  'top_up',
          billing_link:     '/admin/billing',
        });
        return;
      }

      // Suspension from a previous cycle → auto-resume
      await supabaseAdmin.from('workspaces')
        .update({ billing_status: 'active' })
        .eq('id', workspaceId);

      await supabaseAdmin.from('billing_events').insert({
        workspace_id:        workspaceId,
        event_type:          'cycle_reset',
        amount_usd:          0,
        description:         'Workspace auto-resumed at billing cycle reset',
        billing_cycle_start: billingCycle.start.toISOString().split('T')[0],
      });
    }

    // ── Quota check ────────────────────────────────────────────────────────────
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('overcharge_enabled')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const { data: usageRows } = await supabaseAdmin
      .from('resource_usage')
      .select('quantity')
      .eq('workspace_id', workspaceId)
      .eq('resource_type', 'AI_TOKENS')
      .gte('timestamp', cycleStart);

    const used = (usageRows ?? []).reduce((acc: number, r: any) => acc + (parseFloat(r.quantity) || 0), 0);

    if (used >= limits.aiTokensMonthly) {
      if (limits.aiOverageRatePerK === 0) {
        // FREE plan — hard block, no overage
        res.status(429).json({
          success:          false,
          error:            'Monthly AI token quota exhausted. Upgrade your plan to continue.',
          quota:            limits.aiTokensMonthly,
          used:             Math.round(used),
          reset_date:       billingCycle.end.toISOString(),
          upgrade_required: true,
        });
        return;
      }

      if (!wallet?.overcharge_enabled) {
        // Paid plan, overcharge disabled → suspend workspace immediately so all services block
        const cycleStartDate = billingCycle.start.toISOString().split('T')[0];

        await supabaseAdmin.from('workspaces')
          .update({ billing_status: 'suspended' })
          .eq('id', workspaceId);

        await supabaseAdmin.from('billing_events').insert({
          workspace_id:        workspaceId,
          event_type:          'suspension',
          amount_usd:          0,
          description:         'Workspace suspended: AI quota exhausted, overcharge not enabled',
          metadata:            { quota: limits.aiTokensMonthly, used: Math.round(used) },
          billing_cycle_start: cycleStartDate,
        });

        // Notify all workspace admins
        const { data: admins } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .in('role', ['ADMIN', 'WORKSPACE_OWNER']);

        if (admins?.length) {
          await supabaseAdmin.from('notifications').insert(
            admins.map((a: any) => ({
              user_id: a.user_id,
              title:   '⚠️ Services Suspended — Quota Reached',
              body:    `Your monthly AI token quota has been exhausted. Enable overcharge billing and top up your wallet to resume immediately, or wait until your cycle resets on ${billingCycle.end.toLocaleDateString()}.`,
              type:    'BILLING',
              link:    '/admin/billing',
              read:    false,
            }))
          );
        }

        res.status(402).json({
          success:             false,
          error:               'Services suspended: monthly AI quota exhausted. Enable overcharge billing and top up to resume, or wait for your billing cycle to reset.',
          billing_status:      'suspended',
          quota:               limits.aiTokensMonthly,
          used:                Math.round(used),
          reset_date:          billingCycle.end.toISOString(),
          overcharge_disabled: true,
          billing_link:        '/admin/billing',
        });
        return;
      }
      // Overcharge enabled → pass through, settleAiOverage will debit wallet
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, '[QuotaCheck] Check failed, allowing through');
  }

  next();
};
