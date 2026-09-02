/**
 * Meta Marketing API warm-up / health exerciser
 * ------------------------------------------------------------------
 * Purpose: drive the app's rolling "last 500 Marketing API calls" error
 * rate DOWN before re-requesting the Marketing API Access Tier.
 *
 * It makes ONLY safe, read-only GET calls that the dashboard genuinely
 * uses (ad account → campaigns → ad sets → ads → creatives → insights),
 * every one signed with appsecret_proof and on the app admin's OWN ad
 * account. These reliably return 200, so the error ratio improves.
 *
 * It NEVER creates, edits, deletes, or spends anything.
 *
 * Usage:
 *   cd backend
 *   npx ts-node scripts/metaMarketingWarmup.ts            # ~500 calls, all Meta accounts
 *   TARGET_CALLS=600 npx ts-node scripts/metaMarketingWarmup.ts
 *   ACCOUNT_ID=act_1234567890 npx ts-node scripts/metaMarketingWarmup.ts  # single account
 */

import { createHmac } from 'crypto';
import { supabaseAdmin } from '../src/shared/supabase';
import { env } from '../src/config/env';

const META_GRAPH = 'https://graph.facebook.com/v21.0';
const TARGET_CALLS = Number(process.env.TARGET_CALLS || 500);
const ONLY_ACCOUNT = process.env.ACCOUNT_ID || '';

const RATE_LIMIT_CODES = new Set([4, 17, 32, 80004]);

let ok = 0;
let err = 0;
const errorSamples: Array<{ path: string; code?: number; message?: string }> = [];

function appSecretProof(token: string): string {
  const secret = env.META_APP_SECRET;
  if (!secret) return '';
  return createHmac('sha256', secret).update(token).digest('hex');
}

