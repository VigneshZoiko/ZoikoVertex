-- Migration 82: Ensure workspace_members has a unique constraint on (workspace_id, user_id)
--
-- The provision endpoint uses .upsert(..., { onConflict: 'workspace_id,user_id' }).
-- Supabase requires a unique index or constraint on the conflict columns.
-- This migration adds it idempotently — safe to run if it already exists.

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workspace_members'::regclass
      AND contype = 'u'
      AND conname = 'workspace_members_workspace_user_unique'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT workspace_members_workspace_user_unique
      UNIQUE (workspace_id, user_id);
  END IF;
END $$;

SELECT 'Migration 82 — workspace_members unique constraint ensured' AS status;
