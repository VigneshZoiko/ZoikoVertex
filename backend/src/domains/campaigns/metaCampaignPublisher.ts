/**
 * metaCampaignPublisher.ts
 *
 * Publishes a campaign from our DB to Meta's Marketing API.
 * Uses the CLIENT's own connected Meta ad account — not an agency account.
 *
 * Flow:
 *   1. Load campaign + creative + targeting from DB
 *   2. Load client's connected Meta account (access_token, ad_account_id, page_id)
 *   3. Create Meta Campaign → Ad Set → Ad Creative → Ad
 *   4. Store meta IDs back to DB
 *   5. Update campaign status to ACTIVE
 *
 * Meta Graph API v18.0 — https://developers.facebook.com/docs/marketing-api
 */

import { supabaseAdmin } from '../../shared/supabase';
import { logger }        from '../../shared/logger';

const META_GRAPH = 'https://graph.facebook.com/v18.0';

// ── Objective mapping ─────────────────────────────────────────────────────────

const OBJECTIVE_MAP: Record<string, string> = {
  TRAFFIC:          'OUTCOME_TRAFFIC',
  ENGAGEMENT:       'OUTCOME_ENGAGEMENT',
  AWARENESS:        'OUTCOME_AWARENESS',
  LEAD_GENERATION:  'OUTCOME_LEADS',
  CONVERSIONS:      'OUTCOME_SALES',
};

const OPTIMIZATION_MAP: Record<string, string> = {
  LANDING_PAGE_VIEWS:          'LANDING_PAGE_VIEWS',
  LINK_CLICKS:                 'LINK_CLICKS',
  REACH:                       'REACH',
  POST_ENGAGEMENT:             'POST_ENGAGEMENT',
  THRUPLAY:                    'THRUPLAY',
  TWO_SECOND_VIDEO_VIEWS:      'TWO_SECOND_CONTINUOUS_VIDEO_VIEWS',
  OFFSITE_CONVERSIONS:         'OFFSITE_CONVERSIONS',
  LEAD_GENERATION:             'LEAD_GENERATION',
  QUALITY_LEAD:                'QUALITY_LEAD',
  AD_RECALL_LIFT:              'AD_RECALL_LIFT',
  CONVERSATIONS:               'CONVERSATIONS',
  IMPRESSIONS:                 'IMPRESSIONS',
};

// ── Placement ID → Meta position mapping ─────────────────────────────────────
// Maps our frontend placement IDs to Meta's publisher_platforms + positions

interface PlacementSpec {
  publisher_platforms: string[];
  facebook_positions?:        string[];
  instagram_positions?:       string[];
  messenger_positions?:       string[];
  audience_network_positions?: string[];
  device_platforms?:          string[];
}

// Meta API position values — verified against Meta Marketing API v18.0 docs
const PLACEMENT_META_MAP: Record<string, {platform: string; position: string}> = {
  facebook_news_feed:        { platform: 'facebook',         position: 'feed' },
  instagram_feed:            { platform: 'instagram',        position: 'stream' },
  facebook_marketplace:      { platform: 'facebook',         position: 'marketplace' },
  // facebook_video_feeds deprecated in Meta API v17+ — omitted to prevent ad set creation failure
  facebook_right_column:     { platform: 'facebook',         position: 'right_hand_column' },
  instagram_explore:         { platform: 'instagram',        position: 'explore' },
  messenger_inbox:           { platform: 'messenger',        position: 'messenger_home' },
  instagram_stories:         { platform: 'instagram',        position: 'story' },
  facebook_stories:          { platform: 'facebook',         position: 'story' },
  messenger_stories:         { platform: 'messenger',        position: 'story' },
  facebook_instream_videos:  { platform: 'facebook',         position: 'instream_video' },
  facebook_search:           { platform: 'facebook',         position: 'search' },
  audience_network_native:   { platform: 'audience_network', position: 'classic' },
  audience_network_rewarded: { platform: 'audience_network', position: 'rewarded_video' },
  audience_network_instream: { platform: 'audience_network', position: 'instream_video' },
  facebook_reels:            { platform: 'facebook',         position: 'facebook_reels' }, // NOT 'reels'
  instagram_reels:           { platform: 'instagram',        position: 'reels' },
};

