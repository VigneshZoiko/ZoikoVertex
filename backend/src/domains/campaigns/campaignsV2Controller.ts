import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logCampaignEvent } from './campaignsController';

// ── Budget threshold constants ───────────────────────────────

const BUDGET_THRESHOLDS = {
  NOTICE:   0.70,
  WARNING:  0.85,
  PAUSE:    1.00,
  INCIDENT: 1.10,
};

// ── Launch Gate: 13 conditions ───────────────────────────────

interface GateCondition {
  id:     string;
  label:  string;
  passed: boolean;
  reason: string | null;
}

function evaluateLaunchGate(campaign: Record<string, unknown>, actorRole: string): GateCondition[] {
  const targeting = (campaign.targeting as Record<string, unknown>) || {};
  const creative  = (campaign.creative  as Record<string, unknown>) || {};

  const conditions: GateCondition[] = [
    {
      id:     '01',
      label:  'Brief complete: objective, rationale, success metrics, target segment',
      passed: !!(campaign.objective && campaign.business_rationale && campaign.success_metrics && targeting.audience_summary),
      reason: (!campaign.objective || !campaign.business_rationale || !campaign.success_metrics || !targeting.audience_summary)
        ? 'Missing: ' + [
            !campaign.objective         && 'objective',
            !campaign.business_rationale && 'business rationale',
            !campaign.success_metrics   && 'success metrics',
            !targeting.audience_summary && 'audience summary',
          ].filter(Boolean).join(', ')
        : null,
    },
    {
      id:     '02',
      label:  'Campaign owner assigned with Campaign Manager role',
      passed: !!(campaign.campaign_manager_id),
      reason: !campaign.campaign_manager_id ? 'No Campaign Manager assigned' : null,
    },
    {
      id:     '03',
      label:  'Budget total, currency, pacing, schedule, and Budget Owner assigned',
      passed: !!(campaign.budget_total && campaign.budget_currency && campaign.budget_pacing && campaign.start_at && campaign.end_at && campaign.budget_owner_id),
      reason: (!(campaign.budget_total && campaign.budget_currency && campaign.budget_pacing && campaign.start_at && campaign.end_at && campaign.budget_owner_id))
        ? 'Missing: ' + [
            !campaign.budget_total    && 'budget total',
            !campaign.budget_currency && 'currency',
            !campaign.budget_pacing   && 'pacing',
            !campaign.start_at        && 'start date',
            !campaign.end_at          && 'end date',
            !campaign.budget_owner_id && 'budget owner',
          ].filter(Boolean).join(', ')
        : null,
    },
    {
      id:     '04',
      label:  'Campaign dates valid and not outside policy windows',
      passed: !!(campaign.start_at && campaign.end_at && new Date(campaign.end_at as string) > new Date(campaign.start_at as string)),
      reason: (campaign.start_at && campaign.end_at && new Date(campaign.end_at as string) <= new Date(campaign.start_at as string))
        ? 'End date must be after start date'
        : (!campaign.start_at || !campaign.end_at) ? 'Start and end dates required' : null,
    },
    {
      id:     '05',
      label:  'Audience geography, exclusions, and sensitivity declaration complete',
      passed: !!(targeting.geography && Array.isArray(targeting.geography) && (targeting.geography as string[]).length > 0 && targeting.sensitive_category_status),
      reason: (!(targeting.geography && Array.isArray(targeting.geography) && (targeting.geography as string[]).length > 0 && targeting.sensitive_category_status))
        ? 'Missing: ' + [
            (!(targeting.geography && Array.isArray(targeting.geography) && (targeting.geography as string[]).length > 0)) && 'geography',
            !targeting.sensitive_category_status && 'sensitive category declaration',
          ].filter(Boolean).join(', ')
        : null,
    },
    {
      id:     '06',
      label:  'Sensitive category and jurisdictional checks completed',
      passed: targeting.sensitive_category_status !== 'PENDING',
      reason: targeting.sensitive_category_status === 'PENDING' ? 'Sensitive category check still pending' : null,
    },
    {
      id:     '07',
      label:  'Creative assets, copy, CTA, and landing page URL present',
      passed: !!((creative.copy_text || (Array.isArray(creative.asset_ids) && (creative.asset_ids as string[]).length > 0)) && creative.cta_text && creative.landing_page_url),
      reason: (!((creative.copy_text || (Array.isArray(creative.asset_ids) && (creative.asset_ids as string[]).length > 0)) && creative.cta_text && creative.landing_page_url))
        ? 'Missing: ' + [
            !(creative.copy_text || (Array.isArray(creative.asset_ids) && (creative.asset_ids as string[]).length > 0)) && 'copy or creative asset',
            !creative.cta_text        && 'CTA text',
            !creative.landing_page_url && 'landing page URL',
          ].filter(Boolean).join(', ')
        : null,
    },
    {
      id:     '08',
      label:  'Landing page URL present and correctly formatted',
      passed: !!(creative.landing_page_url && String(creative.landing_page_url).startsWith('http')),
      reason: !creative.landing_page_url
        ? 'Landing page URL missing'
        : !String(creative.landing_page_url).startsWith('http')
          ? 'Landing page URL must start with http/https'
          : null,
    },
    {
      id:     '09',
      label:  'Tracking/UTM configured or deliberately waived with reason',
      passed: !!(creative.utm_configured || creative.utm_waived),
      reason: !(creative.utm_configured || creative.utm_waived) ? 'UTM must be configured or explicitly waived' : null,
    },
    {
      id:     '10',
      label:  'All required review gates completed',
      passed: ['APPROVED', 'SCHEDULED'].includes(campaign.status as string),
      reason: !['APPROVED', 'SCHEDULED'].includes(campaign.status as string) ? `Campaign status is ${campaign.status} — must be APPROVED` : null,
    },
    {
      id:     '11',
      label:  'Three-Key Approval Protocol satisfied for current campaign version',
      passed: campaign.three_key_status === 'APPROVED',
      reason: campaign.three_key_status !== 'APPROVED' ? `Three-key status: ${campaign.three_key_status ?? 'PENDING'} — all three keys must be signed` : null,
    },
    {
      id:     '12',
      label:  'Evidence chain open and audit events healthy',
      passed: !!(campaign._event_count && (campaign._event_count as number) > 0),
      reason: !(campaign._event_count && (campaign._event_count as number) > 0) ? 'No campaign events recorded — evidence chain is empty' : null,
    },
    {
      id:     '13',
      label:  'Acting user has Approver or higher launch authority',
      passed: ['APPROVER', 'FINAL_APPROVER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'].includes(actorRole),
      reason: !['APPROVER', 'FINAL_APPROVER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'].includes(actorRole)
        ? `Role "${actorRole}" does not have launch authority`
        : null,
    },
  ];

  return conditions;
}

