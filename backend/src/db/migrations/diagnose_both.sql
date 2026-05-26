-- ============================================================
-- Combined diagnostic: agent visibility + workflow PGRST204
-- ============================================================

-- ── Tab 1: Are agents actually being created? ───────────────
SELECT
  id,
  name,
  status,
  workspace_id,
  primary_dri_id,
  created_at
FROM agents
ORDER BY created_at DESC
LIMIT 10;


-- ── Tab 2: Does workflow_templates have the right columns? ──
-- The backend's createWorkflow writes these 12 columns:
--   id, tenant_id, workspace_id, name, description, type,
--   status, risk_level, owner_id, owner_name, brand_ids, platforms
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workflow_templates'
ORDER BY ordinal_position;


-- ── Tab 3: Were any workflows actually created? ─────────────
SELECT
  id,
  name,
  status,
  workspace_id,
  tenant_id,
  type,
  created_at
FROM workflow_templates
ORDER BY created_at DESC
LIMIT 10;


-- ── Tab 4: Force PostgREST schema reload (in case the NOTIFY hasn't fired) ──
NOTIFY pgrst, 'reload schema';
SELECT 'PostgREST schema cache reload signal sent.' AS notice;
