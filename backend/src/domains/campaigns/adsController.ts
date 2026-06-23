import { createHmac } from 'crypto';
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logger } from '../../shared/logger';
import { env } from '../../config/env';
import { resolveAgencyAccount, resolveMetaAdAccountId, resolveMetaPageId } from './agencyAccountResolver';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

function appSecretProof(token: string): string {
  const secret = env.META_APP_SECRET;
  if (!secret) return '';
  return createHmac('sha256', secret).update(token).digest('hex');
}

// ── Meta API helper ────────────────────────────────────────────

async function metaGet(path: string, token: string): Promise<Record<string, unknown>> {
  const sep   = path.includes('?') ? '&' : '?';
  const proof = appSecretProof(token);
  const r = await fetch(`${META_GRAPH}${path}${sep}access_token=${token}${proof ? `&appsecret_proof=${proof}` : ''}`);
  return r.json();
}

async function metaPost(path: string, token: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const proof = appSecretProof(token);
  const r = await fetch(`${META_GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token, ...(proof ? { appsecret_proof: proof } : {}) }),
  });
  return r.json();
}

function toAdAccountId(raw: string): string {
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

// ── Objective mapping: internal → Meta API ────────────────────

const META_OBJECTIVE_MAP: Record<string, string> = {
  BRAND_AWARENESS:  'OUTCOME_AWARENESS',
  AWARENESS:        'OUTCOME_AWARENESS',
  TRAFFIC:          'OUTCOME_TRAFFIC',
  LEAD_GENERATION:  'OUTCOME_LEADS',
  CONVERSIONS:      'OUTCOME_SALES',
  ENGAGEMENT:       'OUTCOME_ENGAGEMENT',
  POST_ENGAGEMENT:  'OUTCOME_ENGAGEMENT',
  VIDEO_VIEWS:      'OUTCOME_TRAFFIC',
  REACH:            'OUTCOME_AWARENESS',
};

function resolveMetaObjective(objective: string): string {
  return META_OBJECTIVE_MAP[objective?.toUpperCase()] || 'REACH';
}

// Maps internal objective → Meta ad set optimization_goal
const META_OPTIMIZATION_GOAL_MAP: Record<string, string> = {
  BRAND_AWARENESS: 'REACH',
  REACH:           'REACH',
  TRAFFIC:         'LINK_CLICKS',
  CONVERSIONS:     'OFFSITE_CONVERSIONS',
  LEAD_GENERATION: 'LEAD_GENERATION',
  POST_ENGAGEMENT: 'POST_ENGAGEMENT',
  VIDEO_VIEWS:     'VIDEO_VIEWS',
};

function resolveOptimizationGoal(objective: string): string {
  return META_OPTIMIZATION_GOAL_MAP[objective?.toUpperCase()] || 'REACH';
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
    // Agency model: resolve the agency's default Meta account automatically
    let acct: any;
    try {
      acct = await resolveAgencyAccount(workspaceId, 'meta');
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    const adAccountId = resolveMetaAdAccountId(acct);
    const token       = acct.access_token;
    const objective   = resolveMetaObjective(campaign.objective || '');
    const label       = `ZoikoVertex · ${campaign.name}`;
    const currency    = campaign.budget_currency || 'USD';

    const budgetTotal = campaign.budget_total ? Math.round(Number(campaign.budget_total) * 100) : null;
    const budgetDaily = campaign.budget_daily ? Math.round(Number(campaign.budget_daily) * 100) : null;

    // Pre-validate before any Meta API calls to avoid orphaned campaigns
    const geography = (campaign.targeting?.geography as string[] | undefined) || [];
    if (geography.length === 0) {
      return { success: false, error: 'Campaign has no target locations set. Please configure target locations (countries/regions) in campaign targeting before publishing.' };
    }
    if (!budgetTotal && !budgetDaily) {
      return { success: false, error: 'Campaign has no budget set. Please set a daily or lifetime budget before publishing.' };
    }

    // 1. Create Meta Campaign
    const metaCampaign = await metaPost(`/${adAccountId}/campaigns`, token, {
      name:                  label,
      objective,
      status:                'ACTIVE',
      special_ad_categories: ['NONE'],
    }) as any;

    if (metaCampaign.error) {
      return { success: false, error: `Meta campaign: ${metaCampaign.error.message} (code ${metaCampaign.error.code})` };
    }

    const metaCampaignId = metaCampaign.id as string;

    // 2. Targeting
    const ageMin = (campaign.targeting as any)?.age_min ?? 18;
    const ageMax = (campaign.targeting as any)?.age_max ?? 65;
    const targetingSpec: Record<string, unknown> = {
      age_min:       ageMin,
      age_max:       ageMax,
      geo_locations: { countries: geography },
    };

    // 3. Create Ad Set
    const startTime = campaign.start_at ? new Date(campaign.start_at).toISOString() : new Date().toISOString();
    const endTime   = campaign.end_at
      ? new Date(campaign.end_at).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const adSetBody: Record<string, unknown> = {
      name:              `${label} · Ad Set`,
      campaign_id:       metaCampaignId,
      billing_event:     'IMPRESSIONS',
      optimization_goal: resolveOptimizationGoal(campaign.objective || 'REACH'),
      start_time:        startTime,
      end_time:          endTime,
      targeting:         targetingSpec,
      status:            'ACTIVE',
    };

    if (budgetTotal)      adSetBody.lifetime_budget = budgetTotal;
    else if (budgetDaily) adSetBody.daily_budget    = budgetDaily;

    const metaAdSet = await metaPost(`/${adAccountId}/adsets`, token, adSetBody) as any;

    if (metaAdSet.error) {
      await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
      return { success: false, error: `Meta ad set: ${metaAdSet.error.message}` };
    }

    const metaAdSetId = metaAdSet.id as string;

    // 4. If campaign has an image creative, create a full ad — not just a shell
    const creative = campaign.creative || {};
    let metaCreativeId: string | null = null;
    let metaAdId:       string | null = null;
    let resolvedBoostType = 'CAMPAIGN';

    const pageId = creative.facebook_page_id || resolveMetaPageId(acct) || null;

    if (pageId && creative.ad_image_url) {
      // IMAGE_AD: campaign has an image set — create a deliverable ad
      if (!creative.landing_page_url) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return { success: false, error: 'Campaign has no landing page URL set. Please set a landing page URL in the campaign creative before publishing.' };
      }
      const landingUrl = creative.landing_page_url as string;
      const adCreative = await metaPost(`/${adAccountId}/adcreatives`, token, {
        name: `${label} · Creative`,
        object_story_spec: {
          page_id:   pageId,
          link_data: {
            message:        creative.copy_text    || '',
            link:           landingUrl,
            picture:        creative.ad_image_url,
            name:           creative.headline     || '',
            call_to_action: {
              type:  creative.cta_text?.toUpperCase().replace(/ /g, '_') || 'LEARN_MORE',
              value: { link: landingUrl },
            },
          },
        },
      }) as any;

      if (!adCreative.error) {
        metaCreativeId  = adCreative.id as string;
        resolvedBoostType = 'IMAGE_AD';

        const adRes = await metaPost(`/${adAccountId}/ads`, token, {
          name:     `${label} · Ad`,
          adset_id: metaAdSetId,
          creative: { creative_id: metaCreativeId },
          status:   'ACTIVE',
        }) as any;

        if (!adRes.error) metaAdId = adRes.id as string;
      } else {
        logger.warn({ campaignId: campaign.id, err: adCreative.error }, '[Meta] Auto-launch creative creation failed — campaign shell saved');
      }
    }

    // 5. Save to campaign_boosts
    const { data: boost, error: boostErr } = await supabaseAdmin
      .from('campaign_boosts')
      .insert({
        workspace_id:         workspaceId,
        campaign_id:          campaign.id,
        connected_account_id: acct.id,
        platform:             acct.platform,
        boost_type:           resolvedBoostType,
        status:               'ACTIVE',
        budget_total:         campaign.budget_total || null,
        budget_daily:         campaign.budget_daily || null,
        budget_currency:      currency,
        start_at:             campaign.start_at || startTime,
        end_at:               campaign.end_at   || endTime,
        objective,
        targeting:            { countries: geography, age_min: ageMin, age_max: ageMax },
        ad_account_id:        adAccountId,
        meta_campaign_id:     metaCampaignId,
        meta_adset_id:        metaAdSetId,
        meta_creative_id:     metaCreativeId,
        meta_ad_id:           metaAdId,
        ad_image_url:         creative.ad_image_url || null,
        ad_headline:          creative.headline     || null,
        created_by:           userId || null,
      })
      .select()
      .single();

    if (boostErr) throw boostErr;

    logger.info({ campaignId: campaign.id, metaCampaignId, metaAdSetId, hasCreative: !!metaCreativeId }, '[Meta] Campaign pushed to Meta Ads');
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
  boost_type:           z.enum(['POST', 'CAMPAIGN', 'IMAGE_AD', 'VIDEO_AD', 'LEAD_AD']),
  publish_intent_id:    z.string().uuid().optional(),
  campaign_id:          z.string().uuid().optional(),
  connected_account_id: z.string().uuid(),
  objective:            z.enum([
    'POST_ENGAGEMENT', 'REACH', 'BRAND_AWARENESS',
    'TRAFFIC', 'VIDEO_VIEWS', 'LEAD_GENERATION', 'CONVERSIONS',
  ]).default('POST_ENGAGEMENT'),
  budget_total:         z.number().positive().optional(),
  budget_daily:         z.number().positive().optional(),
  budget_currency:      z.string().default('USD'),
  start_at:             z.string(),
  end_at:               z.string(),
  targeting: z.object({
    countries: z.array(z.string()).default([]),
    age_min:   z.number().int().min(13).max(65).default(18),
    age_max:   z.number().int().min(13).max(65).default(65),
  }).default({ countries: [], age_min: 18, age_max: 65 }),
  // Image / Video Ad fields
  ad_image_url:   z.string().url().optional(),
  ad_video_url:   z.string().url().optional(),
  ad_headline:    z.string().max(40).optional(),
  ad_body:        z.string().max(125).optional(),
  ad_cta:         z.string().optional(),
  ad_landing_url: z.string().url().optional(),
  // Lead Ad fields
  lead_form_id:   z.string().optional(),
  // Facebook page (needed for IMAGE/VIDEO ad creatives)
  facebook_page_id: z.string().optional(),
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

    // Agency model: resolve the agency's default Meta account automatically
    const acct = await resolveAgencyAccount(workspaceId, 'meta');
    const adAccountId = resolveMetaAdAccountId(acct);
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

    const boostTypeLabel: Record<string, string> = {
      POST: 'Post', CAMPAIGN: 'Campaign',
      IMAGE_AD: 'Image Ad', VIDEO_AD: 'Video Ad', LEAD_AD: 'Lead Ad',
    };
    const label = `ZoikoVertex ${boostTypeLabel[d.boost_type] ?? d.boost_type} · ${new Date().toISOString().slice(0, 10)}`;

    // Pre-validate before any Meta API calls to avoid orphaned campaigns
    if (!d.targeting.countries || d.targeting.countries.length === 0) {
      return res.status(400).json({ error: 'Boost has no target locations. Please set target countries/regions before creating a boost.' });
    }
    if (!dailyBudget && !lifetimeBudget) {
      return res.status(400).json({ error: 'Boost has no budget set. Please set a daily or total budget before creating a boost.' });
    }

    // Resolve objective for Meta API — LEAD_AD always uses OUTCOME_LEADS
    const resolvedObjective = d.boost_type === 'LEAD_AD'
      ? 'OUTCOME_LEADS'
      : resolveMetaObjective(d.objective);

    // 1. Create Meta Campaign
    const metaCampaign = await metaPost(`/${adAccountId}/campaigns`, token, {
      name:                  label,
      objective:             resolvedObjective,
      status:                'ACTIVE',
      special_ad_categories: ['NONE'],
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
      age_min:       d.targeting.age_min,
      age_max:       d.targeting.age_max,
      geo_locations: { countries: d.targeting.countries },
    };

    // 3. Create Ad Set with optimization_goal
    const adSetBody: Record<string, unknown> = {
      name:              `${label} · AdSet`,
      campaign_id:       metaCampaignId,
      billing_event:     'IMPRESSIONS',
      optimization_goal: resolveOptimizationGoal(d.boost_type === 'LEAD_AD' ? 'LEAD_GENERATION' : d.objective),
      start_time:        new Date(d.start_at).toISOString(),
      end_time:          new Date(d.end_at).toISOString(),
      targeting:         targetingSpec,
      status:            'ACTIVE',
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

    // 4. Build creative based on boost type
    const pageId = d.facebook_page_id || acct.agency_page_id || null;

    if (d.boost_type === 'POST' && objectStoryId) {
      // ── Post Boost: promote existing organic post ─────────────
      const creative = await metaPost(`/${adAccountId}/adcreatives`, token, {
        name:            `${label} · Creative`,
        object_story_id: objectStoryId,
      }) as any;
      if (creative.error) {
        return res.status(400).json({ error: `Meta error creating creative: ${creative.error.message}` });
      }
      metaCreativeId = creative.id as string;

    } else if (d.boost_type === 'IMAGE_AD') {
      // ── Image Ad: fresh image creative ───────────────────────
      if (!d.ad_image_url) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: 'ad_image_url is required for IMAGE_AD boost' });
      }
      if (!pageId) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: 'facebook_page_id is required for IMAGE_AD boost' });
      }
      const ctaType    = d.ad_cta || 'LEARN_MORE';
      if (!d.ad_landing_url) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: 'ad_landing_url is required for IMAGE_AD boost. Please set a landing page URL.' });
      }
      const landingUrl = d.ad_landing_url;
      const creative = await metaPost(`/${adAccountId}/adcreatives`, token, {
        name: `${label} · Creative`,
        object_story_spec: {
          page_id:   pageId,
          link_data: {
            message:          d.ad_body    || '',
            link:             landingUrl,
            picture:          d.ad_image_url,
            name:             d.ad_headline || '',
            call_to_action:   { type: ctaType, value: { link: landingUrl } },
          },
        },
      }) as any;
      if (creative.error) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: `Meta error creating image creative: ${creative.error.message}` });
      }
      metaCreativeId = creative.id as string;

    } else if (d.boost_type === 'VIDEO_AD') {
      // ── Video Ad: video creative ──────────────────────────────
      if (!d.ad_video_url) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: 'ad_video_url is required for VIDEO_AD boost' });
      }
      if (!pageId) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: 'facebook_page_id is required for VIDEO_AD boost' });
      }
      const ctaType = d.ad_cta || 'WATCH_MORE';
      if (!d.ad_landing_url) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: 'ad_landing_url is required for VIDEO_AD boost. Please set a landing page URL.' });
      }
      const landingUrl = d.ad_landing_url;
      const creative   = await metaPost(`/${adAccountId}/adcreatives`, token, {
        name: `${label} · Creative`,
        object_story_spec: {
          page_id:    pageId,
          video_data: {
            video_id:       d.ad_video_url,
            message:        d.ad_body        || '',
            title:          d.ad_headline    || '',
            image_url:      d.ad_image_url   || undefined,
            call_to_action: { type: ctaType, value: { link: landingUrl } },
          },
        },
      }) as any;
      if (creative.error) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: `Meta error creating video creative: ${creative.error.message}` });
      }
      metaCreativeId = creative.id as string;

    } else if (d.boost_type === 'LEAD_AD') {
      // ── Lead Ad: instant form ─────────────────────────────────
      if (!d.lead_form_id) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: 'lead_form_id is required for LEAD_AD boost' });
      }
      if (!pageId) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: 'facebook_page_id is required for LEAD_AD boost' });
      }
      const creative = await metaPost(`/${adAccountId}/adcreatives`, token, {
        name: `${label} · Creative`,
        object_story_spec: {
          page_id:   pageId,
          link_data: {
            message:         d.ad_body     || '',
            name:            d.ad_headline || '',
            call_to_action:  { type: 'SIGN_UP', value: { lead_gen_form_id: d.lead_form_id } },
          },
        },
      }) as any;
      if (creative.error) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'PAUSED' });
        return res.status(400).json({ error: `Meta error creating lead creative: ${creative.error.message}` });
      }
      metaCreativeId = creative.id as string;
    }

    // 5. Create the Ad (for all types that produced a creative)
    if (metaCreativeId) {
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

    // 6. Save to DB
    const { data: boost, error: boostErr } = await supabaseAdmin
      .from('campaign_boosts')
      .insert({
        workspace_id:        workspaceId,
        campaign_id:         d.campaign_id          || null,
        publish_intent_id:   d.publish_intent_id    || null,
        connected_account_id: acct.id,
        platform:            acct.platform,
        boost_type:          d.boost_type,
        status:              'ACTIVE',
        budget_total:        d.budget_total          || null,
        budget_daily:        d.budget_daily          || null,
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
        ad_image_url:        d.ad_image_url          || null,
        ad_headline:         d.ad_headline           || null,
        ad_body:             d.ad_body               || null,
        lead_form_id:        d.lead_form_id          || null,
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
        `/${boost.meta_campaign_id}/insights?fields=impressions,reach,clicks,spend,cpm,cpc,ctr,frequency&date_preset=maximum`,
        token
      ) as any;

      if (!insights.error && insights.data?.[0]) {
        const m = insights.data[0];
        await supabaseAdmin
          .from('campaign_boosts')
          .update({
            impressions:     parseInt(m.impressions    || '0'),
            reach:           parseInt(m.reach          || '0'),
            clicks:          parseInt(m.clicks         || '0'),
            spend_recorded:  parseFloat(m.spend        || '0'),
            updated_at:      new Date().toISOString(),
          })
          .eq('id', req.params.id);
      }
    }

    const { data: updated } = await supabaseAdmin
      .from('campaign_boosts').select('*').eq('id', req.params.id).eq('workspace_id', workspaceId).single();

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
      .select('id, budget_total, budget_daily, budget_currency, spend_recorded, kpi_reach, kpi_engagement, kpi_conversions, meta_campaign_id, selected_meta_account_id')
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // ── Try to pull live numbers from Meta ────────────────────────
    let metaLive: { impressions: number; reach: number; clicks: number; spend: number } | null = null;
    const { meta_campaign_id, selected_meta_account_id } = campaign as any;

    if (meta_campaign_id && selected_meta_account_id) {
      try {
        const { data: account } = await supabaseAdmin
          .from('connected_accounts')
          .select('access_token')
          .eq('id', selected_meta_account_id)
          .single();

        const token = (account as any)?.access_token as string | undefined;
        if (token) {
          const raw = await metaGet(
            `/${meta_campaign_id}/insights?fields=impressions,reach,clicks,spend,cpm,cpc,ctr,frequency,unique_clicks,cost_per_unique_click,purchase_roas,cost_per_action_type,actions,outbound_clicks,website_ctr,quality_ranking,engagement_rate_ranking,conversion_rate_ranking&date_preset=maximum&level=campaign`,
            token,
          ) as any;

          if (!raw.error && raw.data?.[0]) {
            const m = raw.data[0];

            let roas: number | null = null;
            if (Array.isArray(m.purchase_roas) && m.purchase_roas.length > 0) {
              const rv = m.purchase_roas.find((x: any) => x.action_type === 'omni_purchase') || m.purchase_roas[0];
              roas = rv ? parseFloat(rv.value) : null;
            }

            // Parse cost_per_action_type into a lookup map
            const costActArr = (Array.isArray(m.cost_per_action_type) ? m.cost_per_action_type : []) as { action_type: string; value: string }[];
            const costActMap: Record<string, number> = {};
            for (const a of costActArr) costActMap[a.action_type] = parseFloat(a.value) || 0;

            const cpp: number | null = costActMap['omni_purchase'] || costActMap['purchase'] || null;

            // Parse actions array into a lookup map
            const actionsArr = (Array.isArray(m.actions) ? m.actions : []) as { action_type: string; value: string }[];
            const actionMap: Record<string, number> = {};
            for (const a of actionsArr) actionMap[a.action_type] = parseFloat(a.value) || 0;

            const conversions = {
              purchases:     actionMap['offsite_conversion.fb_pixel_purchase']              || 0,
              leads:         actionMap['offsite_conversion.fb_pixel_lead']                  || 0,
              add_to_cart:   actionMap['offsite_conversion.fb_pixel_add_to_cart']           || 0,
              checkout:      actionMap['offsite_conversion.fb_pixel_initiate_checkout']     || 0,
              registrations: actionMap['offsite_conversion.fb_pixel_complete_registration'] || 0,
              video_views:   actionMap['video_view']                                        || 0,
              post_engagements: actionMap['post_engagement']                                || 0,
              cost_per_purchase:    (costActMap['offsite_conversion.fb_pixel_purchase']  || null) as number | null,
              cost_per_lead:        (costActMap['offsite_conversion.fb_pixel_lead']       || null) as number | null,
              cost_per_add_to_cart: (costActMap['offsite_conversion.fb_pixel_add_to_cart']|| null) as number | null,
            };

            // outbound_clicks is an array like [{action_type:"outbound_click",value:"5"}]
            const outClArr = (Array.isArray(m.outbound_clicks) ? m.outbound_clicks : []) as { action_type: string; value: string }[];
            const outbound_clicks = outClArr.length > 0 ? parseInt(outClArr[0].value || '0') : null;

            // website_ctr is also an array
            const webCtrArr = (Array.isArray(m.website_ctr) ? m.website_ctr : []) as { action_type: string; value: string }[];
            const website_ctr = webCtrArr.length > 0 ? parseFloat(webCtrArr[0].value || '0') : null;

            metaLive = {
              impressions:           parseInt(m.impressions           || '0'),
              reach:                 parseInt(m.reach                 || '0'),
              clicks:                parseInt(m.clicks                || '0'),
              spend:                 parseFloat(m.spend               || '0'),
              cpm_live:              parseFloat(m.cpm                 || '0'),
              cpc_live:              parseFloat(m.cpc                 || '0'),
              ctr_live:              parseFloat(m.ctr                 || '0'),
              frequency:             parseFloat(m.frequency           || '0'),
              unique_clicks:         parseInt(m.unique_clicks         || '0'),
              cost_per_unique_click: parseFloat(m.cost_per_unique_click || '0'),
              quality_ranking:         (m.quality_ranking         && m.quality_ranking         !== 'UNKNOWN') ? m.quality_ranking         : null,
              engagement_rate_ranking: (m.engagement_rate_ranking && m.engagement_rate_ranking !== 'UNKNOWN') ? m.engagement_rate_ranking : null,
              conversion_rate_ranking: (m.conversion_rate_ranking && m.conversion_rate_ranking !== 'UNKNOWN') ? m.conversion_rate_ranking : null,
              roas,
              cpp,
              conversions,
              outbound_clicks,
              website_ctr,
            } as any;
            // Write-back so local DB stays fresh for list page
            const liveSnap = metaLive!;
            await Promise.allSettled([
              supabaseAdmin
                .from('campaigns')
                .update({ spend_recorded: liveSnap.spend, updated_at: new Date().toISOString() })
                .eq('id', campaignId),
              // Also sync into campaign_boosts so listCampaigns can aggregate
              supabaseAdmin
                .from('campaign_boosts')
                .update({
                  impressions:    liveSnap.impressions,
                  reach:          liveSnap.reach,
                  clicks:         liveSnap.clicks,
                  spend_recorded: liveSnap.spend,
                  updated_at:     new Date().toISOString(),
                })
                .eq('campaign_id', campaignId)
                .eq('workspace_id', workspaceId),
            ]);
          }
        }
      } catch {
        logger.warn('[Insights] Meta live fetch failed, falling back to DB');
      }
    }

    const { data: boostRows } = await supabaseAdmin
      .from('campaign_boosts')
      .select('platform, status, objective, impressions, reach, clicks, spend_recorded')
      .eq('campaign_id', campaignId)
      .eq('workspace_id', workspaceId);

    const blist = boostRows || [];

    // Prefer Meta live data when available; otherwise sum from local boost rows
    const dbTotals = blist.reduce(
      (acc, b) => ({
        impressions: acc.impressions + (b.impressions || 0),
        reach:       acc.reach       + (b.reach       || 0),
        clicks:      acc.clicks      + (b.clicks      || 0),
        spend:       acc.spend       + parseFloat(String(b.spend_recorded || 0)),
      }),
      { impressions: 0, reach: 0, clicks: 0, spend: 0 }
    );

    const totals = metaLive ?? dbTotals;

    // Prefer Meta-computed KPIs when available (more accurate), otherwise derive
    const ctr  = (metaLive as any)?.ctr_live  ?? (totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0);
    const cpm  = (metaLive as any)?.cpm_live  ?? (totals.impressions > 0 ? Math.round((totals.spend / totals.impressions) * 100000) / 100 : 0);
    const cpc  = (metaLive as any)?.cpc_live  ?? (totals.clicks > 0 ? Math.round((totals.spend / totals.clicks) * 100) / 100 : 0);
    const roas = (metaLive as any)?.roas ?? null;
    const cpp  = (metaLive as any)?.cpp  ?? null;
    const frequency             = (metaLive as any)?.frequency             ?? null;
    const unique_clicks         = (metaLive as any)?.unique_clicks         ?? null;
    const cost_per_unique_click = (metaLive as any)?.cost_per_unique_click ?? null;
    const toRanking = (v: unknown) => (v && v !== 'UNKNOWN' ? String(v) : null);
    const quality_ranking             = toRanking((metaLive as any)?.quality_ranking);
    const engagement_rate_ranking     = toRanking((metaLive as any)?.engagement_rate_ranking);
    const conversion_rate_ranking     = toRanking((metaLive as any)?.conversion_rate_ranking);
    const conversions                 = (metaLive as any)?.conversions     ?? null;
    const outbound_clicks             = (metaLive as any)?.outbound_clicks ?? null;
    const website_ctr                 = (metaLive as any)?.website_ctr     ?? null;

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

    // When live Meta data is available, use it directly — don't add spend_recorded (it was written from the same Meta data)
    const spendTotal   = metaLive ? (metaLive as any).spend : (totals.spend + parseFloat(String(campaign.spend_recorded || 0)));
    const budgetTotal  = parseFloat(String(campaign.budget_total || 0));
    const utilization  = budgetTotal > 0 ? Math.round((spendTotal / budgetTotal) * 100) : null;

    res.json({
      success: true,
      data: {
        totals,
        kpis:        { ctr, cpm, cpc, roas, cpp, frequency, unique_clicks, cost_per_unique_click, outbound_clicks, website_ctr, conversions, quality_ranking, engagement_rate_ranking, conversion_rate_ranking },
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

// ── GET /api/v1/campaigns/:id/insights/breakdown ─────────────
// Fetches age/gender and placement breakdowns live from Meta Insights API.
// Falls back to empty arrays if the campaign has no meta_adset_id yet.

export const getCampaignBreakdownInsights = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('meta_adset_id, selected_meta_account_id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { meta_adset_id, selected_meta_account_id } = campaign as any;

    if (!meta_adset_id || !selected_meta_account_id) {
      return res.json({ success: true, data: { by_age_gender: [], by_placement: [] } });
    }

    // Resolve access token for this ad account
    const { data: account } = await supabaseAdmin
      .from('connected_accounts')
      .select('access_token')
      .eq('id', selected_meta_account_id)
      .single();

    if (!account?.access_token) {
      return res.json({ success: true, data: { by_age_gender: [], by_placement: [] } });
    }

    const token = (account as any).access_token as string;
    const ageFields       = 'impressions,reach,clicks,spend,ctr,cpc,frequency';
    const placementFields = 'impressions,reach,clicks,spend,ctr,cpc';
    const positionFields  = 'impressions,reach,clicks,spend,ctr,cpc';

    // Fetch all three breakdowns concurrently
    const [ageRes, placementRes, positionRes] = await Promise.allSettled([
      metaGet(
        `/${meta_adset_id}/insights?fields=${ageFields}&breakdowns=age,gender&date_preset=maximum&level=adset`,
        token,
      ),
      metaGet(
        `/${meta_adset_id}/insights?fields=${placementFields}&breakdowns=publisher_platform,impression_device&date_preset=maximum&level=adset`,
        token,
      ),
      metaGet(
        `/${meta_adset_id}/insights?fields=${positionFields}&breakdowns=publisher_platform,platform_position&date_preset=maximum&level=adset`,
        token,
      ),
    ]);

    const ageData      = ageRes.status      === 'fulfilled' ? ((ageRes.value      as any).data || []) : [];
    const placementData = placementRes.status === 'fulfilled' ? ((placementRes.value as any).data || []) : [];
    const positionData  = positionRes.status  === 'fulfilled' ? ((positionRes.value  as any).data || []) : [];

    const parse = (rows: any[]) => rows.map((r: any) => ({
      ...r,
      impressions: Number(r.impressions   || 0),
      reach:       Number(r.reach         || 0),
      clicks:      Number(r.clicks        || 0),
      spend:       parseFloat(r.spend     || '0'),
      ctr:         parseFloat(r.ctr       || '0'),
      cpc:         parseFloat(r.cpc       || '0'),
      frequency:   parseFloat(r.frequency || '0'),
    }));

    res.json({
      success: true,
      data: {
        by_age_gender: parse(ageData),
        by_placement:  parse(placementData),
        by_position:   parse(positionData),
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/v1/campaigns/:id/insights/trend ──────────────────
// Returns daily spend/impressions/clicks for last 30 days from Meta.
// Used for the spend trend chart in the Overview tab.

export const getCampaignTrend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('meta_campaign_id, selected_meta_account_id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { meta_campaign_id, selected_meta_account_id } = campaign as any;
    if (!meta_campaign_id || !selected_meta_account_id) {
      return res.json({ success: true, data: { by_day: [] } });
    }

    const { data: account } = await supabaseAdmin
      .from('connected_accounts')
      .select('access_token')
      .eq('id', selected_meta_account_id)
      .single();

    const token = (account as any)?.access_token as string | undefined;
    if (!token) return res.json({ success: true, data: { by_day: [] } });

    const raw = await metaGet(
      `/${meta_campaign_id}/insights?fields=spend,impressions,clicks,reach,ctr,cpm,cpc&time_increment=1&date_preset=maximum&level=campaign`,
      token,
    ) as any;

    if (raw.error) {
      logger.warn({ err: raw.error.message }, '[CampaignTrend] Meta error');
      return res.json({ success: true, data: { by_day: [], meta_error: raw.error.message } });
    }

    const by_day = ((raw.data || []) as any[]).map((d: any) => ({
      date:        d.date_start || null,
      spend:       parseFloat(d.spend       || '0'),
      impressions: parseInt(d.impressions   || '0'),
      clicks:      parseInt(d.clicks        || '0'),
      reach:       parseInt(d.reach         || '0'),
      ctr:         parseFloat(d.ctr         || '0'),
      cpm:         parseFloat(d.cpm         || '0'),
      cpc:         parseFloat(d.cpc         || '0'),
    }));

    return res.json({ success: true, data: { by_day } });
  } catch (err) { next(err); }
};

// ── GET /api/v1/campaigns/:id/insights/ads ────────────────────
// Returns per-ad metrics directly from Meta at the ad level.
// Used for the Ads tab CPM/CPC/CTR columns.

export const getCampaignAdInsights = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('meta_campaign_id, meta_adset_id, meta_ad_id, selected_meta_account_id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { meta_campaign_id, selected_meta_account_id } = campaign as any;
    if (!meta_campaign_id || !selected_meta_account_id) {
      return res.json({ success: true, data: { ads: [] } });
    }

    const { data: account } = await supabaseAdmin
      .from('connected_accounts')
      .select('access_token')
      .eq('id', selected_meta_account_id)
      .single();

    const token = (account as any)?.access_token as string | undefined;
    if (!token) return res.json({ success: true, data: { ads: [] } });

    // Fetch ad-level insights from Meta under the campaign
    const raw = await metaGet(
      `/${meta_campaign_id}/insights?fields=ad_id,ad_name,impressions,reach,clicks,spend,cpm,cpc,ctr,frequency,unique_clicks,cost_per_unique_click,outbound_clicks,actions,cost_per_action_type&date_preset=maximum&level=ad`,
      token,
    ) as any;

    if (raw.error) {
      logger.warn({ err: raw.error.message }, '[AdInsights] Meta error');
      return res.json({ success: true, data: { ads: [], meta_error: raw.error.message } });
    }

    const ads = ((raw.data || []) as any[]).map((d: any) => {
      const aArr = (Array.isArray(d.actions) ? d.actions : []) as { action_type: string; value: string }[];
      const aMap: Record<string, number> = {};
      for (const a of aArr) aMap[a.action_type] = parseFloat(a.value) || 0;

      const cpArr = (Array.isArray(d.cost_per_action_type) ? d.cost_per_action_type : []) as { action_type: string; value: string }[];
      const cpMap: Record<string, number> = {};
      for (const a of cpArr) cpMap[a.action_type] = parseFloat(a.value) || 0;

      return {
        meta_ad_id:            d.ad_id   || null,
        ad_name:               d.ad_name || null,
        impressions:           parseInt(d.impressions           || '0'),
        reach:                 parseInt(d.reach                 || '0'),
        clicks:                parseInt(d.clicks                || '0'),
        spend:                 parseFloat(d.spend               || '0'),
        cpm:                   parseFloat(d.cpm                 || '0'),
        cpc:                   parseFloat(d.cpc                 || '0'),
        ctr:                   parseFloat(d.ctr                 || '0'),
        frequency:             parseFloat(d.frequency           || '0'),
        unique_clicks:         parseInt(d.unique_clicks         || '0'),
        cost_per_unique_click: parseFloat(d.cost_per_unique_click || '0'),
        outbound_clicks:       Array.isArray(d.outbound_clicks) && d.outbound_clicks.length > 0 ? parseInt(d.outbound_clicks[0].value || '0') : 0,
        purchases:             aMap['offsite_conversion.fb_pixel_purchase'] || 0,
        leads:                 aMap['offsite_conversion.fb_pixel_lead']     || 0,
        add_to_cart:           aMap['offsite_conversion.fb_pixel_add_to_cart'] || 0,
        video_views:           aMap['video_view'] || 0,
        cost_per_purchase:     cpMap['offsite_conversion.fb_pixel_purchase']  || null,
        cost_per_lead:         cpMap['offsite_conversion.fb_pixel_lead']       || null,
      };
    });

    return res.json({ success: true, data: { ads } });
  } catch (err) { next(err); }
};

// ── PATCH /api/v1/campaigns/:id/budget-meta ───────────────────
// Pushes a budget change directly to the live Meta ad set without republishing.

export const syncBudgetToMeta = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { budget_type, amount } = req.body as { budget_type: 'daily' | 'lifetime'; amount: number };
    if (!budget_type || !amount || amount <= 0) {
      return res.status(400).json({ error: 'budget_type (daily|lifetime) and amount (> 0) are required' });
    }

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('meta_adset_id, selected_meta_account_id, budget_currency')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { meta_adset_id, selected_meta_account_id, budget_currency } = campaign as any;

    if (!meta_adset_id) {
      return res.status(400).json({ error: 'Campaign is not published to Meta yet — publish first, then sync budget' });
    }

    const { data: account } = await supabaseAdmin
      .from('connected_accounts')
      .select('access_token')
      .eq('id', selected_meta_account_id)
      .single();

    if (!account?.access_token) {
      return res.status(400).json({ error: 'Meta account token not found — please reconnect' });
    }

    const token = (account as any).access_token as string;

    // Meta budget is in minor currency units (cents for USD)
    const majorToMinor: Record<string, number> = { USD: 100, EUR: 100, GBP: 100, INR: 100, AED: 100 };
    const multiplier = majorToMinor[budget_currency] ?? 100;
    const minorAmount = Math.round(amount * multiplier);

    const budgetField = budget_type === 'daily' ? 'daily_budget' : 'lifetime_budget';

    const metaRes = await metaPost(`/${meta_adset_id}`, token, { [budgetField]: minorAmount });
    if ((metaRes as any).error) {
      return res.status(400).json({ error: `Meta API error: ${(metaRes as any).error.message}` });
    }

    // Mirror to local DB
    const dbField = budget_type === 'daily' ? 'budget_daily' : 'budget_total';
    await supabaseAdmin
      .from('campaigns')
      .update({ [dbField]: amount, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    logger.info(`[Campaigns] Budget synced to Meta — adset ${meta_adset_id}: ${budgetField}=${minorAmount}`);
    res.json({ success: true, message: `Budget updated to ${budget_currency} ${amount} on Meta` });
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
