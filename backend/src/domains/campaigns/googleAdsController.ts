/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v17';

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

async function gadsRequest(
  path: string,
  method: string,
  accessToken: string,
  body?: unknown,
): Promise<unknown> {
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!devToken) throw new Error('Google Ads developer token not configured');

  const res = await fetch(`${GOOGLE_ADS_BASE}${path}`, {
    method,
    headers: {
      'Authorization':   `Bearer ${accessToken}`,
      'developer-token': devToken,
      'Content-Type':    'application/json',
    },
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
    hint:  'GOOGLE_ADS_DEVELOPER_TOKEN is not set. Add your developer token to the backend .env to enable Google Ads.',
  });
}

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
  } catch (error) {
    next(error);
  }
};

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
  } catch (error) {
    next(error);
  }
};

export const createGoogleBoost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
    if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) return noDevToken(res);

    const {
      connected_account_id,
      campaign_id,
      publish_intent_id,
      boost_type = 'CAMPAIGN',
      objective  = 'REACH',
      budget_daily,
      budget_total,
      budget_currency = 'USD',
      start_at,
      end_at,
      targeting = {},
      headline,
      description,
      final_url,
    } = req.body;

    if (!connected_account_id) return res.status(400).json({ error: 'connected_account_id is required' });
    if (!start_at || !end_at)  return res.status(400).json({ error: 'start_at and end_at are required' });

    const { data: account, error: acctErr } = await supabaseAdmin
      .from('connected_accounts')
      .select('refresh_token, google_ads_customer_id')
      .eq('id', connected_account_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (acctErr || !account?.refresh_token) {
      return res.status(404).json({ error: 'Google Ads connected account not found' });
    }
    if (!account.google_ads_customer_id) {
      return res.status(400).json({ error: 'No Google Ads customer linked. Call link-customer first.' });
    }

    const customerId  = account.google_ads_customer_id;
    const accessToken = await refreshGoogleToken(account.refresh_token);

    // Budget in micros: 1 USD = 1,000,000 micros
    const dailyBudgetMicros = budget_daily
      ? Math.round(budget_daily * 1_000_000)
      : budget_total
        ? Math.round((budget_total / 30) * 1_000_000)
        : 5_000_000;

    // 1. Create Campaign Budget
    const budgetRes = await gadsRequest(
      `/customers/${customerId}/campaignBudgets:mutate`,
      'POST', accessToken,
      {
        operations: [{
          create: {
            name:            `ZV Budget ${Date.now()}`,
            amount_micros:   dailyBudgetMicros,
            delivery_method: 'STANDARD',
          },
        }],
      }
    ) as any;

    const budgetResourceName = budgetRes?.results?.[0]?.resourceName;
    if (!budgetResourceName) throw new Error('Failed to create Google Ads campaign budget');

    // Format dates as YYYYMMDD (Google Ads requirement)
    const fmtDate = (d: string) => d.replace(/-/g, '');

    // 2. Create Campaign
    const campaignRes = await gadsRequest(
      `/customers/${customerId}/campaigns:mutate`,
      'POST', accessToken,
      {
        operations: [{
          create: {
            name:                     `ZoikoVertex ${campaign_id?.slice(0, 8) ?? ''} ${Date.now()}`,
            status:                   'ENABLED',
            advertising_channel_type: 'DISPLAY',
            campaign_budget:          budgetResourceName,
            start_date:               fmtDate(start_at),
            end_date:                 fmtDate(end_at),
          },
        }],
      }
    ) as any;

    const campaignResourceName = campaignRes?.results?.[0]?.resourceName;
    if (!campaignResourceName) throw new Error('Failed to create Google Ads campaign');

    const googleCampaignId = campaignResourceName.split('/').pop();

    // 3. Create Ad Group
    const adGroupRes = await gadsRequest(
      `/customers/${customerId}/adGroups:mutate`,
      'POST', accessToken,
      {
        operations: [{
          create: {
            name:           `ZV AdGroup ${Date.now()}`,
            campaign:       campaignResourceName,
            status:         'ENABLED',
            type:           'DISPLAY_STANDARD',
            cpc_bid_micros: 1_000_000,
          },
        }],
      }
    ) as any;

    const adGroupResourceName = adGroupRes?.results?.[0]?.resourceName;
    if (!adGroupResourceName) throw new Error('Failed to create Google Ads ad group');

    const googleAdGroupId = adGroupResourceName.split('/').pop();

    // 4. Create Responsive Display Ad
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
                headlines:         [{ text: headline || 'Discover More' }, { text: 'Explore Now' }],
                descriptions:      [{ text: description || 'Amplified by ZoikoVertex' }],
                business_name:     'ZoikoVertex',
                long_headline:     { text: headline || 'Discover More with ZoikoVertex' },
                marketing_images:        [],
                square_marketing_images: [],
              },
            },
          },
        }],
      }
    ) as any;

    const adResourceName = adRes?.results?.[0]?.resourceName;
    const googleAdId = adResourceName?.split('/').pop() || null;

    // 5. Persist boost record
    const { data: boost, error: boostErr } = await supabaseAdmin
      .from('campaign_boosts')
      .insert({
        workspace_id:         workspaceId,
        campaign_id:          campaign_id          || null,
        publish_intent_id:    publish_intent_id    || null,
        connected_account_id,
        platform:             'google',
        boost_type,
        objective,
        status:               'ACTIVE',
        budget_daily:         budget_daily   || null,
        budget_total:         budget_total   || null,
        budget_currency,
        start_at,
        end_at,
        targeting,
        google_campaign_id:   googleCampaignId,
        google_adgroup_id:    googleAdGroupId,
        google_ad_id:         googleAdId,
        impressions:          0,
        reach:                0,
        clicks:               0,
        spend_recorded:       0,
      })
      .select()
      .single();

    if (boostErr) throw boostErr;

    logger.info(`[GoogleAds] Boost created for workspace ${workspaceId}, campaign ${googleCampaignId}`);
    return res.status(201).json({ success: true, data: boost });

  } catch (error) {
    next(error);
  }
};

