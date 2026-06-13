 
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { resolveAgencyAccount } from './agencyAccountResolver';

const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v20';

// ── Token refresh ─────────────────────────────────────────────

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     env.GOOGLE_ADS_CLIENT_ID     || env.YOUTUBE_CLIENT_ID     || '',
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET || env.YOUTUBE_CLIENT_SECRET || '',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  return data.access_token as string;
}

// ── Core API request helper ───────────────────────────────────

async function gadsRequest(
  path: string,
  method: string,
  accessToken: string,
  body?: unknown,
): Promise<unknown> {
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!devToken) throw new Error('Google Ads developer token not configured');

  const headers: Record<string, string> = {
    'Authorization':   `Bearer ${accessToken}`,
    'developer-token': devToken,
    'Content-Type':    'application/json',
  };

  // MCC login-customer-id — required for sub-account operations
  const loginCustomerId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');

  const res = await fetch(`${GOOGLE_ADS_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = (data as any)?.error?.message || JSON.stringify(data);
    throw new Error(`Google Ads API error: ${msg}`);
  }
  return data;
}

function noDevToken(res: Response) {
  return res.status(503).json({
    error: 'Google Ads not configured',
    hint:  'GOOGLE_ADS_DEVELOPER_TOKEN is not set. Add it to backend .env.',
  });
}

// ── Image asset upload helper ─────────────────────────────────

async function uploadGoogleImageAsset(
  customerId: string,
  imageUrl: string,
  accessToken: string,
  assetName: string,
): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to fetch image for Google Ads asset: ${imageUrl}`);
  const buffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  const assetRes = await gadsRequest(
    `/customers/${customerId}/assets:mutate`,
    'POST', accessToken,
    { operations: [{ create: { name: assetName, type: 'IMAGE', image_asset: { data: base64 } } }] },
  ) as any;

  const resourceName = assetRes?.results?.[0]?.resourceName;
  if (!resourceName) throw new Error('Failed to upload image asset to Google Ads');
  return resourceName;
}

// ── Bidding strategy builder ──────────────────────────────────

function buildBiddingStrategy(channelType: string, objective: string): Record<string, unknown> {
  if (channelType === 'SEARCH') {
    return { maximize_clicks: {} };
  }
  // DISPLAY
  switch (objective?.toUpperCase()) {
    case 'CONVERSIONS':      return { maximize_conversions: {} };
    case 'LEAD_GENERATION':  return { maximize_conversions: {} };
    case 'TRAFFIC':          return { maximize_clicks: {} };
    default:                 return { target_impression_share: { location: 'ANYWHERE_ON_PAGE', location_fraction_micros: 1_000_000 } };
  }
}

// ── GET accessible customers ──────────────────────────────────

export const getGoogleAdsCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
    if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) return noDevToken(res);

    const { connectedAccountId } = req.params;

    const { data: account, error: acctErr } = await supabaseAdmin
      .from('connected_accounts')
      .select('refresh_token')
      .eq('id', connectedAccountId)
      .eq('workspace_id', workspaceId)
      .single();

    if (acctErr || !account?.refresh_token) {
      return res.status(404).json({ error: 'Google Ads account not found or missing refresh token' });
    }

    const accessToken = await refreshGoogleToken(account.refresh_token);
    const data = await gadsRequest('/customers:listAccessibleCustomers', 'GET', accessToken) as any;

    const customers = (data.resourceNames || []).map((name: string) => ({
      id:   name.replace('customers/', ''),
      name: name,
    }));

    return res.json({ success: true, data: customers });
  } catch (error) { next(error); }
};

// ── Link Google Ads customer to connected account ─────────────

