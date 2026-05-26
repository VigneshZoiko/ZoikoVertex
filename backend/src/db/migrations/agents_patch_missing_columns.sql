-- ============================================================
-- SURGICAL FIX — add the 18 columns missing from production
-- agents table that the backend's createAgent INSERT writes to.
--
-- Production agents table currently has:
--   id, type, model_version, prompt_version, markets, platforms,
--   assigned_brand, org_id, workspace_id, trust_score,
--   faithfulness_score, primary_dri_id, risk_tier, autonomy_level,
--   backup_dri_id, created_at, updated_at, metadata, status, name
--
-- Backend ALSO writes these (currently missing):
--   purpose, mode, risk_level,
--   permitted_actions, prohibited_actions,
--   linked_channels, linked_prompts, linked_workflows,
--   linked_policies, linked_knowledge_sources,
--   evidence_required, approval_required, runtime_controls,
--   success_metrics, prohibited_outcomes, compliance_notes,
--   last_activity, last_activity_at
-- ============================================================

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS purpose                  text,
  ADD COLUMN IF NOT EXISTS mode                     text         DEFAULT 'draft_only',
  ADD COLUMN IF NOT EXISTS risk_level               text         DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS permitted_actions        text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prohibited_actions       text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_channels          text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_prompts           text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_workflows         text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_policies          text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_knowledge_sources text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_required        boolean      DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_required        boolean      DEFAULT true,
  ADD COLUMN IF NOT EXISTS runtime_controls         jsonb        DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS success_metrics          text,
  ADD COLUMN IF NOT EXISTS prohibited_outcomes      text,
  ADD COLUMN IF NOT EXISTS compliance_notes         text,
  ADD COLUMN IF NOT EXISTS last_activity            text,
  ADD COLUMN IF NOT EXISTS last_activity_at         timestamptz;

-- Reload PostgREST schema cache so it picks up the new columns
NOTIFY pgrst, 'reload schema';

-- Verify — should return 38 rows (20 existing + 18 new)
SELECT
  ordinal_position AS pos,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'agents'
ORDER BY ordinal_position;
