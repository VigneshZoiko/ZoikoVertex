/**
 * Backfill campaigns.selected_meta_account_id for campaigns that were published
 * to Meta (have meta_campaign_id) but never got their account link persisted.
 * Also clears stale "token not found / reconnect" meta_error banners once a
 * valid account resolves. Idempotent and safe to re-run.
 */
import { supabaseAdmin } from '../src/shared/supabase';
import { resolveCampaignMetaAccount } from '../src/domains/campaigns/resolveCampaignMetaAccount';

async function main() {
  const { data: campaigns, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, workspace_id, meta_campaign_id, selected_meta_account_id, meta_error')
    .not('meta_campaign_id', 'is', null);

  if (error) { console.log('DB error:', error.message); process.exit(1); }

  let linked = 0, cleared = 0, skipped = 0, alreadyLinked = 0;

  for (const c of campaigns || []) {
    let acctId = c.selected_meta_account_id as string | null;

    if (!acctId) {
      const resolved = await resolveCampaignMetaAccount(null, c.workspace_id);
      if (resolved) {
        await supabaseAdmin
          .from('campaigns')
          .update({ selected_meta_account_id: resolved.accountId, updated_at: new Date().toISOString() })
          .eq('id', c.id);
        acctId = resolved.accountId;
        linked++;
        console.log(`  LINKED  "${c.name}" -> ${resolved.accountName} (${resolved.accountId})`);
      } else {
        skipped++;
        console.log(`  SKIP    "${c.name}" — no connected Meta account with an ad account in workspace ${c.workspace_id}`);
        continue;
      }
    } else {
      alreadyLinked++;
    }

    if (acctId && c.meta_error && /token|reconnect/i.test(c.meta_error)) {
      await supabaseAdmin.from('campaigns').update({ meta_error: null }).eq('id', c.id);
      cleared++;
      console.log(`  CLEARED stale error on "${c.name}"`);
    }
  }

  console.log(`\nDone. linked=${linked}, cleared=${cleared}, already-linked=${alreadyLinked}, skipped=${skipped}, total=${campaigns?.length || 0}`);
  process.exit(0);
}

main().catch((e) => { console.log('fatal', e?.message); process.exit(1); });
