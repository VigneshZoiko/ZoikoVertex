import { Response } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import {
  publishCampaignToMeta,
  toggleMetaCampaignStatus,
  deleteMetaCampaign,
  syncCampaignsFromMeta,
} from './metaCampaignPublisher';

// ── POST /api/v1/campaigns/:id/publish-to-meta ────────────────────────────────

export const publishToMeta = async (req: AuthRequest, res: Response) => {
  const id           = req.params.id as string;
  const workspaceId  = req.user?.workspace_id;
  if (!workspaceId)  return res.status(400).json({ error: 'Missing workspace context' });

  try {
    const result = await publishCampaignToMeta(id, workspaceId);

    if (!result.success) {
      logger.warn({ campaignId: id, error: result.error }, '[MetaPublish] Failed');
      return res.status(400).json({ success: false, error: result.error });
    }

    logger.info({ campaignId: id, meta_campaign_id: result.meta_campaign_id }, '[MetaPublish] Success');
    return res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg, campaignId: id }, '[MetaPublish] Unexpected error');
    return res.status(500).json({ success: false, error: msg });
  }
};

// ── POST /api/v1/campaigns/:id/toggle-meta-status ────────────────────────────

export const toggleMetaStatus = async (req: AuthRequest, res: Response) => {
  const id          = req.params.id as string;
  const workspaceId = req.user?.workspace_id;
  const { pause }   = req.body as { pause?: boolean };
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  const result = await toggleMetaCampaignStatus(id, workspaceId, !!pause);
  if (!result.success) return res.status(400).json({ error: result.error });
  return res.json({ success: true });
};

// ── DELETE /api/v1/campaigns/:id/meta ────────────────────────────────────────

export const deleteFromMeta = async (req: AuthRequest, res: Response) => {
  const id          = req.params.id as string;
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  await deleteMetaCampaign(id, workspaceId);
  return res.json({ success: true });
};

// ── POST /api/v1/campaigns/meta/sync ─────────────────────────────────────────

export const syncFromMeta = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  // Find the linked ad account
  const { data: accs } = await supabaseAdmin
    .from('connected_accounts')
    .select('ad_account_id, agency_ad_account_id, access_token, refresh_token')
    .eq('workspace_id', workspaceId)
    .in('platform', ['facebook', 'instagram'])
    .not('ad_account_id', 'is', null)
    .limit(1);

  const acc = accs?.[0];
  if (!acc) return res.status(400).json({ error: 'No Meta ad account linked.' });

  const adAccountId = acc.agency_ad_account_id || acc.ad_account_id;
  const token       = acc.access_token || acc.refresh_token;
  if (!token) return res.status(400).json({ error: 'Access token not found. Reconnect Facebook.' });

  const result = await syncCampaignsFromMeta(workspaceId, adAccountId, token);
  if (result.error) return res.status(400).json({ error: result.error });

  return res.json({ success: true, data: { synced: result.synced } });
};

// ── GET /api/v1/campaigns/meta/ad-account-details ────────────────────────────
// Returns the linked ad account details from Meta (spend, status, currency)

export const getAdAccountDetails = async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });

  const { data: accs } = await supabaseAdmin
    .from('connected_accounts')
    .select('ad_account_id, agency_ad_account_id, access_token, refresh_token, account_name')
    .eq('workspace_id', workspaceId)
    .in('platform', ['facebook'])
    .not('ad_account_id', 'is', null)
    .limit(1);

  const acc = accs?.[0];
  if (!acc) return res.json({ success: true, data: null });

  const adAcctRaw   = acc.agency_ad_account_id || acc.ad_account_id;
  const adAccountId = adAcctRaw?.startsWith('act_') ? adAcctRaw : `act_${adAcctRaw}`;
  const token       = acc.access_token || acc.refresh_token;
  if (!token) return res.json({ success: true, data: null });

  try {
    const fields = 'id,name,account_status,currency,timezone_name,amount_spent,spend_cap,balance';
    const r = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}?fields=${fields}&access_token=${token}`);
    const data = await r.json() as any;

    if (data.error) return res.json({ success: true, data: null });

    return res.json({
      success: true,
      data: {
        id:           data.id,
        name:         data.name || acc.account_name,
        status:       data.account_status === 1 ? 'Active' : 'Inactive',
        currency:     data.currency,
        timezone:     data.timezone_name,
        amount_spent: data.amount_spent ? (parseInt(data.amount_spent) / 100).toFixed(2) : '0.00',
        spend_cap:    data.spend_cap    ? (parseInt(data.spend_cap)    / 100).toFixed(2) : null,
        balance:      data.balance      ? (parseInt(data.balance)      / 100).toFixed(2) : null,
      },
    });
  } catch { return res.json({ success: true, data: null }); }
};
