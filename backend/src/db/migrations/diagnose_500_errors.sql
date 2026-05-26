-- ============================================================
-- Diagnose: 500 errors on POST /api/v1/agents and
--                          POST /api/v1/agents/workflows
--
-- Paste into Supabase SQL Editor → Run → share all 3 result tabs.
-- ============================================================


-- 1. Does each table even exist?
SELECT
  expected.t AS table_name,
  CASE WHEN ist.table_name IS NULL THEN '❌ MISSING' ELSE '✅ exists' END AS status
FROM (VALUES
  ('agents'),
  ('workflow_templates'),
  ('workspaces'),
  ('users'),
  ('workspace_members')
) AS expected(t)
LEFT JOIN information_schema.tables ist
  ON ist.table_schema = 'public' AND ist.table_name = expected.t;


-- 2. Required columns the backend WRITES on agent create + workflow create.
-- Any row marked '❌ MISSING' is what's causing the 500.
WITH required_cols (table_name, column_name) AS (VALUES
  -- agents (createAgent → INSERT payload)
  ('agents','name'),
  ('agents','type'),
  ('agents','workspace_id'),
  ('agents','org_id'),
  ('agents','primary_dri_id'),
  ('agents','backup_dri_id'),
  ('agents','assigned_brand'),
  ('agents','permitted_actions'),
  ('agents','prohibited_actions'),
  ('agents','evidence_required'),
  ('agents','approval_required'),
  ('agents','status'),
  ('agents','autonomy_level'),
  ('agents','trust_score'),
  ('agents','faithfulness_score'),
  ('agents','risk_level'),
  ('agents','linked_prompts'),
  ('agents','linked_workflows'),
  ('agents','linked_policies'),
  ('agents','linked_knowledge_sources'),
  ('agents','linked_channels'),
  ('agents','purpose'),
  ('agents','mode'),

  -- workflow_templates (createWorkflow → INSERT payload)
  ('workflow_templates','id'),
  ('workflow_templates','tenant_id'),
  ('workflow_templates','workspace_id'),
  ('workflow_templates','name'),
  ('workflow_templates','description'),
  ('workflow_templates','type'),
  ('workflow_templates','status'),
  ('workflow_templates','risk_level'),
  ('workflow_templates','owner_id'),
  ('workflow_templates','owner_name'),
  ('workflow_templates','brand_ids'),
  ('workflow_templates','platforms')
)
SELECT
  r.table_name,
  r.column_name,
  CASE WHEN c.column_name IS NULL THEN '❌ MISSING' ELSE '✅ present' END AS status,
  c.data_type,
  c.is_nullable AS nullable
FROM required_cols r
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name   = r.table_name
 AND c.column_name  = r.column_name
ORDER BY status DESC, r.table_name, r.column_name;


-- 3. NOT-NULL columns on agents + workflow_templates that have NO default.
-- Any of these MUST be present in the INSERT payload — if the backend omits
-- them, you get a NOT NULL violation (also surfaces as 500).
SELECT
  table_name,
  column_name,
  data_type,
  '⚠️  NOT NULL with no default — backend MUST send this' AS warning
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('agents','workflow_templates')
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY table_name, column_name;