export const linkGoogleAdsCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

    const { connectedAccountId } = req.params;
    const { customer_id } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .update({ google_ads_customer_id: String(customer_id) })
      .eq('id', connectedAccountId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

// ── Create Google Ads boost ───────────────────────────────────
// Agency model: resolves the agency's default Google Ads account automatically.
// Caller only provides campaign intent (budget, dates, targeting, creative).

export const createGoogleBoost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
    if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) return noDevToken(res);

    const {
      campaign_id,
      publish_intent_id,
      boost_type           = 'DISPLAY_AD',
      google_campaign_type = 'DISPLAY',
      objective            = 'REACH',
      budget_daily,
      budget_total,
      budget_currency      = 'USD',
      start_at,
      end_at,
      targeting            = {},
      // Display creative
      ad_image_url,
      ad_square_image_url,
      headline,
      description,
      final_url,
      // Search creative (RSA)
      rsa_headlines    = [],
      rsa_descriptions = [],
      keywords         = [],
    } = req.body;

    if (!start_at || !end_at) return res.status(400).json({ error: 'start_at and end_at are required' });

    const isSearch  = (google_campaign_type as string).toUpperCase() === 'SEARCH';
    const channelType = isSearch ? 'SEARCH' : 'DISPLAY';

    if (isSearch) {
      const heads = Array.isArray(rsa_headlines)    ? rsa_headlines.filter(Boolean)    : [];
      const descs = Array.isArray(rsa_descriptions) ? rsa_descriptions.filter(Boolean) : [];
      if (heads.length < 3) return res.status(400).json({ error: 'Search ads require at least 3 headlines' });
      if (descs.length < 2) return res.status(400).json({ error: 'Search ads require at least 2 descriptions' });
      if (!final_url)        return res.status(400).json({ error: 'final_url is required for Search ads' });
    }

    // ── Resolve agency Google Ads account ─────────────────────
    const agencyAccount  = await resolveAgencyAccount(workspaceId, 'google');
    if (!agencyAccount.refresh_token) {
      return res.status(400).json({ error: 'Agency Google Ads account has no refresh token. Reconnect it in Admin → Ad Accounts.' });
    }

    const customerId  = agencyAccount.google_ads_customer_id;
    if (!customerId) {
      return res.status(400).json({ error: 'Agency Google Ads account has no customer ID. Configure it in Admin → Ad Accounts.' });
    }

    const accessToken = await refreshGoogleToken(agencyAccount.refresh_token);

    // Budget in micros (1 USD = 1,000,000 micros)
    const dailyBudgetMicros = budget_daily
      ? Math.round(budget_daily * 1_000_000)
      : budget_total
        ? Math.round((budget_total / 30) * 1_000_000)
        : 5_000_000;

    const fmtDate = (d: string) => d.slice(0, 10).replace(/-/g, '');

    let budgetResourceName: string | null = null;
    let campaignResourceName: string | null = null;

    try {
      // 1. Campaign Budget
      const budgetRes = await gadsRequest(
        `/customers/${customerId}/campaignBudgets:mutate`,
        'POST', accessToken,
        { operations: [{ create: { name: `ZV Budget ${Date.now()}`, amount_micros: dailyBudgetMicros, delivery_method: 'STANDARD' } }] },
      ) as any;
      budgetResourceName = budgetRes?.results?.[0]?.resourceName;
      if (!budgetResourceName) throw new Error('Failed to create Google Ads campaign budget');

      // 2. Campaign with bidding strategy
      const biddingStrategy = buildBiddingStrategy(channelType, objective);
      const campaignRes = await gadsRequest(
        `/customers/${customerId}/campaigns:mutate`,
        'POST', accessToken,
        {
          operations: [{
            create: {
              name:                     `ZoikoVertex-${channelType} ${campaign_id?.slice(0, 8) ?? ''} ${Date.now()}`,
              status:                   'ENABLED',
              advertising_channel_type: channelType,
              campaign_budget:          budgetResourceName,
              start_date:               fmtDate(start_at),
              end_date:                 fmtDate(end_at),
              ...biddingStrategy,
            },
          }],
        },
      ) as any;
      campaignResourceName = campaignRes?.results?.[0]?.resourceName;
      if (!campaignResourceName) throw new Error('Failed to create Google Ads campaign');

      const googleCampaignId = campaignResourceName.split('/').pop();

      // 3. Apply geo targeting at campaign level
      const countries = (targeting as any).countries;
      if (Array.isArray(countries) && countries.length > 0) {
        const COUNTRY_CRITERION_IDS: Record<string, number> = {
          US: 2840, GB: 2826, AE: 2784, SA: 2682, QA: 2634, KW: 2414,
          BH: 2048, OM: 2542, EG: 2818, JO: 2400, IN: 2356, DE: 2276,
          FR: 2250, AU: 2036, PK: 2586, NG: 2566, ZA: 2710, CA: 2124,
        };
        const locationOps = countries
          .filter((c: string) => COUNTRY_CRITERION_IDS[c])
          .map((c: string) => ({
            create: {
              campaign: campaignResourceName,
              location: { geo_target_constant: `geoTargetConstants/${COUNTRY_CRITERION_IDS[c]}` },
            },
          }));
        if (locationOps.length > 0) {
          await gadsRequest(`/customers/${customerId}/campaignCriteria:mutate`, 'POST', accessToken, { operations: locationOps })
            .catch(err => logger.warn({ err }, '[GoogleAds] Geo targeting failed (non-fatal)'));
        }
      }

      // 4. Ad Group
      const adGroupType = isSearch ? 'SEARCH_STANDARD' : 'DISPLAY_STANDARD';
      const adGroupRes = await gadsRequest(
        `/customers/${customerId}/adGroups:mutate`,
        'POST', accessToken,
        { operations: [{ create: { name: `ZV AdGroup ${Date.now()}`, campaign: campaignResourceName, status: 'ENABLED', type: adGroupType } }] },
      ) as any;
      const adGroupResourceName = adGroupRes?.results?.[0]?.resourceName;
      if (!adGroupResourceName) throw new Error('Failed to create Google Ads ad group');
      const googleAdGroupId = adGroupResourceName.split('/').pop();

      let googleAdId: string | null = null;

      if (isSearch) {
        // 5a. Search: add keywords + RSA
        const kws = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
        if (kws.length > 0) {
          await gadsRequest(
            `/customers/${customerId}/adGroupCriteria:mutate`,
            'POST', accessToken,
            { operations: kws.map((kw: string) => ({ create: { ad_group: adGroupResourceName, status: 'ENABLED', keyword: { text: kw, match_type: 'BROAD' } } })) },
          ).catch(err => logger.warn({ err }, '[GoogleAds] Keyword add failed (non-fatal)'));
        }

        const rsaHeads = (rsa_headlines as string[]).filter(Boolean).map((t: string) => ({ text: t.slice(0, 30) }));
        const rsaDescs = (rsa_descriptions as string[]).filter(Boolean).map((t: string) => ({ text: t.slice(0, 90) }));

        const adRes = await gadsRequest(
          `/customers/${customerId}/adGroupAds:mutate`,
          'POST', accessToken,
          { operations: [{ create: { ad_group: adGroupResourceName, status: 'ENABLED', ad: { final_urls: [final_url], responsive_search_ad: { headlines: rsaHeads, descriptions: rsaDescs } } } }] },
        ) as any;
        googleAdId = adRes?.results?.[0]?.resourceName?.split('/').pop() || null;

      } else {
        // 5b. Display: upload images + create Responsive Display Ad
        let marketingImages:       { asset: string }[] = [];
        let squareMarketingImages: { asset: string }[] = [];

        if (ad_image_url) {
          const r = await uploadGoogleImageAsset(customerId, ad_image_url, accessToken, `ZV-land-${Date.now()}`);
          marketingImages = [{ asset: r }];
        }
        if (ad_square_image_url) {
          const r = await uploadGoogleImageAsset(customerId, ad_square_image_url, accessToken, `ZV-sq-${Date.now()}`);
          squareMarketingImages = [{ asset: r }];
        }

        const adRes = await gadsRequest(
          `/customers/${customerId}/adGroupAds:mutate`,
          'POST', accessToken,
          {
            operations: [{
              create: {
                ad_group: adGroupResourceName,
                status:   'ENABLED',
                ad: {
                  final_urls: [final_url || 'https://zoikogroup.com'],
                  responsive_display_ad: {
                    headlines:               [{ text: (headline || 'Discover More').slice(0, 30) }, { text: 'Learn More Today' }],
                    descriptions:            [{ text: (description || 'ZoikoVertex Agency').slice(0, 90) }],
                    business_name:           'ZoikoVertex',
                    long_headline:           { text: (headline || 'Powered by ZoikoVertex Agency').slice(0, 90) },
                    marketing_images:        marketingImages,
                    square_marketing_images: squareMarketingImages,
                  },
                },
              },
            }],
          },
        ) as any;
        googleAdId = adRes?.results?.[0]?.resourceName?.split('/').pop() || null;
      }

      // 6. Persist boost record
      const resolvedBoostType = isSearch ? 'SEARCH_AD' : (boost_type || 'DISPLAY_AD');
      const { data: boost, error: boostErr } = await supabaseAdmin
        .from('campaign_boosts')
        .insert({
          workspace_id:             workspaceId,
          campaign_id:              campaign_id         || null,
          publish_intent_id:        publish_intent_id   || null,
          connected_account_id:     agencyAccount.id,
          platform:                 'google',
          boost_type:               resolvedBoostType,
          objective,
          status:                   'ACTIVE',
          budget_daily:             budget_daily        || null,
          budget_total:             budget_total        || null,
          budget_currency,
          start_at,
          end_at,
          targeting,
          google_campaign_id:       googleCampaignId,
          google_adgroup_id:        googleAdGroupId,
          google_ad_id:             googleAdId,
          google_customer_id:       customerId,
          advertising_channel_type: channelType,
          ad_image_url:             ad_image_url        || null,
          ad_square_image_url:      ad_square_image_url || null,
          ad_headline:              headline            || null,
          impressions: 0, reach: 0, clicks: 0, spend_recorded: 0,
        })
        .select()
        .single();

      if (boostErr) throw boostErr;

      logger.info(`[GoogleAds] ${channelType} boost created — workspace ${workspaceId}, campaign ${googleCampaignId}`);
      return res.status(201).json({ success: true, data: boost });

    } catch (err: any) {
      // Rollback: remove campaign from Google Ads if partially created
      if (campaignResourceName) {
        const { data: acc } = await supabaseAdmin
          .from('connected_accounts')
          .select('refresh_token')
          .eq('id', agencyAccount.id)
          .single();
        if (acc?.refresh_token) {
          const at = await refreshGoogleToken(acc.refresh_token).catch(() => null);
          if (at) {
            await gadsRequest(
              `/customers/${customerId}/campaigns:mutate`, 'POST', at,
              { operations: [{ remove: campaignResourceName }] },
            ).catch(e => logger.warn({ e }, '[GoogleAds] Rollback failed'));
          }
        }
      }
      throw err;
    }

  } catch (error: any) {
    next(error);
  }
};

