/**
 * verifyGovernanceAppendOnly.ts — automated STAGING verification harness.
 *
 * Proves the append-only / immutability triggers on the three Phase 4
 * prompt-governance tables are wired correctly:
 *
 *   prompt_audit_ledger      (prompt_audit_ledger_no_mutation)
 *   prompt_runtime_traces    (prompt_runtime_traces_no_mutation)
 *   prompt_evidence_links    (prompt_evidence_links_no_update)
 *
 * For each table the runner:
 *   1. Inserts a synthetic test row tagged with a unique
 *      `verify_run_id` (in `event_type` for ledger, in
 *      `execution_id` for runtime_traces, in `evidence_hash` for
 *      evidence_links).
 *   2. Attempts UPDATE — must fail (trigger raises).
 *   3. Attempts DELETE — must fail (trigger raises).
 *
 * Test rows ACCUMULATE in the database. They are tagged for cleanup via the
 * unique verify_run_id and may be purged manually:
 *   ALTER TABLE <table> DISABLE TRIGGER <trigger_name>;
 *   DELETE FROM <table> WHERE <marker_col> LIKE 'verify-%';
 *   ALTER TABLE <table> ENABLE TRIGGER <trigger_name>;
 *
 * The runner does NOT attempt cleanup, because the very immutability we are
 * verifying forbids DELETE.
 *
 * Usage:
 *   npx ts-node scripts/verifyGovernanceAppendOnly.ts
 */
/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../src/shared/supabase';

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

const RUN_ID = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function expectReject(
  label: string,
  promise: PromiseLike<{ error: any }>,
): Promise<{ pass: boolean; detail: string }> {
  const r = await promise;
  if (r.error) {
    return { pass: true, detail: `${label} rejected: ${r.error.message}` };
  }
  return { pass: false, detail: `${label} was unexpectedly allowed` };
}

async function checkAuditLedger(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const ins = await supabaseAdmin
    .from('prompt_audit_ledger')
    .insert({
      workspace_id: '00000000-0000-0000-0000-aaaaappend1',
      tenant_id: '00000000-0000-0000-0000-aaaaappend1',
      event_type: RUN_ID,
      actor_name: 'verifyGovernanceAppendOnly',
      actor_role: 'GOVERNANCE_ADMIN',
      reason: 'staging verification — safe to ignore',
    })
    .select('id')
    .maybeSingle();
  if (ins.error || !ins.data) {
    out.push({
      name: 'prompt_audit_ledger insert (append-only smoke)',
      pass: false,
      detail: ins.error?.message || 'no row returned',
    });
    return out;
  }
  out.push({
    name: 'prompt_audit_ledger insert (append-only smoke)',
    pass: true,
    detail: 'insert succeeded',
  });
  const updateResult = await expectReject(
    'UPDATE',
    supabaseAdmin
      .from('prompt_audit_ledger')
      .update({ reason: 'tampered' })
      .eq('id', ins.data.id)
      .then((r) => ({ error: r.error })),
  );
  out.push({
    name: 'prompt_audit_ledger: UPDATE rejected by trigger',
    pass: updateResult.pass,
    detail: updateResult.detail,
  });
  const deleteResult = await expectReject(
    'DELETE',
    supabaseAdmin
      .from('prompt_audit_ledger')
      .delete()
      .eq('id', ins.data.id)
      .then((r) => ({ error: r.error })),
  );
  out.push({
    name: 'prompt_audit_ledger: DELETE rejected by trigger',
    pass: deleteResult.pass,
    detail: deleteResult.detail,
  });
  return out;
}

async function checkRuntimeTraces(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const ins = await supabaseAdmin
    .from('prompt_runtime_traces')
    .insert({
      workspace_id: '00000000-0000-0000-0000-aaaaappend2',
      execution_id: RUN_ID,
    })
    .select('id')
    .maybeSingle();
  if (ins.error || !ins.data) {
    out.push({
      name: 'prompt_runtime_traces insert (append-only smoke)',
      pass: false,
      detail: ins.error?.message || 'no row returned',
    });
    return out;
  }
  out.push({
    name: 'prompt_runtime_traces insert (append-only smoke)',
    pass: true,
    detail: 'insert succeeded',
  });
  const updateResult = await expectReject(
    'UPDATE',
    supabaseAdmin
      .from('prompt_runtime_traces')
      .update({ violation: true })
      .eq('id', ins.data.id)
      .then((r) => ({ error: r.error })),
  );
  out.push({
    name: 'prompt_runtime_traces: UPDATE rejected by trigger',
    pass: updateResult.pass,
    detail: updateResult.detail,
  });
  const deleteResult = await expectReject(
    'DELETE',
    supabaseAdmin
      .from('prompt_runtime_traces')
      .delete()
      .eq('id', ins.data.id)
      .then((r) => ({ error: r.error })),
  );
  out.push({
    name: 'prompt_runtime_traces: DELETE rejected by trigger',
    pass: deleteResult.pass,
    detail: deleteResult.detail,
  });
  return out;
}

