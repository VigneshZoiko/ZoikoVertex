-- ============================================================================
-- prompt_governance_immutability_hardening.sql
--
-- Recommended hardening (Phase 4 audit, "medium-severity" tier). Adds column-
-- specific immutability triggers on the three prompt-governance tables that
-- the audit flagged as under-protected:
--
--   1. prompt_approvals   — block UPDATE on all columns EXCEPT evidence_id
--                            and updated_at (the legitimate backfill pattern
--                            used by promptController.submitReviewDecision
--                            and the deployment flow).
--                            Block DELETE entirely.
--
--   2. prompt_deployments — same shape as prompt_approvals. The legitimate
--                            evidence_id backfill runs from
--                            promptController.launchDeployment.
--                            Block DELETE entirely.
--
--   3. prompts            — block UPDATE on created_at, created_by (author /
--                            date attribution cannot be backdated or
--                            impersonated). All other UPDATEs (status
--                            transitions, current_version_id, use_case_key,
--                            name, etc.) remain allowed because they are
--                            the documented lifecycle surface.
--                            Block DELETE entirely (no production DELETE
--                            endpoint exists; archived prompts are kept
--                            for the audit trail).
--
-- IDEMPOTENT: safe to re-run. DROP TRIGGER IF EXISTS + CREATE OR REPLACE
-- FUNCTION on each.
--
-- Verification (run AFTER applying):
--   SELECT tgname FROM pg_trigger
--    WHERE tgname IN (
--      'prompt_approvals_immutable_decision',
--      'prompt_deployments_immutable_record',
--      'prompts_immutable_attribution'
--    )
--    ORDER BY tgname;
-- Expect: 3 rows.
--
-- ============================================================================

-- ── 1. prompt_approvals ─────────────────────────────────────────────────────
-- The decision, reviewer, version binding, conditions, and timestamps are
-- immutable. Only the post-hoc evidence_id backfill is permitted.
CREATE OR REPLACE FUNCTION prompt_approvals_block_mutation()
RETURNS trigger AS $$
BEGIN
  -- Per-column immutability: every column is locked EXCEPT evidence_id
  -- (legitimate backfill) and updated_at (the housekeeping trigger already
  -- touches it; allowing the trigger to write its own NEW value is fine).
  IF OLD.evidence_id IS DISTINCT FROM NEW.evidence_id THEN
    NULL; -- allowed
  ELSE
    IF OLD.prompt_version_id IS DISTINCT FROM NEW.prompt_version_id
       OR OLD.reviewer_id      IS DISTINCT FROM NEW.reviewer_id
       OR OLD.reviewer_role    IS DISTINCT FROM NEW.reviewer_role
       OR OLD.decision         IS DISTINCT FROM NEW.decision
       OR OLD.decision_reason  IS DISTINCT FROM NEW.decision_reason
       OR OLD.conditions       IS DISTINCT FROM NEW.conditions
       OR OLD.expires_at       IS DISTINCT FROM NEW.expires_at
       OR OLD.created_at       IS DISTINCT FROM NEW.created_at
    THEN
      RAISE EXCEPTION 'prompt_approvals: decision / reviewer / version / timestamps are immutable; only evidence_id may be backfilled. Blocked column change on row %.', OLD.id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'prompt_approvals is append-only; DELETE is not permitted (row %)', OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompt_approvals_immutable_decision ON prompt_approvals;
CREATE TRIGGER prompt_approvals_immutable_decision
  BEFORE UPDATE OR DELETE ON prompt_approvals
  FOR EACH ROW EXECUTE FUNCTION prompt_approvals_block_mutation();

-- ── 2. prompt_deployments ───────────────────────────────────────────────────
-- The version binding, environment, scope, actor, release note, and rollback
-- pointer are immutable. Only evidence_id is backfillable.
CREATE OR REPLACE FUNCTION prompt_deployments_block_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD.evidence_id IS DISTINCT FROM NEW.evidence_id THEN
    NULL; -- allowed
  ELSE
    IF OLD.prompt_version_id    IS DISTINCT FROM NEW.prompt_version_id
       OR OLD.environment       IS DISTINCT FROM NEW.environment
       OR OLD.scope_json        IS DISTINCT FROM NEW.scope_json
       OR OLD.deployed_by       IS DISTINCT FROM NEW.deployed_by
       OR OLD.release_note      IS DISTINCT FROM NEW.release_note
       OR OLD.rollback_to_version_id IS DISTINCT FROM NEW.rollback_to_version_id
       OR OLD.created_at        IS DISTINCT FROM NEW.created_at
    THEN
      RAISE EXCEPTION 'prompt_deployments: version / environment / scope / actor / timestamps are immutable; only evidence_id may be backfilled. Blocked column change on row %.', OLD.id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'prompt_deployments is append-only; DELETE is not permitted (row %)', OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompt_deployments_immutable_record ON prompt_deployments;
CREATE TRIGGER prompt_deployments_immutable_record
  BEFORE UPDATE OR DELETE ON prompt_deployments
  FOR EACH ROW EXECUTE FUNCTION prompt_deployments_block_mutation();

-- ── 3. prompts ──────────────────────────────────────────────────────────────
-- Lifecycle (status, current_version_id, name, use_case_key, etc.) remains
-- mutable. Author + creation timestamp are immutable. The row itself cannot
-- be deleted — a prompt is hidden by transitioning to RETIRED / ARCHIVED.
CREATE OR REPLACE FUNCTION prompts_block_attribution_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'prompts: created_at is immutable (row %)', OLD.id;
  END IF;
  IF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'prompts: created_by is immutable (row %)', OLD.id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'prompts: DELETE is not permitted — transition status to RETIRED or ARCHIVED instead (row %)', OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompts_immutable_attribution ON prompts;
CREATE TRIGGER prompts_immutable_attribution
  BEFORE UPDATE OR DELETE ON prompts
  FOR EACH ROW EXECUTE FUNCTION prompts_block_attribution_mutation();
