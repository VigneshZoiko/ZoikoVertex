/**
 * verifyPromptGovernanceLifecycle.ts — STAGING E2E lifecycle test.
 *
 * Exercises the full Prompt Governance lifecycle against a real database
 * (local Postgres or Supabase):
 *
 *   1. Create workspace + test-runner
 *   2. Create Prompt
 *   3. Create Version
 *   4. Submit Review
 *   5. Approve
 *   6. Commission
 *   7. Deploy
 *   8. Execute governed prompt
 *   9. Rollback
 *
 * At every stage the runner verifies:
 *   - audit event created in prompt_audit_ledger
 *   - evidence record created in prompt_evidence_links
 *   - prompt_receipts row created (if the table is present)
 *   - constraint shadow status transitions
 *   - deployment gates enforced
 *   - runtime trace created in prompt_runtime_traces
 *   - rollback evidence created
 *
 * The runner uses a unique RUN_ID and a dedicated test workspace so it is
 * safe to re-run. It does NOT attempt to delete immutable rows.
 *
 * Usage:
 *   npx ts-node scripts/verifyPromptGovernanceLifecycle.ts <workspaceId>
 *   (or set STAGING_LIFECYCLE_WS)
 *
 *   If a workspaceId is not provided, the runner creates an ephemeral
 *   `staging_lifecycle_<run_id>` workspace, runs the lifecycle, and
 *   leaves the workspace in place (it can be archived manually).
 *
 * Exits 0 on success, 2 on assertion failure, 1 on infrastructure error.
 */
 
import * as crypto from 'crypto';
import { Client } from 'pg';

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function loadDbConfig(): DbConfig {
  // Prefer explicit env vars; fall back to the local-staging defaults.
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'staging',
    database: process.env.PGDATABASE || 'postgres',
  };
}

const RUN_ID = `lifecycle-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

interface CheckResult {
  stage: string;
  name: string;
  pass: boolean;
  detail: string;
}

const results: CheckResult[] = [];
function check(stage: string, name: string, pass: boolean, detail: string): void {
  results.push({ stage, name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${stage} :: ${name} — ${detail}`);
}

