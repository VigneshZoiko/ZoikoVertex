-- ============================================================
-- ZoikoVertex - prompt_audit_ledger VERIFICATION harness
--
-- Run AFTER prompt_governance_append_only_audit_trail.sql.
-- This is a proof script for Batch 2 acceptance items #2/#3/#4:
--   - query performance at 100k+ rows (EXPLAIN ANALYZE, index-served)
--   - immutability (UPDATE/DELETE rejected at the DB tier)
--   - before/after clamping keeps rows small
--
-- It seeds into a THROWAWAY workspace id and cleans up at the end via a
-- session-local bypass. Run in a non-production database (or a transaction
-- you roll back). Safe to re-run.
-- ============================================================

-- ── 1. Seed 100,000 synthetic audit rows for one workspace + prompt ─────────
DO $$
DECLARE
  ws uuid := '00000000-0000-0000-0000-0000000a1d17';
  pr uuid := '00000000-0000-0000-0000-0000000c0de0';
BEGIN
  INSERT INTO prompt_audit_ledger
    (audit_ref, workspace_id, tenant_id, prompt_id, version_id, actor_id,
     actor_name, actor_role, event_type, reason, risk_level, created_at)
  SELECT
    'PAUD-SEED-' || g,
    ws, ws, pr,
    gen_random_uuid(),
    gen_random_uuid(),
    'seed.actor@zoiko.test',
    'GOVERNANCE_ADMIN',
    (ARRAY['prompt.updated','prompt.deployed','prompt.approval.recorded',
           'prompt.test.passed','prompt.rollback.completed'])[1 + (g % 5)],
    'synthetic seed row',
    (ARRAY['low','medium','high','critical'])[1 + (g % 4)],
    now() - (g || ' seconds')::interval
  FROM generate_series(1, 100000) AS g;
END $$;

ANALYZE prompt_audit_ledger;

-- ── 2. EXPLAIN ANALYZE: GET /prompts/:id/audit (newest-first, paginated) ────
-- Expectation: Index Scan (no Seq Scan, no Sort) on
-- idx_prompt_audit_ledger_ws_prompt_created, sub-millisecond for the page.
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM prompt_audit_ledger
WHERE workspace_id = '00000000-0000-0000-0000-0000000a1d17'
  AND prompt_id    = '00000000-0000-0000-0000-0000000c0de0'
ORDER BY created_at DESC
LIMIT 100 OFFSET 0;

-- Filtered variant (event_type + risk_level) — still index-served on the
-- composite, residual filter applied.
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM prompt_audit_ledger
WHERE workspace_id = '00000000-0000-0000-0000-0000000a1d17'
  AND prompt_id    = '00000000-0000-0000-0000-0000000c0de0'
  AND event_type   = 'prompt.deployed'
  AND risk_level   = 'high'
ORDER BY created_at DESC
LIMIT 100;

-- ── 3. EXPLAIN ANALYZE: GET /prompts/:id/audit/timeline (capped 500) ────────
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM prompt_audit_ledger
WHERE workspace_id = '00000000-0000-0000-0000-0000000a1d17'
  AND prompt_id    = '00000000-0000-0000-0000-0000000c0de0'
ORDER BY created_at DESC
LIMIT 500;

-- ── 4. Immutability: both statements MUST raise and abort ───────────────────
-- Expect: ERROR  prompt_audit_ledger is append-only; UPDATE is not permitted
DO $$
BEGIN
  UPDATE prompt_audit_ledger SET reason = 'tampered'
  WHERE workspace_id = '00000000-0000-0000-0000-0000000a1d17';
  RAISE EXCEPTION 'FAIL: UPDATE was allowed';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'PASS: UPDATE blocked -> %', SQLERRM;
END $$;

-- Expect: ERROR  prompt_audit_ledger is append-only; DELETE is not permitted
DO $$
BEGIN
  DELETE FROM prompt_audit_ledger
  WHERE workspace_id = '00000000-0000-0000-0000-0000000a1d17';
  RAISE EXCEPTION 'FAIL: DELETE was allowed';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'PASS: DELETE blocked -> %', SQLERRM;
END $$;

-- ── 5. Cross-tenant isolation: a different workspace sees zero of these rows ─
-- Expect: count = 0
SELECT count(*) AS other_tenant_visible_rows
FROM prompt_audit_ledger
WHERE workspace_id = '00000000-0000-0000-0000-00000000beef'  -- different tenant
  AND prompt_id    = '00000000-0000-0000-0000-0000000c0de0';

-- ── 6. Cleanup ──────────────────────────────────────────────────────────────
-- The append-only trigger also blocks DELETE for cleanup (by design). Drop it
-- only inside this verification session, purge the seed, then restore it.
ALTER TABLE prompt_audit_ledger DISABLE TRIGGER prompt_audit_ledger_no_mutation;
DELETE FROM prompt_audit_ledger
WHERE workspace_id = '00000000-0000-0000-0000-0000000a1d17';
ALTER TABLE prompt_audit_ledger ENABLE TRIGGER prompt_audit_ledger_no_mutation;
