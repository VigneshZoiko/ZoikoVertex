-- ============================================================
-- ZoikoVertex — prompts.created_by column patch
-- Root cause: POST /api/v1/prompts returns PGRST204
--   "Could not find the 'created_by' column of 'prompts'
--    in the schema cache"
-- because PromptService.create() inserts created_by but the
-- column is missing from the deployed Supabase schema.
--
-- Safe to run repeatedly (idempotent).
-- Apply via Supabase Dashboard → SQL Editor, then verify the
-- final SELECT confirms `created_by` is present.
-- ============================================================

-- 1. Add the column defensively (no-op if already present).
--    Plain `uuid` (no FK) matches the project's existing
--    convention for owner_id / creator_id columns elsewhere
--    (see workflow_templates.owner_id, publish_intents.creator_id).
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Backfill any pre-existing rows: use owner_id as the
--    historical creator. New rows will set created_by directly.
UPDATE prompts
  SET created_by = owner_id
  WHERE created_by IS NULL
    AND owner_id IS NOT NULL;

-- 3. Index for lookups by creator.
CREATE INDEX IF NOT EXISTS idx_prompts_created_by ON prompts (created_by);

-- 4. Force PostgREST to reload its schema cache so the new
--    column is visible to the API layer immediately.
NOTIFY pgrst, 'reload schema';

-- 5. Verify — should list `created_by` as a uuid column.
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prompts'
  AND column_name = 'created_by';
