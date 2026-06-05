const fs = require('fs');
const files = [
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
let out = '-- ============================================================\n';
out += '-- STAGING MIGRATIONS: all 12 prompt_governance migrations\n';
out += '-- Apply in order. Each migration is idempotent.\n';
out += '-- Apply via Supabase Dashboard -> SQL Editor\n';
out += '-- ============================================================\n\n';
for (const f of files) {
  out += `\n-- ============================================================\n-- MIGRATION: ${f}\n-- ============================================================\n`;
  out += fs.readFileSync('src/db/migrations/' + f, 'utf8') + '\n';
}
fs.writeFileSync(process.env.TEMP + '/migrate_staging_governance.sql', out);
console.log('Wrote', out.length, 'bytes to', process.env.TEMP + '/migrate_staging_governance.sql');
console.log('Files combined:', files.length);
