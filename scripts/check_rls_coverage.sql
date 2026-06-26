-- RLS Coverage Check — CI Gate
-- Fails if any public table lacks at least one RLS policy.
-- Run against the Supabase/production database as part of CI/CD.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/check_rls_coverage.sql
--   or via Supabase SQL Editor
--
-- Expected: Query returns zero rows.
-- Failure:  Tables listed below need RLS policies added.

WITH table_list AS (
  SELECT
    schemaname,
    tablename
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_prisma_%'
),
rls_enabled AS (
  SELECT
    schemaname,
    tablename
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true
),
policy_counts AS (
  SELECT
    pol.schemaname,
    pol.tablename,
    COUNT(*) AS policy_count
  FROM pg_catalog.pg_policies pol
  WHERE pol.schemaname = 'public'
  GROUP BY pol.schemaname, pol.tablename
)
SELECT
  tl.schemaname,
  tl.tablename,
  CASE WHEN re.tablename IS NULL THEN 'NO_RLS' ELSE 'RLS_ENABLED' END AS rls_status,
  COALESCE(pc.policy_count, 0) AS policy_count,
  CASE
    WHEN re.tablename IS NULL THEN 'MISSING: ALTER TABLE ... ENABLE ROW LEVEL SECURITY;'
    WHEN pc.policy_count IS NULL OR pc.policy_count = 0 THEN 'MISSING: No policies defined'
    ELSE 'OK'
  END AS status_detail
FROM table_list tl
LEFT JOIN rls_enabled re ON tl.schemaname = re.schemaname AND tl.tablename = re.tablename
LEFT JOIN policy_counts pc ON tl.schemaname = pc.schemaname AND tl.tablename = pc.tablename
WHERE
  re.tablename IS NULL        -- RLS not enabled
  OR pc.policy_count IS NULL  -- RLS enabled but no policies
  OR pc.policy_count = 0      -- RLS enabled but no policies
ORDER BY tl.tablename;

-- If any rows are returned, exit with an error
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM (
    SELECT tl.tablename
    FROM pg_catalog.pg_tables tl
    LEFT JOIN pg_catalog.pg_tables re
      ON tl.schemaname = re.schemaname AND tl.tablename = re.tablename AND re.rowsecurity = true
    LEFT JOIN (
      SELECT schemaname, tablename, COUNT(*) AS policy_count
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
      GROUP BY schemaname, tablename
    ) pc ON tl.schemaname = pc.schemaname AND tl.tablename = pc.tablename
    WHERE tl.schemaname = 'public'
      AND tl.tablename NOT LIKE 'pg_%'
      AND tl.tablename NOT LIKE '_prisma_%'
      AND (re.tablename IS NULL OR pc.policy_count IS NULL OR pc.policy_count = 0)
  ) issues;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'RLS CHECK FAILED: % public table(s) lack RLS policies. Run migration 78 or add policies manually.', v_count;
  END IF;
END;
$$;
