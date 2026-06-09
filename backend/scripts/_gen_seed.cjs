// Precompute deterministic UUIDs and write a ready-to-paste seed SQL.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function deterministicId(seed) {
  const h = crypto.createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const USE_CASES = [
  { key: 'risk_semantic_classifier', name: 'Risk Semantic Classifier', tier: 'tier_2_medium' },
  { key: 'qa_quality_check', name: 'QA Quality Check', tier: 'tier_2_medium' },
  { key: 'safety_moderation', name: 'Safety Moderation', tier: 'tier_2_medium' },
  { key: 'social_caption_generation', name: 'Social Caption Generation', tier: 'tier_2_medium' },
  { key: 'vision_image_summary', name: 'Vision Image Summary', tier: 'tier_1_low' },
  { key: 'vision_story_context', name: 'Vision Story Context', tier: 'tier_1_low' },
  { key: 'scheduler_recommendation', name: 'Scheduler Recommendation', tier: 'tier_1_low' },
  { key: 'inbox_message_classification', name: 'Inbox Message Classification', tier: 'tier_2_medium' },
  { key: 'inbox_ai_reply', name: 'Inbox AI Reply', tier: 'tier_2_medium' },
];

const WORKSPACE_ID = process.argv[2] || '00000000-0000-0000-0000-000000000000';
const TS = '2025-01-01T00:00:00Z';

function shadowRules(tier) {
  if (tier === 'tier_1_low') return [
    { id: 'len_cap', severity: 'warn', check: 'output.length <= 4000' },
    { id: 'pii_basic', severity: 'warn', check: 'pii.email == null && pii.phone == null' },
  ];
  return [
    { id: 'len_cap', severity: 'block', check: 'output.length <= 4000' },
    { id: 'pii_block', severity: 'block', check: 'pii.email == null && pii.phone == null && pii.ssn == null' },
    { id: 'injection_block', severity: 'block', check: 'injection.detected == false' },
  ];
}

let sql = '';
sql += `-- ============================================================\n`;
sql += `-- STAGING SEED: 9 governed use cases for workspace ${WORKSPACE_ID}\n`;
sql += `-- Idempotent: deterministic UUIDs (SHA1) so re-run is safe\n`;
sql += `-- Apply via Supabase Dashboard → SQL Editor\n`;
sql += `-- ============================================================\n\n`;
sql += `BEGIN;\n\n`;
sql += `-- Ensure the prompts row's owner_id is set to a valid uuid (NOT NULL)\n`;
sql += `-- Some seed paths use the workspace as the owner; others use a sentinel.\n`;
sql += `-- We use the workspace uuid as the sentinel so no FK violations occur.\n\n`;