function buildPlacementSpec(placements: string[], deviceType: string): PlacementSpec | null {
  if (!placements || placements.length === 0) return null;

  const platformSet  = new Set<string>();
  const fbPositions  = new Set<string>();
  const igPositions  = new Set<string>();
  const msPositions  = new Set<string>();
  const anPositions  = new Set<string>();

  for (const id of placements) {
    const m = PLACEMENT_META_MAP[id];
    if (!m) continue;
    platformSet.add(m.platform);
    if (m.platform === 'facebook')         fbPositions.add(m.position);
    if (m.platform === 'instagram')        igPositions.add(m.position);
    if (m.platform === 'messenger')        msPositions.add(m.position);
    if (m.platform === 'audience_network') anPositions.add(m.position);
  }

  if (platformSet.size === 0) return null;

  const spec: PlacementSpec = {
    publisher_platforms: [...platformSet],
  };
  if (fbPositions.size)  spec.facebook_positions         = [...fbPositions];
  if (igPositions.size)  spec.instagram_positions        = [...igPositions];
  if (msPositions.size)  spec.messenger_positions        = [...msPositions];
  if (anPositions.size)  spec.audience_network_positions = [...anPositions];

  // Device filter
  if (deviceType === 'mobile')  spec.device_platforms = ['mobile'];
  if (deviceType === 'desktop') spec.device_platforms = ['desktop'];

  return spec;
}

// ── Conversion event name → Meta standard event ───────────────────────────────
const CONV_EVENT_MAP: Record<string, string> = {
  'Add payment info':       'ADD_PAYMENT_INFO',
  'Add to cart':            'ADD_TO_CART',
  'Add to wishlist':        'ADD_TO_WISHLIST',
  'Complete registration':  'COMPLETE_REGISTRATION',
  'Donate':                 'DONATE',
  'Initiate checkout':      'INITIATE_CHECKOUT',
  'Purchase':               'PURCHASE',
  'Search':                 'SEARCH',
  'Start trial':            'START_TRIAL',
  'Subscribe':              'SUBSCRIBE',
  'View content':           'VIEW_CONTENT',
};

// ── Meta API helper ───────────────────────────────────────────────────────────