async function checkEvidenceLinks(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const ins = await supabaseAdmin
    .from('prompt_evidence_links')
    .insert({
      workspace_id: '00000000-0000-0000-0000-aaaaappend3',
      event_type: 'verify.test',
      evidence_hash: RUN_ID,
    })
    .select('id')
    .maybeSingle();
  if (ins.error || !ins.data) {
    out.push({
      name: 'prompt_evidence_links insert (append-only smoke)',
      pass: false,
      detail: ins.error?.message || 'no row returned',
    });
    return out;
  }
  out.push({
    name: 'prompt_evidence_links insert (append-only smoke)',
    pass: true,
    detail: 'insert succeeded',
  });
  // The migration's trigger is named prompt_evidence_links_no_update — it
  // blocks UPDATE specifically (not DELETE). Check what the migration
  // actually enforces.
  const updateResult = await expectReject(
    'UPDATE',
    supabaseAdmin
      .from('prompt_evidence_links')
      .update({ event_type: 'tampered' })
      .eq('id', ins.data.id)
      .then((r) => ({ error: r.error })),
  );
  out.push({
    name: 'prompt_evidence_links: UPDATE rejected by trigger',
    pass: updateResult.pass,
    detail: updateResult.detail,
  });
  return out;
}

async function main() {
  console.log(`\n[verifyGovernanceAppendOnly] starting (run_id=${RUN_ID})\n`);
  const results: CheckResult[] = [];
  results.push(...(await checkAuditLedger()));
  results.push(...(await checkRuntimeTraces()));
  results.push(...(await checkEvidenceLinks()));

  let pass = 0;
  let fail = 0;
  for (const r of results) {
    if (r.pass) {
      pass++;
      console.log(`  PASS  ${r.name}  — ${r.detail}`);
    } else {
      fail++;
      console.log(`  FAIL  ${r.name}  — ${r.detail}`);
    }
  }
  console.log(`\n[verifyGovernanceAppendOnly] ${pass} passed, ${fail} failed`);
  console.log(`\nTest rows tagged with run_id=${RUN_ID} have been left in place.`);
  console.log('Cleanup (manual, post-disabling triggers):');
  console.log(`  ALTER TABLE prompt_audit_ledger DISABLE TRIGGER prompt_audit_ledger_no_mutation;`);
  console.log(`  DELETE FROM prompt_audit_ledger WHERE event_type = '${RUN_ID}';`);
  console.log(`  ALTER TABLE prompt_audit_ledger ENABLE TRIGGER prompt_audit_ledger_no_mutation;`);
  console.log(`  ALTER TABLE prompt_runtime_traces DISABLE TRIGGER prompt_runtime_traces_no_mutation;`);
  console.log(`  DELETE FROM prompt_runtime_traces WHERE execution_id = '${RUN_ID}';`);
  console.log(`  ALTER TABLE prompt_runtime_traces ENABLE TRIGGER prompt_runtime_traces_no_mutation;`);
  console.log(`  ALTER TABLE prompt_evidence_links DISABLE TRIGGER prompt_evidence_links_no_update;`);
  console.log(`  DELETE FROM prompt_evidence_links WHERE evidence_hash = '${RUN_ID}';`);
  console.log(`  ALTER TABLE prompt_evidence_links ENABLE TRIGGER prompt_evidence_links_no_update;`);

  if (fail > 0) {
    console.log('\nA trigger is missing or misconfigured. Re-apply prompt_governance_append_only_audit_trail.sql before flipping PROMPT_GOVERNANCE_ENFORCED.');
    process.exit(2);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[verifyGovernanceAppendOnly] crashed:', err);
  process.exit(1);
});
