import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { deleteMetaCampaign } from './metaCampaignPublisher';

// ── Status & Type constants ──────────────────────────────────

export const CAMPAIGN_TYPES = ['ORGANIC', 'PAID_ADS', 'EMAIL', 'MIXED'] as const;

export const CAMPAIGN_STATUSES = [
  'DRAFT',
  'READY_FOR_REVIEW',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SCHEDULED',
  'ACTIVE',
  'PAUSING',
  'PAUSED',
  'COMPLETED',
  'CLOSED',
  'REJECTED',
  'CANCELLED',
  'ARCHIVED',
] as const;

// Valid status transitions — enforced server-side
export const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT:              ['READY_FOR_REVIEW', 'CANCELLED'],
  READY_FOR_REVIEW:   ['IN_REVIEW', 'APPROVED', 'DRAFT'],
  IN_REVIEW:          ['CHANGES_REQUESTED', 'APPROVED', 'REJECTED'],
  CHANGES_REQUESTED:  ['DRAFT', 'IN_REVIEW'],
  APPROVED:           ['SCHEDULED', 'ACTIVE', 'DRAFT'],
  SCHEDULED:          ['ACTIVE', 'PAUSED', 'CANCELLED'],
  ACTIVE:             ['PAUSING', 'PAUSED', 'COMPLETED'],
  PAUSING:            ['PAUSED', 'ACTIVE'],
  PAUSED:             ['IN_REVIEW', 'APPROVED', 'COMPLETED', 'CANCELLED'],
  COMPLETED:          ['CLOSED'],
  CLOSED:             ['ARCHIVED'],
  REJECTED:           ['DRAFT'],
  CANCELLED:          ['DRAFT'],
  ARCHIVED:           [],
};

// ── Zod schemas ──────────────────────────────────────────────

const TargetingSchema = z.object({
  // Accept both old string[] and new object[] formats for geography
  geography:                  z.array(z.unknown()).default([]),
  excluded_geography:         z.array(z.unknown()).default([]),
  audience_summary:           z.string().optional(),
  audience_segments:          z.array(z.string()).default([]),
  exclusions:                 z.array(z.string()).default([]),
  sensitive_category_status:  z.string().default('NONE'),
  jurisdictional_flags:       z.array(z.string()).default([]),
  // Audience fields from campaign wizard
  age_min:                    z.number().int().min(13).max(65).optional(),
  age_max:                    z.number().int().min(13).max(65).optional(),
  gender:                     z.string().optional(),
  interests:                  z.array(z.unknown()).default([]),
}).default({ geography: [], excluded_geography: [], audience_segments: [], exclusions: [], sensitive_category_status: 'NONE', jurisdictional_flags: [], interests: [] });

const CreativeSchema = z.object({
  asset_ids:        z.array(z.string()).default([]),
  copy_text:        z.string().optional(),
  headline:         z.string().optional(),
  cta_text:         z.string().optional(),
  landing_page_url: z.string().nullable().optional(),
  ad_image_url:     z.string().nullable().optional(),
  meta_ad_type:     z.string().optional(),
  utm_source:       z.string().optional(),
  utm_medium:       z.string().optional(),
  utm_campaign:     z.string().optional(),
  utm_configured:   z.boolean().default(false),
  utm_waived:       z.boolean().default(false),
  creative_hash:    z.string().optional(),
}).default({ asset_ids: [], utm_configured: false, utm_waived: false });

