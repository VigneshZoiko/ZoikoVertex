import { createHmac } from 'crypto';
import { Response } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { env } from '../../config/env';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

function appSecretProof(token: string): string {
  const secret = env.META_APP_SECRET;
  if (!secret) return '';
  return createHmac('sha256', secret).update(token).digest('hex');
}

function metaUrl(path: string, token: string, extraParams = ''): string {
  const sep   = path.includes('?') ? '&' : '?';
  const proof = appSecretProof(token);
  return `${META_GRAPH}${path}${sep}access_token=${token}${proof ? `&appsecret_proof=${proof}` : ''}${extraParams}`;
}

// Shared helper — resolves the workspace's primary ad account + token
async function getWorkspaceAdAccount(workspaceId: string): Promise<{ adAccountId: string; token: string } | null> {
  const { data: accs } = await supabaseAdmin
    .from('connected_accounts')
    .select('ad_account_id, agency_ad_account_id, refresh_token, access_token')
    .eq('workspace_id', workspaceId)
    .in('platform', ['facebook', 'instagram'])
    .not('ad_account_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const acc = accs?.[0];
  if (!acc) return null;

  const raw         = (acc.agency_ad_account_id || acc.ad_account_id) as string;
  const adAccountId = raw.startsWith('act_') ? raw : `act_${raw}`;
  const token       = (acc.refresh_token || acc.access_token) as string | undefined;
  if (!token) return null;

  return { adAccountId, token };
}

// ── GET /api/v1/campaigns/meta/accounts ──────────────────────────────────────

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
      metaUrl('/me/adaccounts?fields=id,name,account_status,currency,timezone_name,spend_cap,amount_spent,disable_reason', account.refresh_token)
    );
    const data = await response.json() as any;

    if (data.error) {
      logger.warn({ metaError: data.error }, '[MetaAccounts] Meta API error fetching ad accounts');
      return res.status(400).json({ error: data.error.message || 'Meta API error — token may be expired. Please reconnect.' });
    }

    const DISABLE_REASON: Record<number, string> = {
      1: 'Policy violation', 2: 'Under review', 3: 'Revenue issue',
      4: 'Suspicious activity', 5: 'Missing payment method', 6: 'Closed',
    };
    const ACTIVE_STATUSES = new Set([1, 9, 201]);

    const adAccounts = (data.data || []).map((a: any) => ({
      id:             a.id,
      name:           a.name,
      currency:       a.currency,
      timezone:       a.timezone_name,
      status:         ACTIVE_STATUSES.has(a.account_status) ? 'Active' : 'Inactive',
      amount_spent:   a.amount_spent ? (parseInt(a.amount_spent) / 100).toFixed(2) : '0.00',
      spend_cap:      a.spend_cap && parseInt(a.spend_cap) > 0 ? (parseInt(a.spend_cap) / 100).toFixed(2) : null,
      disable_reason: a.disable_reason ? (DISABLE_REASON[a.disable_reason] || 'Account issue') : null,
    }));

    return res.json({ success: true, data: { ad_accounts: adAccounts } });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[MetaAccounts] fetchMetaAdAccounts failed');
    return res.status(500).json({ error: 'Failed to fetch ad accounts from Meta' });
  }
};

// ── POST /api/v1/campaigns/meta/accounts/:id/set-ad-account ──────────────────

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
      metaUrl('/me/accounts?fields=id,name,picture,access_token', account.refresh_token)
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

// ── GET /api/v1/campaigns/meta/pixels ────────────────────────────────────────
// Returns all Meta Pixels accessible to the connected ad account.
// Meta API v21.0: GET /{ad-account-id}/adspixels?fields=id,name,creation_time,last_fired_time
// Required scope: ads_management

