/**
 * resolveCampaignMetaAccount.ts
 * ------------------------------------------------------------------
 * Single source of truth for resolving the Meta account + access token
 * used to read/manage a campaign on Meta.
 *
 * Historically every insights / status / delete path resolved the token
 * ONLY via campaigns.selected_meta_account_id. When that link was null
 * (published before it persisted, OR the linked account was later
 * disconnected — an ON DELETE SET NULL), all reads failed with
 * "Access token not found" even though the workspace still had a valid
 * connected account whose token could read the campaign.
 *
 * This resolver:
 *   1. tries campaigns.selected_meta_account_id;
 *   2. falls back to the workspace's connected Facebook/Instagram
 *      accounts when that is missing / deleted / tokenless — preferring
 *      accounts that have an ad account and are the agency default, but
 *      NOT requiring an ad account (a valid user token can read a
 *      campaign's insights regardless of whether an ad account is linked
 *      on the row);
 *   3. prefers the long-lived user token (refresh_token) for ads calls.
 */

import { supabaseAdmin } from '../../shared/supabase';

export interface ResolvedMetaAccount {
  accountId: string;
  token: string;
  adAccountId: string | null;   // normalized to act_...
  accountName: string | null;
  adAccountName: string | null;
}

interface AccountRow {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  ad_account_id: string | null;
  agency_ad_account_id: string | null;
  account_name: string | null;
  ad_account_name: string | null;
  is_agency_default?: boolean | null;
  created_at?: string | null;
}

const SELECT_COLS =
  'id, access_token, refresh_token, ad_account_id, agency_ad_account_id, account_name, ad_account_name, is_agency_default, created_at';

function build(acc: AccountRow | null | undefined): ResolvedMetaAccount | null {
  if (!acc) return null;
  const token = (acc.refresh_token || acc.access_token) as string | undefined;
  if (!token) return null;
  const rawAd = (acc.agency_ad_account_id || acc.ad_account_id) as string | null;
  const adAccountId = rawAd ? (rawAd.startsWith('act_') ? rawAd : `act_${rawAd}`) : null;
  return {
    accountId: acc.id,
    token,
    adAccountId,
    accountName: acc.account_name || null,
    adAccountName: acc.ad_account_name || null,
  };
}

export async function resolveCampaignMetaAccount(
  selectedMetaAccountId: string | null | undefined,
  workspaceId: string,
): Promise<ResolvedMetaAccount | null> {
  // 1. Try the explicitly selected account.
  if (selectedMetaAccountId) {
    const { data: acc } = await supabaseAdmin
      .from('connected_accounts')
      .select(SELECT_COLS)
      .eq('id', selectedMetaAccountId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    const built = build(acc as AccountRow | null);
    if (built) return built; // else fall through — account deleted or has no token
  }

  // 2. Fallback: any active FB/IG account in the workspace that has a token.
  //    Prefer accounts with an ad account, then the agency default, then oldest.
  const { data: accs } = await supabaseAdmin
    .from('connected_accounts')
    .select(SELECT_COLS)
    .eq('workspace_id', workspaceId)
    .in('platform', ['facebook', 'instagram'])
    .eq('status', 'active');

  const candidates = ((accs || []) as AccountRow[]).filter((a) => a.refresh_token || a.access_token);
  candidates.sort((a, b) => {
    const adA = a.agency_ad_account_id || a.ad_account_id ? 1 : 0;
    const adB = b.agency_ad_account_id || b.ad_account_id ? 1 : 0;
    if (adA !== adB) return adB - adA;
    const dfA = a.is_agency_default ? 1 : 0;
    const dfB = b.is_agency_default ? 1 : 0;
    if (dfA !== dfB) return dfB - dfA;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  return build(candidates[0]);
}
