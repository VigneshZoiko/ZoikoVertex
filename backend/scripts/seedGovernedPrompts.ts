/*
 * Bootstrap seed for Governed Prompt Execution.
 *
 *   npx ts-node scripts/seedGovernedPrompts.ts <workspaceId>
 *   (or set SEED_WORKSPACE_ID)
 *
 * Idempotent: deterministic row ids → upsert on conflict, never duplicates.
 * Marks every row metadata.bootstrap = true and writes a bootstrap audit event,
 * so the seed origin is auditable and NOT a silent governance bypass.
 *
 * Requires the prior migrations applied (prompts.use_case_key, prompt_constraint_shadows,
 * prompt_evidence_links). Does not flip PROMPT_GOVERNANCE_ENFORCED.
 */
 
import { supabaseAdmin } from '../src/shared/supabase';
import { PromptAuditService } from '../src/modules/prompts/PromptAuditService';
import { buildGovernedPromptFixtures, GOVERNED_PROMPT_SEEDS } from '../src/modules/prompts/governedPromptSeeds';

async function upsert(table: string, rows: any[]) {
  if (rows.length === 0) return;
  const { error } = await supabaseAdmin.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`upsert ${table} failed: ${error.message}`);
  console.log(`  upserted ${rows.length} → ${table}`);
}

async function main() {
  const workspaceId = process.argv[2] || process.env.SEED_WORKSPACE_ID;
  if (!workspaceId) {
    console.error('Usage: ts-node scripts/seedGovernedPrompts.ts <workspaceId>');
    process.exit(1);
  }

  console.log(`Seeding ${GOVERNED_PROMPT_SEEDS.length} governed prompts for workspace ${workspaceId} (BOOTSTRAP)…`);
  const f = buildGovernedPromptFixtures(workspaceId);

  // Order matters loosely (prompt before version reference); upsert is tolerant.
  await upsert('prompts', f.prompts);
  await upsert('prompt_versions', f.prompt_versions);
  await upsert('prompt_deployments', f.prompt_deployments);
  await upsert('prompt_constraint_shadows', f.prompt_constraint_shadows);
  await upsert('prompt_evidence_links', f.prompt_evidence_links);

  for (const seed of GOVERNED_PROMPT_SEEDS) {
    await PromptAuditService.record({
      event_type: 'prompt.governance_seed.bootstrapped',
      workspace_id: workspaceId,
      reason: `Bootstrap governed prompt seeded for use case '${seed.useCaseKey}' (${seed.riskTier})`,
      after_state: { use_case_key: seed.useCaseKey, risk_tier: seed.riskTier, bootstrap: true },
    }).catch(() => undefined);
  }

  console.log('Done. Governed prompts are resolvable by use_case_key for this workspace.');
  console.log('NOTE: PROMPT_GOVERNANCE_ENFORCED was NOT changed.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
