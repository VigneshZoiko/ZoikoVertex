/**
 * seedStagingGovernance.ts — STAGING seed for 9 governed use cases.
 *
 * Uses the `pg` driver (not the Supabase REST API) so it can run against
 * either the local staging Postgres OR the real Supabase instance once
 * DATABASE_URL is provided.
 *
 *   PGHOST=… PGUSER=… PGPASSWORD=… PGDATABASE=… \
 *     npx ts-node scripts/seedStagingGovernance.ts <workspaceId>
 *
 * Idempotent: deterministic row ids → upsert on conflict, never duplicates.
 * Writes a 'prompt.governance_seed.bootstrapped' audit event for every use case.
 */
import * as crypto from 'crypto';
import { Client as PgClient } from 'pg';
import { GOVERNED_PROMPT_SEEDS } from '../src/modules/prompts/governedPromptSeeds';

const TS = '2025-01-01T00:00:00Z';

function deterministicId(seed: string): string {
  const h = crypto.createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function shadowRulesForTier(tier: string): any[] {
  // Minimal rule set per tier; full rules live in ConstraintShadowService.
  if (tier === 'tier_1_low') {
    return [
      { id: 'len_cap', severity: 'warn', check: 'output.length <= 4000' },
      { id: 'pii_basic', severity: 'warn', check: 'pii.email == null && pii.phone == null' },
    ];
  }
  return [
    { id: 'len_cap', severity: 'block', check: 'output.length <= 4000' },
    { id: 'pii_block', severity: 'block', check: 'pii.email == null && pii.phone == null && pii.ssn == null' },
    { id: 'injection_block', severity: 'block', check: 'injection.detected == false' },
  ];
}

async function main(): Promise<number> {
  const workspaceId = process.argv[2] || process.env.SEED_WORKSPACE_ID;
  if (!workspaceId) {
    console.error('Usage: PGHOST=… PGUSER=… PGPASSWORD=… ts-node scripts/seedStagingGovernance.ts <workspaceId>');
    process.exit(1);
  }
  const cfg = {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'staging',
    database: process.env.PGDATABASE || 'postgres',
  };
  console.log(`Seeding ${GOVERNED_PROMPT_SEEDS.length} governed prompts for workspace ${workspaceId}`);
  console.log(`  database: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);

  const c = new PgClient(cfg);
  await c.connect();

  let pass = 0;
  let fail = 0;
  for (const seed of GOVERNED_PROMPT_SEEDS) {
    try {
      const promptId = deterministicId(`prompt:${workspaceId}:${seed.useCaseKey}`);
      const versionId = deterministicId(`version:${workspaceId}:${seed.useCaseKey}`);
      const deployId = deterministicId(`deploy:${workspaceId}:${seed.useCaseKey}`);
      const shadowId = deterministicId(`shadow:${workspaceId}:${seed.useCaseKey}`);
      const evidenceId = deterministicId(`receipt:${workspaceId}:${seed.useCaseKey}`);
      const auditId = deterministicId(`audit:seed:${workspaceId}:${seed.useCaseKey}`);

      const compiledShadow = { risk_tier: seed.riskTier, rules: shadowRulesForTier(seed.riskTier) };
      const shadowHash = crypto.createHash('sha256').update(JSON.stringify(compiledShadow)).digest('hex');
      const receiptHash = crypto.createHash('sha256').update(`receipt:${versionId}:${seed.body}`).digest('hex');
      const bodyHash = crypto.createHash('sha256').update(seed.body).digest('hex');

      // prompts
      await c.query(
        `INSERT INTO prompts (id, tenant_id, workspace_id, name, prompt_type, owner_id, owner_name,
                              risk_tier, status, use_case_key, current_version_id, created_by, created_at, updated_at)
         VALUES ($1, $2, $2, $3, 'system_prompt', $2, 'governance-seed', $4, 'production_active', $5, $6, $2, $7, $7)
         ON CONFLICT (id) DO UPDATE SET status = 'production_active', current_version_id = $6, updated_at = $7`,
        [promptId, workspaceId, seed.name, seed.riskTier, seed.useCaseKey, versionId, TS],
      );

      // prompt_versions
      await c.query(
        `INSERT INTO prompt_versions (id, prompt_id, version_number, body, body_hash, variables_json,
                                      guardrails_json, model_routes_json, change_summary, created_by,
                                      immutable, created_at, updated_at)
         VALUES ($1, $2, 1, $3, $4, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Seed', $5,
                 true, $6, $6)
         ON CONFLICT (id) DO NOTHING`,
        [versionId, promptId, seed.body, bodyHash, workspaceId, TS],
      );

      // prompt_deployments
      await c.query(
        `INSERT INTO prompt_deployments (id, prompt_version_id, environment, scope_json, deployed_by,
                                         release_note, created_at, updated_at)
         VALUES ($1, $2, 'production', '{}'::jsonb, $3, 'Seed', $4, $4)
         ON CONFLICT (id) DO NOTHING`,
        [deployId, versionId, workspaceId, TS],
      );

      // prompt_constraint_shadows (locked)
      await c.query(
        `INSERT INTO prompt_constraint_shadows (id, prompt_id, version_id, workspace_id, risk_tier,
                                                 compiled_shadow, shadow_hash, status, locked_at,
                                                 locked_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'locked', $8, $9, $8, $8)
         ON CONFLICT (id) DO UPDATE SET status = 'locked', locked_at = $8`,
        [shadowId, promptId, versionId, workspaceId, seed.riskTier, JSON.stringify(compiledShadow), shadowHash, TS, workspaceId],
      );

      // prompt_evidence_links (governance receipt)
      await c.query(
        `INSERT INTO prompt_evidence_links (id, prompt_id, prompt_version_id, workspace_id, tenant_id,
                                            event_type, vault_item_id, evidence_hash, risk_level,
                                            actor_id, created_at)
         VALUES ($1, $2, $3, $4, $4, 'prompt.governance_receipt.generated', $5, $6, $7, $4, $8)
         ON CONFLICT (id) DO NOTHING`,
        [evidenceId, promptId, versionId, workspaceId, deterministicId(`vault:${workspaceId}:${seed.useCaseKey}`), receiptHash, seed.riskTier, TS],
      );

      // audit event
      await c.query(
        `INSERT INTO prompt_audit_ledger (id, audit_ref, workspace_id, tenant_id, event_type, reason,
                                          after_state, risk_level, actor_id, created_at)
         VALUES ($1, $2, $3, $3, 'prompt.governance_seed.bootstrapped', $4, $5::jsonb, $6, $3, $7)`,
        [auditId, `seed-${workspaceId}-${seed.useCaseKey}`, workspaceId, `Bootstrap governed prompt for ${seed.useCaseKey}`, JSON.stringify({ use_case_key: seed.useCaseKey, risk_tier: seed.riskTier, bootstrap: true }), seed.riskTier, TS],
      );

      console.log(`  OK   ${seed.useCaseKey} (${seed.riskTier})`);
      pass++;
    } catch (e: any) {
      console.log(`  FAIL ${seed.useCaseKey}: ${String(e.message).substring(0, 120)}`);
      fail++;
    }
  }

  console.log(`\n${pass} seeded, ${fail} failed`);
  await c.end();
  return fail > 0 ? 2 : 0;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
