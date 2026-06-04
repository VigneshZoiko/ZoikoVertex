-- ─────────────────────────────────────────────────────────────────────────────
-- Prompt Governance — use_case_key resolution column (Phase 4: Governed Execution)
--
-- Adds a stable, workspace-scoped lookup key so a real AI/model call site can
-- resolve THE governed prompt for a use-case (e.g. 'social_caption_generation',
-- 'inbox_ai_reply') instead of constructing an inline prompt. GovernedPromptResolver
-- resolves by (workspace_id, use_case_key) → newest production-ready prompt.
--
-- Additive + idempotent. No data change, no FK, rollback = DROP COLUMN.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE prompts ADD COLUMN IF NOT EXISTS use_case_key text;

CREATE INDEX IF NOT EXISTS idx_prompts_workspace_use_case
  ON prompts (workspace_id, use_case_key)
  WHERE use_case_key IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- Verification:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='prompts' AND column_name='use_case_key';
--   SELECT indexname FROM pg_indexes WHERE tablename='prompts' AND indexname='idx_prompts_workspace_use_case';