// ── Sync Google Ads metrics ───────────────────────────────────

export const syncGoogleBoostMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
    if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) return noDevToken(res);

    const { id } = req.params;

    const { data: boost, error: boostErr } = await supabaseAdmin
      .from('campaign_boosts')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (boostErr || !boost) return res.status(404).json({ error: 'Boost not found' });
    if ((boost as any).platform !== 'google') return res.status(400).json({ error: 'Not a Google Ads boost' });
    if (!boost.google_campaign_id)            return res.status(400).json({ error: 'No Google campaign ID on this boost' });

    // Resolve refresh token from agency account
    const agencyAccount = await resolveAgencyAccount(workspaceId, 'google');
    const customerId    = boost.google_customer_id || agencyAccount.google_ads_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No Google customer ID' });

    const accessToken = await refreshGoogleToken(agencyAccount.refresh_token!);

    const query = `SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE campaign.id = ${boost.google_campaign_id} AND segments.date DURING ALL_TIME`.trim();

    const gaqlRes = await gadsRequest(`/customers/${customerId}/googleAds:searchStream`, 'POST', accessToken, { query }) as any;

    let impressions = 0, clicks = 0, costMicros = 0;
    const chunks = Array.isArray(gaqlRes) ? gaqlRes : [gaqlRes];
    for (const chunk of chunks) {
      for (const row of (chunk.results || [])) {
        impressions += Number(row.metrics?.impressions || 0);
        clicks      += Number(row.metrics?.clicks      || 0);
        costMicros  += Number(row.metrics?.cost_micros || 0);
      }
    }

    const spendUsd = costMicros / 1_000_000;
    await supabaseAdmin.from('campaign_boosts')
      .update({ impressions, reach: impressions, clicks, spend_recorded: spendUsd })
      .eq('id', id);

    return res.json({ success: true, data: { impressions, clicks, spend_recorded: spendUsd } });
  } catch (error) { next(error); }
};

