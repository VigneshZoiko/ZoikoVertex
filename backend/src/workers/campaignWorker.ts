/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Campaign Worker
 *
 * Runs every 2 minutes via setInterval — no Redis required.
 * Picks up PENDING campaign_boosts rows for Meta platforms and
 * calls the Meta Graph API to create the full ad stack:
 *   campaign → ad set → ad creative (object_story_id) → ad
 *
 * On success: marks the boost ACTIVE and records meta IDs.
 * On failure: marks the boost FAILED with an error_message.
 * After a successful boost: deducts from the workspace wallet.
 *
 * One boost failing never stops the others.
 */

import { supabaseAdmin } from '../shared/supabase';
import { logger }        from '../shared/logger';
import {
  resolveAgencyAccount,
  resolveMetaAdAccountId,
} from '../domains/campaigns/agencyAccountResolver';

// ── Spend cap check ───────────────────────────────────────────────────────────
// Returns true if the deduction is allowed (under cap or cap disabled).

async function checkSpendCap(workspaceId: string, amount: number): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, spend_cap_enabled, spend_cap_amount')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.spend_cap_enabled || !wallet.spend_cap_amount) {
      return { allowed: true }; // No cap set
    }

    // Sum all DEBIT transactions this calendar month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: txns } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('wallet_id', wallet.id)
      .eq('type', 'DEBIT')
      .gte('created_at', monthStart.toISOString());

    const monthlySpend = (txns || []).reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

    if (monthlySpend + amount > wallet.spend_cap_amount) {
      return {
        allowed: false,
        reason: `Monthly spend cap of $${wallet.spend_cap_amount} reached (spent $${monthlySpend.toFixed(2)} this month)`,
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true }; // Non-fatal — allow if check fails
  }
}

// ── Auto top-up trigger ───────────────────────────────────────────────────────
// Called after a successful wallet deduction. If balance drops below threshold
// and auto top-up is enabled, charge the default card immediately.

async function triggerAutoTopUp(workspaceId: string): Promise<void> {
  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, auto_topup_enabled, auto_topup_threshold, auto_topup_amount, stripe_customer_id, default_payment_method_id')
      .eq('workspace_id', workspaceId)
      .single();

    if (!wallet?.auto_topup_enabled) return;
    if (!wallet.stripe_customer_id || !wallet.default_payment_method_id) return;
    if (Number(wallet.balance) >= Number(wallet.auto_topup_threshold)) return;

    const topUpAmount  = Number(wallet.auto_topup_amount) || 100;
    const amountCents  = Math.round(topUpAmount * 100);

    // Dynamically import Stripe only when needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe     = require('stripe');
    const stripeKey  = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return;

    const stripe     = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    const holdHours  = parseInt(process.env.DEPOSIT_HOLD_HOURS || '48');
    const availableAt = new Date(Date.now() + holdHours * 60 * 60 * 1000).toISOString();

    const paymentIntent = await stripe.paymentIntents.create({
      amount:               amountCents,
      currency:             'usd',
      customer:             wallet.stripe_customer_id,
      payment_method:       wallet.default_payment_method_id,
      confirm:              true,
      off_session:          true,
      description:          `Auto top-up: $${topUpAmount} campaign credits`,
    }) as any;

    if (paymentIntent.status === 'succeeded') {
      // Record as PROCESSING transaction (settlement worker will move to balance)
      await supabaseAdmin.from('wallet_transactions').insert({
        wallet_id:    wallet.id,
        type:         'CREDIT',
        status:       'PROCESSING',
        amount:       topUpAmount,
        net_amount:   topUpAmount,
        currency:     'USD',
        description:  `Auto top-up: $${topUpAmount}`,
        stripe_payment_intent_id: paymentIntent.id,
        available_at: availableAt,
        created_at:   new Date().toISOString(),
      });

      // Add to processing_balance immediately
      await supabaseAdmin.from('wallets').update({
        processing_balance: Number(wallet.balance) + topUpAmount,
        total_deposited:    Number(wallet.balance) + topUpAmount,
        updated_at:         new Date().toISOString(),
      }).eq('id', wallet.id);

      logger.info({ workspaceId, topUpAmount, paymentIntentId: paymentIntent.id }, '[CampaignWorker] Auto top-up triggered successfully');
    }
  } catch (err: any) {
    logger.warn({ err: err?.message, workspaceId }, '[CampaignWorker] Auto top-up failed (non-fatal)');
  }
}