export const fetchMetaPixels = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  try {
    const acct = await getWorkspaceAdAccount(workspaceId);
    if (!acct) return res.json({ success: true, data: { pixels: [] } });

    const { adAccountId, token } = acct;
    const url = metaUrl(
      `/${adAccountId}/adspixels`,
      token,
      '&fields=id,name,creation_time,last_fired_time,code,is_unavailable,automatic_matching_fields,connected_datasets{id,name}&limit=50',
    );
    const r    = await fetch(url);
    const data = await r.json() as any;

    if (data.error) {
      logger.warn({ err: data.error.message, adAccountId }, '[MetaPixels] Meta API error');
      return res.json({ success: true, data: { pixels: [], error: data.error.message } });
    }

    const rawPixels = (data.data || []).map((p: any) => ({
      id:                        p.id,
      name:                      p.name || `Pixel ${p.id}`,
      creation_time:             p.creation_time             || null,
      last_fired_time:           p.last_fired_time           || null,
      code:                      p.code                      || null,
      is_unavailable:            p.is_unavailable            ?? false,
      automatic_matching_fields: p.automatic_matching_fields || [],
      connected_datasets:        (p.connected_datasets?.data || []) as { id: string; name: string }[],
    }));

    // Fetch which pixels have ZoikoVertex CAPI configured
    const pixelIds = rawPixels.map((p: any) => p.id);
    const { data: capiRows } = pixelIds.length
      ? await supabaseAdmin
          .from('meta_pixel_capi')
          .select('pixel_id')
          .eq('workspace_id', workspaceId)
          .in('pixel_id', pixelIds)
      : { data: [] };

    const capiSet = new Set((capiRows || []).map((r: any) => r.pixel_id));
    const pixels  = rawPixels.map((p: any) => ({ ...p, capi_enabled: capiSet.has(p.id) }));

    return res.json({ success: true, data: { pixels, ad_account_id: adAccountId } });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[MetaPixels] Error');
    return res.status(500).json({ error: 'Failed to fetch Meta Pixels' });
  }
};

// ── GET /api/v1/campaigns/meta/pixels/:pixelId/stats ─────────────────────────
// Returns pixel event stats: 24h total, 7-day daily trend, by event name,
// by device type, by country, top URLs, and event match quality (EMQ).
// Meta Pixel Stats API: GET /{pixel-id}/stats?aggregation=<type>&start_time=<unix>&end_time=<unix>

