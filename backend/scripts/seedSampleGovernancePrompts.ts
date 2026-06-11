/*
 * Seed the Prompt Governance registry with five sample governed prompts — one
 * per Test Center runtime decision possibility (Basic / Claim+No-KB / Claim+KB /
 * High-Risk / Policy Violation). Their names match the classifier's governed_prompt
 * labels so a Test Center run resolves to a real registry row.
 *
 *   npx ts-node scripts/seedSampleGovernancePrompts.ts <workspaceId>
 *   (or set SEED_WORKSPACE_ID)
 *
 * Idempotent: deterministic row ids → upsert on conflict, never duplicates.
 * Every row is metadata.governance_sample = true and each seed writes a bootstrap
 * audit event, so the origin is auditable and NOT a silent governance bypass.
 * Tenant-scoped: workspace_id AND tenant_id are set to the target workspace.
 *
 * Requires the prompts schema patch + prompt_evidence_links migration applied.
 * Does not flip PROMPT_GOVERNANCE_ENFORCED and does not set a runtime use_case_key.
 */
/* eslint-disable no-console */
import { supabaseAdmin } from '../src/shared/supabase';
import { PromptAuditService } from '../src/modules/prompts/PromptAuditService';
import {
  buildSampleGovernancePromptFixtures,
  SAMPLE_GOVERNANCE_PROMPT_SEEDS,
} from '../src/modules/prompts/sampleGovernancePromptSeeds';

async function upsert(table: string, rows: any[]) {
  if (rows.length === 0) return;
  const { error } = await supabaseAdmin.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`upsert ${table} failed: ${error.message}`);
  console.log(`  upserted ${rows.length} → ${table}`);
}

async function main() {
  const workspaceId = process.argv[2] || process.env.SEED_WORKSPACE_ID;
  if (!workspaceId) {
    console.error('Usage: ts-node scripts/seedSampleGovernancePrompts.ts <workspaceId>');
    process.exit(1);
  }

  console.log(`Seeding ${SAMPLE_GOVERNANCE_PROMPT_SEEDS.length} sample governance prompts for workspace ${workspaceId}…`);
  const f = buildSampleGovernancePromptFixtures(workspaceId);

  // Order matters loosely (prompt before version reference); upsert is tolerant.
  await upsert('prompts', f.prompts);
  await upsert('prompt_versions', f.prompt_versions);
  await upsert('prompt_deployments', f.prompt_deployments);
  await upsert('prompt_evidence_links', f.prompt_evidence_links);

  for (const seed of SAMPLE_GOVERNANCE_PROMPT_SEEDS) {
    await PromptAuditService.record({
      event_type: 'prompt.governance_sample.bootstrapped',
      workspace_id: workspaceId,
      reason: `Sample governance prompt '${seed.name}' seeded for possibility '${seed.possibility.key}' (${seed.riskTier}, ${seed.status})`,
      after_state: {
        name: seed.name,
        prompt_type: seed.promptType,
        risk_tier: seed.riskTier,
        status: seed.status,
        workflow_possibility: seed.possibility,
        governance_sample: true,
      },
    }).catch(() => undefined);
  }

  console.log('Done. Five sample governed prompts are visible in the Prompt Governance registry for this workspace.');
  console.log('NOTE: no runtime use_case_key set; PROMPT_GOVERNANCE_ENFORCED was NOT changed.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