export const CreateSchema = z.object({
  name:                   z.string().min(2).max(200),
  description:            z.string().max(1000).optional(),
  campaign_type:          z.enum(CAMPAIGN_TYPES).default('ORGANIC'),
  objective:              z.string().min(2).max(500),
  business_rationale:     z.string().max(1000).optional(),
  success_metrics:        z.string().max(500).optional(),
  region:                 z.string().optional(),
  platforms:              z.array(z.string()).default([]),

  // Budget
  budget_total:           z.number().positive().nullable().optional(),
  budget_daily:           z.number().positive().nullable().optional(),
  budget_currency:        z.string().default('USD'),
  budget_pacing:          z.string().default('EVEN'),
  budget_owner_id:        z.string().uuid().optional(),
  budget_owner_name:      z.string().optional(),

  // Schedule
  start_at:               z.string().nullable().optional(),
  end_at:                 z.string().nullable().optional(),

  // KPIs
  kpi_reach:              z.number().int().positive().nullable().optional(),
  kpi_engagement:         z.number().int().positive().nullable().optional(),
  kpi_conversions:        z.number().int().positive().nullable().optional(),

  // Governance
  campaign_manager_id:    z.string().uuid().optional(),
  campaign_manager_name:  z.string().optional(),
  risk_tier:              z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  autonomy_level:         z.enum(['L0', 'L1', 'L2', 'L3', 'L4']).default('L1'),
  approval_tier:          z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  wizard_step:            z.number().int().min(1).max(10).default(1),

  // Post limit & auto-boost
  post_limit:             z.number().int().positive().nullable().optional(),
  auto_boost_enabled:     z.boolean().default(false),
  boost_per_post_budget:  z.number().positive().nullable().optional(),
  boost_settings:         z.record(z.string(), z.unknown()).nullable().optional(),

  // Paid ads — Meta-specific fields
  selected_meta_account_id: z.string().uuid().nullable().optional(),
  ads_data:                 z.array(z.unknown()).nullable().optional(),
  eu_targeting:             z.boolean().nullable().optional(),
  eu_beneficiary:           z.string().nullable().optional(),
  eu_payer:                 z.string().nullable().optional(),
  tracking_pixel_id:        z.string().nullable().optional(),
  conversion_event:         z.string().nullable().optional(),
  welcome_message:          z.string().nullable().optional(),
  device_type:              z.string().nullable().optional(),

  // JSONB fields
  targeting:              TargetingSchema,
  creative:               CreativeSchema,
});

export const UpdateSchema = CreateSchema.partial().extend({
  status: z.enum(CAMPAIGN_STATUSES).optional(),
});

// ── Helper: log a campaign lifecycle event ───────────────────

export async function logCampaignEvent(
  workspaceId: string,
  campaignId: string,
  eventType: string,
  actorId: string | null | undefined,
  actorRole: string | null | undefined,
  prevStatus: string | null | undefined,
  newStatus: string | null | undefined,
  metadata: Record<string, unknown> = {},
) {
  await supabaseAdmin.from('campaign_events').insert({
    workspace_id: workspaceId,
    campaign_id:  campaignId,
    event_type:   eventType,
    actor_id:     actorId    ?? null,
    actor_role:   actorRole  ?? null,
    prev_status:  prevStatus ?? null,
    new_status:   newStatus  ?? null,
    metadata,
  });
}

// ── Controllers ──────────────────────────────────────────────

export const listCampaigns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    let query = supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const { status, risk_tier, campaign_type, needs_action } = req.query;

    if (status && status !== 'ALL') query = query.eq('status', String(status));
    if (risk_tier) query = query.eq('risk_tier', String(risk_tier));
    if (campaign_type) query = query.eq('campaign_type', String(campaign_type));

    // "Needs Action" filter: statuses that require user attention
    if (needs_action === 'true') {
      query = query.in('status', ['READY_FOR_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED', 'PAUSING']);
    }

    const { data, error } = await query;
    if (error) throw error;

    const ids = (data || []).map(c => c.id);
    const counts: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: projectRows } = await supabaseAdmin
        .from('projects')
        .select('campaign_id')
        .in('campaign_id', ids);
      (projectRows || []).forEach((p: { campaign_id: string }) => {
        counts[p.campaign_id] = (counts[p.campaign_id] || 0) + 1;
      });
    }

    res.json({
      success: true,
      data: (data || []).map(c => ({ ...c, project_count: counts[c.id] || 0 })),
    });
  } catch (err) { next(err); }
};