export const getPixelStats = async (req: AuthRequest, res: Response) => {
  const { pixelId } = req.params;
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId || !pixelId) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const acct = await getWorkspaceAdAccount(workspaceId);
    if (!acct) return res.status(400).json({ error: 'No connected ad account found' });

    const { token } = acct;
    const nowTs = Math.floor(Date.now() / 1000);
    const ts7d  = nowTs - 7 * 86400;
    const ts24h = nowTs - 86400;

    // Five parallel calls — evData drives both event breakdown AND daily totals
    // (pixel_fire aggregation does NOT carry per-bucket counts reliably)
    const [evR, totR, devR, urlR, cntryR] = await Promise.all([
      fetch(metaUrl(`/${pixelId}/stats`, token, `&aggregation=event&start_time=${ts7d}&end_time=${nowTs}`)),
      fetch(metaUrl(`/${pixelId}/stats`, token, `&aggregation=event_total_counts&start_time=${ts24h}&end_time=${nowTs}`)),
      fetch(metaUrl(`/${pixelId}/stats`, token, `&aggregation=device_type&start_time=${ts7d}&end_time=${nowTs}`)),
      fetch(metaUrl(`/${pixelId}/stats`, token, `&aggregation=url&start_time=${ts7d}&end_time=${nowTs}`)),
      fetch(metaUrl(`/${pixelId}/stats`, token, `&aggregation=country&start_time=${ts7d}&end_time=${nowTs}`)),
    ]);

    const [evData, totData, devData, urlData, cntryData] = await Promise.all([
      evR.json(), totR.json(), devR.json(), urlR.json(), cntryR.json(),
    ]) as any[];

    if (evData.error) {
      logger.warn({ err: evData.error.message, pixelId }, '[PixelStats] Meta API error');
      return res.json({ success: true, data: { events_24h: 0, by_event: [], by_day: [], by_device: [], by_url: [], by_country: [], meta_error: evData.error.message } });
    }

    // ── Event name breakdown ────────────────────────────────────────────────
    // Outer data[] = hourly time buckets; each has inner data[] of {value, count}
    const flatEvent = ((evData.data || []) as any[]).flatMap((b: any) => b.data || []);
    const eventMap: Record<string, number> = {};
    for (const e of flatEvent) {
      const name = (e.value as string) || 'Unknown';
      eventMap[name] = (eventMap[name] || 0) + (Number(e.count) || 0);
    }
    const byEvent = Object.entries(eventMap)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);

    // ── Daily trend — derived directly from evData (reliable, same response) ─
    const dayMap: Record<string, number> = {};
    for (const bucket of ((evData.data || []) as any[])) {
      const day = ((bucket.start_time as string) || '').substring(0, 10); // "YYYY-MM-DD"
      const cnt = ((bucket.data || []) as any[]).reduce((s: number, e: any) => s + (Number(e.count) || 0), 0);
      if (day) dayMap[day] = (dayMap[day] || 0) + cnt;
    }
    const byDay = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── 24h total ────────────────────────────────────────────────────────────
    const events24h = ((totData.data || []) as any[])
      .flatMap((b: any) => b.data || [])
      .reduce((s: number, e: any) => s + (Number(e.count) || 0), 0);

    // ── Device type breakdown (nested or flat depending on Meta response) ───
    function aggregateFlatOrNested(raw: any[]): Record<string, number> {
      const map: Record<string, number> = {};
      // Check if first entry has an inner data[] (nested time-bucket format)
      const isNested = raw.length > 0 && Array.isArray(raw[0]?.data);
      const entries = isNested ? raw.flatMap((b: any) => b.data || []) : raw;
      for (const e of entries) {
        const key = (e.value as string) || (e.device_type as string) || (e.country as string) || 'Unknown';
        map[key] = (map[key] || 0) + (Number(e.count) || 0);
      }
      return map;
    }

    const devMap     = aggregateFlatOrNested((devData.data   || []) as any[]);
    const urlRawMap  = aggregateFlatOrNested((urlData.data   || []) as any[]);
    const cntryMap   = aggregateFlatOrNested((cntryData.data || []) as any[]);

    const byDevice = Object.entries(devMap)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    // Top 10 URLs — strip query strings for cleaner display
    const byUrl = Object.entries(urlRawMap)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const byCountry = Object.entries(cntryMap)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Event Match Quality (EMQ) — best-effort, fails gracefully ──────────
    let eventQuality: { event: string; score: number; match_keys: string[] }[] = [];
    try {
      const emqR = await fetch(metaUrl(`/${pixelId}/signal_sources_stats`, token,
        `&fields=event_name,event_match_quality_score,match_keys_seen`));
      const emqData = await emqR.json() as any;
      if (!emqData.error && Array.isArray(emqData.data)) {
        eventQuality = emqData.data
          .filter((e: any) => e.event_name && e.event_match_quality_score != null)
          .map((e: any) => ({
            event:       e.event_name as string,
            score:       Number(e.event_match_quality_score),
            match_keys:  Array.isArray(e.match_keys_seen) ? e.match_keys_seen as string[] : [],
          }))
          .sort((a: any, b: any) => b.score - a.score);
      }
    } catch {
      // EMQ is best-effort — not all tokens have access
    }

    return res.json({
      success: true,
      data: { events_24h: events24h, by_event: byEvent, by_day: byDay, by_device: byDevice, by_url: byUrl, by_country: byCountry, event_quality: eventQuality },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[PixelStats] Error');
    return res.status(500).json({ error: 'Failed to fetch pixel stats' });
  }
};

// ── POST /api/v1/campaigns/meta/pixels ───────────────────────────────────────
// Creates a new Meta Pixel under the workspace's ad account.
// Meta API: POST /{ad-account-id}/adspixels   body: { name }
// Required scope: ads_management

