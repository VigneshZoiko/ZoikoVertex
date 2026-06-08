/**
 * verifyGovernanceAppendOnlyPg.ts — pg-based append-only verification.
 *
 * Mirrors scripts/verifyGovernanceAppendOnly.ts (Supabase REST API) using
 * the `pg` driver. Inserts a synthetic test row tagged with a unique
 * verify_run_id in each of the three append-only tables, then attempts
 * UPDATE and DELETE on each — both must be rejected by the trigger.
 *
 * Test rows ACCUMULATE in the database. They are tagged for cleanup:
 *   ALTER TABLE <table> DISABLE TRIGGER <trigger_name>;
 *   DELETE FROM <table> WHERE <marker_col> LIKE 'verify-%';
 *   ALTER TABLE <table> ENABLE TRIGGER <trigger_name>;
 *
 *   PGHOST=… PGUSER=… PGPASSWORD=… PGDATABASE=… \
 *     npx ts-node scripts/verifyGovernanceAppendOnlyPg.ts
 *
 * Exits 0 on full pass, 2 on any failure.
 */
import { Client } from 'pg';

interface CheckResult { name: string; pass: boolean; detail: string }
const results: CheckResult[] = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(56)} — ${detail}`);
}

const RUN_ID = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const WS = '00000000-0000-0000-0000-000000000000';

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

  console.log(`[verifyGovernanceAppendOnlyPg] run_id=${RUN_ID}\n`);

  // 1. prompt_audit_ledger
  const a = (n: number) => `${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}-${n.toString(16).padStart(12, '0')}`;
  const auditId = a(1);
  await c.query(
    `INSERT INTO prompt_audit_ledger (id, audit_ref, workspace_id, tenant_id, event_type, reason, risk_level, actor_id, created_at)
     VALUES ($1, $2, $3, $3, 'verify.test', $4, 'tier_1_low', $3, now())`,
    [auditId, RUN_ID, WS, RUN_ID],
  );
  let auditUpdateBlocked = true;
  let auditUpdateDetail = 'rejected (expected)';
  try {
    await c.query(`UPDATE prompt_audit_ledger SET reason = 'tampered' WHERE id = $1`, [auditId]);
    auditUpdateBlocked = false; auditUpdateDetail = 'mutation was allowed (trigger missing)';
  } catch (e: any) { auditUpdateDetail = `rejected: ${String(e.message).substring(0, 60)}`; }
  check('prompt_audit_ledger: UPDATE rejected', auditUpdateBlocked, auditUpdateDetail);

  let auditDeleteBlocked = true;
  let auditDeleteDetail = 'rejected (expected)';
  try {
    await c.query(`DELETE FROM prompt_audit_ledger WHERE id = $1`, [auditId]);
    auditDeleteBlocked = false; auditDeleteDetail = 'deletion was allowed (trigger missing)';
  } catch (e: any) { auditDeleteDetail = `rejected: ${String(e.message).substring(0, 60)}`; }
  check('prompt_audit_ledger: DELETE rejected', auditDeleteBlocked, auditDeleteDetail);

  // 2. prompt_runtime_traces
  const traceId = a(2);
  await c.query(
    `INSERT INTO prompt_runtime_traces (id, workspace_id, tenant_id, prompt_id, prompt_version_id, execution_id, environment, model_id, input_hash, output_hash, policy_result, violation, actor_id, created_at)
     VALUES ($1, $2, $2, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', $3, 'production', 'test', 'h', 'h', 'allow', false, $2, now())`,
    [traceId, WS, RUN_ID],
  );
  let traceUpdateBlocked = true;
  let traceUpdateDetail = 'rejected (expected)';
  try {
    await c.query(`UPDATE prompt_runtime_traces SET output_hash = 'tampered' WHERE id = $1`, [traceId]);
    traceUpdateBlocked = false; traceUpdateDetail = 'mutation was allowed (trigger missing)';
  } catch (e: any) { traceUpdateDetail = `rejected: ${String(e.message).substring(0, 60)}`; }
  check('prompt_runtime_traces: UPDATE rejected', traceUpdateBlocked, traceUpdateDetail);

  let traceDeleteBlocked = true;
  let traceDeleteDetail = 'rejected (expected)';
  try {
    await c.query(`DELETE FROM prompt_runtime_traces WHERE id = $1`, [traceId]);
    traceDeleteBlocked = false; traceDeleteDetail = 'deletion was allowed (trigger missing)';
  } catch (e: any) { traceDeleteDetail = `rejected: ${String(e.message).substring(0, 60)}`; }
  check('prompt_runtime_traces: DELETE rejected', traceDeleteBlocked, traceDeleteDetail);

  // 3. prompt_evidence_links
  const evId = a(3);
  await c.query(
    `INSERT INTO prompt_evidence_links (id, prompt_id, prompt_version_id, workspace_id, tenant_id, event_type, vault_item_id, evidence_hash, risk_level, actor_id, created_at)
     VALUES ($1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', $2, $2, 'verify.test', $3, $4, 'tier_1_low', $2, now())`,
    [evId, WS, RUN_ID, RUN_ID],
  );
  let evUpdateBlocked = true;
  let evUpdateDetail = 'rejected (expected)';
  try {
    await c.query(`UPDATE prompt_evidence_links SET evidence_hash = 'tampered' WHERE id = $1`, [evId]);
    evUpdateBlocked = false; evUpdateDetail = 'mutation was allowed (trigger missing)';
  } catch (e: any) { evUpdateDetail = `rejected: ${String(e.message).substring(0, 60)}`; }
  check('prompt_evidence_links: UPDATE rejected', evUpdateBlocked, evUpdateDetail);

  let evDeleteBlocked = true;
  let evDeleteDetail = 'rejected (expected)';
  try {
    await c.query(`DELETE FROM prompt_evidence_links WHERE id = $1`, [evId]);
    evDeleteBlocked = false; evDeleteDetail = 'deletion was allowed (trigger missing)';
  } catch (e: any) { evDeleteDetail = `rejected: ${String(e.message).substring(0, 60)}`; }
  check('prompt_evidence_links: DELETE rejected', evDeleteBlocked, evDeleteDetail);

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n[verifyGovernanceAppendOnlyPg] ${passed} passed, ${failed} failed`);
  console.log(`Test rows tagged with run_id=${RUN_ID} have been left in place.`);
  console.log('Cleanup (manual, post-disabling triggers):');
  console.log(`  ALTER TABLE prompt_audit_ledger DISABLE TRIGGER prompt_audit_ledger_no_mutation;`);
  console.log(`  DELETE FROM prompt_audit_ledger WHERE audit_ref = '${RUN_ID}';`);
  console.log(`  ALTER TABLE prompt_audit_ledger ENABLE TRIGGER prompt_audit_ledger_no_mutation;`);
  console.log(`  ALTER TABLE prompt_runtime_traces DISABLE TRIGGER prompt_runtime_traces_no_mutation;`);
  console.log(`  DELETE FROM prompt_runtime_traces WHERE execution_id = '${RUN_ID}';`);
  console.log(`  ALTER TABLE prompt_runtime_traces ENABLE TRIGGER prompt_runtime_traces_no_mutation;`);
  console.log(`  ALTER TABLE prompt_evidence_links DISABLE TRIGGER prompt_evidence_links_no_update;`);
  console.log(`  DELETE FROM prompt_evidence_links WHERE vault_item_id = '${RUN_ID}';`);
  console.log(`  ALTER TABLE prompt_evidence_links ENABLE TRIGGER prompt_evidence_links_no_update;`);

  await c.end();
  return failed > 0 ? 2 : 0;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
