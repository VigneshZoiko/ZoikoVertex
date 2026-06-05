-- ============================================================
-- Single-result diagnostic — always returns exactly one row
-- with all the answers we need.
-- ============================================================

SELECT
  -- ── agents ─────────────────────────────────────────────
  (SELECT COUNT(*) FROM agents)                         AS total_agents,
  (SELECT MAX(created_at) FROM agents)                  AS most_recent_agent_created_at,
  (SELECT name FROM agents ORDER BY created_at DESC LIMIT 1)         AS most_recent_agent_name,
  (SELECT workspace_id FROM agents ORDER BY created_at DESC LIMIT 1) AS most_recent_agent_workspace,

  -- ── workflow_templates ─────────────────────────────────
  (SELECT COUNT(*) FROM workflow_templates)             AS total_workflows,
  (SELECT MAX(created_at) FROM workflow_templates)      AS most_recent_workflow_created_at,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='workflow_templates') AS workflow_templates_column_count,

  -- ── verify the 12 columns the backend writes exist ─────
  (SELECT bool_and(c.column_name IS NOT NULL) FROM (VALUES
     ('id'),('tenant_id'),('workspace_id'),('name'),('description'),
     ('type'),('status'),('risk_level'),('owner_id'),('owner_name'),
     ('brand_ids'),('platforms')
   ) AS required(col)
   LEFT JOIN information_schema.columns c
     ON c.table_schema='public'
    AND c.table_name='workflow_templates'
    AND c.column_name=required.col
  ) AS workflow_has_all_required_columns,

  -- Which required columns ARE missing (NULL if none missing)
  (SELECT string_agg(required.col, ', ')
   FROM (VALUES
     ('id'),('tenant_id'),('workspace_id'),('name'),('description'),
     ('type'),('status'),('risk_level'),('owner_id'),('owner_name'),
     ('brand_ids'),('platforms')
   ) AS required(col)
   LEFT JOIN information_schema.columns c
     ON c.table_schema='public'
    AND c.table_name='workflow_templates'
    AND c.column_name=required.col
   WHERE c.column_name IS NULL
  ) AS workflow_missing_columns;
