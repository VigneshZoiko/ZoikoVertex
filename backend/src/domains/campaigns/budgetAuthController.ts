import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logCampaignEvent } from './campaignsController';

// ── POST /api/v1/campaigns/:id/budget-auth/request ────────────

const RequestSchema = z.object({
  justification: z.string().min(1).max(1000).optional(),
});

export const requestBudgetAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, budget_total, budget_daily, budget_currency, budget_owner_id')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!campaign.budget_total) return res.status(400).json({ error: 'Set a budget total before requesting authorization' });
    if (!campaign.budget_owner_id) return res.status(400).json({ error: 'Assign a budget owner before requesting authorization' });

    const parsed = RequestSchema.safeParse(req.body);

    // Cancel any existing PENDING auth for this campaign
    await supabaseAdmin
      .from('budget_authorizations')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('campaign_id', campaign.id)
      .eq('workspace_id', workspaceId)
      .eq('status', 'PENDING');

    const { data: auth, error } = await supabaseAdmin
      .from('budget_authorizations')
      .insert({
        workspace_id:     workspaceId,
        campaign_id:      campaign.id,
        requested_by:     userId,
        budget_owner_id:  campaign.budget_owner_id,
        requested_amount: campaign.budget_total,
        requested_daily:  campaign.budget_daily  || null,
        currency:         campaign.budget_currency || 'USD',
        justification:    (parsed.success && parsed.data.justification) || null,
        status:           'PENDING',
        expires_at:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, campaign.id,
      'budget.authorization.requested',
      userId, req.user?.role,
      null, null,
      { amount: campaign.budget_total, currency: campaign.budget_currency, auth_id: auth.id },
    );

    res.status(201).json({ success: true, data: auth, message: 'Budget authorization requested. The budget owner will be notified.' });
  } catch (err) { next(err); }
};

// ── GET /api/v1/campaigns/:id/budget-auth ─────────────────────

export const getBudgetAuthForCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data, error } = await supabaseAdmin
      .from('budget_authorizations')
      .select('*')
      .eq('campaign_id', req.params.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const active = (data || []).find(a => ['PENDING', 'APPROVED'].includes(a.status)) || null;

    res.json({ success: true, data: { active, history: data || [] } });
  } catch (err) { next(err); }
};

// ── GET /api/v1/budget-authorizations — list for budget owner ─

export const listBudgetAuths = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const role        = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { status } = req.query;

    const canSeeAll = ['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN', 'APPROVER', 'FINAL_APPROVER'].includes(role);

    let query = supabaseAdmin
      .from('budget_authorizations')
      .select(`
        *,
        campaigns ( id, name, campaign_type, status )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (!canSeeAll) {
      query = query.eq('budget_owner_id', userId!);
    }
    if (status) query = query.eq('status', String(status));

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
};

// ── POST /api/v1/budget-authorizations/:id/approve ────────────

const DecisionSchema = z.object({
  decision_note: z.string().max(500).optional(),
});

export const approveBudgetAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const role        = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: auth } = await supabaseAdmin
      .from('budget_authorizations')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!auth) return res.status(404).json({ error: 'Authorization request not found' });
    if (auth.status !== 'PENDING') return res.status(400).json({ error: `Cannot approve — status is ${auth.status}` });

    const canApprove = ['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN', 'APPROVER', 'FINAL_APPROVER'].includes(role)
      || auth.budget_owner_id === userId;

    if (!canApprove) return res.status(403).json({ error: 'Only the budget owner or an admin can approve this request' });

    const parsed = DecisionSchema.safeParse(req.body);
    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('budget_authorizations')
      .update({
        status:       'APPROVED',
        decision_by:  userId,
        decision_at:  now,
        decision_note: (parsed.success && parsed.data.decision_note) || null,
        updated_at:   now,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, auth.campaign_id,
      'budget.authorization.approved',
      userId, role,
      null, null,
      { amount: auth.requested_amount, currency: auth.currency, auth_id: auth.id },
    );

    res.json({ success: true, data: updated, message: 'Budget authorized. The campaign can now proceed to launch.' });
  } catch (err) { next(err); }
};

// ── POST /api/v1/budget-authorizations/:id/reject ─────────────

const RejectSchema = z.object({
  decision_note: z.string().min(1).max(500),
});

export const rejectBudgetAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const role        = req.user?.role ?? '';
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const parsed = RejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'A rejection reason is required' });

    const { data: auth } = await supabaseAdmin
      .from('budget_authorizations')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!auth) return res.status(404).json({ error: 'Authorization request not found' });
    if (auth.status !== 'PENDING') return res.status(400).json({ error: `Cannot reject — status is ${auth.status}` });

    const canReject = ['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN', 'APPROVER', 'FINAL_APPROVER'].includes(role)
      || auth.budget_owner_id === userId;

    if (!canReject) return res.status(403).json({ error: 'Only the budget owner or an admin can reject this request' });

    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('budget_authorizations')
      .update({
        status:        'REJECTED',
        decision_by:   userId,
        decision_at:   now,
        decision_note: parsed.data.decision_note,
        updated_at:    now,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await logCampaignEvent(
      workspaceId, auth.campaign_id,
      'budget.authorization.rejected',
      userId, role,
      null, null,
      { amount: auth.requested_amount, currency: auth.currency, reason: parsed.data.decision_note, auth_id: auth.id },
    );

    res.json({ success: true, data: updated, message: 'Budget authorization rejected.' });
  } catch (err) { next(err); }
};
