-- ============================================================
-- ZoikoVertex — agent_certifications.artifact_id nullable patch
--
-- Root cause: POST /api/v1/agents/:id/certify fails with
--   23502 "null value in column artifact_id of relation
--   agent_certifications violates not-null constraint"
-- because an agent can be certified before any agent_artifacts
-- row exists for it. A certification does not strictly require
-- a pre-existing artifact — the artifact reference is optional
-- provenance, not a hard dependency.
--
-- This drops the NOT NULL constraint so certifications persist
-- their audit row even when no artifact has been generated yet.
-- Existing FK (if any) is preserved — null is simply allowed.
--
-- Safe to run repeatedly (DROP NOT NULL is idempotent in effect).
-- Apply via Supabase Dashboard → SQL Editor.
-- ============================================================

ALTER TABLE agent_certifications
  ALTER COLUMN artifact_id DROP NOT NULL;

-- Force PostgREST to reload its schema cache so the relaxed
-- constraint is reflected immediately.
NOTIFY pgrst, 'reload schema';

-- Verify — is_nullable should now read YES for artifact_id.
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'agent_certifications'
  AND column_name = 'artifact_id';
