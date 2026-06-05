/**
 * verifyGovernanceMigrationsPg.ts — pg-based migration verification.
 *
 * Mirror of scripts/verifyGovernanceMigrations.ts (which uses the Supabase
 * REST API) using the `pg` driver. Verifies tables, columns, indexes,
 * triggers, and immutability behaviour.
 *
 *   PGHOST=… PGUSER=… PGPASSWORD=… PGDATABASE=… \
 *     npx ts-node scripts/verifyGovernanceMigrationsPg.ts
 *
 * Exits 0 on full pass, 2 on any failure, 1 on infrastructure error.
 */
import { Client } from 'pg';

interface CheckResult { name: string; pass: boolean; detail: string }
const results: CheckResult[] = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(72)} — ${detail}`);
}

async function main(): Promise<number> {
  const cfg = {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'staging',
    database: process.env.PGDATABASE || 'postgres',
  };
  const c = new Client(cfg);
  await c.connect();

  console.log('\n[verifyGovernanceMigrationsPg] starting\n');

  // 1. Tables exist
  const tables = ['prompt_constraint_shadows', 'prompt_runtime_traces', 'prompt_evidence_links', 'prompt_incidents', 'prompt_audit_ledger'];
  for (const t of tables) {
    const r = await c.query("SELECT to_regclass($1) AS reg", [`public.${t}`]);
    const ok = r.rows[0].reg !== null;
    check(`table ${t} exists`, ok, ok ? 'present' : 'missing');
  }

  // 2. prompts.use_case_key
  const col = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'use_case_key'");
  check('prompts.use_case_key column exists', col.rows.length === 1, col.rows.length === 1 ? 'present' : 'missing');

  // 3. Indexes
  const expectedIndexes = ['idx_prompts_workspace_use_case', 'uq_pcs_one_locked_per_version'];
  for (const idx of expectedIndexes) {
    const r = await c.query("SELECT 1 FROM pg_indexes WHERE indexname = $1", [idx]);
    check(`index ${idx} exists`, r.rows.length === 1, r.rows.length === 1 ? 'present' : 'missing');
  }

  // 4. Triggers
  const expectedTriggers = ['trg_pcs_lock_immutable', 'prompt_runtime_traces_no_mutation', 'prompt_evidence_links_no_update', 'prompt_audit_ledger_no_mutation', 'prompt_approvals_immutable_decision', 'prompt_deployments_immutable_record', 'prompts_immutable_attribution', 'prompt_incidents_no_delete'];
  for (const trg of expectedTriggers) {
    const r = await c.query("SELECT 1 FROM pg_trigger WHERE tgname = $1", [trg]);
    check(`trigger ${trg} exists`, r.rows.length === 1, r.rows.length === 1 ? 'present' : 'missing');
  }

  // 5. Immutability smoke tests
  // Use a unique hex suffix per run so the script can be re-run safely
  // (the append-only triggers prevent cleanup of inserted test rows).
  // UUIDs only allow hex chars (0-9, a-f), so we use Math.random and
  // a counter, not base-36.
  const RUN_TAG = `verify-${Date.now()}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}`;
  // Format: 8 hex chars - 4 hex - 4 hex - 4 hex - 12 hex = 36 chars total
  const a = (n: number) => `${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}-${n.toString(16).padStart(12, '0')}`;

  // 5a. Insert + UPDATE on prompt_audit_ledger (must fail)
  const auditTestId = a(1);
  await c.query(`INSERT INTO prompt_audit_ledger (id, audit_ref, workspace_id, tenant_id, event_type, reason, risk_level, actor_id, created_at) VALUES ($1, $2, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'verify.test', $3, 'tier_1_low', '00000000-0000-0000-0000-000000000000', now())`, [auditTestId, RUN_TAG, RUN_TAG]);
  let auditBlocked = true;
  let auditDetail = 'rejected (expected)';
  try {
    await c.query(`UPDATE prompt_audit_ledger SET reason = 'tampered' WHERE id = $1`, [auditTestId]);
    auditBlocked = false; auditDetail = 'mutation was allowed (trigger missing)';
  } catch (e: any) { auditDetail = `rejected: ${String(e.message).substring(0, 80)}`; }
  check('prompt_audit_ledger: UPDATE rejected by trigger', auditBlocked, auditDetail);

  // 5b. Insert + UPDATE on prompt_runtime_traces (must fail)
  const traceTestId = a(2);
  await c.query(`INSERT INTO prompt_runtime_traces (id, workspace_id, tenant_id, prompt_id, prompt_version_id, execution_id, environment, model_id, input_hash, output_hash, policy_result, violation, actor_id, created_at) VALUES ($1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', $2, 'production', 'test', 'h', 'h', 'allow', false, '00000000-0000-0000-0000-000000000000', now())`, [traceTestId, RUN_TAG]);
  let traceBlocked = true;
  let traceDetail = 'rejected (expected)';
  try {
    await c.query(`UPDATE prompt_runtime_traces SET output_hash = 'tampered' WHERE id = $1`, [traceTestId]);
    traceBlocked = false; traceDetail = 'mutation was allowed (trigger missing)';
  } catch (e: any) { traceDetail = `rejected: ${String(e.message).substring(0, 80)}`; }
  check('prompt_runtime_traces: UPDATE rejected by trigger', traceBlocked, traceDetail);

  // 5c. Insert + UPDATE on prompt_evidence_links (must fail)
  const evTestId = a(3);
  await c.query(`INSERT INTO prompt_evidence_links (id, prompt_id, prompt_version_id, workspace_id, tenant_id, event_type, vault_item_id, evidence_hash, risk_level, actor_id, created_at) VALUES ($1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'verify.test', $2, $3, 'tier_1_low', '00000000-0000-0000-0000-000000000000', now())`, [evTestId, RUN_TAG, RUN_TAG]);
  let evBlocked = true;
  let evDetail = 'rejected (expected)';
  try {
    await c.query(`UPDATE prompt_evidence_links SET evidence_hash = 'tampered' WHERE id = $1`, [evTestId]);
    evBlocked = false; evDetail = 'mutation was allowed (trigger missing)';
  } catch (e: any) { evDetail = `rejected: ${String(e.message).substring(0, 80)}`; }
  check('prompt_evidence_links: UPDATE rejected by trigger', evBlocked, evDetail);

  // 5d. Insert + UPDATE on prompt_approvals.decision (must fail)
  const apprTestVerId = a(4);
  const apprTestId = a(5);
  await c.query(`INSERT INTO prompt_versions (id, prompt_id, version_number, body, body_hash, created_by, created_at, updated_at) VALUES ($1, '00000000-0000-0000-0000-000000000000', 1, 't', 'h', '00000000-0000-0000-0000-000000000000', now(), now()) ON CONFLICT DO NOTHING`, [apprTestVerId]);
  await c.query(`INSERT INTO prompt_approvals (id, prompt_version_id, reviewer_id, reviewer_role, decision, decision_reason, created_at, updated_at) VALUES ($1, $2, '00000000-0000-0000-0000-000000000000', 'COMPLIANCE_OFFICER', 'APPROVED', $3, now(), now())`, [apprTestId, apprTestVerId, RUN_TAG]);
  let apprBlocked = true;
  let apprDetail = 'rejected (expected)';
  try {
    await c.query(`UPDATE prompt_approvals SET decision = 'REJECTED' WHERE id = $1`, [apprTestId]);
    apprBlocked = false; apprDetail = 'mutation was allowed (trigger missing)';
  } catch (e: any) { apprDetail = `rejected: ${String(e.message).substring(0, 80)}`; }
  check('prompt_approvals.decision: UPDATE rejected by trigger', apprBlocked, apprDetail);

  // 5e. prompts.created_by immutability
  const promptTestId = a(6);
  const promptTestVerId = a(7);
  await c.query(`INSERT INTO prompts (id, tenant_id, workspace_id, name, prompt_type, owner_id, risk_tier, status, use_case_key, current_version_id, created_by, created_at, updated_at) VALUES ($1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 't', 'system_prompt', '00000000-0000-0000-0000-000000000001', 'tier_1_low', 'draft', 'test_immut', $2, '00000000-0000-0000-0000-000000000001', now(), now()) ON CONFLICT DO NOTHING`, [promptTestId, promptTestVerId]);
  await c.query(`INSERT INTO prompt_versions (id, prompt_id, version_number, body, body_hash, created_by, created_at, updated_at) VALUES ($1, $2, 1, 't', 'h', '00000000-0000-0000-0000-000000000000', now(), now()) ON CONFLICT DO NOTHING`, [promptTestVerId, promptTestId]);
  let promBlocked = true;
  let promDetail = 'rejected (expected)';
  try {
    await c.query(`UPDATE prompts SET created_by = '00000000-0000-0000-0000-000000000002' WHERE id = $1`, [promptTestId]);
    promBlocked = false; promDetail = 'mutation was allowed (trigger missing)';
  } catch (e: any) { promDetail = `rejected: ${String(e.message).substring(0, 80)}`; }
  check('prompts.created_by: UPDATE rejected by trigger', promBlocked, promDetail);

  // 5f. prompts.status lifecycle is mutable (positive control)
  await c.query(`UPDATE prompts SET status = 'draft' WHERE id = $1`, [promptTestId]);
  const statusOk = (await c.query(`SELECT status FROM prompts WHERE id = $1`, [promptTestId])).rows[0].status === 'draft';
  check('prompts.status lifecycle remains mutable', statusOk, statusOk ? 'status update succeeded (lifecycle column is mutable as expected)' : 'status update failed unexpectedly');

  // 5g. Unique locked shadow index
  const ws = a(0xb);
  const v1 = a(0xc);
  const v2 = a(0xd);
  const s1 = a(0xe);
  const s2 = a(0xf);
  const basePrompt = a(0xa);
  await c.query(`INSERT INTO prompts (id, tenant_id, workspace_id, name, prompt_type, risk_tier, status, use_case_key, created_by, created_at, updated_at) VALUES ($1, $2, $2, 't', 'system_prompt', 'tier_1_low', 'draft', 'test_uq', $2, now(), now()) ON CONFLICT DO NOTHING`, [basePrompt, ws]);
  await c.query(`INSERT INTO prompt_versions (id, prompt_id, version_number, body, body_hash, created_by, created_at, updated_at) VALUES ($1, $2, 1, 't', 'h', $3, now(), now()) ON CONFLICT DO NOTHING`, [v1, basePrompt, ws]);
  await c.query(`INSERT INTO prompt_versions (id, prompt_id, version_number, body, body_hash, created_by, created_at, updated_at) VALUES ($1, $2, 2, 't2', 'h2', $3, now(), now()) ON CONFLICT DO NOTHING`, [v2, basePrompt, ws]);
  await c.query(`INSERT INTO prompt_constraint_shadows (id, prompt_id, version_id, workspace_id, risk_tier, compiled_shadow, shadow_hash, status, locked_at, locked_by, created_at, updated_at) VALUES ($1, $2, $3, $4, 'tier_1_low', '{"rules":[]}'::jsonb, 'h1', 'locked', now(), $4, now(), now()) ON CONFLICT DO NOTHING`, [s1, basePrompt, v1, ws]);
  let uqBlocked = true;
  let uqDetail = 'rejected (expected)';
  try {
    await c.query(`INSERT INTO prompt_constraint_shadows (id, prompt_id, version_id, workspace_id, risk_tier, compiled_shadow, shadow_hash, status, locked_at, locked_by, created_at, updated_at) VALUES ($1, $2, $3, $4, 'tier_1_low', '{"rules":[]}'::jsonb, 'h2', 'locked', now(), $4, now(), now())`, [s2, basePrompt, v1, ws]);
    uqBlocked = false; uqDetail = 'second locked row was accepted (index missing)';
  } catch (e: any) { uqDetail = `rejected: ${String(e.message).substring(0, 80)}`; }
  check('uq_pcs_one_locked_per_version enforces uniqueness', uqBlocked, uqDetail);

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n[verifyGovernanceMigrationsPg] ${passed} passed, ${failed} failed`);
  await c.end();
  return failed > 0 ? 2 : 0;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
