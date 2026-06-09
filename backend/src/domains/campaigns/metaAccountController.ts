import { Response } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

const META_GRAPH = 'https://graph.facebook.com/v18.0';

// ── GET /api/v1/campaigns/meta/accounts ──────────────────────────────────────
// Lists client's connected Facebook/Instagram accounts usable for ad campaigns.

export const listClientCampaignAccounts = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  try {
    const { data: accounts, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform, account_name, account_handle, ad_account_id, ad_account_name, ad_account_currency, avatar_url, refresh_token, status')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .eq('status', 'active');

    if (error) throw error;

    return res.json({
      success: true,
      data: {
        accounts: (accounts || []).map(a => ({
          id:                  a.id,
          platform:            a.platform,
          account_name:        a.account_name,
          account_handle:      a.account_handle,
          ad_account_id:       a.ad_account_id,
          ad_account_name:     a.ad_account_name,
          ad_account_currency: a.ad_account_currency || null,
          avatar_url:          a.avatar_url,
          has_ad_account:      !!a.ad_account_id,
          has_token:           !!a.refresh_token,
        })),
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[MetaAccounts] listClientCampaignAccounts failed');
    return res.status(500).json({ error: 'Failed to load Meta accounts' });
  }
};

// ── POST /api/v1/campaigns/meta/accounts/:id/fetch-ad-accounts ───────────────
// Uses stored User access token to fetch Meta Business ad accounts.

export const fetchMetaAdAccounts = async (req: AuthRequest, res: Response) => {
  const { id }      = req.params;
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  try {
    const { data: account, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, refresh_token, account_name')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !account) return res.status(404).json({ error: 'Account not found' });
    if (!account.refresh_token) return res.status(400).json({ error: 'No access token for this account. Please reconnect.' });

    const response = await fetch(
      `${META_GRAPH}/me/adaccounts?fields=id,name,account_status,currency,timezone_name,spend_cap,amount_spent,disable_reason&access_token=${account.refresh_token}`
    );
    const data = await response.json() as any;

    if (data.error) {
      logger.warn({ metaError: data.error }, '[MetaAccounts] Meta API error fetching ad accounts');
      return res.status(400).json({ error: data.error.message || 'Meta API error — token may be expired. Please reconnect.' });
    }

    // Meta disable_reason codes: 0=none, 5=BILLING_INACTIVE (missing payment), others=policy/review
    const DISABLE_REASON: Record<number, string> = {
      1: 'Policy violation',
      2: 'Under review',
      3: 'Revenue issue',
      4: 'Suspicious activity',
      5: 'Missing payment method',
      6: 'Closed',
    };

    // Active codes: 1=ACTIVE, 201=ANY_ACTIVE, 9=IN_GRACE_PERIOD (still usable)
    const ACTIVE_STATUSES = new Set([1, 9, 201]);

    const adAccounts = (data.data || []).map((a: any) => ({
      id:             a.id,
      name:           a.name,
      currency:       a.currency,
      timezone:       a.timezone_name,
      status:         ACTIVE_STATUSES.has(a.account_status) ? 'Active' : 'Inactive',
      amount_spent:   a.amount_spent ? (parseInt(a.amount_spent) / 100).toFixed(2) : '0.00',
      disable_reason: a.disable_reason ? (DISABLE_REASON[a.disable_reason] || 'Account issue') : null,
    }));

    return res.json({ success: true, data: { ad_accounts: adAccounts } });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[MetaAccounts] fetchMetaAdAccounts failed');
    return res.status(500).json({ error: 'Failed to fetch ad accounts from Meta' });
  }
};

// ── POST /api/v1/campaigns/meta/accounts/:id/set-ad-account ──────────────────
// Saves the selected Meta ad account ID to the connected account.

export const setAdAccount = async (req: AuthRequest, res: Response) => {
  const { id }      = req.params;
  const workspaceId = req.user?.workspace_id;
  const { ad_account_id, ad_account_name, ad_account_currency, page_id } =
    req.body as { ad_account_id?: string; ad_account_name?: string; ad_account_currency?: string; page_id?: string };

  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
  if (!ad_account_id) return res.status(400).json({ error: 'ad_account_id required' });

  try {
    const updatePayload: Record<string, string | null> = {
      ad_account_id:       ad_account_id,
      ad_account_name:     ad_account_name     || null,
      ad_account_currency: ad_account_currency || null,
    };
    // Persist the numeric Facebook Page ID so the publisher can use it for ad creatives.
    // Only update if provided — don't overwrite an existing page_id with null.
    if (page_id) updatePayload.page_id = page_id;

    const { error } = await supabaseAdmin
      .from('connected_accounts')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    logger.info({ workspaceId, accountId: id, ad_account_id }, '[MetaAccounts] Ad account linked');
    return res.json({ success: true });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[MetaAccounts] setAdAccount failed');
    return res.status(500).json({ error: 'Failed to save ad account' });
  }
};

// ── GET /api/v1/campaigns/meta/pages ─────────────────────────────────────────
// Fetches Facebook Pages accessible to the connected account (for ad creative).

export const fetchMetaPages = async (req: AuthRequest, res: Response) => {
  const { id }      = req.query as { id?: string };
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId || !id) return res.status(400).json({ error: 'workspace and account id required' });

  try {
    const { data: account } = await supabaseAdmin
      .from('connected_accounts')
      .select('refresh_token')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!account?.refresh_token) return res.status(400).json({ error: 'No access token' });

    const r = await fetch(
      `${META_GRAPH}/me/accounts?fields=id,name,picture,access_token&access_token=${account.refresh_token}`
    );
    const data = await r.json() as any;
    if (data.error) return res.status(400).json({ error: data.error.message });

    return res.json({
      success: true,
      data: { pages: (data.data || []).map((p: any) => ({ id: p.id, name: p.name, picture: p.picture?.data?.url })) },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch pages' });
  }
};