async function metaPost(path: string, token: string, body: Record<string, unknown>) {
  const r = await fetch(`${META_GRAPH}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...body, access_token: token }),
  });
  return r.json() as Promise<any>;
}

async function metaGet(path: string, token: string) {
  const r = await fetch(`${META_GRAPH}${path}&access_token=${token}`);
  return r.json() as Promise<any>;
}

// ── Geo location spec builder ─────────────────────────────────────────────────
// Meta requires different keys per location type:
//   country → geo_locations.countries: ["US"]
//   city    → geo_locations.cities:    [{key: "2277082"}]
//   region  → geo_locations.regions:   [{key: "..."}]

function buildGeoSpec(
  locations: Array<{key: string; type?: string; display_name?: string}>,
  spec: Record<string, any>
) {
  const countries: string[] = [];
  const cities:    {key: string}[] = [];
  const regions:   {key: string}[] = [];

  for (const loc of locations) {
    const type = loc.type || 'country';
    if (type === 'country') {
      countries.push(loc.key.toUpperCase().slice(0, 2));
    } else if (type === 'city') {
      cities.push({ key: loc.key });
    } else if (type === 'region') {
      regions.push({ key: loc.key });
    } else {
      // Unknown type — try as country code if 2 chars, else city
      if (loc.key.length <= 2) countries.push(loc.key.toUpperCase());
      else cities.push({ key: loc.key });
    }
  }

  if (countries.length) spec.countries = countries;
  if (cities.length)    spec.cities    = cities;
  if (regions.length)   spec.regions   = regions;
}

// ── Main publisher ────────────────────────────────────────────────────────────

export interface PublishResult {
  success:          boolean;
  meta_campaign_id?: string;
  meta_adset_id?:   string;
  meta_creative_id?: string;
  meta_ad_id?:      string;
  error?:           string;
}

export async function publishCampaignToMeta(
  campaignId: string,
  workspaceId: string,
): Promise<PublishResult> {

  // ── 1. Load campaign ──────────────────────────────────────────────────────
  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
    .single();

  if (campErr || !campaign) {
    return { success: false, error: `Campaign not found: ${campErr?.message}` };
  }

  const targeting = (campaign.targeting || {}) as Record<string, any>;
  const creative  = (campaign.creative  || {}) as Record<string, any>;

  // ── 2. Load Meta account ──────────────────────────────────────────────────
  // Use selected_meta_account_id if set, otherwise find first Facebook account with ad_account_id
  let accountId = campaign.selected_meta_account_id;
  if (!accountId) {
    const { data: accs } = await supabaseAdmin
      .from('connected_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .in('platform', ['facebook', 'instagram'])
      .not('ad_account_id', 'is', null)
      .limit(1);
    accountId = accs?.[0]?.id;
  }

  if (!accountId) {
    return { success: false, error: 'No Meta ad account linked. Go to Campaigns and link your Meta Ad Account.' };
  }

  const { data: account } = await supabaseAdmin
    .from('connected_accounts')
    .select('access_token, refresh_token, ad_account_id, agency_ad_account_id, account_handle, account_name, page_id')
    .eq('id', accountId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!account) {
    return { success: false, error: 'Connected account not found.' };
  }

  const token      = account.access_token || account.refresh_token;
  const adAcctRaw  = account.agency_ad_account_id || account.ad_account_id;
  const adAccountId = adAcctRaw?.startsWith('act_') ? adAcctRaw : `act_${adAcctRaw}`;

  if (!token) {
    return { success: false, error: 'Access token expired. Please reconnect your Facebook account.' };
  }
  if (!adAcctRaw) {
    return { success: false, error: 'No ad account ID found. Please link your Meta Ad Account first.' };
  }

  // Resolve the Facebook Page ID — must be numeric for object_story_spec.
  // Try the stored page_id column first; if missing or non-numeric (e.g. a username),
  // fetch the user's pages from Meta API at publish time.
  let pageId: string = (account as any).page_id || '';
  const isNumeric = (s: string) => /^\d+$/.test(s);

  if (!pageId || !isNumeric(pageId)) {
    logger.info({ campaignId, accountId, adAccountId }, '[MetaPublisher] Resolving Facebook Page ID...');

    // Strategy 1: /{ad-account-id}/promote_pages — most reliable.
    // Returns exactly the Pages this ad account is allowed to promote.
    // Requires no special scope beyond basic ads_management.
    try {
      const r1 = await fetch(`${META_GRAPH}/${adAccountId}/promote_pages?fields=id,name&limit=1&access_token=${token}`);
      const d1 = await r1.json() as any;
      if (!d1.error && d1.data?.[0]?.id && isNumeric(d1.data[0].id)) {
        pageId = d1.data[0].id;
        logger.info({ campaignId, pageId, pageName: d1.data[0].name }, '[MetaPublisher] Resolved Page ID via promote_pages');
      }
    } catch { /* fall through */ }

    // Strategy 2: /me/accounts — requires pages_show_list scope
    if (!pageId || !isNumeric(pageId)) {
      try {
        const r2 = await fetch(`${META_GRAPH}/me/accounts?fields=id,name&limit=1&access_token=${token}`);
        const d2 = await r2.json() as any;
        if (!d2.error && d2.data?.[0]?.id && isNumeric(d2.data[0].id)) {
          pageId = d2.data[0].id;
          logger.info({ campaignId, pageId }, '[MetaPublisher] Resolved Page ID via /me/accounts');
        }
      } catch { /* fall through */ }
    }

    // Strategy 3: resolve from username — but only if it's a Page, not a personal profile.
    // Pages have a fan_count field; personal profiles don't.
    if (!pageId || !isNumeric(pageId)) {
      const handle = (account.account_handle || '').replace(/^@/, '').trim();
      if (handle) {
        try {
          const r3 = await fetch(`${META_GRAPH}/${encodeURIComponent(handle)}?fields=id,name,fan_count&access_token=${token}`);
          const d3 = await r3.json() as any;
          // fan_count exists on Pages but not personal profiles
          if (!d3.error && d3.id && isNumeric(d3.id) && 'fan_count' in d3) {
            pageId = d3.id;
            logger.info({ campaignId, pageId, pageName: d3.name }, '[MetaPublisher] Resolved Page ID via username lookup');
          }
        } catch { /* fall through */ }
      }
    }

    if (!pageId || !isNumeric(pageId)) {
      return {
        success: false,
        error: 'No Facebook Business Page found for this ad account. Please create a Facebook Page in Meta Business Manager and link it to your ad account, then try again.',
      };
    }

    // Persist so future publishes skip this lookup
    await supabaseAdmin
      .from('connected_accounts')
      .update({ page_id: pageId } as any)
      .eq('id', accountId)
      .eq('workspace_id', workspaceId)
      .then(undefined, () => {});
  }

  // ── 3. Map fields ─────────────────────────────────────────────────────────

  // Normalize objective to uppercase to handle display-label variations (e.g. "Traffic" → "TRAFFIC")
  const normalizedObjective = (campaign.objective || '').toUpperCase().replace(/ /g, '_');
  if (!OBJECTIVE_MAP[normalizedObjective]) {
    logger.warn({ campaignId, objective: campaign.objective }, '[MetaPublisher] Unknown objective — defaulting to OUTCOME_TRAFFIC');
  }
  const metaObjective    = OBJECTIVE_MAP[normalizedObjective] || 'OUTCOME_TRAFFIC';
  const optimizationGoal = OPTIMIZATION_MAP[campaign.boost_settings?.optimize || 'LANDING_PAGE_VIEWS'] || 'LANDING_PAGE_VIEWS';

  // Targeting spec
  const genderRaw = targeting.gender || 'ALL';
  const genders   = genderRaw === 'MALE' ? [1] : genderRaw === 'FEMALE' ? [2] : [1, 2];

  // Parse geo_locations — supports both old string[] and new object[] formats
  const rawGeo    = targeting.geography || ['US'];
  let geoLocSpec: Record<string, any> = {};

  if (typeof rawGeo === 'string') {
    // Legacy: try to parse as JSON, fall back to comma-split country codes
    try {
      const parsed = JSON.parse(rawGeo);
      if (rawGeo.length) buildGeoSpec(parsed, geoLocSpec);
    } catch {
      geoLocSpec = { countries: rawGeo.split(',').map((g: string) => g.trim().slice(0, 2).toUpperCase()).filter(Boolean) };
    }
  } else if (Array.isArray(rawGeo)) {
    if (rawGeo.length > 0 && typeof rawGeo[0] === 'object' && rawGeo[0].key) {
      // New format: [{key, display_name, type}]
      buildGeoSpec(rawGeo, geoLocSpec);
    } else {
      // Old format: ['US', 'IN']
      geoLocSpec = { countries: (rawGeo as string[]).map((g: string) => g.toUpperCase().slice(0, 2)) };
    }
  }

  if (!Object.keys(geoLocSpec).length) geoLocSpec = { countries: ['US'] };

  // Build excluded_geo_locations if user set exclude locations
  let excludedGeoSpec: Record<string, any> | null = null;
  const rawExclude = targeting.excluded_geography;
  if (rawExclude && Array.isArray(rawExclude) && rawExclude.length > 0) {
    excludedGeoSpec = {};
    buildGeoSpec(rawExclude as Array<{key:string; type?:string}>, excludedGeoSpec);
    if (!Object.keys(excludedGeoSpec).length) excludedGeoSpec = null;
  }

  // Special ad categories — Meta requires ["NONE"] not [] for no category
  const specialCatMap: Record<string, string> = { HOUSING: 'HOUSING', EMPLOYMENT: 'EMPLOYMENT', CREDIT: 'CREDIT' };
  const specialCategories = campaign.special_ad_category && specialCatMap[campaign.special_ad_category]
    ? [specialCatMap[campaign.special_ad_category]]
    : ['NONE'];

  // ── 4. Create Meta Campaign ───────────────────────────────────────────────

  logger.info({ campaignId, adAccountId, metaObjective, specialCategories }, '[MetaPublisher] Creating campaign on Meta');

  const campaignCreateBody: Record<string, any> = {
    name:                           campaign.name,
    objective:                      metaObjective,
    status:                         'PAUSED',
    special_ad_categories:          specialCategories,
    is_adset_budget_sharing_enabled: false, // budget is set at ad set level, not campaign level
  };

  // EU compliance: add beneficiary + payer as ad labels
  if (campaign.eu_targeting) {
    campaignCreateBody.adlabels = [
      ...(campaign.eu_beneficiary ? [{ name: `EU-Beneficiary: ${campaign.eu_beneficiary}` }] : []),
      ...(campaign.eu_payer       ? [{ name: `EU-Payer: ${campaign.eu_payer}` }]             : []),
    ];
  }

  const metaCamp = await metaPost(`/${adAccountId}/campaigns`, token, campaignCreateBody);

  if (metaCamp.error) {
    const detail = metaCamp.error.error_user_msg || metaCamp.error.message;
    logger.error({ metaError: metaCamp.error }, '[MetaPublisher] Campaign creation failed');
    await saveMetaError(campaignId, detail);
    return { success: false, error: `Meta API (campaign): ${detail}` };
  }

  const metaCampaignId = metaCamp.id as string;
  logger.info({ metaCampaignId }, '[MetaPublisher] Campaign created');

  // ── 5. Create Meta Ad Set ─────────────────────────────────────────────────

  const boostSettings = (campaign.boost_settings || {}) as Record<string, any>;

  // Budget: daily vs total (lifetime)
  const budgetBody: Record<string, any> = {};
  if (campaign.budget_daily) {
    budgetBody.daily_budget = Math.round(campaign.budget_daily * 100);
  } else if (campaign.budget_total) {
    budgetBody.lifetime_budget = Math.round(campaign.budget_total * 100);
    // lifetime_budget requires end_time
    if (!campaign.end_at) {
      // Default: 30 days from now
      budgetBody.end_time = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  } else {
    budgetBody.daily_budget = 1000; // $10 minimum fallback
  }

  const adSetTargeting: Record<string, any> = {
    age_min:       parseInt(String(targeting.age_min || 18)),
    age_max:       parseInt(String(targeting.age_max || 65)),
    genders,
    geo_locations: geoLocSpec,
    ...(excludedGeoSpec ? { excluded_geo_locations: excludedGeoSpec } : {}),
    // Required by Meta API — 0 = use our custom targeting, 1 = let Meta find the audience
    targeting_automation: { advantage_audience: 0 },
  };

  // Interests — [{id, name}] format required by Meta
  if (targeting.interests && Array.isArray(targeting.interests) && targeting.interests.length > 0) {
    const interests = targeting.interests.map((i: any) =>
      typeof i === 'object' && i.id ? i : { id: i, name: String(i) }
    );
    adSetTargeting.flexible_spec = [{ interests }];
  }

  // Manual placements
  const placementsRaw = boostSettings.placements;
  if (placementsRaw && placementsRaw !== 'automatic' && Array.isArray(placementsRaw)) {
    const placementSpec = buildPlacementSpec(placementsRaw, campaign.device_type || 'all');
    if (placementSpec) {
      adSetTargeting.publisher_platforms         = placementSpec.publisher_platforms;
      if (placementSpec.facebook_positions)         adSetTargeting.facebook_positions         = placementSpec.facebook_positions;
      if (placementSpec.instagram_positions)        adSetTargeting.instagram_positions        = placementSpec.instagram_positions;
      if (placementSpec.messenger_positions)        adSetTargeting.messenger_positions        = placementSpec.messenger_positions;
      if (placementSpec.audience_network_positions) adSetTargeting.audience_network_positions = placementSpec.audience_network_positions;
      if (placementSpec.device_platforms)           adSetTargeting.device_platforms           = placementSpec.device_platforms;
    }
  } else if (campaign.device_type && campaign.device_type !== 'all') {
    // Automatic placements with device filter
    adSetTargeting.device_platforms = [campaign.device_type];
  }

  // billing_event must match optimization_goal for some goals
  const BILLING_EVENT_MAP: Record<string, string> = {
    THRUPLAY:                        'THRUPLAY',
    TWO_SECOND_CONTINUOUS_VIDEO_VIEWS: 'IMPRESSIONS',
    LINK_CLICKS:                     'LINK_CLICKS',
  };
  const billingEvent = BILLING_EVENT_MAP[optimizationGoal] || 'IMPRESSIONS';

  const adSetBody: Record<string, any> = {
    name:               `${campaign.name} — Ad Set`,
    campaign_id:        metaCampaignId,
    optimization_goal:  optimizationGoal,
    billing_event:      billingEvent,
    bid_strategy:       'LOWEST_COST_WITHOUT_CAP', // no bid amount needed
    targeting:          adSetTargeting,
    status:             'PAUSED', // activate after ads are created
    ...budgetBody,
  };

  // Tracking pixel + conversion event (Sales + OFFSITE_CONVERSIONS)
  if (campaign.tracking_pixel_id && optimizationGoal === 'OFFSITE_CONVERSIONS') {
    const metaEvent = CONV_EVENT_MAP[campaign.conversion_event || 'Purchase'] || 'PURCHASE';
    adSetBody.promoted_object = {
      pixel_id:          campaign.tracking_pixel_id,
      custom_event_type: metaEvent,
    };
  }

  // Schedule
  if (campaign.start_at) adSetBody.start_time = new Date(campaign.start_at).toISOString();
  if (campaign.end_at)   adSetBody.end_time   = new Date(campaign.end_at).toISOString();

  const metaAdSet = await metaPost(`/${adAccountId}/adsets`, token, adSetBody);

  if (metaAdSet.error) {
    await metaPost(`/${metaCampaignId}`, token, { status: 'DELETED' }).catch(() => {});
    const detail = metaAdSet.error.error_user_msg || metaAdSet.error.message;
    logger.error({ metaError: metaAdSet.error }, '[MetaPublisher] Ad set creation failed');
    await saveMetaError(campaignId, detail);
    return { success: false, error: `Meta API (ad set): ${detail}` };
  }

  const metaAdsetId = metaAdSet.id as string;
  logger.info({ metaAdsetId }, '[MetaPublisher] Ad set created');

  // ── 6. Create Ad Creatives + Ads for each ad in ads_data ─────────────────────

  const convLocation = boostSettings.conv_location || 'website';
  const isMessage    = convLocation === 'message';
  const msgDest      = boostSettings.msg_dest || 'messenger';

  // Resolve all ads: use ads_data array if present, else fall back to single creative
  const adsData: Array<Record<string, any>> = Array.isArray(campaign.ads_data) && campaign.ads_data.length > 0
    ? campaign.ads_data
    : [creative];

  logger.info({
    campaignId,
    source: Array.isArray(campaign.ads_data) && campaign.ads_data.length > 0 ? 'ads_data' : 'creative',
    adsCount: adsData.length,
    firstAd: {
      headline:         adsData[0]?.headline,
      landing_page_url: adsData[0]?.landing_page_url,
      copy_text:        adsData[0]?.copy_text,
      ad_image_url:     adsData[0]?.ad_image_url ? '(set)' : '(empty)',
      cta_text:         adsData[0]?.cta_text,
    },
    pageId,
  }, '[MetaPublisher] Creative data resolved from DB');

  const createdAdIds: string[] = [];
  let firstCreativeId = '';
  let firstAdId       = '';

  for (let idx = 0; idx < adsData.length; idx++) {
    const adData      = adsData[idx];
    const landingUrl  = adData.landing_page_url || creative.landing_page_url || null;
    const validUrl    = landingUrl?.startsWith('http') ? landingUrl : null;
    const headline    = adData.headline  || creative.headline  || campaign.name;
    const message     = adData.copy_text || creative.copy_text || '';
    const ctaTypeRaw  = adData.cta_text  || creative.cta_text  || 'LEARN_MORE';
    const ctaType     = ctaTypeRaw.toUpperCase().replace(/ /g, '_').replace(/'/g, '');
    const imageUrl    = adData.ad_image_url || creative.ad_image_url || null;
    const adName      = adData.name || `${campaign.name} — Ad ${idx + 1}`;

    let storySpec: Record<string, any>;

    if (isMessage) {
      const messengerLink = msgDest === 'instagram_dm'
        ? `https://ig.me/m/${pageId}`
        : `https://m.me/${pageId}`;

      storySpec = {
        object_story_spec: {
          page_id:   pageId,
          link_data: {
            ...(message ? { message } : {}),
            link:    messengerLink,
            name:    headline,
            call_to_action: { type: 'MESSAGE_PAGE', value: { app_destination: msgDest === 'instagram_dm' ? 'INSTAGRAM_DIRECT' : 'MESSENGER' } },
            ...(imageUrl ? { picture: imageUrl } : {}),
            ...(campaign.welcome_message ? { page_welcome_message: JSON.stringify({ type: 'VISUAL_EDITOR', version: 2, greeting: [{ content: { type: 'text', text: campaign.welcome_message }, tag: 'DEFAULT' }], call_to_actions: [] }) } : {}),
          },
        },
      };
    } else if (imageUrl) {
      // Image/link ad — picture field (not image_url) for link_data
      storySpec = {
        object_story_spec: {
          page_id:   pageId,
          link_data: {
            ...(message ? { message } : {}),
            ...(validUrl ? { link: validUrl, call_to_action: { type: ctaType, value: { link: validUrl } } } : { call_to_action: { type: ctaType } }),
            name: headline,
            picture: imageUrl,
          },
        },
      };
    } else {
      // Text-only fallback
      storySpec = {
        object_story_spec: {
          page_id:   pageId,
          link_data: {
            message:        message || campaign.name,
            name:           headline,
            ...(validUrl ? { link: validUrl, call_to_action: { type: 'LEARN_MORE', value: { link: validUrl } } } : {}),
          },
        },
      };
    }

    // EU compliance labels on creative
    const euLabels: Record<string, any>[] = [];
    if (campaign.eu_targeting && campaign.eu_beneficiary) {
      euLabels.push({ name: `EU-Beneficiary: ${campaign.eu_beneficiary}` });
    }
    if (campaign.eu_targeting && campaign.eu_payer) {
      euLabels.push({ name: `EU-Payer: ${campaign.eu_payer}` });
    }

    const creativePayload: Record<string, any> = {
      name: `${adName} — Creative`,
      ...storySpec,
    };
    if (euLabels.length) creativePayload.adlabels = euLabels;

    const metaCreative = await metaPost(`/${adAccountId}/adcreatives`, token, creativePayload);

    if (metaCreative.error) {
      const detail = metaCreative.error.error_user_msg || metaCreative.error.message;
      logger.warn({ ad: adName, metaError: metaCreative.error }, '[MetaPublisher] Creative failed');
      if (idx === 0) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'DELETED' }).catch(() => {});
        await saveMetaError(campaignId, detail);
        return { success: false, error: `Meta API (creative): ${detail}` };
      }
      continue;
    }

    const metaCreativeId = metaCreative.id as string;
    if (idx === 0) firstCreativeId = metaCreativeId;

    // Create the ad as PAUSED — Meta v17+ rejects ACTIVE when the parent ad set is PAUSED.
    // The full hierarchy is activated together after all ads are created (see step 8 below).
    const metaAd = await metaPost(`/${adAccountId}/ads`, token, {
      name:     adName,
      adset_id: metaAdsetId,
      creative: { creative_id: metaCreativeId },
      status:   'PAUSED',
    });

    if (metaAd.error) {
      const adErrDetail = metaAd.error.error_user_msg || metaAd.error.message;
      logger.warn({ ad: adName, metaError: metaAd.error }, '[MetaPublisher] Ad creation failed');
      if (idx === 0) {
        await metaPost(`/${metaCampaignId}`, token, { status: 'DELETED' }).catch(() => {});
        await saveMetaError(campaignId, adErrDetail);
        return { success: false, error: `Meta API (ad): ${adErrDetail}` };
      }
      continue;
    }

    const metaAdId = metaAd.id as string;
    createdAdIds.push(metaAdId);
    if (idx === 0) firstAdId = metaAdId;
    logger.info({ adName, metaAdId }, '[MetaPublisher] Ad created');
  }

  const metaCreativeId = firstCreativeId;
  const metaAdId       = firstAdId;
  logger.info({ total: createdAdIds.length }, '[MetaPublisher] All ads created — activating campaign on Meta');

  // ── 8. Activate hierarchy: ad set first, then campaign ───────────────────
  // Meta does NOT cascade activation from campaign to PAUSED ad sets,
  // and ads created as PAUSED (required by v17+) need explicit activation.
  let activationFailed = false;
  let activationError  = '';

  const adSetActivation = await metaPost(`/${metaAdsetId}`, token, { status: 'ACTIVE' });
  if ((adSetActivation as any).error) {
    const err = (adSetActivation as any).error;
    if (err.code === 190) {
      return { success: false, error: 'Access token expired. Please reconnect your Facebook account and try again.' };
    }
    activationFailed = true;
    activationError  = err.error_user_msg || err.message;
    logger.warn({ metaError: err }, '[MetaPublisher] Ad set activation failed');
  }

  if (!activationFailed) {
    const campActivation = await metaPost(`/${metaCampaignId}`, token, { status: 'ACTIVE' });
    if ((campActivation as any).error) {
      const err = (campActivation as any).error;
      activationFailed = true;
      activationError  = err.error_user_msg || err.message;
      logger.warn({ metaError: err }, '[MetaPublisher] Campaign activation failed');
    }
  }

  // Activate individual ads regardless of campaign/adset activation errors —
  // they may become active once the parent is fixed manually.
  for (const adId of createdAdIds) {
    const adAct = await metaPost(`/${adId}`, token, { status: 'ACTIVE' });
    if ((adAct as any).error) {
      logger.warn({ adId, metaError: (adAct as any).error }, '[MetaPublisher] Individual ad activation failed');
    }
  }

  // ── 9. Save Meta IDs to DB ────────────────────────────────────────────────
  // Status is ACTIVE only when the full hierarchy activated successfully.
  // If activation failed, write SCHEDULED so the operator can retry / investigate.
  const finalStatus = activationFailed ? 'SCHEDULED' : 'ACTIVE';
  if (activationFailed) {
    logger.warn({ campaignId, activationError }, '[MetaPublisher] Meta objects created but activation failed — marking SCHEDULED');
    await saveMetaError(campaignId, `Activation failed: ${activationError}. Meta objects exist — check Meta Business Manager.`);
  }

  await supabaseAdmin
    .from('campaigns')
    .update({
      meta_campaign_id:  metaCampaignId,
      meta_adset_id:     metaAdsetId,
      meta_creative_id:  metaCreativeId,
      meta_ad_id:        metaAdId,
      status:            finalStatus,
      published_at:      new Date().toISOString(),
      meta_error:        activationFailed ? `Activation failed: ${activationError}` : null,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId);

  return {
    success:          true,
    meta_campaign_id: metaCampaignId,
    meta_adset_id:    metaAdsetId,
    meta_creative_id: metaCreativeId,
    meta_ad_id:       metaAdId,
  };
}

