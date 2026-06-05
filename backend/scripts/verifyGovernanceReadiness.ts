/**
 * verifyGovernanceReadiness.ts — pg-based governance readiness check.
 *
 * Verifies that all 9 governed use cases resolve for the given workspace
 * and that an unseeded use case fails closed. Uses the `pg` driver so it
 * works against the local staging Postgres or the real Supabase instance.
 *
 *   PGHOST=… PGUSER=… PGPASSWORD=… PGDATABASE=… \
 *     npx ts-node scripts/verifyGovernanceReadiness.ts <workspaceId>
 *
 * Exits 0 on full pass, 2 on any failure, 1 on infrastructure error.
 */
import { Client } from 'pg';

const USE_CASES = [
  'risk_semantic_classifier',
  'qa_quality_check',
  'safety_moderation',
  'social_caption_generation',
  'scheduler_recommendation',
  'inbox_message_classification',
  'inbox_ai_reply',
  'vision_image_summary',
  'vision_story_context',
];

async function main(): Promise<number> {
  const workspaceId = process.argv[2] || process.env.STAGING_WORKSPACE_ID;
  if (!workspaceId) {
    console.error('Usage: ts-node scripts/verifyGovernanceReadiness.ts <workspaceId>');
    process.exit(1);
  }
  const cfg = {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'staging',
    database: process.env.PGDATABASE || 'postgres',
  };
  console.log(`[verifyGovernanceReadiness] workspace=${workspaceId}`);

  const c = new Client(cfg);
  await c.connect();
  let pass = 0;
  let fail = 0;

  for (const useCase of USE_CASES) {
    const r = await c.query(
      `SELECT p.id AS prompt_id, p.status, p.current_version_id,
              pv.id AS version_id, pv.body_hash,
              pd.id AS deployment_id, pd.environment,
              pcs.id AS shadow_id, pcs.status AS shadow_status, pcs.shadow_hash,
              pel.id AS evidence_id, pel.event_type
         FROM prompts p
         LEFT JOIN prompt_versions pv ON pv.id = p.current_version_id
         LEFT JOIN prompt_deployments pd ON pd.prompt_version_id = pv.id
         LEFT JOIN prompt_constraint_shadows pcs ON pcs.version_id = pv.id AND pcs.status = 'locked'
         LEFT JOIN prompt_evidence_links pel ON pel.prompt_version_id = pv.id
            AND pel.event_type = 'prompt.governance_receipt.generated'
        WHERE p.workspace_id = $1 AND p.use_case_key = $2
        LIMIT 1`,
      [workspaceId, useCase],
    );
    if (r.rows.length === 0) {
      console.log(`  ✗ ${useCase.padEnd(30)} NO_GOVERNED_PROMPT — no prompt with use_case_key`);
      fail++;
      continue;
    }
    const row = r.rows[0];
    const ok =
      row.status === 'production_active' &&
      row.version_id &&
      row.deployment_id &&
      row.environment === 'production' &&
      row.shadow_id &&
      row.shadow_status === 'locked' &&
      row.evidence_id;
    if (ok) {
      console.log(`  ✓ ${useCase.padEnd(30)} resolved (shadow locked, evidence present, deployed to production)`);
      pass++;
    } else {
      const missing = [
        !row.version_id && 'version',
        !row.deployment_id && 'deployment',
        !row.shadow_id && 'shadow',
        !row.evidence_id && 'evidence',
      ].filter(Boolean).join(', ');
      console.log(`  ✗ ${useCase.padEnd(30)} INCOMPLETE — missing: ${missing || 'status=' + row.status}`);
      fail++;
    }
  }

  // Unseeded use case must not resolve
  const unseeded = await c.query(
    `SELECT 1 FROM prompts WHERE workspace_id = $1 AND use_case_key = $2 LIMIT 1`,
    [workspaceId, 'unseeded_does_not_exist'],
  );
  const failClosed = unseeded.rows.length === 0;
  if (failClosed) {
    console.log(`  ✓ ${'unseeded_does_not_exist'.padEnd(30)} fails closed (no row)`);
    pass++;
  } else {
    console.log(`  ✗ ${'unseeded_does_not_exist'.padEnd(30)} unexpectedly resolved`);
    fail++;
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await c.end();
  return fail > 0 ? 2 : 0;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