// ── getCampaignStats — summary cards for dashboard ───────────

export const getCampaignStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('status, risk_tier, budget_total, spend_recorded')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    const rows = data || [];

    const stats = {
      total:             rows.length,
      draft:             rows.filter(r => r.status === 'DRAFT').length,
      in_review:         rows.filter(r => ['READY_FOR_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED'].includes(r.status)).length,
      approval_pending:  rows.filter(r => r.status === 'APPROVED').length,
      active:            rows.filter(r => r.status === 'ACTIVE').length,
      pausing:           rows.filter(r => r.status === 'PAUSING').length,
      paused:            rows.filter(r => r.status === 'PAUSED').length,
      completed:         rows.filter(r => r.status === 'COMPLETED').length,
      risk_flags:        rows.filter(r => ['high', 'critical'].includes(r.risk_tier)).length,
      budget_allocated:  rows.reduce((sum, r) => sum + (Number(r.budget_total) || 0), 0),
      spend_recorded:    rows.reduce((sum, r) => sum + (Number(r.spend_recorded) || 0), 0),
      needs_action:      rows.filter(r => ['READY_FOR_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED', 'PAUSING'].includes(r.status)).length,
    };

    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};

// ── submitForReview — validate required fields, transition ───

const SubmitReviewSchema = z.object({
  approval_tier: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export const submitCampaignForReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign, error: fetchErr } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchErr || !campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(campaign.status)) {
      return res.status(400).json({ error: `Cannot submit for review from status: ${campaign.status}` });
    }

    // Validate all required fields for submission
    const gaps: string[] = [];
    if (!campaign.objective)          gaps.push('objective');
    if (!campaign.business_rationale) gaps.push('business rationale');
    if (!campaign.campaign_manager_id) gaps.push('campaign manager');
    if (!campaign.budget_total)       gaps.push('budget total');
    if (!campaign.budget_owner_id)    gaps.push('budget owner');
    if (!campaign.start_at)           gaps.push('start date');
    if (!campaign.end_at)             gaps.push('end date');

    const targeting = campaign.targeting || {};
    if (!targeting.geography || !targeting.geography.length) gaps.push('audience geography');

    const creative = campaign.creative || {};
    if (!creative.landing_page_url)   gaps.push('landing page URL');

    if (gaps.length > 0) {
      return res.status(400).json({
        error: 'Campaign has required field gaps',
        gaps,
        message: `Complete these fields before submitting: ${gaps.join(', ')}`,
      });
    }

    const parsed = SubmitReviewSchema.safeParse(req.body);
    const approvalTier = parsed.success && parsed.data.approval_tier
      ? parsed.data.approval_tier
      : campaign.risk_tier || 'low';

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('campaigns')
      .update({
        status:        'READY_FOR_REVIEW',
        approval_tier: approvalTier,
        wizard_step:   5,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.review.submitted',
      userId, req.user?.role,
      campaign.status, 'READY_FOR_REVIEW',
      { approval_tier: approvalTier, gaps_resolved: true },
    );

    res.json({ success: true, data: updated, message: 'Campaign submitted for governance review' });
  } catch (err) { next(err); }
};