// How often the worker polls
const POLL_INTERVAL_MS    = 2  * 60 * 1000; // 2 minutes — boost processing
const SETTLE_INTERVAL_MS  = 15 * 60 * 1000; // 15 minutes — deposit settlement

// Maximum boosts to process per run to keep runs time-bounded
const BATCH_LIMIT = 10;

const META_GRAPH = 'https://graph.facebook.com/v18.0';

// ── Meta API helpers ──────────────────────────────────────────────────────────

async function metaPost(
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const r = await fetch(`${META_GRAPH}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...body, access_token: token }),
  });
  return r.json();
}

// ── Objective mapping ─────────────────────────────────────────────────────────

const META_OBJECTIVE_MAP: Record<string, string> = {
  BRAND_AWARENESS: 'BRAND_AWARENESS',
  TRAFFIC:         'OUTCOME_TRAFFIC',
  LEAD_GENERATION: 'OUTCOME_LEADS',
  CONVERSIONS:     'OUTCOME_SALES',
  POST_ENGAGEMENT: 'POST_ENGAGEMENT',
  VIDEO_VIEWS:     'VIDEO_VIEWS',
  REACH:           'REACH',
};

function resolveMetaObjective(objective: string): string {
  return META_OBJECTIVE_MAP[objective?.toUpperCase()] || 'POST_ENGAGEMENT';
}

// ── Process a single PENDING boost ───────────────────────────────────────────

async function processBoost(boost: any): Promise<void> {
  const boostId      = boost.id as string;
  const workspaceId  = boost.workspace_id as string;
  const campaignId   = boost.campaign_id  as string;
  const intentId     = boost.publish_intent_id as string | null;

  // 0. Spend cap check before doing any work
  const capCheck = await checkSpendCap(workspaceId, 10); // min $10 estimate
  if (!capCheck.allowed) {
    await supabaseAdmin.from('campaign_boosts').update({
      status:        'FAILED',
      error_message: capCheck.reason,
      updated_at:    new Date().toISOString(),
    }).eq('id', boostId);
    logger.warn({ boostId, workspaceId, reason: capCheck.reason }, '[CampaignWorker] Boost blocked by spend cap');
    return;
  }

  // 1. Mark as BOOSTING so a concurrent run does not double-pick it
  await supabaseAdmin
    .from('campaign_boosts')
    .update({ status: 'BOOSTING', updated_at: new Date().toISOString() })
    .eq('id', boostId);

  // 2. Fetch campaign details
  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, objective, boost_per_post_budget, boost_settings, targeting, budget_daily, budget_currency, start_at, end_at')
    .eq('id', campaignId)
    .single();

  if (campErr || !campaign) {
    throw new Error(`Campaign ${campaignId} not found: ${campErr?.message}`);
  }

  // 3. Fetch publish_intent to get the platform post ID (needed for object_story_id)
  let platformPostId: string | null = null;
  if (intentId) {
    const { data: intent, error: intentErr } = await supabaseAdmin
      .from('publish_intents')
      .select('id, platform_post_id, platform')
      .eq('id', intentId)
      .single();

    if (intentErr || !intent) {
      throw new Error(`publish_intent ${intentId} not found: ${intentErr?.message}`);
    }

    platformPostId = intent.platform_post_id as string | null;
    if (!platformPostId) {
      throw new Error(`publish_intent ${intentId} has no platform_post_id — post may not have published to Meta yet`);
    }
  }

  // 4. Resolve agency Meta account
  const agencyAccount = await resolveAgencyAccount(workspaceId, 'meta');
  const adAccountId   = resolveMetaAdAccountId(agencyAccount);
  const token         = agencyAccount.access_token;

  // 5. Budget — prefer boost_per_post_budget, fall back to budget_daily
  const rawBudget    = campaign.boost_per_post_budget || campaign.budget_daily || 10;
  const budgetCents  = Math.round(Number(rawBudget) * 100);
  const currency     = campaign.budget_currency || 'USD';
  const objective    = resolveMetaObjective(campaign.objective || 'POST_ENGAGEMENT');
  const label        = `ZoikoVertex Auto-Boost · ${campaign.name}`;

  // 6. Targeting
  const geography = (campaign.targeting?.geography as string[] | undefined) || [];
  const boostSettings = (campaign.boost_settings as Record<string, any> | null) || {};
  const ageMin    = boostSettings.age_min ?? 18;
  const ageMax    = boostSettings.age_max ?? 65;
  const countries = geography.length > 0 ? geography : (boostSettings.countries as string[] | undefined) || ['US', 'GB', 'AE'];

  const targetingSpec: Record<string, unknown> = {
    age_min:       ageMin,
    age_max:       ageMax,
    geo_locations: { countries },
  };

  // 7. Ad schedule
  const startTime = campaign.start_at
    ? new Date(campaign.start_at).toISOString()
    : new Date().toISOString();
  const endTime = campaign.end_at
    ? new Date(campaign.end_at).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── Create Meta Campaign ──────────────────────────────────────────────────

  const metaCampaignRes = await metaPost(`/${adAccountId}/campaigns`, token, {
    name:                  label,
    objective,
    status:                'ACTIVE',
    special_ad_categories: [],
  }) as any;

  if (metaCampaignRes.error) {
    throw new Error(`Meta campaign creation failed: ${metaCampaignRes.error.message} (code ${metaCampaignRes.error.code})`);
  }

  const metaCampaignId = metaCampaignRes.id as string;

  // ── Create Ad Set ─────────────────────────────────────────────────────────

  const adSetBody: Record<string, unknown> = {
    name:          `${label} · Ad Set`,
    campaign_id:   metaCampaignId,
    billing_event: 'IMPRESSIONS',
    start_time:    startTime,
    end_time:      endTime,
    targeting:     targetingSpec,
    status:        'ACTIVE',
    daily_budget:  budgetCents > 0 ? budgetCents : 1000, // $10 minimum fallback
  };

  const metaAdSetRes = await metaPost(`/${adAccountId}/adsets`, token, adSetBody) as any;

  if (metaAdSetRes.error) {
    // Pause the orphaned campaign before throwing
    await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
    throw new Error(`Meta ad set creation failed: ${metaAdSetRes.error.message}`);
  }

  const metaAdSetId = metaAdSetRes.id as string;

  // ── Create Ad Creative + Ad (requires a real platform_post_id) ────────────

  let metaCreativeId: string | null = null;
  let metaAdId:       string | null = null;

  if (platformPostId) {
    const creativeRes = await metaPost(`/${adAccountId}/adcreatives`, token, {
      name:            `${label} · Creative`,
      object_story_id: platformPostId,
    }) as any;

    if (creativeRes.error) {
      await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
      throw new Error(`Meta creative creation failed: ${creativeRes.error.message}`);
    }

    metaCreativeId = creativeRes.id as string;

    const adRes = await metaPost(`/${adAccountId}/ads`, token, {
      name:     `${label} · Ad`,
      adset_id: metaAdSetId,
      creative: { creative_id: metaCreativeId },
      status:   'ACTIVE',
    }) as any;

    if (adRes.error) {
      await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
      throw new Error(`Meta ad creation failed: ${adRes.error.message}`);
    }

    metaAdId = adRes.id as string;
  }

  // ── Mark boost ACTIVE ─────────────────────────────────────────────────────

  await supabaseAdmin
    .from('campaign_boosts')
    .update({
      status:           'ACTIVE',
      meta_campaign_id: metaCampaignId,
      meta_adset_id:    metaAdSetId,
      meta_ad_id:       metaAdId,
      meta_creative_id: metaCreativeId,
      ad_account_id:    adAccountId,
      budget_daily:     rawBudget,
      budget_currency:  currency,
      objective,
      targeting: { countries, age_min: ageMin, age_max: ageMax },
      updated_at: new Date().toISOString(),
    })
    .eq('id', boostId);

  logger.info(
    { boostId, campaignId, metaCampaignId, metaAdSetId, metaAdId },
    '[CampaignWorker] Boost activated on Meta'
  );

  // ── Spend cap check with actual budget ───────────────────────────────────────
  const actualCapCheck = await checkSpendCap(workspaceId, rawBudget);
  if (!actualCapCheck.allowed) {
    await supabaseAdmin.from('campaign_boosts').update({
      status:        'FAILED',
      error_message: actualCapCheck.reason,
      updated_at:    new Date().toISOString(),
    }).eq('id', boostId);
    // Pause the orphaned Meta campaign
    try { await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' }); } catch { /* non-fatal */ }
    logger.warn({ boostId, rawBudget, reason: actualCapCheck.reason }, '[CampaignWorker] Boost paused by spend cap after creation');
    return;
  }

  // ── Deduct from wallet ────────────────────────────────────────────────────

  const { error: walletErr } = await supabaseAdmin.rpc('deduct_wallet_balance', {
    p_workspace_id: workspaceId,
    p_amount:       rawBudget,
    p_description:  `Auto-boost: ${campaign.name}`,
    p_campaign_id:  campaignId,
  });

  if (walletErr) {
    logger.warn({ boostId, campaignId, err: walletErr.message }, '[CampaignWorker] Wallet deduction failed (boost still live)');
  } else {
    // Trigger auto top-up if balance dropped below threshold
    await triggerAutoTopUp(workspaceId);
  }
}

// ── Main processing pass ──────────────────────────────────────────────────────

async function runBoostProcessingPass(): Promise<void> {
  const { data: boosts, error } = await supabaseAdmin
    .from('campaign_boosts')
    .select('id, workspace_id, campaign_id, publish_intent_id, platform')
    .eq('status', 'PENDING')
    .in('platform', ['facebook', 'instagram'])
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    logger.error({ error }, '[CampaignWorker] Failed to query PENDING boosts');
    return;
  }

  if (!boosts || boosts.length === 0) {
    return; // Nothing to do — no log noise
  }

  logger.info(`[CampaignWorker] Processing ${boosts.length} PENDING boost(s)...`);

  for (const boost of boosts) {
    try {
      await processBoost(boost);
    } catch (err: any) {
      logger.error({ err: err.message, boostId: boost.id }, '[CampaignWorker] Boost failed');

      await supabaseAdmin
        .from('campaign_boosts')
        .update({
          status:        'FAILED',
          error_message: err.message,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', boost.id);
    }
  }
}

// ── Settle matured deposits (processing_balance → balance) ───────────────────
// Stripe deposits have a hold period (DEPOSIT_HOLD_HOURS, default 48).
// Once available_at has passed, move the amount from processing_balance to
// balance so clients can use the credits.

async function settleMaturedDeposits(): Promise<void> {
  const now = new Date().toISOString();

  // Find all PROCESSING transactions whose available_at has passed
  const { data: txns, error } = await supabaseAdmin
    .from('wallet_transactions')
    .select('id, wallet_id, amount')
    .eq('status', 'PROCESSING')
    .lte('available_at', now)
    .limit(50);

  if (error) {
    logger.error({ error }, '[CampaignWorker] Failed to query maturing deposits');
    return;
  }

  if (!txns || txns.length === 0) return;

  logger.info(`[CampaignWorker] Settling ${txns.length} matured deposit(s)…`);

  for (const tx of txns) {
    try {
      const amount = Number(tx.amount);

      // Move amount: deduct processing_balance, add to balance (atomic via RPC if available)
      const { error: rpcErr } = await supabaseAdmin.rpc('settle_wallet_deposit', {
        p_wallet_id: tx.wallet_id,
        p_amount:    amount,
      });

      if (rpcErr) {
        // Fallback: manual two-step update
        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('balance, processing_balance')
          .eq('id', tx.wallet_id)
          .single();

        if (wallet) {
          await supabaseAdmin
            .from('wallets')
            .update({
              balance:            (wallet.balance            || 0) + amount,
              processing_balance: Math.max(0, (wallet.processing_balance || 0) - amount),
              updated_at:         now,
            })
            .eq('id', tx.wallet_id);
        }
      }

      // Mark transaction COMPLETED
      await supabaseAdmin
        .from('wallet_transactions')
        .update({ status: 'COMPLETED', description: 'Campaign credits — available', updated_at: now })
        .eq('id', tx.id);

      logger.info({ txId: tx.id, walletId: tx.wallet_id, amount }, '[CampaignWorker] Deposit settled — credits now available');
    } catch (err: any) {
      logger.error({ err: err.message, txId: tx.id }, '[CampaignWorker] Deposit settlement failed for transaction');
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startCampaignWorker(): void {
  logger.info('[CampaignWorker] Starting — boost processing every 2m, deposit settlement every 15m');

  // Run immediately on boot, then on intervals
  runBoostProcessingPass().catch((err) =>
    logger.error({ err }, '[CampaignWorker] Initial boost pass failed')
  );
  settleMaturedDeposits().catch((err) =>
    logger.error({ err }, '[CampaignWorker] Initial settlement pass failed')
  );

  setInterval(() => {
    runBoostProcessingPass().catch((err) =>
      logger.error({ err }, '[CampaignWorker] Scheduled boost pass failed')
    );
  }, POLL_INTERVAL_MS);

  setInterval(() => {
    settleMaturedDeposits().catch((err) =>
      logger.error({ err }, '[CampaignWorker] Scheduled settlement pass failed')
    );
  }, SETTLE_INTERVAL_MS);
}
