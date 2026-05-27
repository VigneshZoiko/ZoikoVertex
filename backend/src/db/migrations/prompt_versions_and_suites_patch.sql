-- ============================================================
-- ZoikoVertex — prompt_versions + prompt_test_suites patch
--
-- Root cause: After POST /api/v1/prompts succeeds (prompts
-- table fixed in prompts_full_schema_patch.sql), the
-- controller calls PromptVersionService.create() and
-- PromptTestService.createSuite(). Both insert into tables
-- whose deployed schemas are missing columns the services
-- write to. Observed first: prompt_versions.immutable
-- (PGRST204 "Could not find the 'immutable' column").
--
-- This migration adds every column those services write,
-- idempotently. Safe to run repeatedly.
-- Apply via Supabase Dashboard → SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ------------------------------------------------------------
-- prompt_versions
-- ------------------------------------------------------------
-- Columns PromptVersionService.create() inserts:
--   prompt_id, version_number, body, body_hash,
--   variables_json, guardrails_json, model_routes_json,
--   change_summary, created_by, immutable

ALTER TABLE prompt_versions
  ADD COLUMN IF NOT EXISTS prompt_id          uuid,
  ADD COLUMN IF NOT EXISTS version_number     integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS body               text,
  ADD COLUMN IF NOT EXISTS body_hash          text,
  ADD COLUMN IF NOT EXISTS variables_json     jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS guardrails_json    jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS model_routes_json  jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS change_summary     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_by         uuid,
  ADD COLUMN IF NOT EXISTS immutable          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at         timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt     ON prompt_versions (prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_by ON prompt_versions (created_by);

DROP TRIGGER IF EXISTS prompt_versions_updated_at ON prompt_versions;
CREATE TRIGGER prompt_versions_updated_at
  BEFORE UPDATE ON prompt_versions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ------------------------------------------------------------
-- prompt_test_suites
-- ------------------------------------------------------------
-- Columns PromptTestService.createSuite() inserts:
--   prompt_id, suite_name, required_for_risk_tier (text[]),
--   scenario_count, evaluator_config (jsonb)

ALTER TABLE prompt_test_suites
  ADD COLUMN IF NOT EXISTS prompt_id              uuid,
  ADD COLUMN IF NOT EXISTS suite_name             text,
  ADD COLUMN IF NOT EXISTS required_for_risk_tier text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scenario_count         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluator_config       jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by             uuid,
  ADD COLUMN IF NOT EXISTS created_at             timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at             timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_prompt_test_suites_prompt ON prompt_test_suites (prompt_id);

DROP TRIGGER IF EXISTS prompt_test_suites_updated_at ON prompt_test_suites;
CREATE TRIGGER prompt_test_suites_updated_at
  BEFORE UPDATE ON prompt_test_suites
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ------------------------------------------------------------
-- Force PostgREST to reload its schema cache so all new
-- columns are visible to the API immediately.
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Verify — dump the resulting schemas. Inspect for any
-- NOT NULL columns lacking defaults or unexpected enum types
-- (same pitfalls we hit on the prompts table).
-- ------------------------------------------------------------
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('prompt_versions', 'prompt_test_suites')
ORDER BY table_name, ordinal_position;