export const createPixel = async (req: AuthRequest, res: Response) => {
  const { name }    = req.body as { name?: string };
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
  if (!name?.trim()) return res.status(400).json({ error: 'Pixel name is required' });

  try {
    const acct = await getWorkspaceAdAccount(workspaceId);
    if (!acct) return res.status(400).json({ error: 'No connected ad account found. Link a Meta ad account first.' });

    const { adAccountId, token } = acct;
    const proof = appSecretProof(token);

    const r = await fetch(`${META_GRAPH}/${adAccountId}/adspixels`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:           name.trim(),
        access_token:   token,
        ...(proof ? { appsecret_proof: proof } : {}),
      }),
    });
    const data = await r.json() as any;

    if (data.error) {
      logger.warn({ err: data.error.message, adAccountId }, '[CreatePixel] Meta API error');
      return res.status(400).json({ error: data.error.message || 'Meta API error' });
    }

    logger.info({ workspaceId, pixelId: data.id, name }, '[CreatePixel] Pixel created');
    return res.status(201).json({
      success: true,
      data: {
        id:              String(data.id),
        name:            name.trim(),
        creation_time:   data.creation_time || new Date().toISOString(),
        last_fired_time: null,
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[CreatePixel] Error');
    return res.status(500).json({ error: 'Failed to create pixel' });
  }
};

// ── PATCH /api/v1/campaigns/meta/pixels/:pixelId ─────────────────────────────
// Renames a Meta Pixel.
// Meta API: POST /{pixel-id}   body: { name }
// Required scope: ads_management

export const updatePixelName = async (req: AuthRequest, res: Response) => {
  const { pixelId } = req.params;
  const { name }    = req.body as { name?: string };
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId || !pixelId) return res.status(400).json({ error: 'Missing parameters' });
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    const acct = await getWorkspaceAdAccount(workspaceId);
    if (!acct) return res.status(400).json({ error: 'No connected ad account found' });

    const { token } = acct;
    const proof     = appSecretProof(token);

    // Meta Graph API: POST /{pixel-id} with name in body updates the pixel
    const r = await fetch(`${META_GRAPH}/${pixelId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:           name.trim(),
        access_token:   token,
        ...(proof ? { appsecret_proof: proof } : {}),
      }),
    });
    const data = await r.json() as any;

    if (data.error) {
      logger.warn({ err: data.error.message, pixelId }, '[UpdatePixel] Meta API error');
      return res.status(400).json({ error: data.error.message || 'Meta API error' });
    }

    logger.info({ workspaceId, pixelId, name }, '[UpdatePixel] Pixel renamed');
    return res.json({ success: true });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[UpdatePixel] Error');
    return res.status(500).json({ error: 'Failed to rename pixel' });
  }
};

// ── DELETE /api/v1/campaigns/meta/pixels/:pixelId ────────────────────────────
// Deletes a Meta Pixel.
// Meta API: DELETE /{pixel-id}
// Only works for pixels the app (or token holder) owns.
// If the pixel cannot be deleted via API, returns needs_events_manager=true with a deep link.

export const deleteMetaPixel = async (req: AuthRequest, res: Response) => {
  const { pixelId } = req.params;
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId || !pixelId) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const acct = await getWorkspaceAdAccount(workspaceId);
    if (!acct) return res.status(404).json({ error: 'No connected ad account found' });

    const { token } = acct;
    const proof     = appSecretProof(token);

    const r = await fetch(
      `${META_GRAPH}/${pixelId}?access_token=${encodeURIComponent(token)}${proof ? `&appsecret_proof=${proof}` : ''}`,
      { method: 'DELETE' },
    );
    const data = await r.json() as any;

    if (data.error) {
      logger.warn({ err: data.error.message, pixelId }, '[DeletePixel] Meta API rejected delete');
      return res.status(400).json({
        error:                data.error.message || 'Cannot delete pixel via API',
        needs_events_manager: true,
        events_manager_url:   `https://business.facebook.com/events_manager2/list/pixel/${pixelId}/settings`,
      });
    }

    logger.info({ workspaceId, pixelId }, '[DeletePixel] Pixel deleted');
    return res.json({ success: true });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[DeletePixel] Error');
    return res.status(500).json({ error: 'Failed to delete pixel' });
  }
};
