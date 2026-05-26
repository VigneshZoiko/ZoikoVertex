import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

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
  geography:                  z.array(z.string()).default([]),
  audience_summary:           z.string().optional(),
  audience_segments:          z.array(z.string()).default([]),
  exclusions:                 z.array(z.string()).default([]),
  sensitive_category_status:  z.string().default('NONE'),
  jurisdictional_flags:       z.array(z.string()).default([]),
}).default({ geography: [], audience_segments: [], exclusions: [], sensitive_category_status: 'NONE', jurisdictional_flags: [] });

const CreativeSchema = z.object({
  asset_ids:        z.array(z.string()).default([]),
  copy_text:        z.string().optional(),
  headline:         z.string().optional(),
  cta_text:         z.string().optional(),
  landing_page_url: z.string().optional(),
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
  wizard_step:            z.number().int().min(1).max(5).default(1),

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
    res.json({ success: true, data });
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

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        ...parsed.data,
        workspace_id: workspaceId,
        org_id:       ws.org_id,
        created_by:   userId,
        status:       'DRAFT',
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
    const hasMaterialEdit = MATERIAL_FIELDS.some(f => parsed.data[f as keyof typeof parsed.data] !== undefined);
    const isApproved = ['APPROVED', 'SCHEDULED', 'ACTIVE'].includes(current.status);

    const updates: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

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