for (const u of USE_CASES) {
  const promptId   = deterministicId(`prompt:${WORKSPACE_ID}:${u.key}`);
  const versionId  = deterministicId(`version:${WORKSPACE_ID}:${u.key}`);
  const deployId   = deterministicId(`deploy:${WORKSPACE_ID}:${u.key}`);
  const shadowId   = deterministicId(`shadow:${WORKSPACE_ID}:${u.key}`);
  const evidenceId = deterministicId(`receipt:${WORKSPACE_ID}:${u.key}`);
  const auditId    = deterministicId(`audit:seed:${WORKSPACE_ID}:${u.key}`);
  const vaultId    = deterministicId(`vault:${WORKSPACE_ID}:${u.key}`);
  const rules = shadowRules(u.tier);
  const compiled = { risk_tier: u.tier, rules };
  const shadowHash = crypto.createHash('sha256').update(JSON.stringify(compiled)).digest('hex');
  const receiptHash = crypto.createHash('sha256').update(`receipt:${versionId}:${u.key}`).digest('hex');

  sql += `-- ---- ${u.key} ----\n`;
  // prompts (upsert)
  sql += `INSERT INTO prompts (id, tenant_id, workspace_id, name, prompt_type, owner_id, owner_name, risk_tier, status, use_case_key, current_version_id, created_by, created_at, updated_at)\n`;
  sql += `VALUES ('${promptId}', '${WORKSPACE_ID}', '${WORKSPACE_ID}', '${u.name.replace(/'/g, "''")}', 'system_prompt', '${WORKSPACE_ID}', 'governance-seed', '${u.tier}', 'production_active', '${u.key}', '${versionId}', '${WORKSPACE_ID}', '${TS}', '${TS}')\n`;
  sql += `ON CONFLICT (id) DO UPDATE SET status = 'production_active', current_version_id = EXCLUDED.current_version_id, updated_at = EXCLUDED.updated_at;\n\n`;

  // prompt_versions
  sql += `INSERT INTO prompt_versions (id, prompt_id, version_number, body, body_hash, variables_json, guardrails_json, model_routes_json, change_summary, created_by, immutable, created_at, updated_at)\n`;
  sql += `VALUES ('${versionId}', '${promptId}', 1, 'seed-body-${u.key}', 'seed-hash-${u.key}', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Seed', '${WORKSPACE_ID}', true, '${TS}', '${TS}')\n`;
  sql += `ON CONFLICT (id) DO NOTHING;\n\n`;

  // prompt_deployments (real Supabase: deployed_at not updated_at)
  sql += `INSERT INTO prompt_deployments (id, prompt_version_id, environment, scope_json, deployed_by, deployed_at, release_note, created_at)\n`;
  sql += `VALUES ('${deployId}', '${versionId}', 'production', '{}'::jsonb, '${WORKSPACE_ID}', '${TS}', 'Seed', '${TS}')\n`;
  sql += `ON CONFLICT (id) DO NOTHING;\n\n`;

  // prompt_constraint_shadows (LOCKED)
  sql += `INSERT INTO prompt_constraint_shadows (id, prompt_id, version_id, workspace_id, risk_tier, compiled_shadow, shadow_hash, status, locked_at, locked_by, created_at, updated_at)\n`;
  sql += `VALUES ('${shadowId}', '${promptId}', '${versionId}', '${WORKSPACE_ID}', '${u.tier}', '${JSON.stringify(compiled).replace(/'/g, "''")}'::jsonb, '${shadowHash}', 'locked', '${TS}', '${WORKSPACE_ID}', '${TS}', '${TS}')\n`;
  sql += `ON CONFLICT (id) DO UPDATE SET status = 'locked', locked_at = EXCLUDED.locked_at;\n\n`;

  // prompt_evidence_links (governance receipt) -- real Supabase has no updated_at
  sql += `INSERT INTO prompt_evidence_links (id, prompt_id, prompt_version_id, workspace_id, tenant_id, event_type, vault_item_id, evidence_hash, risk_level, actor_id, reason, metadata, created_at)\n`;
  sql += `VALUES ('${evidenceId}', '${promptId}', '${versionId}', '${WORKSPACE_ID}', '${WORKSPACE_ID}', 'prompt.governance_receipt.generated', '${vaultId}', '${receiptHash}', '${u.tier}', '${WORKSPACE_ID}', 'Bootstrap receipt for ${u.key}', '{"bootstrap":true}'::jsonb, '${TS}')\n`;
  sql += `ON CONFLICT (id) DO NOTHING;\n\n`;

  // prompt_audit_ledger (seed bootstrap event) -- real Supabase has no updated_at
  sql += `INSERT INTO prompt_audit_ledger (id, audit_ref, workspace_id, tenant_id, prompt_id, version_id, actor_id, event_type, reason, before_state, after_state, risk_level, created_at)\n`;
  sql += `VALUES ('${auditId}', 'seed-${WORKSPACE_ID}-${u.key}', '${WORKSPACE_ID}', '${WORKSPACE_ID}', '${promptId}', '${versionId}', '${WORKSPACE_ID}', 'prompt.governance_seed.bootstrapped', 'Bootstrap governed prompt for ${u.key}', '{}'::jsonb, '${JSON.stringify({ use_case_key: u.key, risk_tier: u.tier, bootstrap: true }).replace(/'/g, "''")}'::jsonb, '${u.tier}', '${TS}')\n`;
  sql += `ON CONFLICT (id) DO NOTHING;\n\n`;
}

sql += `COMMIT;\n`;
const outPath = path.join(process.env.TEMP || '/tmp', 'seed_staging_governance.sql');
fs.writeFileSync(outPath, sql);
console.log(`Wrote ${sql.length} bytes to ${outPath}`);
console.log(`Workspace: ${WORKSPACE_ID}`);
console.log(`Seeds: ${USE_CASES.length}`);