// ── Toggle pause/resume on Meta ───────────────────────────────────────────────

export async function toggleMetaCampaignStatus(
  campaignId: string,
  workspaceId: string,
  pause: boolean,
): Promise<{ success: boolean; error?: string }> {
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('meta_campaign_id, selected_meta_account_id')
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!campaign?.meta_campaign_id) {
    return { success: false, error: 'Campaign not published to Meta yet.' };
  }

  const { data: account } = await supabaseAdmin
    .from('connected_accounts')
    .select('access_token, refresh_token')
    .eq('id', campaign.selected_meta_account_id)
    .single();

  const token = account?.access_token || account?.refresh_token;
  if (!token) return { success: false, error: 'Access token not found.' };

  const result = await metaPost(`/${campaign.meta_campaign_id}`, token, {
    status: pause ? 'PAUSED' : 'ACTIVE',
  });

  if (result.error) return { success: false, error: result.error.message };
  return { success: true };
}

// ── Delete from Meta ──────────────────────────────────────────────────────────

export async function deleteMetaCampaign(
  campaignId: string,
  workspaceId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('meta_campaign_id, selected_meta_account_id')
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!campaign?.meta_campaign_id) return { success: true }; // not published, nothing to delete

  const { data: account } = await supabaseAdmin
    .from('connected_accounts')
    .select('access_token, refresh_token')
    .eq('id', campaign.selected_meta_account_id)
    .single();

  const token = account?.access_token || account?.refresh_token;
  if (!token) return { success: true }; // can't delete but not critical

  await metaPost(`/${campaign.meta_campaign_id}`, token, { status: 'DELETED' }).catch(() => {});
  return { success: true };
}

