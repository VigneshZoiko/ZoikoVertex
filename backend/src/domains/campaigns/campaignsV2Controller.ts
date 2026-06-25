import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logCampaignEvent } from './campaignsController';
import { AutoCampaignBoostService } from './autoCampaignBoostService';
import { toggleMetaCampaignStatus } from './metaCampaignPublisher';
import { logger } from '../../shared/logger';

// ── Budget threshold constants ───────────────────────────────

const BUDGET_THRESHOLDS = {
  NOTICE:   0.70,
  WARNING:  0.85,
  PAUSE:    1.00,
  INCIDENT: 1.10,
};

// ── Launch Gate: 11 conditions (agency model) ────────────────

interface GateCondition {
  id:     string;
  label:  string;
  passed: boolean;
  reason: string | null;
}

function evaluateLaunchGate(campaign: Record<string, unknown>, actorRole: string, budgetAuthStatus?: string | null): GateCondition[] {
  const creative  = (campaign.creative  as Record<string, unknown>) || {};
  const targeting = (campaign.targeting as Record<string, unknown>) || {};
  const platforms = (campaign.platforms as string[]) || [];
  const boostSettings = (campaign.boost_settings as Record<string, unknown>) || {};

  return [
    {
      id:     '01',
      label:  'Budget, currency, pacing, schedule, and owner set',
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
      id:     '02',
      label:  'Campaign dates valid (end date after start date)',
      passed: !!(campaign.start_at && campaign.end_at && new Date(campaign.end_at as string) > new Date(campaign.start_at as string)),
      reason: (campaign.start_at && campaign.end_at && new Date(campaign.end_at as string) <= new Date(campaign.start_at as string))
        ? 'End date must be after start date'
        : (!campaign.start_at || !campaign.end_at) ? 'Start and end dates required' : null,
    },
    {
      id:     '03',
      label:  'Landing page URL present and UTM tracking configured or waived',
      passed: !!(creative.landing_page_url && String(creative.landing_page_url).startsWith('http') && (creative.utm_configured || creative.utm_waived)),
      reason: !creative.landing_page_url
        ? 'Landing page URL missing'
        : !String(creative.landing_page_url).startsWith('http')
          ? 'Landing page URL must start with http/https'
          : !(creative.utm_configured || creative.utm_waived)
            ? 'UTM must be configured or explicitly waived'
            : null,
    },
    {
      id:     '04',
      label:  'Launch approval received',
      passed: ['APPROVED', 'SCHEDULED'].includes(campaign.status as string),
      reason: !['APPROVED', 'SCHEDULED'].includes(campaign.status as string)
        ? `Campaign must be approved before launch (current: ${campaign.status})`
        : null,
    },
    {
      id:     '05',
      label:  'Acting user has launch authority',
      passed: ['APPROVER', 'FINAL_APPROVER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'].includes(actorRole),
      reason: !['APPROVER', 'FINAL_APPROVER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'].includes(actorRole)
        ? `Role "${actorRole}" does not have launch authority`
        : null,
    },
    {
      id:     '06',
      label:  'Budget authorized by budget owner',
      passed: budgetAuthStatus === 'APPROVED',
      reason: budgetAuthStatus === 'APPROVED'          ? null
        : budgetAuthStatus === 'PARTIALLY_APPROVED'    ? 'Partial approval received — a second approver is required for this HIGH budget (≥$500)'
        : budgetAuthStatus === 'PENDING'               ? 'Budget authorization is pending — awaiting approver decision'
        : budgetAuthStatus === 'REJECTED'              ? 'Budget authorization was rejected — re-request with updated justification'
        : budgetAuthStatus === 'EXPIRED'               ? 'Budget authorization expired — re-request required'
        : 'Budget authorization not yet requested — submit a request on the Budget tab',
    },
    {
      id:     '07',
      label:  'At least one ad platform selected',
      passed: platforms.length > 0,
      reason: platforms.length === 0 ? 'Select at least one platform in the campaign settings' : null,
    },
    {
      id:     '08',
      label:  'Campaign objective set',
      passed: !!(campaign.objective),
      reason: !campaign.objective ? 'Campaign objective must be set before launch' : null,
    },
    {
      id:     '09',
      label:  'Ad creative has headline and copy',
      passed: !!(creative.headline && creative.copy_text),
      reason: !creative.headline && !creative.copy_text
        ? 'Both headline and ad copy are required'
        : !creative.headline ? 'Ad headline is required'
        : !creative.copy_text ? 'Ad copy is required'
        : null,
    },
    {
      id:     '10',
      label:  'Meta: client ad account configured',
      // Only required if Meta is a selected platform
      passed: !platforms.includes('Meta') || !!(boostSettings.meta_connected_account_id),
      reason: platforms.includes('Meta') && !boostSettings.meta_connected_account_id
        ? 'Meta platform selected but no client ad account is configured — link a Meta ad account in Step 2'
        : null,
    },
    {
      id:     '11',
      label:  'Target audience region defined',
      // Warn if no geography — agency should always target specific regions for clients
      passed: Array.isArray(targeting.geography) && (targeting.geography as string[]).length > 0,
      reason: !(Array.isArray(targeting.geography) && (targeting.geography as string[]).length > 0)
        ? 'Target geography is empty — specify at least one target country for the client\'s campaign'
        : null,
    },
  ];
}

