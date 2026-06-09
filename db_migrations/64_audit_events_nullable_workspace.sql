-- Migration 64: Make audit_events.workspace_id nullable
-- When an organization is created during signup, a DB trigger auto-inserts an
-- audit event. At that point no workspace exists yet, so workspace_id is null.
-- The NOT NULL constraint caused every org insert (and thus every signup) to fail.
-- Org-level events are valid without a workspace_id — the org_id column covers them.

ALTER TABLE public.audit_events
  ALTER COLUMN workspace_id DROP NOT NULL;

-- Update existing index if it assumed NOT NULL (it will still work with nulls)
-- No index change needed; existing indexes on workspace_id handle null correctly.
