/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest }   from '../../shared/authMiddleware';

// ── GET /api/v1/admin/ad-accounts ────────────────────────────
// Lists all connected Meta and Google Ads accounts for the workspace
// with their agency-default status so admin can configure them.

export const listAgencyAdAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .select(`
        id, platform, account_name, account_handle, avatar_url, status,
        ad_account_id, ad_account_name,
        agency_ad_account_id, agency_page_id,
        google_ads_customer_id, is_agency_default,
        created_at, updated_at
      `)
      .eq('workspace_id', workspaceId)
      .in('platform', ['facebook', 'instagram', 'googleads'])
      .order('platform')
      .order('created_at');

    if (error) throw error;

    // Group by platform category
    const metaAccounts   = (data || []).filter(a => ['facebook', 'instagram'].includes(a.platform));
    const googleAccounts = (data || []).filter(a => a.platform === 'googleads');

    return res.json({
      success: true,
      data: { meta: metaAccounts, google: googleAccounts },
    });
  } catch (err) { next(err); }
};

// ── POST /api/v1/admin/ad-accounts/:id/set-default ───────────
// Marks one connected account as the agency default for its platform.
// Clears the default flag on any other account with the same platform.

export const setAgencyDefault = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { id } = req.params;
    const {
      agency_ad_account_id,   // Meta: ad account ID (act_xxx) — optional update
      agency_page_id,          // Meta: Facebook Page ID — optional update
      google_ads_customer_id,  // Google: customer ID — optional update
    } = req.body;

    // Fetch the account to get its platform
    const { data: account } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!account) return res.status(404).json({ error: 'Connected account not found' });

    // Clear default on all accounts with the same platform in this workspace
    const platformGroup = account.platform === 'googleads'
      ? ['googleads']
      : ['facebook', 'instagram'];

    await supabaseAdmin
      .from('connected_accounts')
      .update({ is_agency_default: false, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .in('platform', platformGroup);

    // Set default on the chosen account + update optional fields
    const updatePayload: Record<string, unknown> = {
      is_agency_default: true,
      updated_at:        new Date().toISOString(),
    };
    if (agency_ad_account_id  !== undefined) updatePayload.agency_ad_account_id  = agency_ad_account_id;
    if (agency_page_id         !== undefined) updatePayload.agency_page_id         = agency_page_id;
    if (google_ads_customer_id !== undefined) updatePayload.google_ads_customer_id = google_ads_customer_id;

    const { data: updated, error } = await supabaseAdmin
      .from('connected_accounts')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    const platformLabel = account.platform === 'googleads' ? 'Google Ads' : 'Meta';
    return res.json({
      success: true,
      data:    updated,
      message: `${platformLabel} agency default set. All client campaigns will use this account.`,
    });
  } catch (err) { next(err); }
};

// ── DELETE /api/v1/admin/ad-accounts/:id/unset-default ───────

export const unsetAgencyDefault = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { data: updated, error } = await supabaseAdmin
      .from('connected_accounts')
      .update({ is_agency_default: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    if (!updated) return res.status(404).json({ error: 'Account not found' });

    return res.json({ success: true, data: updated, message: 'Agency default cleared.' });
  } catch (err) { next(err); }
};
