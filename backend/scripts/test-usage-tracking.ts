/**
 * Usage tracking diagnostic script.
 * Run: npx ts-node --project tsconfig.json scripts/test-usage-tracking.ts <workspaceId>
 *
 * Tests every layer: direct insert, trackUsage(), billing cycle calc, query back.
 */
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const workspaceId = process.argv[2];
if (!workspaceId) {
  console.error('Usage: npx ts-node scripts/test-usage-tracking.ts <workspaceId>');
  process.exit(1);
}

async function run() {
  console.log('\n=== USAGE TRACKING DIAGNOSTIC ===\n');
  console.log('Workspace ID:', workspaceId);

  // ── 1. Check resource_usage table exists + list recent rows ─────────────────
  console.log('\n── 1. Recent resource_usage rows (last 10) ──');
  const { data: existing, error: existErr } = await supabase
    .from('resource_usage')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (existErr) {
    console.error('❌ Query failed:', existErr.message);
    console.error('   Hint: resource_usage table may not exist or RLS is blocking service role key (unusual).');
  } else {
    console.log(`✅ Found ${existing?.length ?? 0} existing rows`);
    existing?.forEach(r => console.log(`   [${r.timestamp}] ${r.resource_type} qty=${r.quantity} ref=${r.reference_type}`));
  }

  // ── 2. Direct insert test ────────────────────────────────────────────────────
  console.log('\n── 2. Direct insert test ──');
  const testTs = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from('resource_usage')
    .insert({
      workspace_id: workspaceId,
      resource_type: 'AI_TOKENS',
      quantity: 999,
      cost_usd: 0.0001,
      unit: 'tokens',
      reference_type: 'diagnostic_test',
      metadata: { test: true, script: 'test-usage-tracking.ts' },
      timestamp: testTs,
    })
    .select()
    .single();

  if (insErr) {
    console.error('❌ Direct insert FAILED:', insErr.message);
    console.error('   Code:', insErr.code);
    console.error('   Hint: CHECK constraint violation? Column missing? RLS?');
  } else {
    console.log('✅ Direct insert succeeded, id:', inserted?.id);
  }

  // ── 3. Query it back ─────────────────────────────────────────────────────────
  if (!insErr) {
    console.log('\n── 3. Query inserted row back ──');
    const { data: fetched, error: fetchErr } = await supabase
      .from('resource_usage')
      .select('id, resource_type, quantity, timestamp')
      .eq('workspace_id', workspaceId)
      .eq('reference_type', 'diagnostic_test')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (fetchErr) {
      console.error('❌ Could not read back the inserted row:', fetchErr.message);
    } else {
      console.log('✅ Row readable:', fetched);
    }
  }

  // ── 4. Billing cycle calc ────────────────────────────────────────────────────
  console.log('\n── 4. Billing cycle calculation ──');
  const { data: wallet } = await supabase
    .from('wallets')
    .select('current_period_end, id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const { data: wsRow } = await supabase
    .from('workspaces')
    .select('created_at, id')
    .eq('id', workspaceId)
    .maybeSingle();

  console.log('  wallet.current_period_end:', (wallet as any)?.current_period_end ?? '(not set)');
  console.log('  workspace.created_at:', wsRow?.created_at ?? '(not found)');

  const now = new Date();
  const periodEndIso = (wallet as any)?.current_period_end ?? null;
  const createdAtIso = wsRow?.created_at ?? null;

  let start: Date, end: Date;
  if (periodEndIso) {
    const e = new Date(periodEndIso);
    if (e > now) {
      start = new Date(e);
      start.setMonth(start.getMonth() - 1);
      end = e;
      console.log('  → Using Stripe period:', start.toISOString(), '→', end.toISOString());
    } else {
      console.log('  → Stripe period_end is in the past, falling back to anchor');
    }
  }
  const anchor = createdAtIso ? new Date(createdAtIso) : now;
  const anchorDay = Math.min(anchor.getDate(), 28);
  start = new Date(now.getFullYear(), now.getMonth(), anchorDay, 0, 0, 0, 0);
  if (start > now) start.setMonth(start.getMonth() - 1);
  end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  console.log('  → Anchor day:', anchorDay);
  console.log('  → Cycle start:', start.toISOString());
  console.log('  → Cycle end:  ', end.toISOString());
  console.log('  → Now:        ', now.toISOString());
  console.log('  → Record timestamp would pass filter?', new Date(testTs) >= start ? '✅ YES' : '❌ NO (filtered out!)');

  // ── 5. Query with billing cycle filter ───────────────────────────────────────
  console.log('\n── 5. Query with billing cycle filter ──');
  const { data: cycleRows, error: cycleErr } = await supabase
    .from('resource_usage')
    .select('id, resource_type, quantity, timestamp, reference_type')
    .eq('workspace_id', workspaceId)
    .gte('timestamp', start.toISOString())
    .order('timestamp', { ascending: false })
    .limit(20);

  if (cycleErr) {
    console.error('❌ Cycle-filtered query failed:', cycleErr.message);
  } else {
    console.log(`✅ ${cycleRows?.length ?? 0} rows within current billing cycle:`);
    cycleRows?.forEach(r => console.log(`   [${r.timestamp}] ${r.resource_type} qty=${r.quantity} ref=${r.reference_type}`));
  }

  // ── 6. Cleanup diagnostic row ────────────────────────────────────────────────
  if (!insErr && inserted?.id) {
    await supabase.from('resource_usage').delete().eq('id', inserted.id);
    console.log('\n── Cleaned up test row ──');
  }

  console.log('\n=== DONE ===\n');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