// ── Pause / Resume / Cancel via campaign status mutation ──────

async function mutateGoogleCampaignStatus(
  req: AuthRequest, res: Response, next: NextFunction,
  googleStatus: 'PAUSED' | 'ENABLED' | 'REMOVED',
  dbStatus: 'PAUSED' | 'ACTIVE' | 'CANCELLED',
) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
    if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) return noDevToken(res);

    const { id } = req.params;

    const { data: boost, error: boostErr } = await supabaseAdmin
      .from('campaign_boosts')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (boostErr || !boost) return res.status(404).json({ error: 'Boost not found' });
    if ((boost as any).platform !== 'google') return res.status(400).json({ error: 'Not a Google Ads boost' });

    const agencyAccount = await resolveAgencyAccount(workspaceId, 'google');
    const customerId    = boost.google_customer_id || agencyAccount.google_ads_customer_id;
    const accessToken   = await refreshGoogleToken(agencyAccount.refresh_token!);

    await gadsRequest(
      `/customers/${customerId}/campaigns:mutate`, 'POST', accessToken,
      { operations: [{ update: { resource_name: `customers/${customerId}/campaigns/${boost.google_campaign_id}`, status: googleStatus }, update_mask: { paths: ['status'] } }] },
    );

    await supabaseAdmin.from('campaign_boosts').update({ status: dbStatus }).eq('id', id);
    return res.json({ success: true });
  } catch (error) { next(error); }
}

export const pauseGoogleBoost  = (req: AuthRequest, res: Response, next: NextFunction) => mutateGoogleCampaignStatus(req, res, next, 'PAUSED',   'PAUSED');
export const resumeGoogleBoost = (req: AuthRequest, res: Response, next: NextFunction) => mutateGoogleCampaignStatus(req, res, next, 'ENABLED',  'ACTIVE');
export const cancelGoogleBoost = (req: AuthRequest, res: Response, next: NextFunction) => mutateGoogleCampaignStatus(req, res, next, 'REMOVED',  'CANCELLED');

