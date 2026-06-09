const fs = require('fs');
const all = [
  'prompt_governance_enterprise_hardening.sql',
  'prompt_versions_and_suites_patch.sql',
  'prompt_use_case_key.sql',
  'prompt_constraint_shadows_schema.sql',
  'prompt_governance_append_only_audit_trail.sql',
  'prompt_runtime_evidence_schema.sql',
  'prompt_evidence_vault_integration.sql',
  'prompt_audit_ledger_verification.sql',
  'prompt_dependency_graph_indexes.sql',
  'prompt_dependency_backfill.sql',
  'prompt_governance_immutability_hardening.sql',
  'prompt_adversarial_testing_scenarios.sql',
];
// Split into 3 chunks of 4 migrations each
const chunks = [all.slice(0,4), all.slice(4,8), all.slice(8,12)];
chunks.forEach((files, i) => {
  let out = `-- ============================================================\n`;
  out += `-- MIGRATION CHUNK ${i+1} of ${chunks.length}: ${files.length} files\n`;
  out += `-- Apply in this order. Each migration is idempotent.\n`;
  out += `-- Apply via Supabase Dashboard -> SQL Editor\n`;
  out += `-- ============================================================\n\n`;
  for (const f of files) {
    out += `\n-- ============================================================\n-- MIGRATION: ${f}\n-- ============================================================\n`;
    out += fs.readFileSync('src/db/migrations/' + f, 'utf8') + '\n';
  }
  const path = process.env.TEMP + `/migrate_chunk_${i+1}.sql`;
  fs.writeFileSync(path, out);
  console.log(`Chunk ${i+1}: ${out.length} bytes -> ${path}`);
});