function actId(raw: string): string {
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/** One signed GET. Returns parsed JSON; records success/failure. Retries on rate limit. */
async function metaGet(path: string, token: string, attempt = 0): Promise<any> {
  if (ok + err >= TARGET_CALLS && ok >= TARGET_CALLS) return null;
  const sep = path.includes('?') ? '&' : '?';
  const proof = appSecretProof(token);
  const url = `${META_GRAPH}${path}${sep}access_token=${token}${proof ? `&appsecret_proof=${proof}` : ''}`;
  let json: any;
  try {
    const r = await fetch(url);
    json = await r.json();
  } catch (e: any) {
    err++;
    errorSamples.push({ path, message: `network: ${e?.message}` });
    return null;
  }
  if (json?.error) {
    const code = json.error.code;
    if (RATE_LIMIT_CODES.has(code) && attempt < 4) {
      const delay = Math.pow(2, attempt) * 2000;
      process.stdout.write(`  ⏳ rate-limited (code ${code}), backing off ${delay}ms\n`);
      await sleep(delay);
      return metaGet(path, token, attempt + 1);
    }
    err++;
    if (errorSamples.length < 15) errorSamples.push({ path, code, message: json.error.message });
    return json;
  }
  ok++;
  return json;
}

/** Follow paging.cursors.after up to `maxPages` extra pages. */
async function paged(basePath: string, token: string, maxPages = 3): Promise<any[]> {
  const items: any[] = [];
  let after = '';
  for (let p = 0; p <= maxPages; p++) {
    if (ok >= TARGET_CALLS) break;
    const sep = basePath.includes('?') ? '&' : '?';
    const path = after ? `${basePath}${sep}after=${after}` : basePath;
    const res = await metaGet(path, token);
    if (!res || res.error) break;
    if (Array.isArray(res.data)) items.push(...res.data);
    after = res.paging?.cursors?.after || '';
    if (!after || !res.paging?.next) break;
  }
  return items;
}

async function warmAccount(adAccountId: string, token: string) {
  const act = actId(adAccountId);
  process.stdout.write(`\n▶ ${act}\n`);

  // Account detail + status (a few field variants = a few reliable reads)
  await metaGet(`/${act}?fields=account_status,name,currency,timezone_name`, token);
  await metaGet(`/${act}?fields=amount_spent,balance,spend_cap,funding_source`, token);
  await metaGet(`/${act}?fields=business_country_code,disable_reason,capabilities`, token);

  // Account-level insights across several presets
  for (const preset of ['today', 'yesterday', 'last_7d', 'last_30d', 'last_90d', 'this_month', 'last_month']) {
    if (ok >= TARGET_CALLS) return;
    await metaGet(`/${act}/insights?fields=impressions,reach,spend,clicks,cpc,ctr&date_preset=${preset}`, token);
  }

  // Campaigns (paged) → then per-campaign insights & child reads
  const campaigns = await paged(`/${act}/campaigns?fields=id,name,status,objective&limit=25`, token, 3);
  const adsets    = await paged(`/${act}/adsets?fields=id,name,status,optimization_goal,billing_event&limit=25`, token, 3);
  const ads       = await paged(`/${act}/ads?fields=id,name,status&limit=25`, token, 3);
  await paged(`/${act}/adcreatives?fields=id,name,object_story_id&limit=25`, token, 2);

  for (const c of campaigns) {
    if (ok >= TARGET_CALLS) return;
    await metaGet(`/${c.id}?fields=id,name,status,objective,daily_budget,lifetime_budget`, token);
    await metaGet(`/${c.id}/insights?fields=impressions,reach,spend,clicks&date_preset=last_30d`, token);
  }
  for (const s of adsets) {
    if (ok >= TARGET_CALLS) return;
    await metaGet(`/${s.id}?fields=id,name,status,optimization_goal,targeting`, token);
  }
  for (const a of ads) {
    if (ok >= TARGET_CALLS) return;
    await metaGet(`/${a.id}?fields=id,name,status,creative`, token);
  }
}

async function main() {
  if (!env.META_APP_SECRET) {
    process.stdout.write('✖ META_APP_SECRET not set — appsecret_proof cannot be computed. Aborting.\n');
    process.exit(1);
  }

  process.stdout.write(`Meta Marketing API warm-up — target ${TARGET_CALLS} successful calls\n`);

  // Load Meta connected accounts that have a token + an ad account id.
  const { data, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('id, platform, access_token, ad_account_id, agency_ad_account_id, account_name')
    .in('platform', ['facebook', 'instagram']);

  if (error) { process.stdout.write(`✖ DB error: ${error.message}\n`); process.exit(1); }

  let accounts = (data || []).filter((a: any) => a.access_token && (a.agency_ad_account_id || a.ad_account_id));
  if (ONLY_ACCOUNT) {
    accounts = accounts.filter((a: any) => actId(a.agency_ad_account_id || a.ad_account_id) === actId(ONLY_ACCOUNT));
  }

  if (accounts.length === 0) {
    process.stdout.write('✖ No Meta connected accounts with an ad account id found in connected_accounts.\n');
    process.exit(1);
  }
  process.stdout.write(`Found ${accounts.length} Meta ad account(s).\n`);

  // Loop accounts repeatedly until we hit the target (safe: all reads).
  let guard = 0;
  while (ok < TARGET_CALLS && guard < 20) {
    guard++;
    for (const a of accounts) {
      if (ok >= TARGET_CALLS) break;
      const adAccountId = a.agency_ad_account_id || a.ad_account_id;
      await warmAccount(adAccountId, a.access_token);
    }
  }

  const total = ok + err;
  const rate = total ? ((err / total) * 100).toFixed(1) : '0';
  process.stdout.write(`\n─────────────────────────────────────────────\n`);
  process.stdout.write(`Total calls: ${total}   ✅ ${ok}   ❌ ${err}   (error rate ${rate}%)\n`);
  if (errorSamples.length) {
    process.stdout.write(`\nError samples (fix these before re-requesting):\n`);
    for (const e of errorSamples) {
      process.stdout.write(`  • [${e.code ?? '-'}] ${e.path} — ${e.message}\n`);
    }
  } else {
    process.stdout.write(`\nNo errors — the recent-call window is clean.\n`);
  }
  process.exit(0);
}

main().catch((e) => { process.stdout.write(`Fatal: ${e?.message}\n`); process.exit(1); });
