/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Campaign Worker
 *
 * Runs every 2 minutes via setInterval — no Redis required.
 * Picks up PENDING campaign_boosts rows for Meta platforms and
 * calls the Meta Graph API to create the full ad stack:
 *   campaign → ad set → ad creative (object_story_id) → ad
 *
 * Meta charges the client's own ad account directly (Hootsuite model).
 * No internal wallet deductions or spend caps — all billing is on Meta's side.
 *
 * On success: marks the boost ACTIVE and records meta IDs.
 * On failure: marks the boost FAILED with an error_message.
 * One boost failing never stops the others.
 */

import { supabaseAdmin } from '../shared/supabase';
import { logger }        from '../shared/logger';
import {
  resolveAgencyAccount,
  resolveMetaAdAccountId,
} from '../domains/campaigns/agencyAccountResolver';

// How often the worker polls
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

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

  // Mark as BOOSTING so a concurrent run does not double-pick it
  await supabaseAdmin
    .from('campaign_boosts')
    .update({ status: 'BOOSTING', updated_at: new Date().toISOString() })
    .eq('id', boostId);

  // Fetch campaign details
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

  // Meta charges the client's own ad account directly — no spend cap check needed.
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
    special_ad_categories: ['NONE'], // Meta v18+: must be ['NONE'], not []
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


// ── Public API ────────────────────────────────────────────────────────────────

export function startCampaignWorker(): void {
  logger.info('[CampaignWorker] Starting — boost processing every 2m');

  runBoostProcessingPass().catch((err) =>
    logger.error({ err }, '[CampaignWorker] Initial boost pass failed')
  );

  setInterval(() => {
    runBoostProcessingPass().catch((err) =>
      logger.error({ err }, '[CampaignWorker] Scheduled boost pass failed')
    );
  }, POLL_INTERVAL_MS);
}