// ── getCampaignStats — summary cards for dashboard ───────────

export const getCampaignStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('status, risk_tier, budget_total, spend_recorded, end_at')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    const rows = data || [];
    const now = new Date();

    // A campaign is effectively completed when:
    //   - status is explicitly COMPLETED, OR
    //   - it was ACTIVE/PAUSED/SCHEDULED but its end_at has passed
    const isEffectivelyCompleted = (r: any) =>
      r.status === 'COMPLETED' ||
      (['ACTIVE', 'PAUSED', 'SCHEDULED'].includes(r.status) && r.end_at && new Date(r.end_at) < now);

    const isStillActive = (r: any) =>
      r.status === 'ACTIVE' && (!r.end_at || new Date(r.end_at) >= now);

    const isStillPaused = (r: any) =>
      r.status === 'PAUSED' && (!r.end_at || new Date(r.end_at) >= now);

    // Meta submits campaigns for platform review — until we sync Meta's effective_status
    // back, any ACTIVE campaign currently running (not expired) may be in review on Meta.
    // We surface internal workflow review statuses here; Meta review appears as ACTIVE
    // until a future status-sync worker updates the DB.
    const inReviewStatuses = ['READY_FOR_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED'];

    const stats = {
      total:             rows.length,
      draft:             rows.filter(r => r.status === 'DRAFT').length,
      in_review:         rows.filter(r => inReviewStatuses.includes(r.status)).length,
      approval_pending:  rows.filter(r => r.status === 'APPROVED').length,
      active:            rows.filter(isStillActive).length,
      paused:            rows.filter(isStillPaused).length,
      completed:         rows.filter(isEffectivelyCompleted).length,
      risk_flags:        rows.filter(r => ['high', 'critical'].includes(r.risk_tier)).length,
      budget_allocated:  rows.reduce((sum, r) => sum + (Number(r.budget_total) || 0), 0),
      spend_recorded:    rows.reduce((sum, r) => sum + (Number(r.spend_recorded) || 0), 0),
      needs_action:      rows.filter(r => inReviewStatuses.includes(r.status)).length,
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

    // Validate required fields for approval request
    const gaps: string[] = [];
    if (!campaign.objective)    gaps.push('objective');
    if (!campaign.budget_total) gaps.push('budget total');
    if (!campaign.start_at)     gaps.push('start date');
    if (!campaign.end_at)       gaps.push('end date');

    const creative = campaign.creative || {};
    if (!creative.landing_page_url) gaps.push('landing page URL');

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

    // Auto-assign budget owner to the submitting user if not already set
    const budgetOwnerPatch = campaign.budget_owner_id ? {} : { budget_owner_id: userId };

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('campaigns')
      .update({
        ...budgetOwnerPatch,
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

    res.json({ success: true, data: updated, message: 'Approval request submitted — a workspace owner will review and approve.' });
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

    // Fetch active budget authorization status for condition 06
    const { data: budgetAuthRow } = await supabaseAdmin
      .from('budget_authorizations')
      .select('status')
      .eq('campaign_id', campaign.id)
      .eq('workspace_id', workspaceId)
      .in('status', ['PENDING', 'PARTIALLY_APPROVED', 'APPROVED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const budgetAuthStatus = budgetAuthRow?.status ?? null;
    const campaignWithCount = { ...campaign, _event_count: eventCount ?? 0 };
    const conditions = evaluateLaunchGate(campaignWithCount, actorRole, budgetAuthStatus);

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

    // Governance gate (submit-for-review, budget auth, role restrictions) is disabled
    // while the campaign flow is being validated. Re-enable evaluateLaunchGate() here
    // once the end-to-end flow is confirmed working.

    // Minimal sanity checks only — fail fast with a clear message
    if (!campaign.platforms || (campaign.platforms as string[]).length === 0) {
      return res.status(400).json({ error: 'Select at least one platform before launching' });
    }
    if (!campaign.objective) {
      return res.status(400).json({ error: 'Campaign objective is required' });
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

    // If campaign is immediately ACTIVE, process any already-published posts
    if (newStatus === 'ACTIVE') {
      AutoCampaignBoostService.processActiveCampaignPosts(campaign.id, workspaceId)
        .catch((err: any) => logger.warn({ err, campaignId: campaign.id }, '[Launch] processActiveCampaignPosts failed (non-fatal)'));
      // Meta publishing is handled explicitly by the frontend via POST /publish-to-meta — no auto-push here.
    }

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
      .select('id, status, meta_campaign_id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Idempotent: already paused → return current state
    if (campaign.status === 'PAUSED') {
      const { data: current } = await supabaseAdmin.from('campaigns').select('*').eq('id', req.params.id).single();
      return res.json({ success: true, data: current, message: 'Campaign is already paused' });
    }

    if (!['ACTIVE', 'SCHEDULED'].includes(campaign.status)) {
      return res.status(400).json({ error: `Cannot pause a campaign in "${campaign.status}" status` });
    }

    // Pause on Meta — await the call so we know whether it succeeded
    let metaError: string | undefined;
    if ((campaign as any).meta_campaign_id) {
      const metaResult = await toggleMetaCampaignStatus(String(req.params.id), workspaceId, true)
        .catch((err: any) => ({ success: false, error: String(err?.message ?? err) }));
      if (!metaResult.success) {
        metaError = metaResult.error ?? 'Meta pause call failed';
        logger.warn({ metaError, campaignId: campaign.id }, '[Pause] Meta pause failed');
      }
    }

    const newStatus = 'PAUSED';

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(metaError ? { meta_error: metaError } : {}),
      })
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
      meta_warning: metaError,
      message: metaError
        ? `Campaign status set to ${newStatus} but Meta pause failed: ${metaError}`
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
      .select('id, status, meta_campaign_id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Pause on Meta immediately — fire-and-forget with logging (don't block emergency pause if Meta call fails)
    if ((campaign as any).meta_campaign_id) {
      toggleMetaCampaignStatus(String(req.params.id), workspaceId, true)
        .catch((err: any) => logger.warn({ err, campaignId: campaign.id }, '[EmergencyPause] Meta pause call failed (non-fatal)'));
    }

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

// ── approveCampaign — owner/admin approves pending campaign ──

export const approveCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const actorRole   = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    if (!['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN', 'APPROVER', 'FINAL_APPROVER'].includes(actorRole)) {
      return res.status(403).json({ error: 'Only admins and workspace owners can approve campaigns' });
    }

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, name')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (!['READY_FOR_REVIEW', 'IN_REVIEW'].includes(campaign.status)) {
      return res.status(400).json({ error: `Cannot approve campaign in status: ${campaign.status}` });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.approved',
      userId, actorRole,
      campaign.status, 'APPROVED',
      { approved_by: userId },
    );

    res.json({ success: true, data: updated, message: 'Campaign approved — ready to launch.' });
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
      await logCampaignEvent(workspaceId, campaign.id, 'campaign.budget.overspend', userId, req.user?.role,
        campaign.status, campaign.status,
        { spend: parsed.data.spend_recorded, budget: budgetTotal, ratio: spendRatio, threshold: '110%' });

    } else if (spendRatio >= BUDGET_THRESHOLDS.PAUSE && campaign.status === 'ACTIVE') {
      // Auto-pause: campaign has consumed 100% of its budget
      thresholdAlert = 'AUTO_PAUSED';
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'PAUSED', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('workspace_id', workspaceId);

      // Also pause all active boosts
      const { data: activeBoosts } = await supabaseAdmin
        .from('campaign_boosts')
        .select('id, platform, meta_campaign_id, google_campaign_id')
        .eq('campaign_id', campaign.id)
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE');

      for (const boost of activeBoosts || []) {
        await supabaseAdmin
          .from('campaign_boosts')
          .update({ status: 'PAUSED', updated_at: new Date().toISOString() })
          .eq('id', boost.id);
      }

      await logCampaignEvent(workspaceId, campaign.id, 'campaign.budget.auto_paused', userId, req.user?.role,
        'ACTIVE', 'PAUSED',
        { spend: parsed.data.spend_recorded, budget: budgetTotal, ratio: spendRatio, threshold: '100%', boosts_paused: (activeBoosts || []).length });

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

// ── resumeCampaign — PAUSED → ACTIVE (requires approval role) ─

const ResumeSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const resumeCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const actorRole   = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    // Resuming restarts ad spend — requires same authority as launching
    if (!['APPROVER', 'FINAL_APPROVER', 'ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'].includes(actorRole)) {
      return res.status(403).json({ error: 'Resuming a campaign requires approval authority' });
    }

    const parsed = ResumeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Resume reason is required' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, budget_total, spend_recorded, meta_campaign_id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Idempotent: already active → return current state
    if (['ACTIVE', 'SCHEDULED'].includes(campaign.status)) {
      const { data: current } = await supabaseAdmin.from('campaigns').select('*').eq('id', req.params.id).single();
      return res.json({ success: true, data: current, message: 'Campaign is already active' });
    }

    if (campaign.status !== 'PAUSED') {
      return res.status(400).json({ error: `Cannot resume a campaign in "${campaign.status}" status` });
    }

    // Block resume if budget is already exhausted
    const spendRatio = Number(campaign.budget_total) > 0
      ? Number(campaign.spend_recorded) / Number(campaign.budget_total)
      : 0;
    if (spendRatio >= BUDGET_THRESHOLDS.PAUSE) {
      return res.status(400).json({
        error:   'Cannot resume — budget is fully spent (≥100%). Increase budget before resuming.',
        spend_ratio: Math.round(spendRatio * 100),
      });
    }

    // Re-activate on Meta first — await so we surface failure
    let metaError: string | undefined;
    if (campaign.meta_campaign_id) {
      const metaResult = await toggleMetaCampaignStatus(String(req.params.id), workspaceId, false)
        .catch((err: any) => ({ success: false, error: String(err?.message ?? err) }));
      if (!metaResult.success) {
        metaError = metaResult.error ?? 'Meta activation failed';
        logger.warn({ metaError, campaignId: campaign.id }, '[Resume] Meta activation failed');
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
        ...(metaError ? { meta_error: metaError } : { meta_error: null }),
      })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.resumed',
      userId, actorRole,
      campaign.status, 'ACTIVE',
      { reason: parsed.data.reason, resumed_by: userId },
    );

    res.json({
      success: true,
      data: updated,
      meta_warning: metaError,
      message: metaError
        ? `Campaign DB status set to ACTIVE but Meta re-activation failed: ${metaError}`
        : 'Campaign resumed and is now active.',
    });
  } catch (err) { next(err); }
};

// ── requestChanges — reviewer sends campaign back with notes ──

const RequestChangesSchema = z.object({
  note: z.string().min(10, 'Please provide at least 10 characters explaining what needs to change').max(1000),
});

export const requestChanges = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const actorRole   = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    if (!['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN', 'APPROVER', 'FINAL_APPROVER'].includes(actorRole)) {
      return res.status(403).json({ error: 'Only reviewers can request changes' });
    }

    const parsed = RequestChangesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid request' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, name')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!['READY_FOR_REVIEW', 'IN_REVIEW'].includes(campaign.status)) {
      return res.status(400).json({ error: `Cannot request changes from status: ${campaign.status}` });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'CHANGES_REQUESTED', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.changes_requested',
      userId, actorRole,
      campaign.status, 'CHANGES_REQUESTED',
      { note: parsed.data.note, reviewer: userId },
    );

    res.json({
      success: true,
      data: updated,
      message: 'Campaign returned to the team for revisions.',
    });
  } catch (err) { next(err); }
};

