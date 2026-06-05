/**
 * metaTargetingSearch.ts
 * Searches Meta's Targeting API for locations and interests.
 * Uses the client's own access token — no extra Meta setup needed.
 */

import { Response } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

const META_GRAPH = 'https://graph.facebook.com/v18.0';

// ── POST /api/v1/campaigns/meta/reach-estimate ────────────────────────────────
// Returns real potential reach from Meta's Reach Estimate API.

export const getReachEstimate = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  const { age_min, age_max, gender, geography, optimization_goal } = req.body as {
    age_min?: number; age_max?: number; gender?: string;
    geography?: Array<{key: string; type: string}>;
    optimization_goal?: string;
  };

  try {
    const token = await getClientToken(workspaceId);
    if (!token) return res.json({ success: true, data: { estimate: null } });

    // Get ad account ID
    const { data: accs } = await supabaseAdmin
      .from('connected_accounts')
      .select('ad_account_id, agency_ad_account_id')
      .eq('workspace_id', workspaceId)
      .in('platform', ['facebook', 'instagram'])
      .not('ad_account_id', 'is', null)
      .limit(1);

    const acc = accs?.[0];
    if (!acc) return res.json({ success: true, data: { estimate: null } });

    const rawId = acc.agency_ad_account_id || acc.ad_account_id;
    const adAccountId = rawId.startsWith('act_') ? rawId : `act_${rawId}`;

    // Build targeting spec
    const genderNums = gender === 'MALE' ? [1] : gender === 'FEMALE' ? [2] : [1, 2];
    const geoLocations: Record<string, any> = {};

    if (geography && geography.length > 0) {
      const countries = geography.filter(g => g.type === 'country').map(g => g.key.toUpperCase().slice(0, 2));
      const cities    = geography.filter(g => g.type === 'city').map(g => ({ key: g.key }));
      const regions   = geography.filter(g => g.type === 'region').map(g => ({ key: g.key }));
      if (countries.length) geoLocations.countries = countries;
      if (cities.length)    geoLocations.cities    = cities;
      if (regions.length)   geoLocations.regions   = regions;
    }

    if (!Object.keys(geoLocations).length) geoLocations.countries = ['US'];

    const targetingSpec = {
      age_min:       age_min || 18,
      age_max:       age_max || 65,
      genders:       genderNums,
      geo_locations: geoLocations,
    };

    // delivery_estimate replaced the deprecated reachestimate endpoint (deprecated in v14.0)
    const goal = optimization_goal || 'REACH';
    const url = `${META_GRAPH}/${adAccountId}/delivery_estimate?optimization_goal=${encodeURIComponent(goal)}&targeting_spec=${encodeURIComponent(JSON.stringify(targetingSpec))}&access_token=${token}`;
    const r = await fetch(url);

    const data = await r.json() as any;
    if (data.error) {
      logger.warn({ err: data.error.message }, '[ReachEstimate] Meta API error');
      return res.json({ success: true, data: { estimate: null, error: data.error.message } });
    }

    const row = data.data?.[0];
    const lower = row?.estimate_mau_lower_bound ?? row?.estimate_dau ?? null;
    const upper = row?.estimate_mau_upper_bound ?? null;
    const users = lower !== null && upper !== null
      ? Math.round((lower + upper) / 2)
      : lower;

    return res.json({
      success: true,
      data: {
        estimate:     users ? users.toLocaleString() : null,
        lower_bound:  lower,
        upper_bound:  upper,
        estimate_ready: row?.estimate_ready ?? true,
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[ReachEstimate] Error');
    return res.json({ success: true, data: { estimate: null } });
  }
};

// ── Get client access token ───────────────────────────────────────────────────

async function getClientToken(workspaceId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('connected_accounts')
    .select('access_token, refresh_token')
    .eq('workspace_id', workspaceId)
    .in('platform', ['facebook', 'instagram'])
    .not('access_token', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data?.access_token || data?.refresh_token || null;
}

// ── GET /api/v1/campaigns/meta/search/locations ───────────────────────────────
// Returns location suggestions from Meta Targeting API.
// query: "united states", "new york", "UK", etc.

export const searchLocations = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  const { q } = req.query as { q?: string };

  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
  if (!q || q.trim().length < 2) return res.json({ success: true, data: { locations: [] } });

  try {
    const token = await getClientToken(workspaceId);
    if (!token) return res.status(400).json({ error: 'No Meta account connected. Connect your Facebook account first.' });

    const url = `${META_GRAPH}/search?type=adgeolocation&q=${encodeURIComponent(q)}&location_types=["country","region","city"]&limit=10&access_token=${token}`;
    const r = await fetch(url);
    const data = await r.json() as any;

    if (data.error) {
      logger.warn({ err: data.error.message }, '[MetaSearch] Location search failed');
      return res.status(400).json({ error: data.error.message });
    }

    const locations = (data.data || []).map((l: any) => ({
      key:          l.key,
      name:         l.name,
      type:         l.type,
      country_code: l.country_code,
      country_name: l.country_name,
      region:       l.region,
      display_name: [l.name, l.region, l.country_name].filter(Boolean).join(', '),
    }));

    return res.json({ success: true, data: { locations } });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[MetaSearch] Location search error');
    return res.status(500).json({ error: 'Failed to search locations' });
  }
};

// ── GET /api/v1/campaigns/meta/search/interests ───────────────────────────────
// Returns interest suggestions from Meta Targeting API.
// query: "technology", "travel", "fitness", etc.

export const searchInterests = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  const { q } = req.query as { q?: string };

  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
  if (!q || q.trim().length < 2) return res.json({ success: true, data: { interests: [] } });

  try {
    const token = await getClientToken(workspaceId);
    if (!token) return res.status(400).json({ error: 'No Meta account connected. Connect your Facebook account first.' });

    const url = `${META_GRAPH}/search?type=adinterest&q=${encodeURIComponent(q)}&limit=10&access_token=${token}`;
    const r = await fetch(url);
    const data = await r.json() as any;

    if (data.error) {
      logger.warn({ err: data.error.message }, '[MetaSearch] Interest search failed');
      return res.status(400).json({ error: data.error.message });
    }

    const interests = (data.data || []).map((i: any) => ({
      id:               i.id,
      name:             i.name,
      audience_size_upper_bound: i.audience_size_upper_bound,
      path:             i.path || [],
      topic:            i.topic,
    }));

    return res.json({ success: true, data: { interests } });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[MetaSearch] Interest search error');
    return res.status(500).json({ error: 'Failed to search interests' });
  }
};
