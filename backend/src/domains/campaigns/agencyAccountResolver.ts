import { supabaseAdmin } from '../../shared/supabase';

export interface AgencyAccount {
  id:                    string;
  platform:              string;
  access_token:          string;
  refresh_token:         string | null;
  ad_account_id:         string | null;   // Meta: act_xxx  (fallback)
  agency_ad_account_id:  string | null;   // Meta: act_xxx  (preferred agency account)
  agency_page_id:        string | null;   // Meta: Facebook Page ID for ad creatives
  google_ads_customer_id: string | null;  // Google: client customer ID or agency account
  account_handle:        string | null;
  account_name:          string | null;
}

/**
 * Resolves the agency's designated connected account for a given platform.
 * The admin marks exactly one account per platform per workspace as the default
 * via the Admin → Ad Accounts settings page.
 *
 * Throws a user-friendly error if no default is configured so it surfaces
 * clearly in the API response rather than failing silently.
 */
export async function resolveAgencyAccount(
  workspaceId: string,
  platform: 'meta' | 'google',
): Promise<AgencyAccount> {
  const platformFilter = platform === 'meta'
    ? ['facebook', 'instagram']
    : ['googleads'];

  const { data, error } = await supabaseAdmin
    .from('connected_accounts')
    .select(`
      id, platform, access_token, refresh_token,
      ad_account_id, agency_ad_account_id, agency_page_id,
      google_ads_customer_id, account_handle, account_name
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_agency_default', true)
    .in('platform', platformFilter)
    .maybeSingle();

  if (error) throw new Error(`Agency account lookup failed: ${error.message}`);

  if (!data) {
    const platformLabel = platform === 'meta' ? 'Meta (Facebook/Instagram)' : 'Google Ads';
    throw new Error(
      `No agency ${platformLabel} account configured. ` +
      `Go to Admin → Ad Accounts and mark an account as the agency default.`
    );
  }

  return data as AgencyAccount;
}

/**
 * Resolves the effective ad account ID for Meta:
 * Uses agency_ad_account_id if set, falls back to ad_account_id.
 * Ensures the act_ prefix is present.
 */
export function resolveMetaAdAccountId(account: AgencyAccount): string {
  const raw = account.agency_ad_account_id || account.ad_account_id || '';
  if (!raw) throw new Error('Agency Meta account has no ad account ID. Set one in Admin → Ad Accounts.');
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

/**
 * Resolves the Facebook Page ID for ad creatives.
 * Returns agency_page_id (numeric page ID) only — account_handle is a username
 * string and is rejected by Meta's API as a non-numeric page_id value.
 */
export function resolveMetaPageId(account: AgencyAccount): string | null {
  return account.agency_page_id || null;
}
