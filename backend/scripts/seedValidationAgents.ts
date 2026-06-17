/*
 * Seed the six governed post-validation agents into Agent Studio.
 *
 *   npx ts-node scripts/seedValidationAgents.ts <workspaceId>
 *   (or set SEED_WORKSPACE_ID)
 *
 * Behaviour (per the product decision — "these 6 agents only"):
 *   1. RETIRE every existing agent in the workspace whose name is not one of the
 *      six governed validation agents. Retirement preserves the audit record
 *      (rows are never hard-deleted) and hides them from the default view.
 *   2. UPSERT the six governed agents as ACTIVE, each with its real purpose.
 *
 * Idempotent: re-running only re-asserts the six agents and re-retires strays.
 * The agent `name` values MUST match each ValidationAgent.label so the runtime
 * chain (agent → finding → decision) lines up with what the Studio shows.
 */

import { supabaseAdmin } from '../src/shared/supabase';
import { AGENT_CATALOG } from '../src/modules/prompts/validation/registry';

// Per-agent Studio presentation. Risk tiers reflect how hard each gate bites.
const AGENT_PRESENTATION: Record<string, { type: string; risk: string; autonomy: string }> = {
  general_content:     { type: 'content',    risk: 'low',    autonomy: 'L1' },
  image_validation:    { type: 'safety',     risk: 'high',   autonomy: 'L1' },
  approval_rules:      { type: 'governance', risk: 'medium', autonomy: 'L1' },
  policy_check:        { type: 'governance', risk: 'high',   autonomy: 'L1' },
  evidence_kb:         { type: 'governance', risk: 'medium', autonomy: 'L1' },
  platform_compliance: { type: 'compliance', risk: 'low',    autonomy: 'L1' },
};

const GOVERNED_NAMES = AGENT_CATALOG.map((a) => a.name);

async function main() {
  const workspaceId = process.argv[2] || process.env.SEED_WORKSPACE_ID;
  if (!workspaceId) {
    console.error('Usage: ts-node scripts/seedValidationAgents.ts <workspaceId>');
    process.exit(1);
  }

  // org_id mirrors workspace_id in this codebase's seed convention unless an
  // explicit org is provided.
  const orgId = process.env.SEED_ORG_ID || workspaceId;
  const now = new Date().toISOString();

  console.log(`\nSeeding the 6 governed validation agents for workspace ${workspaceId}…\n`);

  // ── Step 1: retire strays ────────────────────────────────────────────
  const { data: existing, error: listErr } = await supabaseAdmin
    .from('agents')
    .select('id, name, status')
    .eq('workspace_id', workspaceId);

  if (listErr) {
    console.error('Failed to list existing agents:', listErr.message);
    process.exit(1);
  }

  const strays = (existing || []).filter(
    (a) => !GOVERNED_NAMES.includes(a.name) && String(a.status).toUpperCase() !== 'RETIRED',
  );

  for (const a of strays) {
    const { error } = await supabaseAdmin
      .from('agents')
      .update({ status: 'RETIRED', updated_at: now })
      .eq('id', a.id);
    if (error) console.warn(`  ! could not retire "${a.name}": ${error.message}`);
    else console.log(`  retired stray agent: "${a.name}"`);
  }
  if (strays.length === 0) console.log('  no stray agents to retire.');

  // ── Step 2: insert/update the six governed agents ─────────────────────
  // Done as explicit select → update | insert keyed on (workspace_id, name),
  // rather than upsert(onConflict:'name'), which fails when no unique
  // constraint matches and is not workspace-scoped.
  console.log('');
  for (const entry of AGENT_CATALOG) {
    const p = AGENT_PRESENTATION[entry.key];
    const row: Record<string, unknown> = {
      org_id: orgId,
      workspace_id: workspaceId,
      name: entry.name,
      type: p.type,
      purpose: entry.purpose,
      status: 'ACTIVE',
      autonomy_level: p.autonomy,
      risk_level: p.risk,
      trust_score: 0.9,
      faithfulness_score: 0.95,
      evidence_required: true,
      approval_required: false,
      linked_workflows: ['Post Governance Workflow'],
      runtime_controls: { environment: 'production' },
      updated_at: now,
    };

    const { data: found } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', entry.name)
      .limit(1)
      .maybeSingle();

    if (found?.id) {
      const { error } = await supabaseAdmin.from('agents').update(row).eq('id', found.id);
      if (error) console.error(`  ✗ failed to update "${entry.name}": ${error.message}`);
      else console.log(`  ✓ updated  ${entry.name}`);
    } else {
      const { error } = await supabaseAdmin
        .from('agents')
        .insert({ ...row, created_at: now });
      if (error) console.error(`  ✗ failed to insert "${entry.name}": ${error.message}`);
      else console.log(`  ✓ inserted ${entry.name}`);
    }
  }

  console.log('\nDone. Agent Studio now shows the 6 governed validation agents.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