export const getCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Campaign not found' });

    // Enrich with connected account name + ad account name
    let meta_account_name: string | null = null;
    let meta_ad_account_name: string | null = null;
    let meta_access_token: string | null = null;
    if (data.selected_meta_account_id) {
      const { data: acct } = await supabaseAdmin
        .from('connected_accounts')
        .select('account_name, ad_account_name, ad_account_id, access_token')
        .eq('id', data.selected_meta_account_id)
        .single();
      if (acct) {
        meta_account_name    = acct.account_name    || null;
        meta_ad_account_name = acct.ad_account_name || acct.ad_account_id || null;
        meta_access_token    = acct.access_token    || null;
      }
    }

    // Auto-delete if campaign was deleted in Meta
    if (data.meta_campaign_id && meta_access_token) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2000);
        const metaRes = await fetch(
          `https://graph.facebook.com/v19.0/${data.meta_campaign_id}?fields=id,status&access_token=${meta_access_token}`,
          { signal: ctrl.signal }
        );
        clearTimeout(timer);
        const metaData = await metaRes.json() as { error?: { code: number; message: string } };
        if (metaData.error) {
          await supabaseAdmin.from('campaigns').delete().eq('id', data.id).eq('workspace_id', workspaceId);
          return res.status(404).json({
            error: 'This campaign was deleted in Meta Ads Manager and has been removed.',
            meta_deleted: true,
          });
        }
      } catch {
        // Meta unreachable or timed out — serve cached data
      }
    }

    res.json({ success: true, data: { ...data, meta_account_name, meta_ad_account_name } });
  } catch (err) { next(err); }
};

