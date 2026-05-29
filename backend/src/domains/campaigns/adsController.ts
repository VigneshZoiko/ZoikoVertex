import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logger } from '../../shared/logger';

const META_GRAPH = 'https://graph.facebook.com/v18.0';

// ── Meta API helper ────────────────────────────────────────────

async function metaGet(path: string, token: string): Promise<Record<string, unknown>> {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`${META_GRAPH}${path}${sep}access_token=${token}`);
  return r.json();
}

async function metaPost(path: string, token: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await fetch(`${META_GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  return r.json();
}

function toAdAccountId(raw: string): string {
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

// ── Objective mapping: internal → Meta API ────────────────────

const META_OBJECTIVE_MAP: Record<string, string> = {
  BRAND_AWARENESS:  'BRAND_AWARENESS',
  TRAFFIC:          'OUTCOME_TRAFFIC',
  LEAD_GENERATION:  'OUTCOME_LEADS',
  CONVERSIONS:      'OUTCOME_SALES',
  POST_ENGAGEMENT:  'POST_ENGAGEMENT',
  VIDEO_VIEWS:      'VIDEO_VIEWS',
  REACH:            'REACH',
};

function resolveMetaObjective(objective: string): string {
  return META_OBJECTIVE_MAP[objective?.toUpperCase()] || 'REACH';
}

// ── pushCampaignToMeta — shared service function ───────────────
// Called from launchCampaign (auto) and POST /push-to-meta (manual).
// Returns a result object — never throws, so callers can treat it non-fatally.

export async function pushCampaignToMeta(
  campaign: Record<string, any>,
  workspaceId: string,
  userId?: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const connectedAccountId = (campaign.boost_settings as Record<string, unknown> | null)?.meta_connected_account_id as string | undefined;
    if (!connectedAccountId) {
      return { success: false, error: 'No Meta ad account configured on this campaign. Select one in the campaign wizard.' };
    }

    const { data: acct } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform, access_token, account_name, ad_account_id')
      .eq('id', connectedAccountId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!acct) return { success: false, error: 'Meta connected account not found.' };
    if (!acct.ad_account_id) return { success: false, error: 'No Meta Ad Account linked to this account. Link one in the Accounts page.' };

    const adAccountId = toAdAccountId(acct.ad_account_id);
    const token       = acct.access_token;
    const objective   = resolveMetaObjective(campaign.objective || '');
    const label       = `ZoikoVertex · ${campaign.name}`;
    const currency    = campaign.budget_currency || 'USD';

    const budgetTotal = campaign.budget_total ? Math.round(Number(campaign.budget_total) * 100) : null;
    const budgetDaily = campaign.budget_daily ? Math.round(Number(campaign.budget_daily) * 100) : null;

    // 1. Create Meta Campaign
    const metaCampaign = await metaPost(`/${adAccountId}/campaigns`, token, {
      name:                  label,
      objective,
      status:                'ACTIVE',
      special_ad_categories: [],
    }) as any;

    if (metaCampaign.error) {
      return { success: false, error: `Meta campaign: ${metaCampaign.error.message} (code ${metaCampaign.error.code})` };
    }

    const metaCampaignId = metaCampaign.id as string;

    // 2. Targeting
    const geography = (campaign.targeting?.geography as string[] | undefined) || [];
    const targetingSpec: Record<string, unknown> = {
      age_min:       18,
      age_max:       65,
      geo_locations: { countries: geography.length > 0 ? geography : ['US', 'GB', 'AE'] },
    };

    // 3. Create Ad Set
    const startTime = campaign.start_at ? new Date(campaign.start_at).toISOString() : new Date().toISOString();
    const endTime   = campaign.end_at
      ? new Date(campaign.end_at).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const adSetBody: Record<string, unknown> = {
      name:          `${label} · Ad Set`,
      campaign_id:   metaCampaignId,
      billing_event: 'IMPRESSIONS',
      start_time:    startTime,
      end_time:      endTime,
      targeting:     targetingSpec,
      status:        'ACTIVE',
    };

    if (budgetTotal)    adSetBody.lifetime_budget = budgetTotal;
    else if (budgetDaily) adSetBody.daily_budget  = budgetDaily;
    else                adSetBody.daily_budget    = 1000; // $10 fallback

    const metaAdSet = await metaPost(`/${adAccountId}/adsets`, token, adSetBody) as any;

    if (metaAdSet.error) {
      await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
      return { success: false, error: `Meta ad set: ${metaAdSet.error.message}` };
    }

    const metaAdSetId = metaAdSet.id as string;

    // 4. Save to campaign_boosts
    const { data: boost, error: boostErr } = await supabaseAdmin
      .from('campaign_boosts')
      .insert({
        workspace_id:         workspaceId,
        campaign_id:          campaign.id,
        connected_account_id: connectedAccountId,
        platform:             acct.platform,
        boost_type:           'CAMPAIGN',
        status:               'ACTIVE',
        budget_total:         campaign.budget_total || null,
        budget_daily:         campaign.budget_daily || null,
        budget_currency:      currency,
        start_at:             campaign.start_at || startTime,
        end_at:               campaign.end_at   || endTime,
        objective,
        targeting:            { countries: geography.length > 0 ? geography : ['US', 'GB', 'AE'], age_min: 18, age_max: 65 },
        ad_account_id:        adAccountId,
        meta_campaign_id:     metaCampaignId,
        meta_adset_id:        metaAdSetId,
        created_by:           userId || null,
      })
      .select()
      .single();

    if (boostErr) throw boostErr;

    logger.info({ campaignId: campaign.id, metaCampaignId, metaAdSetId }, '[Meta] Campaign pushed to Meta Ads');
    return { success: true, data: boost };
  } catch (err: any) {
    logger.warn({ err, campaignId: campaign.id }, '[Meta] pushCampaignToMeta failed');
    return { success: false, error: err.message || 'Unknown error pushing to Meta.' };
  }
}

// ── POST /api/v1/campaigns/:id/push-to-meta — Manual trigger ──

export const pushCampaignToMetaHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId      = req.user?.id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!campaign.platforms?.includes('Meta')) {
      return res.status(400).json({ error: 'This campaign does not target Meta.' });
    }

    // Check for existing active CAMPAIGN boost to prevent duplicates
    const { data: existing } = await supabaseAdmin
      .from('campaign_boosts')
      .select('id, status, meta_campaign_id')
      .eq('campaign_id', campaign.id)
      .eq('boost_type', 'CAMPAIGN')
      .in('status', ['ACTIVE', 'PENDING'])
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error:  'An active Meta campaign already exists for this campaign.',
        boost_id:   existing.id,
        meta_campaign_id: existing.meta_campaign_id,
      });
    }

    const result = await pushCampaignToMeta(campaign, workspaceId, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ success: true, data: result.data, message: 'Campaign live on Meta Ads.' });
  } catch (err) { next(err); }
};

// ── GET /api/v1/ads/accounts/:connectedAccountId/ad-accounts ──
// Fetches Meta ad accounts accessible with the connected token

export const getMetaAdAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: acct } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform, access_token, account_name')
      .eq('id', req.params.connectedAccountId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!acct) return res.status(404).json({ error: 'Connected account not found' });
    if (!['facebook', 'instagram'].includes(acct.platform)) {
      return res.status(400).json({ error: 'Ad accounts are only available for Meta (Facebook/Instagram) accounts' });
    }

    const data = await metaGet('/me/adaccounts?fields=id,name,currency,account_status', acct.access_token);

    if ((data as any).error) {
      const err = (data as any).error;
      return res.status(400).json({
        error: err.message,
        code: err.code,
        requires_permission: err.code === 200 || err.code === 10,
        hint: 'Your Facebook token may need the ads_management permission. Reconnect your Facebook account and grant Ads access.',
      });
    }

    const accounts = ((data as any).data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      status: a.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
    }));

    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
};

// ── POST /api/v1/ads/accounts/:connectedAccountId/link-ad-account ──

const LinkAdAccountSchema = z.object({
  ad_account_id:   z.string().min(1),
  ad_account_name: z.string().optional(),
});

export const linkAdAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = LinkAdAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const adAccountId = toAdAccountId(parsed.data.ad_account_id);

    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .update({
        ad_account_id:   adAccountId,
        ad_account_name: parsed.data.ad_account_name || null,
      })
      .eq('id', req.params.connectedAccountId)
      .eq('workspace_id', workspaceId)
      .select('id, ad_account_id, ad_account_name')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Account not found' });

    res.json({ success: true, data, message: 'Ad account linked.' });
  } catch (err) { next(err); }
};

// ── POST /api/v1/ads/boosts — Create a boost ─────────────────

const CreateBoostSchema = z.object({
  boost_type:          z.enum(['POST', 'CAMPAIGN']),
  publish_intent_id:   z.string().uuid().optional(),
  campaign_id:         z.string().uuid().optional(),
  connected_account_id: z.string().uuid(),
  objective:           z.enum(['POST_ENGAGEMENT', 'REACH', 'BRAND_AWARENESS', 'TRAFFIC', 'VIDEO_VIEWS'])
                         .default('POST_ENGAGEMENT'),
  budget_total:        z.number().positive().optional(),
  budget_daily:        z.number().positive().optional(),
  budget_currency:     z.string().default('USD'),
  start_at:            z.string(),
  end_at:              z.string(),
  targeting: z.object({
    countries: z.array(z.string()).default([]),
    age_min:   z.number().int().min(13).max(65).default(18),
    age_max:   z.number().int().min(13).max(65).default(65),
  }).default({ countries: [], age_min: 18, age_max: 65 }),
});

export const createBoost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = CreateBoostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const d = parsed.data;
    if (!d.budget_daily && !d.budget_total) {
      return res.status(400).json({ error: 'Provide either budget_daily or budget_total' });
    }

    // Resolve connected account
    const { data: acct } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform, access_token, account_handle, ad_account_id, ad_account_name, account_name')
      .eq('id', d.connected_account_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!acct)              return res.status(404).json({ error: 'Connected account not found' });
    if (!acct.ad_account_id) return res.status(400).json({ error: 'No ad account linked. Select an ad account first.' });

    const adAccountId = toAdAccountId(acct.ad_account_id);
    const token       = acct.access_token;

    // For POST boosts — resolve the platform post ID
    let objectStoryId: string | null = null;
    if (d.boost_type === 'POST') {
      if (!d.publish_intent_id) return res.status(400).json({ error: 'publish_intent_id required for POST boost' });

      const { data: intent } = await supabaseAdmin
        .from('publish_intents')
        .select('id, platform_post_id, platform')
        .eq('id', d.publish_intent_id)
        .eq('workspace_id', workspaceId)
        .single();

      if (!intent?.platform_post_id) {
        return res.status(400).json({
          error: 'This post does not have a Meta post ID. Only posts published via ZoikoVertex to Facebook/Instagram can be boosted.',
        });
      }
      objectStoryId = intent.platform_post_id;
    }

    // Budget in cents (Meta uses smallest currency unit)
    const dailyBudget    = d.budget_daily ? Math.round(d.budget_daily * 100) : null;
    const lifetimeBudget = d.budget_total ? Math.round(d.budget_total * 100) : null;

    const label = `ZoikoVertex ${d.boost_type === 'POST' ? 'Post' : 'Campaign'} Boost · ${new Date().toISOString().slice(0, 10)}`;

    // 1. Create Meta Campaign
    const metaCampaign = await metaPost(`/${adAccountId}/campaigns`, token, {
      name:                  label,
      objective:             d.objective,
      status:                'ACTIVE',
      special_ad_categories: [],
    }) as any;

    if (metaCampaign.error) {
      return res.status(400).json({
        error: `Meta error creating campaign: ${metaCampaign.error.message}`,
        code:  metaCampaign.error.code,
      });
    }

    const metaCampaignId = metaCampaign.id as string;

    // 2. Build targeting
    const targetingSpec: Record<string, unknown> = {
      age_min: d.targeting.age_min,
      age_max: d.targeting.age_max,
      geo_locations: {
        countries: d.targeting.countries.length > 0 ? d.targeting.countries : ['US', 'GB', 'AE'],
      },
    };

    // 3. Create Ad Set
    const adSetBody: Record<string, unknown> = {
      name:          `${label} · AdSet`,
      campaign_id:   metaCampaignId,
      billing_event: 'IMPRESSIONS',
      start_time:    new Date(d.start_at).toISOString(),
      end_time:      new Date(d.end_at).toISOString(),
      targeting:     targetingSpec,
      status:        'ACTIVE',
    };
    if (dailyBudget)    adSetBody.daily_budget    = dailyBudget;
    else                adSetBody.lifetime_budget = lifetimeBudget;

    const metaAdSet = await metaPost(`/${adAccountId}/adsets`, token, adSetBody) as any;

    if (metaAdSet.error) {
      await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
      return res.status(400).json({ error: `Meta error creating ad set: ${metaAdSet.error.message}` });
    }

    const metaAdSetId = metaAdSet.id as string;
    let metaCreativeId: string | null = null;
    let metaAdId:       string | null = null;

    // 4. Creative + Ad (for post boosts with a real post ID)
    if (d.boost_type === 'POST' && objectStoryId) {
      const creative = await metaPost(`/${adAccountId}/adcreatives`, token, {
        name:            `${label} · Creative`,
        object_story_id: objectStoryId,
      }) as any;

      if (creative.error) {
        return res.status(400).json({ error: `Meta error creating creative: ${creative.error.message}` });
      }
      metaCreativeId = creative.id as string;

      const ad = await metaPost(`/${adAccountId}/ads`, token, {
        name:     `${label} · Ad`,
        adset_id: metaAdSetId,
        creative: { creative_id: metaCreativeId },
        status:   'ACTIVE',
      }) as any;

      if (ad.error) {
        return res.status(400).json({ error: `Meta error creating ad: ${ad.error.message}` });
      }
      metaAdId = ad.id as string;
    }

    // 5. Save to DB
    const { data: boost, error: boostErr } = await supabaseAdmin
      .from('campaign_boosts')
      .insert({
        workspace_id:        workspaceId,
        campaign_id:         d.campaign_id         || null,
        publish_intent_id:   d.publish_intent_id   || null,
        connected_account_id: d.connected_account_id,
        platform:            acct.platform,
        boost_type:          d.boost_type,
        status:              'ACTIVE',
        budget_total:        d.budget_total         || null,
        budget_daily:        d.budget_daily         || null,
        budget_currency:     d.budget_currency,
        start_at:            d.start_at,
        end_at:              d.end_at,
        objective:           d.objective,
        targeting:           d.targeting,
        ad_account_id:       adAccountId,
        meta_campaign_id:    metaCampaignId,
        meta_adset_id:       metaAdSetId,
        meta_ad_id:          metaAdId,
        meta_creative_id:    metaCreativeId,
        created_by:          userId,
      })
      .select()
      .single();

    if (boostErr) throw boostErr;

    res.status(201).json({ success: true, data: boost, message: 'Boost created and live on Meta.' });
  } catch (err) { next(err); }
};

// ── GET /api/v1/ads/boosts — List boosts ─────────────────────

export const listBoosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { campaign_id } = req.query;

    let query = supabaseAdmin
      .from('campaign_boosts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (campaign_id) query = query.eq('campaign_id', String(campaign_id));

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

// ── POST /api/v1/ads/boosts/:id/sync — Sync metrics from Meta ─

export const syncBoostMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: boost } = await supabaseAdmin
      .from('campaign_boosts')
      .select('*, connected_accounts(access_token)')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!boost) return res.status(404).json({ error: 'Boost not found' });

    const token = (boost.connected_accounts as any)?.access_token;
    if (token && boost.meta_campaign_id) {
      const insights = await metaGet(
        `/${boost.meta_campaign_id}/insights?fields=impressions,reach,clicks,spend&date_preset=lifetime`,
        token
      ) as any;

      if (!insights.error && insights.data?.[0]) {
        const m = insights.data[0];
        await supabaseAdmin
          .from('campaign_boosts')
          .update({
            impressions:     parseInt(m.impressions || '0'),
            reach:           parseInt(m.reach       || '0'),
            clicks:          parseInt(m.clicks      || '0'),
            spend_recorded:  parseFloat(m.spend     || '0'),
            updated_at:      new Date().toISOString(),
          })
          .eq('id', req.params.id);
      }
    }

    const { data: updated } = await supabaseAdmin
      .from('campaign_boosts').select('*').eq('id', req.params.id).single();

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// ── POST /api/v1/ads/boosts/:id/pause ────────────────────────

export const pauseBoost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: boost } = await supabaseAdmin
      .from('campaign_boosts')
      .select('*, connected_accounts(access_token)')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!boost)                  return res.status(404).json({ error: 'Boost not found' });
    if (boost.status !== 'ACTIVE') return res.status(400).json({ error: `Boost is ${boost.status} — only ACTIVE boosts can be paused` });

    const token = (boost.connected_accounts as any)?.access_token;
    if (token && boost.meta_campaign_id) {
      await metaPost(`/${boost.meta_campaign_id}`, token, { status: 'PAUSED' });
    }

    await supabaseAdmin
      .from('campaign_boosts')
      .update({ status: 'PAUSED', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.json({ success: true, message: 'Boost paused.' });
  } catch (err) { next(err); }
};

// ── POST /api/v1/ads/boosts/:id/resume ───────────────────────

export const resumeBoost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: boost } = await supabaseAdmin
      .from('campaign_boosts')
      .select('*, connected_accounts(access_token)')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!boost)                   return res.status(404).json({ error: 'Boost not found' });
    if (boost.status !== 'PAUSED') return res.status(400).json({ error: `Boost is ${boost.status} — only PAUSED boosts can be resumed` });

    const token = (boost.connected_accounts as any)?.access_token;
    if (token && boost.meta_campaign_id) {
      await metaPost(`/${boost.meta_campaign_id}`, token, { status: 'ACTIVE' });
    }

    await supabaseAdmin
      .from('campaign_boosts')
      .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.json({ success: true, message: 'Boost resumed.' });
  } catch (err) { next(err); }
};

// ── GET /api/v1/campaigns/:id/insights ───────────────────────

export const getCampaignInsights = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const campaignId = req.params.id;

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, budget_total, budget_daily, budget_currency, spend_recorded, kpi_reach, kpi_engagement, kpi_conversions')
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { data: boostRows } = await supabaseAdmin
      .from('campaign_boosts')
      .select('platform, status, objective, impressions, reach, clicks, spend_recorded')
      .eq('campaign_id', campaignId)
      .eq('workspace_id', workspaceId);

    const blist = boostRows || [];

    const totals = blist.reduce(
      (acc, b) => ({
        impressions: acc.impressions + (b.impressions || 0),
        reach:       acc.reach       + (b.reach       || 0),
        clicks:      acc.clicks      + (b.clicks      || 0),
        spend:       acc.spend       + parseFloat(String(b.spend_recorded || 0)),
      }),
      { impressions: 0, reach: 0, clicks: 0, spend: 0 }
    );

    const ctr = totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0;
    const cpm = totals.impressions > 0 ? Math.round((totals.spend / totals.impressions) * 100000) / 100 : 0;
    const cpc = totals.clicks      > 0 ? Math.round((totals.spend / totals.clicks) * 100) / 100 : 0;

    const platformMap: Record<string, { impressions: number; reach: number; clicks: number; spend: number }> = {};
    const statusMap:   Record<string, number> = {};
    const objectiveMap: Record<string, number> = {};

    for (const b of blist) {
      if (!platformMap[b.platform]) platformMap[b.platform] = { impressions: 0, reach: 0, clicks: 0, spend: 0 };
      platformMap[b.platform].impressions += b.impressions || 0;
      platformMap[b.platform].reach       += b.reach       || 0;
      platformMap[b.platform].clicks      += b.clicks      || 0;
      platformMap[b.platform].spend       += parseFloat(String(b.spend_recorded || 0));

      statusMap[b.status]     = (statusMap[b.status]     || 0) + 1;
      objectiveMap[b.objective] = (objectiveMap[b.objective] || 0) + 1;
    }

    const spendTotal   = totals.spend + parseFloat(String(campaign.spend_recorded || 0));
    const budgetTotal  = parseFloat(String(campaign.budget_total || 0));
    const utilization  = budgetTotal > 0 ? Math.round((spendTotal / budgetTotal) * 100) : null;

    res.json({
      success: true,
      data: {
        totals,
        kpis:        { ctr, cpm, cpc },
        kpi_targets: {
          reach:       campaign.kpi_reach       || null,
          engagement:  campaign.kpi_engagement  || null,
          conversions: campaign.kpi_conversions || null,
        },
        budget: {
          total:           budgetTotal  || null,
          currency:        campaign.budget_currency || 'USD',
          spend:           Math.round(spendTotal * 100) / 100,
          utilization_pct: utilization,
        },
        by_platform:  Object.entries(platformMap).map(([platform, m]) => ({ platform, ...m })),
        by_status:    Object.entries(statusMap).map(([status, count]) => ({ status, count })),
        by_objective: Object.entries(objectiveMap).map(([objective, count]) => ({ objective, count })),
        boosts_count: blist.length,
      },
    });
  } catch (err) { next(err); }
};

// ── DELETE /api/v1/ads/boosts/:id — Cancel boost ─────────────

export const cancelBoost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: boost } = await supabaseAdmin
      .from('campaign_boosts')
      .select('*, connected_accounts(access_token)')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!boost) return res.status(404).json({ error: 'Boost not found' });

    const token = (boost.connected_accounts as any)?.access_token;
    if (token && boost.meta_campaign_id) {
      await metaPost(`/${boost.meta_campaign_id}`, token, { status: 'PAUSED' });
    }

    await supabaseAdmin
      .from('campaign_boosts')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.json({ success: true, message: 'Boost cancelled.' });
  } catch (err) { next(err); }
};
