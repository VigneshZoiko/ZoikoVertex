-- ============================================================
-- ZoikoVertex — Schema Diagnostic Inspector
-- Paste into Supabase SQL Editor → New Query → Run.
-- Read-only. Returns 14 result sets:
--   1.  Tables in public schema (with row counts)
--   2.  All columns for ZoikoVertex tables (name, type, nullable, default)
--   3.  Missing-column check vs. what the backend writes
--   4.  Primary keys per table
--   5.  Foreign-key relationships
--   6.  Unique constraints
--   7.  Check constraints
--   8.  Indexes per table
--   9.  Triggers
--   10. Views
--   11. Functions / stored procedures
--   12. Extensions installed
--   13. RLS status + policies per table
--   14. Auth helpers — what auth.jwt() actually returns for current user
-- ============================================================


-- 1. TABLES + ROW COUNTS ──────────────────────────────────────
SELECT
  schemaname AS schema,
  relname    AS table_name,
  n_live_tup AS estimated_rows,
  pg_size_pretty(pg_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;


-- 2. COLUMNS FOR ZOIKOVERTEX TABLES ───────────────────────────
SELECT
  table_name,
  ordinal_position AS pos,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length AS max_len
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'agents','agent_versions','agent_approvals','agent_deployments',
    'agent_incidents','agent_certifications','agent_artifacts',
    'agent_evidence','agent_permission_sets','agent_safety_results',
    'agent_sandbox_runs',
    'workflows','workflow_versions','workflow_instances','workflow_steps',
    'workflow_evidence','workflow_approvals',
    'prompts','prompt_versions','prompt_approvals',
    'knowledge_collections','knowledge_sources','knowledge_chunks',
    'knowledge_reviews','knowledge_conflicts',
    'governance_rules','governance_decisions',
    'workspaces','workspace_members','users',
    'audit_log','evidence_artifacts'
  )
ORDER BY table_name, ordinal_position;


-- 3. MISSING COLUMNS CHECK (backend-write columns vs. schema) ──
WITH required_cols (table_name, column_name) AS (VALUES
  ('agents','name'), ('agents','type'), ('agents','workspace_id'),
  ('agents','org_id'), ('agents','primary_dri_id'), ('agents','backup_dri_id'),
  ('agents','assigned_brand'), ('agents','permitted_actions'),
  ('agents','prohibited_actions'), ('agents','evidence_required'),
  ('agents','approval_required'), ('agents','status'), ('agents','autonomy_level'),
  ('agents','trust_score'), ('agents','faithfulness_score'),
  ('agents','risk_level'), ('agents','risk_tier'),
  ('agents','linked_prompts'), ('agents','linked_workflows'),
  ('agents','linked_policies'), ('agents','linked_knowledge_sources'),
  ('agents','linked_channels'), ('agents','purpose'), ('agents','mode'),
  ('agents','runtime_controls'), ('agents','metadata'),
  ('agents','created_at'), ('agents','updated_at')
)
SELECT
  r.table_name,
  r.column_name,
  CASE WHEN c.column_name IS NULL THEN '❌ MISSING' ELSE '✅ present' END AS status,
  c.data_type
FROM required_cols r
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name   = r.table_name
 AND c.column_name  = r.column_name
ORDER BY status DESC, r.table_name, r.column_name;


-- 4. PRIMARY KEYS ─────────────────────────────────────────────
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema    = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name;


-- 5. FOREIGN KEYS ─────────────────────────────────────────────
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name  AS references_table,
  ccu.column_name AS references_column,
  rc.delete_rule,
  rc.update_rule,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name, kcu.column_name;


-- 6. UNIQUE CONSTRAINTS ───────────────────────────────────────
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;


-- 7. CHECK CONSTRAINTS ────────────────────────────────────────
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name;


-- 8. INDEXES ──────────────────────────────────────────────────
SELECT
  schemaname AS schema,
  tablename  AS table_name,
  indexname  AS index_name,
  indexdef   AS definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- 9. TRIGGERS ─────────────────────────────────────────────────
SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing      AS timing,
  action_statement   AS action
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY table_name, trigger_name;


-- 10. VIEWS ───────────────────────────────────────────────────
SELECT
  table_name AS view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY view_name;


-- 11. FUNCTIONS / PROCEDURES ──────────────────────────────────
SELECT
  routine_name,
  routine_type,
  data_type AS return_type,
  external_language AS language
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;


-- 12. INSTALLED EXTENSIONS ────────────────────────────────────
SELECT
  extname    AS extension,
  extversion AS version
FROM pg_extension
ORDER BY extname;


-- 13. RLS STATUS + POLICIES ───────────────────────────────────
-- 13a. RLS enabled per table
-- (pg_tables exposes rowsecurity; relforcerowsecurity lives on pg_class)
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity      THEN '🔒 enabled' ELSE '⚠️  DISABLED'   END AS rls_status,
  CASE WHEN c.relforcerowsecurity THEN 'forced'      ELSE 'not forced'     END AS rls_force
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'           -- ordinary tables only
ORDER BY c.relname;

-- 13b. Policy definitions per table
SELECT
  schemaname AS schema,
  tablename  AS table_name,
  policyname,
  permissive,
  cmd        AS applies_to,
  roles,
  qual       AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- 14. CURRENT AUTH CONTEXT (debug RLS issues) ─────────────────
-- Shows what auth.jwt() contains for whoever ran this query.
-- If workspace_id is null/missing, your RLS policies will silently
-- block every read & write.
SELECT
  auth.uid()                              AS current_user_id,
  auth.role()                             AS current_role,
  auth.jwt() ->> 'workspace_id'           AS jwt_workspace_id,
  auth.jwt() ->> 'org_id'                 AS jwt_org_id,
  auth.jwt() ->> 'email'                  AS jwt_email,
  auth.jwt()                              AS full_jwt;


-- ============================================================
-- END OF DIAGNOSTIC. Scroll the results panel — Supabase returns
-- each SELECT above as a separate result tab.
-- ============================================================