export const syncGoogleBoostMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
    if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) return noDevToken(res);

    const { id } = req.params;

    const { data: boost, error: boostErr } = await supabaseAdmin
      .from('campaign_boosts')
      .select('*, connected_accounts(refresh_token, google_ads_customer_id)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (boostErr || !boost) return res.status(404).json({ error: 'Boost not found' });
    if (boost.platform !== 'google') return res.status(400).json({ error: 'Not a Google Ads boost' });
    if (!boost.google_campaign_id) return res.status(400).json({ error: 'No Google campaign ID on this boost' });

    const account = Array.isArray(boost.connected_accounts)
      ? boost.connected_accounts[0]
      : boost.connected_accounts;

    if (!account?.refresh_token || !account?.google_ads_customer_id) {
      return res.status(400).json({ error: 'Google Ads account not configured' });
    }

    const accessToken = await refreshGoogleToken(account.refresh_token);
    const customerId  = account.google_ads_customer_id;

    const query = `
      SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros
      FROM campaign
      WHERE campaign.id = ${boost.google_campaign_id}
      AND segments.date DURING ALL_TIME
    `.trim();

    const gaqlRes = await gadsRequest(
      `/customers/${customerId}/googleAds:searchStream`,
      'POST', accessToken,
      { query }
    ) as any;

    let impressions = 0, clicks = 0, costMicros = 0;
    const chunks = Array.isArray(gaqlRes) ? gaqlRes : [gaqlRes];
    for (const chunk of chunks) {
      for (const row of (chunk.results || [])) {
        impressions += Number(row.metrics?.impressions  || 0);
        clicks      += Number(row.metrics?.clicks       || 0);
        costMicros  += Number(row.metrics?.cost_micros  || 0);
      }
    }

    const spendUsd = costMicros / 1_000_000;

    await supabaseAdmin
      .from('campaign_boosts')
      .update({ impressions, reach: impressions, clicks, spend_recorded: spendUsd })
      .eq('id', id);

    return res.json({ success: true, data: { impressions, clicks, spend_recorded: spendUsd } });
  } catch (error) {
    next(error);
  }
};

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
      .select('*, connected_accounts(refresh_token, google_ads_customer_id)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (boostErr || !boost) return res.status(404).json({ error: 'Boost not found' });
    if (boost.platform !== 'google') return res.status(400).json({ error: 'Not a Google Ads boost' });

    const account = Array.isArray(boost.connected_accounts)
      ? boost.connected_accounts[0]
      : boost.connected_accounts;

    if (!account?.refresh_token || !account?.google_ads_customer_id) {
      return res.status(400).json({ error: 'Google Ads account not configured' });
    }

    const accessToken = await refreshGoogleToken(account.refresh_token);
    const customerId  = account.google_ads_customer_id;

    await gadsRequest(
      `/customers/${customerId}/campaigns:mutate`,
      'POST', accessToken,
      {
        operations: [{
          update: {
            resource_name: `customers/${customerId}/campaigns/${boost.google_campaign_id}`,
            status:        googleStatus,
          },
          update_mask: { paths: ['status'] },
        }],
      }
    );

    await supabaseAdmin.from('campaign_boosts').update({ status: dbStatus }).eq('id', id);

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export const pauseGoogleBoost  = (req: AuthRequest, res: Response, next: NextFunction) =>
  mutateGoogleCampaignStatus(req, res, next, 'PAUSED',   'PAUSED');

export const resumeGoogleBoost = (req: AuthRequest, res: Response, next: NextFunction) =>
  mutateGoogleCampaignStatus(req, res, next, 'ENABLED',  'ACTIVE');

export const cancelGoogleBoost = (req: AuthRequest, res: Response, next: NextFunction) =>
  mutateGoogleCampaignStatus(req, res, next, 'REMOVED',  'CANCELLED');