export const createCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!userId)      return res.status(401).json({ error: 'Unauthorized' });
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const { data: ws } = await supabaseAdmin
      .from('workspaces').select('org_id').eq('id', workspaceId).single();
    if (!ws?.org_id) return res.status(400).json({ error: 'Organization not found' });

    // Meta charges the client's own ad account directly — no internal wallet gate.

    // Destructure meta/paid-ads fields separately so they are handled explicitly
    const {
      selected_meta_account_id,
      ads_data,
      eu_targeting,
      eu_beneficiary,
      eu_payer,
      tracking_pixel_id,
      conversion_event,
      welcome_message,
      device_type,
      ...coreData
    } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        ...coreData,
        workspace_id:             workspaceId,
        org_id:                   ws.org_id,
        created_by:               userId,
        status:                   'DRAFT',
        // Meta / paid ads columns (from migrations 56-59)
        selected_meta_account_id: selected_meta_account_id ?? null,
        ads_data:                 ads_data ?? null,
        eu_targeting:             eu_targeting ?? null,
        eu_beneficiary:           eu_beneficiary ?? null,
        eu_payer:                 eu_payer ?? null,
        tracking_pixel_id:        tracking_pixel_id ?? null,
        conversion_event:         conversion_event ?? null,
        welcome_message:          welcome_message ?? null,
        device_type:              device_type ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, data.id,
      'campaign.draft.created',
      userId, req.user?.role,
      undefined, 'DRAFT',
      { name: data.name, campaign_type: data.campaign_type },
    );

    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    // Fetch current campaign for state machine check
    const { data: current } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, three_key_status')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!current) return res.status(404).json({ error: 'Campaign not found' });

    // Enforce valid status transitions
    if (parsed.data.status && parsed.data.status !== current.status) {
      const allowed = VALID_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(parsed.data.status)) {
        return res.status(400).json({
          error: `Invalid status transition: ${current.status} → ${parsed.data.status}`,
          allowed_transitions: allowed,
        });
      }
    }

    // Material edit detection: if campaign is APPROVED and key fields change, reset three_key_status
    const MATERIAL_FIELDS = ['budget_total', 'budget_currency', 'targeting', 'creative', 'platforms', 'start_at', 'end_at'];
    // Only void approval when a material field actually CHANGED vs the stored value —
    // not when the field is merely present in the PATCH body with the same value.
    const hasMaterialEdit = MATERIAL_FIELDS.some(f => {
      const newVal = parsed.data[f as keyof typeof parsed.data];
      if (newVal === undefined) return false;
      const currentVal = (current as any)[f];
      return JSON.stringify(newVal) !== JSON.stringify(currentVal);
    });
    const isApproved = ['APPROVED', 'SCHEDULED', 'ACTIVE'].includes(current.status);

    const {
      selected_meta_account_id: upd_sma,
      ads_data:                 upd_ads,
      eu_targeting:             upd_eu,
      eu_beneficiary:           upd_ben,
      eu_payer:                 upd_pay,
      tracking_pixel_id:        upd_px,
      conversion_event:         upd_ce,
      welcome_message:          upd_wm,
      device_type:              upd_dt,
      ...coreUpdateData
    } = parsed.data;

    const updates: Record<string, unknown> = {
      ...coreUpdateData,
      updated_at: new Date().toISOString(),
    };
    // Only write optional JSON/meta fields when explicitly provided in the PATCH body —
    // omitting a field must not overwrite it with null in the DB.
    if (upd_sma !== undefined) updates.selected_meta_account_id = upd_sma ?? null;
    if (upd_ads !== undefined) updates.ads_data                 = upd_ads ?? null;
    if (upd_eu  !== undefined) updates.eu_targeting             = upd_eu  ?? null;
    if (upd_ben !== undefined) updates.eu_beneficiary           = upd_ben ?? null;
    if (upd_pay !== undefined) updates.eu_payer                 = upd_pay ?? null;
    if (upd_px  !== undefined) updates.tracking_pixel_id        = upd_px  ?? null;
    if (upd_ce  !== undefined) updates.conversion_event         = upd_ce  ?? null;
    if (upd_wm  !== undefined) updates.welcome_message          = upd_wm  ?? null;
    if (upd_dt  !== undefined) updates.device_type              = upd_dt  ?? null;

    if (hasMaterialEdit && isApproved) {
      updates.three_key_status = 'VOIDED';
      updates.status = 'DRAFT';
    }

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(updates)
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Campaign not found' });

    if (parsed.data.status && parsed.data.status !== current.status) {
      await logCampaignEvent(
        workspaceId, data.id,
        `campaign.status.changed`,
        userId, req.user?.role,
        current.status, parsed.data.status,
        { wizard_step: data.wizard_step },
      );
    }

    if (hasMaterialEdit && isApproved) {
      await logCampaignEvent(
        workspaceId, data.id,
        'campaign.approval.voided',
        userId, req.user?.role,
        current.status, 'DRAFT',
        { reason: 'Material edit after approval' },
      );
    }

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    // Delete from Meta first (non-fatal — the DB record is still removed even if Meta cleanup fails)
    await deleteMetaCampaign(String(req.params.id), workspaceId).catch(() => {});

    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) { next(err); }
};

export const getCampaignPosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (campErr || !campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .select('id, content, platform, status, media_urls, created_at, project_id, creator_id')
      .eq('campaign_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const projectIds = [...new Set((data || []).map((p: { project_id: string | null }) => p.project_id).filter(Boolean))];
    const projectMap: Record<string, string> = {};
    if (projectIds.length > 0) {
      const { data: projects } = await supabaseAdmin
        .from('projects').select('id, name').in('id', projectIds as string[]);
      (projects || []).forEach((p: { id: string; name: string }) => { projectMap[p.id] = p.name; });
    }

    const creatorIds = [...new Set((data || []).map((p: { creator_id: string | null }) => p.creator_id).filter(Boolean))];
    const creatorMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users').select('id, full_name, email').in('id', creatorIds as string[]);
      (users || []).forEach((u: { id: string; full_name?: string; email?: string }) => {
        creatorMap[u.id] = u.full_name || u.email || u.id;
      });
    }

    res.json({
      success: true,
      data: (data || []).map((p: Record<string, unknown>) => ({
        ...p,
        project_name: p.project_id ? (projectMap[p.project_id as string] || null) : null,
        creator_name: p.creator_id ? (creatorMap[p.creator_id as string] || null) : null,
      })),
    });
  } catch (err) { next(err); }
};
