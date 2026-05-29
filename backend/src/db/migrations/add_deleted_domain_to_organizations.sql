-- ============================================================
-- ZoikoVertex — organizations.deleted_domain column
--
-- Tracks the email domain of permanently deleted organizations
-- so that:
--   1. Users with email @ that domain cannot log in
--   2. No new org can be created with an admin email @ that domain
--
-- Safe to run repeatedly (idempotent).
-- Apply via Supabase Dashboard → SQL Editor.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS deleted_domain text;

CREATE INDEX IF NOT EXISTS idx_organizations_deleted_domain
  ON organizations (deleted_domain);

NOTIFY pgrst, 'reload schema';
