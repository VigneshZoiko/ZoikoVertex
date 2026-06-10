-- ============================================================
-- Fix: publish_intents.reviewer_id missing
--
-- The "review queue UI overhaul" (commit 62111ae) made submitIntent insert a
-- reviewer_id (load-balanced reviewer pre-assignment), but no migration added
-- the column. Without it, POST /api/v1/governance/submit fails with:
--   "Could not find the 'reviewer_id' column of 'publish_intents' in the schema cache"
-- which blocks ALL publishing. This adds the column (additive, safe to re-run)
-- and reloads the PostgREST schema cache.
-- ============================================================

ALTER TABLE publish_intents
  ADD COLUMN IF NOT EXISTS reviewer_id uuid;

CREATE INDEX IF NOT EXISTS idx_publish_intents_reviewer
  ON publish_intents (reviewer_id);

-- Tell PostgREST (Supabase API layer) to refresh its cached schema so the new
-- column is immediately usable without a project restart.
NOTIFY pgrst, 'reload schema';