// ── checkLaunchGate — evaluate all 13 conditions ─────────────

export const checkLaunchGate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const actorRole   = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Count events for condition 12
    const { count: eventCount } = await supabaseAdmin
      .from('campaign_events')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id);

    const campaignWithCount = { ...campaign, _event_count: eventCount ?? 0 };
    const conditions = evaluateLaunchGate(campaignWithCount, actorRole);

    const passed  = conditions.filter(c => c.passed).length;
    const failed  = conditions.filter(c => !c.passed);
    const eligible = failed.length === 0;

    // Persist gate check result on campaign
    await supabaseAdmin
      .from('campaigns')
      .update({
        launch_gate_status: {
          eligible,
          evaluated_at:   new Date().toISOString(),
          passed_count:   passed,
          failed_conditions: failed.map(c => c.id),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId);

    res.json({
      success: true,
      data: {
        eligible,
        passed_count:  passed,
        total_conditions: conditions.length,
        conditions,
        failed_conditions: failed,
      },
    });
  } catch (err) { next(err); }
};

// ── launchCampaign — server-side gate then transition ────────

export const launchCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const actorRole   = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { count: eventCount } = await supabaseAdmin
      .from('campaign_events')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id);

    const campaignWithCount = { ...campaign, _event_count: eventCount ?? 0 };
    const conditions = evaluateLaunchGate(campaignWithCount, actorRole);
    const failed = conditions.filter(c => !c.passed);

    if (failed.length > 0) {
      return res.status(400).json({
        error:  'Launch blocked — conditions not met',
        failed_conditions: failed,
        message: `${failed.length} condition(s) must be resolved before launch`,
      });
    }

    // Determine SCHEDULED vs ACTIVE
    const isScheduled = campaign.start_at && new Date(campaign.start_at) > new Date();
    const newStatus   = isScheduled ? 'SCHEDULED' : 'ACTIVE';

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('campaigns')
      .update({
        status:     newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.launched',
      userId, actorRole,
      campaign.status, newStatus,
      { scheduled: isScheduled, start_at: campaign.start_at },
    );

    res.json({
      success: true,
      data:    updated,
      message: isScheduled
        ? `Campaign scheduled to launch on ${new Date(campaign.start_at).toLocaleDateString()}`
        : 'Campaign launched and is now active',
    });
  } catch (err) { next(err); }
};

// ── pauseCampaign ────────────────────────────────────────────

const PauseSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const pauseCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = PauseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Pause reason is required' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (!['ACTIVE', 'SCHEDULED', 'PAUSING'].includes(campaign.status)) {
      return res.status(400).json({ error: `Cannot pause campaign in status: ${campaign.status}` });
    }

    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSING' : 'PAUSED';

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.pause.requested',
      userId, req.user?.role,
      campaign.status, newStatus,
      { reason: parsed.data.reason },
    );

    res.json({
      success: true,
      data: updated,
      message: newStatus === 'PAUSING'
        ? 'Pause request sent. Campaign status set to PAUSING — spend may continue briefly until confirmed.'
        : 'Campaign paused.',
    });
  } catch (err) { next(err); }
};

// ── emergencyPauseCampaign ───────────────────────────────────

const EmergencyPauseSchema = z.object({
  reason:         z.string().min(1).max(500),
  crisis_context: z.string().optional(),
});

export const emergencyPauseCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const actorRole   = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    // Emergency pause requires elevated role
    if (!['CRISIS_COMMANDER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN', 'FINAL_APPROVER'].includes(actorRole)) {
      return res.status(403).json({ error: 'Emergency pause requires Crisis Commander or Admin authority' });
    }

    const parsed = EmergencyPauseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Reason is required for emergency pause' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({
        status:        'PAUSED',
        risk_tier:     'critical',
        updated_at:    new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.emergency_paused',
      userId, actorRole,
      campaign.status, 'PAUSED',
      { reason: parsed.data.reason, crisis_context: parsed.data.crisis_context, emergency: true },
    );

    res.json({ success: true, data: updated, message: 'Campaign emergency paused. Review required before resuming.' });
  } catch (err) { next(err); }
};

// ── getCampaignEvents — event log ────────────────────────────

export const getCampaignEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { data, error } = await supabaseAdmin
      .from('campaign_events')
      .select('*')
      .eq('campaign_id', req.params.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [], count: (data || []).length });
  } catch (err) { next(err); }
};

// ── updateSpend — record spend, check thresholds ─────────────

const SpendSchema = z.object({
  spend_recorded:   z.number().min(0),
  spend_data_state: z.enum(['PRELIMINARY', 'FINAL', 'STALE', 'VARIANCE']).default('PRELIMINARY'),
});

export const updateSpend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = SpendSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, budget_total, spend_recorded')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({
        spend_recorded:    parsed.data.spend_recorded,
        spend_data_state:  parsed.data.spend_data_state,
        last_reconciled_at: new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    // Evaluate budget thresholds
    const budgetTotal = Number(campaign.budget_total) || 0;
    const spendRatio  = budgetTotal > 0 ? parsed.data.spend_recorded / budgetTotal : 0;
    let thresholdAlert: string | null = null;

    if (spendRatio >= BUDGET_THRESHOLDS.INCIDENT) {
      thresholdAlert = 'OVERSPEND_INCIDENT';
      await logCampaignEvent(workspaceId, campaign.id, 'campaign.budget.overspend', userId, req.user?.role, null, null,
        { spend: parsed.data.spend_recorded, budget: budgetTotal, ratio: spendRatio, threshold: '110%' });
    } else if (spendRatio >= BUDGET_THRESHOLDS.PAUSE) {
      thresholdAlert = 'PAUSE_REQUESTED';
      await logCampaignEvent(workspaceId, campaign.id, 'campaign.budget.notice', userId, req.user?.role, null, null,
        { spend: parsed.data.spend_recorded, budget: budgetTotal, ratio: spendRatio, threshold: '100%' });
    } else if (spendRatio >= BUDGET_THRESHOLDS.WARNING) {
      thresholdAlert = 'PACING_WARNING';
      await logCampaignEvent(workspaceId, campaign.id, 'campaign.budget.warning', userId, req.user?.role, null, null,
        { spend: parsed.data.spend_recorded, budget: budgetTotal, ratio: spendRatio, threshold: '85%' });
    } else if (spendRatio >= BUDGET_THRESHOLDS.NOTICE) {
      thresholdAlert = 'PACING_NOTICE';
      await logCampaignEvent(workspaceId, campaign.id, 'campaign.budget.notice', userId, req.user?.role, null, null,
        { spend: parsed.data.spend_recorded, budget: budgetTotal, ratio: spendRatio, threshold: '70%' });
    }

    res.json({
      success: true,
      data:    updated,
      spend_ratio:     Math.round(spendRatio * 100),
      threshold_alert: thresholdAlert,
    });
  } catch (err) { next(err); }
};
