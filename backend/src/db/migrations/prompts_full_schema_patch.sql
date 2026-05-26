-- ============================================================
-- ZoikoVertex — prompts table schema patch (comprehensive)
--
-- Root cause: POST /api/v1/prompts returns repeated PGRST204
-- errors because the deployed `prompts` table is missing
-- multiple columns that PromptService.create() inserts.
--
-- Observed missing columns so far:
--   created_by, knowledge_sources, ...
--
-- This migration adds ALL columns the service writes to,
-- idempotently (no-op if already present). Safe to run
-- repeatedly. Supersedes prompts_add_created_by.sql.
--
-- Apply via Supabase Dashboard → SQL Editor.
-- ============================================================

-- 1. Add all columns PromptService.create() inserts.
--    Uses ADD COLUMN IF NOT EXISTS — pre-existing columns
--    are left untouched.
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS workspace_id        uuid,
  ADD COLUMN IF NOT EXISTS name                text,
  ADD COLUMN IF NOT EXISTS description         text DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_type         text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS owner_id            uuid,
  ADD COLUMN IF NOT EXISTS owner_name          text DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_tier           text DEFAULT 'TIER_2_MEDIUM',
  ADD COLUMN IF NOT EXISTS status              text DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS linked_agent        text DEFAULT '',
  ADD COLUMN IF NOT EXISTS linked_agent_id     uuid,
  ADD COLUMN IF NOT EXISTS linked_workflow     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS linked_workflow_id  uuid,
  ADD COLUMN IF NOT EXISTS knowledge_sources   text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tools_permitted     text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by          uuid,
  ADD COLUMN IF NOT EXISTS created_at          timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT now();

-- 2. Backfill created_by from owner_id for any rows that
--    have one but not the other.
UPDATE prompts
  SET created_by = owner_id
  WHERE created_by IS NULL
    AND owner_id IS NOT NULL;

-- 3. Helpful indexes for the workloads PromptService.list()
--    and the prompt-detail drawer hit.
CREATE INDEX IF NOT EXISTS idx_prompts_workspace ON prompts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_prompts_owner     ON prompts (owner_id);
CREATE INDEX IF NOT EXISTS idx_prompts_status    ON prompts (status);
CREATE INDEX IF NOT EXISTS idx_prompts_risk      ON prompts (risk_tier);
CREATE INDEX IF NOT EXISTS idx_prompts_created_by ON prompts (created_by);

-- 4. updated_at auto-trigger (matches workflow_templates pattern).
CREATE EXTENSION IF NOT EXISTS "moddatetime";
DROP TRIGGER IF EXISTS prompts_updated_at ON prompts;
CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- 5. Force PostgREST to reload its schema cache so all new
--    columns are visible to the API layer immediately —
--    no Render redeploy required.
NOTIFY pgrst, 'reload schema';

-- 6. Verify — should list every column above.
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prompts'
ORDER BY ordinal_position;
