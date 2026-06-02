-- ============================================================================
--  AGENT OPERATIONS — GOVERNANCE INTEGRITY HARDENING (idempotent, additive)
-- ============================================================================
--  Purpose
--    Closes the three critical governance gaps identified in the Agent
--    Operations audit (C1, C2, C3):
--      C1  Audit/evidence trail was destroyable (hard DELETE cascade).
--      C2  Evidence "hash" did not cover evidence content.
--      C3  Locked evidence bundles could still be overwritten.
--
--    This migration makes the audit trail (run_events, runtime_control_actions)
--    APPEND-ONLY at the data layer, makes evidence bundles WRITE-ONCE after
--    lock, and adds soft-delete (archive) columns to agent_runs so operational
--    history is preserved permanently instead of being purged.
--
--  Safety
--    Every statement is additive and idempotent:
--      ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
--      DROP TRIGGER IF EXISTS + CREATE TRIGGER.
--    No data is dropped or rewritten. Safe to run more than once.
--
--  Tenant isolation note (audit "RLS with zero policies")
--    RLS is intentionally left enabled with no permissive policies. All
--    application access goes through the Supabase service role (supabaseAdmin),
--    which bypasses RLS; tenant isolation is enforced in the API layer via
--    assertWorkspaceScope(). Direct anon/authenticated access is therefore
--    denied-by-default. This is the sanctioned boundary; do NOT add broad
--    policies without a dedicated review.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0) ENUM VALUES (runtime_action_type)
--    The control layer records two action types that were missing from the
--    deployed runtime_action_type enum:
--      • 'start'   — re-starting a STOPPED run (startRun); pre-existing gap.
--      • 'archive' — soft-delete/archive action (deleteRun -> archive).
--    ALTER TYPE ... ADD VALUE auto-commits and the new values are not used
--    within this migration, so this is safe to run as part of the script.
-- ----------------------------------------------------------------------------
ALTER TYPE runtime_action_type ADD VALUE IF NOT EXISTS 'start';
ALTER TYPE runtime_action_type ADD VALUE IF NOT EXISTS 'archive';


-- ----------------------------------------------------------------------------
-- 1) SOFT-DELETE (ARCHIVE) COLUMNS ON agent_runs  (C1)
--    deleteRun() is converted from a destructive cascade to an archive. These
--    columns record who archived a run, when, and why. Default lists filter on
--    archived_at IS NULL; detail/evidence remain retrievable by id.
-- ----------------------------------------------------------------------------
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS archived_at     timestamptz;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS archived_by     uuid;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS archive_reason  text;

-- Workflow executions are recorded as operations runs, but a workflow run is
-- not tied to a single agent. Relax agent_id so a run can be workflow-scoped
-- (agent_id NULL). The FK (if any) still validates non-null values. No-op if
-- already nullable; existing rows are unaffected.
ALTER TABLE agent_runs ALTER COLUMN agent_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_runs_active
  ON agent_runs (workspace_id, status, created_at DESC)
  WHERE archived_at IS NULL;


-- ----------------------------------------------------------------------------
-- 2) CONTENT-INTEGRITY HASH ON evidence_bundles  (C2)
--    content_hash holds a SHA-256 over the canonical evidence content (run
--    snapshot + events + policy results), computed by the evidence service.
--    The legacy `hash` column is retained for backward compatibility.
-- ----------------------------------------------------------------------------
ALTER TABLE evidence_bundles ADD COLUMN IF NOT EXISTS content_hash      text;
ALTER TABLE evidence_bundles ADD COLUMN IF NOT EXISTS content_hash_algo text;
ALTER TABLE evidence_bundles ADD COLUMN IF NOT EXISTS sealed_at         timestamptz;


-- ----------------------------------------------------------------------------
-- 3) APPEND-ONLY AUDIT TRAIL  (C1)
--    run_events and runtime_control_actions are immutable once written:
--    UPDATE and DELETE are rejected at the database level, so neither the
--    service role nor any future handler can rewrite or purge the trail.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION operations_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'append-only table %: % is not permitted (operations governance)',
    TG_TABLE_NAME, TG_OP
    USING errcode = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_run_events_append_only ON run_events;
CREATE TRIGGER trg_run_events_append_only
  BEFORE UPDATE OR DELETE ON run_events
  FOR EACH ROW EXECUTE FUNCTION operations_reject_mutation();

DROP TRIGGER IF EXISTS trg_runtime_control_actions_append_only ON runtime_control_actions;
CREATE TRIGGER trg_runtime_control_actions_append_only
  BEFORE UPDATE OR DELETE ON runtime_control_actions
  FOR EACH ROW EXECUTE FUNCTION operations_reject_mutation();


-- ----------------------------------------------------------------------------
-- 4) WRITE-ONCE EVIDENCE BUNDLES  (C3)
--    DELETE of any evidence bundle is rejected outright. After a bundle is
--    locked (locked_at set), only export bookkeeping fields may change
--    (status, exported_by, exported_at, export_reason, storage_ref). The
--    sealed content — hash/content_hash/run_id/created_at/locked_at — is
--    frozen; any attempt to change it raises.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION operations_evidence_write_once()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'evidence_bundles is write-once: DELETE is not permitted'
      USING errcode = 'P0001';
  END IF;

  -- UPDATE: only enforce immutability once the bundle has been locked.
  IF OLD.locked_at IS NOT NULL THEN
    IF NEW.hash         IS DISTINCT FROM OLD.hash
    OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
    OR NEW.run_id       IS DISTINCT FROM OLD.run_id
    OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.locked_at    IS DISTINCT FROM OLD.locked_at
    OR NEW.created_at   IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION
        'evidence bundle % is locked; sealed fields cannot be modified', OLD.id
        USING errcode = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evidence_bundles_write_once ON evidence_bundles;
CREATE TRIGGER trg_evidence_bundles_write_once
  BEFORE UPDATE OR DELETE ON evidence_bundles
  FOR EACH ROW EXECUTE FUNCTION operations_evidence_write_once();


-- ============================================================================
--  POST-RUN VERIFICATION (optional — run as separate SELECTs)
-- ----------------------------------------------------------------------------
--  SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%append_only';
--  SELECT column_name FROM information_schema.columns
--    WHERE table_name='agent_runs' AND column_name='archived_at';
--  -- Expect failure:
--  -- UPDATE run_events SET reason='x' WHERE id = (SELECT id FROM run_events LIMIT 1);
-- ============================================================================
