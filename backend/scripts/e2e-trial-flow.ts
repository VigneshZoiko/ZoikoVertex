/**
 * e2e-trial-flow.ts — End-to-end test of the ZV-COM-BILL-001 trial lifecycle.
 *
 * Prereqs:
 *   1. Backend running locally:  npx ts-node src/server.ts   (uses backend/.env → staging Supabase)
 *   2. env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env
 *
 * Flow:
 *   1. Create a disposable test user + org + workspace in staging (FREE_STARTER / FREE_ACTIVE)
 *   2. Sign in → JWT
 *   3. POST /api/v1/billing/trial/start          → expect 14-day trial started
 *   4. GET  /api/v1/billing/status               → expect TRIAL_GROWTH / trial_active
 *   5. Simulate expiry (trial_ends_at ← past)    → GET /billing/status → expect settled to STARTER
 *   6. POST /api/v1/billing/trial/start again    → expect 400 (one-trial rule)
 *   7. Cleanup: delete member, workspace, org, user
 *
 * Usage: npx ts-node scripts/e2e-trial-flow.ts
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const API = 'http://localhost:5005';
const EMAIL = `trial-e2e-${Date.now()}@test.zoikovertex.com`;
const PASSWORD = 'TrialE2E!2026pass';
const FULL_NAME = 'Trial E2E Tester';
const COMPANY = 'Trial E2E Org';
const WORKSPACE = 'Trial E2E Workspace';

const supabaseAdmin: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail: string) {
  if (ok) { pass++; console.log(`  ✅ ${name} — ${detail}`); }
  else { fail++; console.log(`  ❌ ${name} — ${detail}`); }
}

async function api(path: string, method: string, token: string | null, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: unknown = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}

async function main(): Promise<number> {
  console.log(`\n═══ ZV-COM-BILL-001 Trial E2E — target ${process.env.SUPABASE_URL} ═══\n`);

  // ── 0. Preflight: API reachable ───────────────────────────────────────────
  const health = await api('/api/v1/health', 'GET', null);
  check('Backend reachable', health.status === 200, `HTTP ${health.status}`);

  // ── 1. Create test user + org + workspace ─────────────────────────────────
  let userId: string;
  let orgId: string;
  let workspaceId: string;
  try {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });
    if (error || !created?.user) throw new Error(error?.message || 'createUser failed');
    userId = created.user.id;

    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations').insert({ name: COMPANY, status: 'ACTIVE', plan_type: 'FREE' }).select().single();
    if (orgErr) throw orgErr;
    orgId = org.id;

    const { data: ws, error: wsErr } = await supabaseAdmin
      .from('workspaces').insert({ name: WORKSPACE, org_id: orgId, status: 'ACTIVE', type: 'BRAND' }).select().single();
    if (wsErr) throw wsErr;
    workspaceId = ws.id;

    await supabaseAdmin.from('users').upsert(
      { id: userId, email: EMAIL, full_name: FULL_NAME, is_superadmin: false },
      { onConflict: 'id' },
    );
    const { error: memErr } = await supabaseAdmin.from('workspace_members').insert({
      workspace_id: workspaceId, user_id: userId, role: 'WORKSPACE_OWNER', identity_class: 'INTERNAL_USER',
    });
    if (memErr) throw memErr;

    check('Test workspace provisioned', true, `${EMAIL} → ws ${workspaceId.slice(0, 8)}…`);
  } catch (e) {
    check('Test workspace provisioned', false, String((e as Error).message));
    return 1;
  }

  // ── 2. Sign in → JWT ──────────────────────────────────────────────────────
  let token: string;
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    if (error || !data.session) throw new Error(error?.message || 'signIn failed');
    token = data.session.access_token;
    check('Sign in → JWT issued', true, 'token acquired');
  } catch (e) {
    check('Sign in → JWT issued', false, String((e as Error).message));
    return 1;
  }

  // ── 3. POST /billing/trial/start ──────────────────────────────────────────
  const trialStart = await api('/api/v1/billing/trial/start', 'POST', token);
  const ts = (trialStart.json as any)?.data;
  const trialOk = trialStart.status === 200 && ts?.trial_active === true && !!ts?.trial_ends_at;
  check('Trial started (14 days, no card)',
    trialOk,
    trialStart.status === 200
      ? `trial_active=${ts?.trial_active}, ends ${ts?.trial_ends_at?.slice(0, 10)}`
      : `HTTP ${trialStart.status} ${JSON.stringify(trialStart.json).slice(0, 160)}`);

  // ── 4. GET /billing/status — during trial ─────────────────────────────────
  const statusDuring = await api('/api/v1/billing/status', 'GET', token);
  const sd = (statusDuring.json as any)?.data;
  const duringOk = statusDuring.status === 200
    && sd?.subscription_status === 'TRIAL_GROWTH'
    && sd?.trial_active === true
    && sd?.plan === 'GROWTH';
  check('Billing status during trial',
    duringOk,
    statusDuring.status === 200
      ? `status=${sd?.subscription_status}, plan=${sd?.plan}, trial_active=${sd?.trial_active}, exec.publish=${sd?.execution?.publish}`
      : `HTTP ${statusDuring.status} ${JSON.stringify(statusDuring.json).slice(0, 160)}`);

  // ── 5. Simulate expiry + verify settlement ────────────────────────────────
  const { error: expireErr } = await supabaseAdmin
    .from('workspaces')
    .update({ trial_ends_at: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', workspaceId);
  check('Simulate expiry (trial_ends_at ← past)', !expireErr, expireErr?.message || 'updated');

  const statusAfter = await api('/api/v1/billing/status', 'GET', token);
  const sa = (statusAfter.json as any)?.data;
  const settleOk = statusAfter.status === 200
    && sa?.subscription_status === 'FREE_ACTIVE'
    && sa?.trial_active === false
    && sa?.plan === 'STARTER'
    && sa?.billing_classification === 'FREE_STARTER';
  check('Expired trial settles to Vertex Starter (data kept)',
    settleOk,
    statusAfter.status === 200
      ? `status=${sa?.subscription_status}, plan=${sa?.plan}, class=${sa?.billing_classification}`
      : `HTTP ${statusAfter.status} ${JSON.stringify(statusAfter.json).slice(0, 160)}`);

  // ── 6. One-trial rule: restart must be blocked ────────────────────────────
  const trialAgain = await api('/api/v1/billing/trial/start', 'POST', token);
  const blocked = trialAgain.status === 400;
  check('Trial restart blocked (one trial per workspace)',
    blocked,
    trialAgain.status === 400
      ? String((trialAgain.json as any)?.error).slice(0, 100)
      : `HTTP ${trialAgain.status} — restart was unexpectedly allowed!`);

  // ── 7. Cleanup ────────────────────────────────────────────────────────────
  try {
    await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspaceId);
    await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId);
    await supabaseAdmin.from('organizations').delete().eq('id', orgId);
    await supabaseAdmin.from('users').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    check('Cleanup complete', true, 'test data removed');
  } catch (e) {
    check('Cleanup complete', false, String((e as Error).message));
  }

  console.log(`\n═══ RESULT: ${pass} passed, ${fail} failed ═══\n`);
  return fail > 0 ? 2 : 0;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