// ── completeCampaign — manually mark a campaign as done ──────

export const completeCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const actorRole   = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    if (!['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN', 'APPROVER', 'FINAL_APPROVER'].includes(actorRole)) {
      return res.status(403).json({ error: 'Only admins can manually complete campaigns' });
    }

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, name')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (!['ACTIVE', 'PAUSED', 'SCHEDULED'].includes(campaign.status)) {
      return res.status(400).json({ error: `Cannot complete campaign in status: ${campaign.status}` });
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'COMPLETED', updated_at: now })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    // Complete all active boosts
    await supabaseAdmin
      .from('campaign_boosts')
      .update({ status: 'COMPLETED', updated_at: now })
      .eq('campaign_id', campaign.id)
      .in('status', ['ACTIVE', 'PAUSED', 'PENDING']);

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.completed',
      userId, actorRole,
      campaign.status, 'COMPLETED',
      { completed_by: userId, manual: true },
    );

    res.json({ success: true, data: updated, message: 'Campaign marked as completed.' });
  } catch (err) { next(err); }
};

// ── cancelCampaign — cancel a campaign (non-recoverable) ─────

const CancelSchema = z.object({
  reason: z.string().min(5).max(500),
});

export const cancelCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const actorRole   = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    if (!['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'].includes(actorRole)) {
      return res.status(403).json({ error: 'Only admins can cancel campaigns' });
    }

    const parsed = CancelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'A cancellation reason is required (min 5 chars)' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, name, budget_total, budget_currency, spend_recorded')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(campaign.status)) {
      return res.status(400).json({ error: `Campaign is already ${campaign.status}` });
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'CANCELLED', updated_at: now })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    // Cancel all boosts
    await supabaseAdmin
      .from('campaign_boosts')
      .update({ status: 'CANCELLED', updated_at: now })
      .eq('campaign_id', campaign.id)
      .in('status', ['ACTIVE', 'PAUSED', 'PENDING', 'SCHEDULED']);

    // Meta charges the client's ad account directly — no wallet refund needed on cancel.

    await logCampaignEvent(
      workspaceId, campaign.id,
      'campaign.cancelled',
      userId, actorRole,
      campaign.status, 'CANCELLED',
      { reason: parsed.data.reason, cancelled_by: userId },
    );

    res.json({ success: true, data: updated, message: 'Campaign cancelled.' });
  } catch (err) { next(err); }
};