// ── Sync campaigns from Meta ──────────────────────────────────────────────────

export async function syncCampaignsFromMeta(
  workspaceId: string,
  adAccountId: string,
  token: string,
): Promise<{ synced: number; error?: string }> {
  // Resolve org_id for this workspace once — required for campaign inserts
  const { data: ws } = await supabaseAdmin
    .from('workspaces')
    .select('org_id')
    .eq('id', workspaceId)
    .single();
  const orgId = ws?.org_id || null;

  const fields  = 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,configured_status';
  const baseUrl = `/act_${adAccountId.replace('act_', '')}/campaigns?fields=${fields}&limit=100`;

  const statusMap: Record<string, string> = {
    ACTIVE:   'ACTIVE',
    PAUSED:   'PAUSED',
    DELETED:  'CANCELLED',
    ARCHIVED: 'COMPLETED',
  };

  let nextUrl: string | null = baseUrl;
  let synced = 0;

  while (nextUrl) {
    const result = await metaGet(nextUrl, token);
    if ((result as any).error) return { synced, error: (result as any).error.message };

    const campaigns: any[] = (result as any).data || [];

    for (const mc of campaigns) {
      const { data: existing } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('meta_campaign_id', mc.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabaseAdmin.from('campaigns').insert({
          workspace_id:     workspaceId,
          org_id:           orgId,
          name:             mc.name,
          status:           statusMap[mc.status] || 'ACTIVE',
          campaign_type:    'PAID_ADS',
          objective:        mc.objective?.replace('OUTCOME_', '') || 'TRAFFIC',
          platforms:        ['Meta'],
          budget_daily:     mc.daily_budget    ? parseInt(mc.daily_budget)    / 100 : null,
          budget_total:     mc.lifetime_budget ? parseInt(mc.lifetime_budget) / 100 : null,
          start_at:         mc.start_time      || null,
          end_at:           mc.stop_time       || null,
          meta_campaign_id: mc.id,
          published_at:     mc.created_time,
          created_at:       mc.created_time,
        });
        if (insertErr) {
          logger.warn({ metaCampaignId: mc.id, err: insertErr.message }, '[MetaSync] Insert failed for synced campaign');
          continue;
        }
      } else {
        await supabaseAdmin.from('campaigns').update({
          status:     statusMap[mc.status] || 'ACTIVE',
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      }
      synced++;
    }

    // Follow Meta paging cursor — paging.cursors.after is the next page token
    const after = (result as any).paging?.cursors?.after;
    nextUrl = after ? `${baseUrl}&after=${after}` : null;
  }

  return { synced };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function saveMetaError(campaignId: string, error: string) {
  await supabaseAdmin
    .from('campaigns')
    .update({ meta_error: error, updated_at: new Date().toISOString() })
    .eq('id', campaignId);
}
