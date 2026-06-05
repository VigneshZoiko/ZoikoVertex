-- ============================================================================
-- Phase 4.F — Governance migration verification (run in STAGING after applying
-- all six prompt-governance migrations). Every query has an expected result in
-- its comment. If any row is missing, the corresponding migration did not apply.
--
-- Apply order (idempotent, safe to re-run):
--   prompt_governance_enterprise_hardening.sql
--   prompt_governance_append_only_audit_trail.sql
--   prompt_evidence_vault_integration.sql
--   prompt_runtime_evidence_schema.sql
--   prompt_constraint_shadows_schema.sql
--   prompt_use_case_key.sql
-- ============================================================================

-- 1. Tables exist (expect 1 row each).
SELECT to_regclass('prompt_constraint_shadows')  AS constraint_shadows,
       to_regclass('prompt_runtime_traces')       AS runtime_traces,
       to_regclass('prompt_evidence_links')        AS evidence_links,
       to_regclass('prompt_incidents')             AS incidents;

-- 2. prompts.use_case_key column exists (expect 1 row).
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'prompts' AND column_name = 'use_case_key';

-- 3. Indexes (expect idx_prompts_workspace_use_case + idx_pcs_* + uq_pcs_one_locked_per_version).
SELECT indexname FROM pg_indexes
 WHERE tablename IN ('prompts','prompt_constraint_shadows','prompt_evidence_links','prompt_runtime_traces')
   AND (indexname LIKE 'idx_%' OR indexname LIKE 'uq_%')
 ORDER BY indexname;

-- 4. Partial UNIQUE locked-shadow index exists (expect uq_pcs_one_locked_per_version, indisunique=t).
SELECT i.relname AS index_name, ix.indisunique
  FROM pg_index ix JOIN pg_class i ON i.oid = ix.indexrelid
 WHERE i.relname = 'uq_pcs_one_locked_per_version';

-- 5. Immutability / append-only triggers (expect all four).
SELECT tgname FROM pg_trigger
 WHERE tgname IN ('trg_pcs_lock_immutable',
                  'prompt_runtime_traces_no_mutation',
                  'prompt_evidence_links_no_update')
 ORDER BY tgname;

-- 6. Append-only enforcement smoke (run in a transaction, then ROLLBACK):
--    BEGIN;
--      INSERT INTO prompt_evidence_links (id, prompt_version_id, event_type, evidence_hash)
--        VALUES (gen_random_uuid(), gen_random_uuid(), 'verify.test', 'h');
--      UPDATE prompt_evidence_links SET evidence_hash='x' WHERE event_type='verify.test';  -- expect ERROR (append-only)
--    ROLLBACK;
--
--    BEGIN;
--      INSERT INTO prompt_runtime_traces (id, workspace_id, execution_id) VALUES (gen_random_uuid(), gen_random_uuid(), 'v');
--      DELETE FROM prompt_runtime_traces WHERE execution_id='v';                            -- expect ERROR (append-only)
--    ROLLBACK;
--
--    (Constraint-shadow lock immutability + partial-unique checks: see the
--     MANUAL STAGING VERIFICATION block in prompt_constraint_shadows_schema.sql.)
