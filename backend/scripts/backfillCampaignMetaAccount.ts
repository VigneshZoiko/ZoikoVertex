/**
 * Repair campaigns.selected_meta_account_id for campaigns published to Meta.
 *
 * For each campaign that has a meta_campaign_id, this finds a connected
 * Facebook/Instagram account in the same workspace whose token can ACTUALLY
 * read the campaign on Meta (tested live), and links it. It also clears stale
 * "token / reconnect" meta_error banners once a working account is linked.
 *
 * This survives account swaps/disconnects: even if the originally-linked
 * account was deleted (ON DELETE SET NULL), it relinks to whichever connected
 * account still has access. Idempotent and safe to re-run.
 *
 *   cd backend && npx ts-node scripts/backfillCampaignMetaAccount.ts
 */
import { createHmac } from 'crypto';
import { supabaseAdmin } from '../src/shared/supabase';
import { env } from '../src/config/env';

const GRAPH = 'https://graph.facebook.com/v21.0';
function proof(t: string) {
  const s = env.META_APP_SECRET;
  return s ? createHmac('sha256', s).update(t).digest('hex') : '';
}

// Can this token read this Meta campaign object?
async function canRead(metaCampaignId: string, token: string): Promise<boolean> {
  try {
    const p = proof(token);
    const r = await fetch(`${GRAPH}/${metaCampaignId}?fields=id,status&access_token=${token}${p ? `&appsecret_proof=${p}` : ''}`);
    const j = (await r.json()) as any;
    return !j.error;
  } catch { return false; }
}

async function main() {
  const { data: campaigns, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, workspace_id, meta_campaign_id, selected_meta_account_id, meta_error')
    .not('meta_campaign_id', 'is', null);
  if (error) { console.log('DB error:', error.message); process.exit(1); }

  // cache accounts per workspace
  const acctCache = new Map<string, any[]>();
  async function accountsFor(ws: string) {
    if (acctCache.has(ws)) return acctCache.get(ws)!;
    const { data } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, account_name, access_token, refresh_token, ad_account_id, agency_ad_account_id, is_agency_default, created_at')
      .eq('workspace_id', ws).in('platform', ['facebook', 'instagram']).eq('status', 'active');
    const list = (data || []).filter((a: any) => a.refresh_token || a.access_token).sort((a: any, b: any) => {
      const adA = a.agency_ad_account_id || a.ad_account_id ? 1 : 0, adB = b.agency_ad_account_id || b.ad_account_id ? 1 : 0;
      if (adA !== adB) return adB - adA;
      const dfA = a.is_agency_default ? 1 : 0, dfB = b.is_agency_default ? 1 : 0;
      if (dfA !== dfB) return dfB - dfA;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
    acctCache.set(ws, list); return list;
  }

  let relinked = 0, kept = 0, cleared = 0, unresolved = 0;

  for (const c of campaigns || []) {
    const accs = await accountsFor(c.workspace_id);
    // If already linked to an account that can read → keep it.
    let workingId: string | null = null;
    if (c.selected_meta_account_id) {
      const cur = accs.find((a) => a.id === c.selected_meta_account_id);
      if (cur && (await canRead(c.meta_campaign_id, cur.refresh_token || cur.access_token))) workingId = cur.id;
    }
    if (!workingId) {
      for (const a of accs) {
        if (await canRead(c.meta_campaign_id, a.refresh_token || a.access_token)) { workingId = a.id; break; }
      }
    }

    if (!workingId) {
      unresolved++;
      console.log(`  UNRESOLVED "${c.name}" — no connected account can read ${c.meta_campaign_id}`);
      continue;
    }

    if (workingId === c.selected_meta_account_id) {
      kept++;
    } else {
      await supabaseAdmin.from('campaigns').update({ selected_meta_account_id: workingId, updated_at: new Date().toISOString() }).eq('id', c.id);
      relinked++;
      const nm = accs.find((a) => a.id === workingId)?.account_name;
      console.log(`  RELINKED "${c.name}" -> ${nm} (${workingId})`);
    }
    if (c.meta_error && /token|reconnect/i.test(c.meta_error)) {
      await supabaseAdmin.from('campaigns').update({ meta_error: null }).eq('id', c.id);
      cleared++;
    }
  }

  console.log(`\nDone. relinked=${relinked}, kept=${kept}, cleared=${cleared}, unresolved=${unresolved}, total=${campaigns?.length || 0}`);
  process.exit(0);
}

main().catch((e) => { console.log('fatal', e?.message); process.exit(1); });
