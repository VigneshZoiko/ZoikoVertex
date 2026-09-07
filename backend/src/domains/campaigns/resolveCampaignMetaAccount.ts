/**
 * resolveCampaignMetaAccount.ts
 * ------------------------------------------------------------------
 * Single source of truth for resolving the Meta account + access token
 * used to read/manage a campaign on Meta.
 *
 * Historically every insights / status / delete path resolved the token
 * ONLY via campaigns.selected_meta_account_id. When that column is null
 * (e.g. a campaign published before the link was persisted), all reads
 * failed with "Access token not found" even though the workspace had a
 * perfectly valid connected Facebook account — so no spend/reach pulled.
 *
 * This resolver mirrors the publish path's fallback: prefer the campaign's
 * selected account, otherwise use the workspace's first connected
 * Facebook/Instagram account that has an ad account (agency default first).
 * It also prefers the long-lived user token (refresh_token) over the
 * page/access token, which is what the ads API requires.
 */

import { supabaseAdmin } from '../../shared/supabase';

export interface ResolvedMetaAccount {
  accountId: string;
  token: string;
  adAccountId: string | null;   // normalized to act_...
  accountName: string | null;
  adAccountName: string | null;
}

export async function resolveCampaignMetaAccount(
  selectedMetaAccountId: string | null | undefined,
  workspaceId: string,
): Promise<ResolvedMetaAccount | null> {
  let accountId: string | null = selectedMetaAccountId || null;

  // Fallback: first connected Meta account in the workspace that has an ad account.
  if (!accountId) {
    const { data: accs } = await supabaseAdmin
      .from('connected_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .in('platform', ['facebook', 'instagram'])
      .not('ad_account_id', 'is', null)
      .order('is_agency_default', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    accountId = accs?.[0]?.id || null;
  }

  if (!accountId) return null;

  const { data: account } = await supabaseAdmin
    .from('connected_accounts')
    .select('id, access_token, refresh_token, ad_account_id, agency_ad_account_id, account_name, ad_account_name')
    .eq('id', accountId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!account) return null;

  // Prefer the long-lived user token (refresh_token) for ads API calls.
  const token = (account.refresh_token || account.access_token) as string | undefined;
  if (!token) return null;

  const rawAd = (account.agency_ad_account_id || account.ad_account_id) as string | null;
  const adAccountId = rawAd ? (rawAd.startsWith('act_') ? rawAd : `act_${rawAd}`) : null;

  return {
    accountId: account.id,
    token,
    adAccountId,
    accountName: account.account_name || null,
    adAccountName: account.ad_account_name || null,
  };
}