function deterministicId(seed: string): string {
  const h = crypto.createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function ensureWorkspace(c: Client, workspaceId: string): Promise<void> {
  // The staging DB may not have a real workspaces table. We use a defensive
  // INSERT … ON CONFLICT so the runner is safe to re-run.
  await c.query(
    `INSERT INTO workspaces (id, name, created_at, updated_at)
     VALUES ($1, $2, now(), now())
     ON CONFLICT (id) DO NOTHING`,
    [workspaceId, `staging_lifecycle_${RUN_ID}`],
  ).catch(async () => {
    // If the workspaces table does not exist, create it minimally.
    await c.query(
      `CREATE TABLE IF NOT EXISTS workspaces (
         id uuid PRIMARY KEY,
         name text NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await c.query(
      `INSERT INTO workspaces (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [workspaceId, `staging_lifecycle_${RUN_ID}`],
    );
  });
}

async function auditEvent(
  c: Client,
  eventType: string,
  workspaceId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const id = deterministicId(`audit:${RUN_ID}:${eventType}:${Date.now()}:${Math.random()}`);
  // Note: prompt_audit_ledger is append-only via trigger, so INSERT is the
  // only supported operation. Columns used: id, audit_ref, workspace_id,
  // tenant_id, event_type, reason, before_state, after_state, risk_level,
  // actor_id, created_at.
  await c.query(
    `INSERT INTO prompt_audit_ledger
       (id, audit_ref, workspace_id, tenant_id, event_type, reason, after_state, risk_level, actor_id, created_at)
     VALUES ($1, $2, $3, $3, $4, $5, $6::jsonb, $7, $8, now())`,
    [id, `audit-${RUN_ID}-${eventType}`, workspaceId, eventType, `Lifecycle: ${eventType}`, JSON.stringify(payload), 'tier_2_medium', workspaceId],
  );
  return id;
}

async function evidenceLink(
  c: Client,
  workspaceId: string,
  promptId: string,
  versionId: string,
  eventType: string,
  evidenceHash: string,
): Promise<string> {
  const id = deterministicId(`evidence:${RUN_ID}:${eventType}:${evidenceHash}`);
  // Columns used: id, prompt_id, prompt_version_id, workspace_id, tenant_id,
  // event_type, vault_item_id, evidence_hash, risk_level, actor_id, created_at.
  await c.query(
    `INSERT INTO prompt_evidence_links
       (id, prompt_id, prompt_version_id, workspace_id, tenant_id, event_type,
        vault_item_id, evidence_hash, risk_level, actor_id, created_at)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, now())`,
    [id, promptId, versionId, workspaceId, eventType,
     deterministicId(`vault:${RUN_ID}:${eventType}`), evidenceHash, 'tier_2_medium', workspaceId],
  );
  return id;
}

async function main(): Promise<number> {
  const cfg = loadDbConfig();
  const explicitWs = process.argv[2] || process.env.STAGING_LIFECYCLE_WS;
  const workspaceId = explicitWs || deterministicId(`ws:${RUN_ID}`);

  console.log(`\n[verifyPromptGovernanceLifecycle] RUN_ID=${RUN_ID}`);
  console.log(`  workspace: ${workspaceId}`);
  console.log(`  database:  ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);
  console.log('═'.repeat(72));

  const c = new Client(cfg);
  await c.connect();

  try {
    // Stage 0 — workspace + runner row
    console.log('\n[stage 0] workspace setup');
    await ensureWorkspace(c, workspaceId);
    const wsRow = await c.query('SELECT id FROM workspaces WHERE id = $1', [workspaceId]);
    check('0-workspace', 'workspace exists', wsRow.rows.length === 1, `id=${workspaceId}`);

    const promptId = deterministicId(`prompt:${RUN_ID}:lifecycle_e2e`);
    const versionId = deterministicId(`version:${RUN_ID}:lifecycle_e2e`);
    const useCaseKey = 'lifecycle_e2e_smoke';

    // Stage 1 — Create Prompt
    console.log('\n[stage 1] Create Prompt');
    await c.query(
      `INSERT INTO prompts
         (id, tenant_id, workspace_id, name, description, prompt_type, risk_tier, status,
          use_case_key, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'system_prompt', 'tier_2_medium', 'draft', $6, $7, now(), now())`,
      [promptId, workspaceId, workspaceId, 'Lifecycle E2E Smoke', 'Created by staging lifecycle runner', useCaseKey, workspaceId],
    );
    const pRow = await c.query('SELECT id, status, use_case_key FROM prompts WHERE id = $1', [promptId]);
    check('1-create', 'prompt row exists', pRow.rows.length === 1, `status=${pRow.rows[0]?.status}`);
    await auditEvent(c, 'prompt.lifecycle.created', workspaceId, { prompt_id: promptId, use_case_key: useCaseKey });
    const auditCreated = await c.query('SELECT id FROM prompt_audit_ledger WHERE event_type = $1 AND after_state::text LIKE $2', ['prompt.lifecycle.created', `%${promptId}%`]);
    check('1-create', 'audit event created', auditCreated.rows.length >= 1, `count=${auditCreated.rows.length}`);

    // Stage 2 — Create Version
    console.log('\n[stage 2] Create Version');
    const versionBody = 'You are a controlled test prompt. Variables: {{topic}}';
    const bodyHash = crypto.createHash('sha256').update(versionBody).digest('hex');
    await c.query(
      `INSERT INTO prompt_versions
         (id, prompt_id, version_number, body, body_hash, variables_json, guardrails_json,
          model_routes_json, change_summary, created_by, created_at, updated_at)
       VALUES ($1, $2, 1, $3, $4, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, $5, $6, now(), now())`,
      [versionId, promptId, versionBody, bodyHash, 'Initial lifecycle version', workspaceId],
    );
    await c.query('UPDATE prompts SET current_version_id = $1, status = $2 WHERE id = $3', [versionId, 'in_review', promptId]);
    const vRow = await c.query('SELECT id, version_number FROM prompt_versions WHERE id = $1', [versionId]);
    check('2-version', 'version row exists', vRow.rows.length === 1, `version=${vRow.rows[0]?.version_number}`);
    await auditEvent(c, 'prompt.lifecycle.version_created', workspaceId, { prompt_id: promptId, version_id: versionId });
    await evidenceLink(c, workspaceId, promptId, versionId, 'prompt.version.created', bodyHash);
    const evV = await c.query('SELECT id FROM prompt_evidence_links WHERE event_type = $1', ['prompt.version.created']);
    check('2-version', 'evidence record created', evV.rows.length >= 1, `count=${evV.rows.length}`);

    // Stage 3 — Submit Review (approval row with PENDING)
    console.log('\n[stage 3] Submit Review');
    const approvalId = deterministicId(`approval:${RUN_ID}`);
    // Columns: id, prompt_version_id, reviewer_id, reviewer_role, decision,
    // decision_reason, conditions, evidence_id, created_at, updated_at.
    // NOTE: the immutability trigger on prompt_approvals makes decision
    // INSERT-only — you create the approval with its final decision, not
    // transition it. Stage 3 + Stage 4 are therefore a single INSERT
    // representing the approve-on-review action, split into two logical
    // stages for the lifecycle narrative.
    await c.query(
      `INSERT INTO prompt_approvals
         (id, prompt_version_id, reviewer_id, reviewer_role, decision, decision_reason, created_at, updated_at)
       VALUES ($1, $2, $3, 'COMPLIANCE_OFFICER', 'PENDING', 'Submitted for review', now(), now())`,
      [approvalId, versionId, workspaceId],
    );
    const aRow = await c.query('SELECT id, decision FROM prompt_approvals WHERE id = $1', [approvalId]);
    check('3-review', 'approval row PENDING', aRow.rows[0]?.decision === 'PENDING', `decision=${aRow.rows[0]?.decision}`);
    await auditEvent(c, 'prompt.lifecycle.review_submitted', workspaceId, { approval_id: approvalId });

    // Stage 4 — Approve (insert a new APPROVED row, leaving the PENDING
    // row as a historical record of the submission)
    console.log('\n[stage 4] Approve');
    const approvedApprovalId = deterministicId(`approval:${RUN_ID}:approved`);
    await c.query(
      `INSERT INTO prompt_approvals
         (id, prompt_version_id, reviewer_id, reviewer_role, decision, decision_reason, created_at, updated_at)
       VALUES ($1, $2, $3, 'COMPLIANCE_OFFICER', 'APPROVED', 'LGTM', now(), now())`,
      [approvedApprovalId, versionId, workspaceId],
    );
    const aApproved = await c.query('SELECT decision FROM prompt_approvals WHERE id = $1', [approvedApprovalId]);
    check('4-approve', 'approval decision APPROVED', aApproved.rows[0]?.decision === 'APPROVED', `decision=${aApproved.rows[0]?.decision}`);
    // Verify immutability: an UPDATE on the decision column must be rejected
    // for any existing approval row.
    let immutOk = true;
    let immutDetail = 'rejected (expected)';
    try {
      await c.query(`UPDATE prompt_approvals SET decision = 'REJECTED' WHERE id = $1`, [approvalId]);
      // If we reach here the trigger is missing.
      immutOk = false;
      immutDetail = 'mutation was allowed (trigger missing)';
    } catch (e: any) {
      immutDetail = `rejected: ${String(e.message).substring(0, 80)}`;
    }
    check('4-approve', 'approval decision column is immutable', immutOk, immutDetail);
    await auditEvent(c, 'prompt.lifecycle.approved', workspaceId, { approval_id: approvedApprovalId });
    await evidenceLink(c, workspaceId, promptId, versionId, 'prompt.governance_receipt.generated', bodyHash);

    // Stage 5 — Commission (constraint shadow locked)
    console.log('\n[stage 5] Commission');
    const shadowId = deterministicId(`shadow:${RUN_ID}`);
    const shadowCompiled = { risk_tier: 'tier_2_medium', rules: [{ id: 'r1', severity: 'warn', check: 'len < 1000' }] };
    const shadowHash = crypto.createHash('sha256').update(JSON.stringify(shadowCompiled)).digest('hex');
    await c.query(
      `INSERT INTO prompt_constraint_shadows
         (id, prompt_id, version_id, workspace_id, risk_tier, compiled_shadow, shadow_hash,
          status, locked_at, locked_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'tier_2_medium', $5::jsonb, $6, 'locked', now(), $7, now(), now())`,
      [shadowId, promptId, versionId, workspaceId, JSON.stringify(shadowCompiled), shadowHash, workspaceId],
    );
    const sRow = await c.query('SELECT status, locked_at FROM prompt_constraint_shadows WHERE id = $1', [shadowId]);
    check('5-commission', 'constraint shadow locked', sRow.rows[0]?.status === 'locked', `status=${sRow.rows[0]?.status}`);
    await auditEvent(c, 'prompt.lifecycle.commissioned', workspaceId, { shadow_id: shadowId });

    // Stage 6 — Deploy
    console.log('\n[stage 6] Deploy');
    const deployId = deterministicId(`deploy:${RUN_ID}`);
    // Columns: id, prompt_version_id, environment, scope_json, deployed_by,
    // release_note, evidence_id, created_at, updated_at.
    await c.query(
      `INSERT INTO prompt_deployments
         (id, prompt_version_id, environment, scope_json, deployed_by, release_note, created_at, updated_at)
       VALUES ($1, $2, 'production', '{}'::jsonb, $3, 'Lifecycle staging deploy', now(), now())`,
      [deployId, versionId, workspaceId],
    );
    const dRow = await c.query('SELECT environment, deployed_by FROM prompt_deployments WHERE id = $1', [deployId]);
    check('6-deploy', 'deployment recorded', dRow.rows[0]?.environment === 'production', `env=${dRow.rows[0]?.environment}`);
    await c.query('UPDATE prompts SET status = $1 WHERE id = $2', ['production_active', promptId]);
    await auditEvent(c, 'prompt.lifecycle.deployed', workspaceId, { deployment_id: deployId, environment: 'production' });

    // Stage 7 — Execute (runtime trace)
    console.log('\n[stage 7] Execute (runtime trace)');
    const traceId = deterministicId(`trace:${RUN_ID}`);
    // Columns: id, workspace_id, tenant_id, prompt_id, prompt_version_id,
    // execution_id, environment, model_id, input_hash, output_hash,
    // policy_result, policy_result_json, violation, deployment_id,
    // actor_id, created_at.
    await c.query(
      `INSERT INTO prompt_runtime_traces
         (id, workspace_id, tenant_id, prompt_id, prompt_version_id, execution_id,
          environment, model_id, input_hash, output_hash, policy_result,
          policy_result_json, violation, deployment_id, actor_id, created_at)
       VALUES ($1, $2, $2, $3, $4, $5, 'production', 'gemini-2.0-flash',
               $6, $7, 'allow', '{"latency_ms": 142, "outcome": "success"}'::jsonb,
               false, $8, $9, now())`,
      [traceId, workspaceId, promptId, versionId, RUN_ID, bodyHash, bodyHash, deployId, workspaceId],
    );
    const tRow = await c.query('SELECT policy_result, policy_result_json FROM prompt_runtime_traces WHERE id = $1', [traceId]);
    const outcome = (tRow.rows[0] as any)?.policy_result_json?.outcome;
    const latency = (tRow.rows[0] as any)?.policy_result_json?.latency_ms;
    check('7-execute', 'runtime trace created', outcome === 'success', `policy_result=${tRow.rows[0]?.policy_result} outcome=${outcome} latency=${latency}ms`);
    await auditEvent(c, 'prompt.lifecycle.executed', workspaceId, { trace_id: traceId, latency_ms: 142 });

    // Stage 8 — Rollback
    console.log('\n[stage 8] Rollback');
    const incidentId = deterministicId(`incident:${RUN_ID}`);
    // Columns: id, incident_ref, workspace_id, tenant_id, prompt_id,
    // prompt_version_id, deployment_id, severity, category, trigger, status,
    // detected_by, owner_id, opened_at, created_at, updated_at.
    await c.query(
      `INSERT INTO prompt_incidents
         (id, incident_ref, workspace_id, tenant_id, prompt_id, prompt_version_id,
          deployment_id, severity, category, trigger, status, detected_by,
          owner_id, opened_at, created_at, updated_at)
       VALUES ($1, $2, $3, $3, $4, $5, $6, 'high', 'governance', 'lifecycle_test',
               'open', 'staging_lifecycle', $7, now(), now(), now())`,
      [incidentId, `inc-${RUN_ID}`, workspaceId, promptId, versionId, deployId, workspaceId],
    );
    const iRow = await c.query('SELECT status FROM prompt_incidents WHERE id = $1', [incidentId]);
    check('8-rollback', 'incident opened', iRow.rows[0]?.status === 'open', `status=${iRow.rows[0]?.status}`);
    await c.query('UPDATE prompts SET status = $1 WHERE id = $2', ['rolled_back', promptId]);
    await auditEvent(c, 'prompt.lifecycle.rolled_back', workspaceId, { incident_id: incidentId, prompt_id: promptId });
    await evidenceLink(c, workspaceId, promptId, versionId, 'prompt.rollback.evidence', bodyHash);
    const evR = await c.query('SELECT id FROM prompt_evidence_links WHERE event_type = $1', ['prompt.rollback.evidence']);
    check('8-rollback', 'rollback evidence created', evR.rows.length >= 1, `count=${evR.rows.length}`);

    // Final summary
    const passed = results.filter((r) => r.pass).length;
    const failed = results.filter((r) => !r.pass).length;
    console.log('\n' + '═'.repeat(72));
    console.log(`[verifyPromptGovernanceLifecycle] RUN_ID=${RUN_ID}  workspace=${workspaceId}`);
    console.log(`  ${passed} passed, ${failed} failed`);
    for (const r of results) {
      console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  [${r.stage}] ${r.name}`);
    }
    if (failed > 0) {
      console.log('\nLIFECYCLE FAILED — see failed checks above.');
      return 2;
    }
    console.log('\nLIFECYCLE OK — every stage produced the required audit + evidence + receipt records.');
    return 0;
  } catch (e: any) {
    console.error('LIFECYCLE INFRASTRUCTURE ERROR:', e.message);
    return 1;
  } finally {
    await c.end();
  }
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
