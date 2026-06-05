-- ─────────────────────────────────────────────────────────────────────────────
-- Prompt Governance — Constraint Shadow store (Phase 3.B production closure)
--
-- Canonical, tenant-scoped table backing ConstraintShadowService. A Constraint
-- Shadow is the mandatory inverse guardrail compiled for a prompt version. Once
-- LOCKED (at commissioning) it becomes immutable: its compiled_shadow and
-- shadow_hash participate in the Governance Receipt hash and gate deployment +
-- runtime enforcement, so it must never be mutated or deleted after lock.
--
-- Idempotent: safe to re-run. No FKs (matches the rest of the prompt-governance
-- schema, which keys by id and scopes by workspace_id in the service layer).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompt_constraint_shadows (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id        UUID         NOT NULL,
  version_id       UUID         NOT NULL,
  workspace_id     UUID         NOT NULL,
  risk_tier        TEXT         NOT NULL,
  compiled_shadow  JSONB        NOT NULL,                 -- { risk_tier, rules[] }
  shadow_hash      TEXT         NOT NULL,                 -- sha256 over canonical(compiled_shadow)
  status           TEXT         NOT NULL DEFAULT 'compiled'
                     CHECK (status IN ('compiled', 'locked')),
  locked_at        TIMESTAMPTZ,
  locked_by        UUID,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Lookup indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pcs_prompt_id    ON prompt_constraint_shadows (prompt_id);
CREATE INDEX IF NOT EXISTS idx_pcs_version_id   ON prompt_constraint_shadows (version_id);
CREATE INDEX IF NOT EXISTS idx_pcs_workspace_id ON prompt_constraint_shadows (workspace_id);
CREATE INDEX IF NOT EXISTS idx_pcs_status       ON prompt_constraint_shadows (status);
-- Newest-shadow-per-version lookups (service orders by created_at DESC).
CREATE INDEX IF NOT EXISTS idx_pcs_version_created ON prompt_constraint_shadows (version_id, created_at DESC);

-- ── Uniqueness: at most ONE active LOCKED shadow per prompt version ──────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_pcs_one_locked_per_version
  ON prompt_constraint_shadows (version_id)
  WHERE status = 'locked';

-- ── Immutability: a LOCKED shadow cannot be updated or deleted ───────────────
-- The compiled→locked transition (UPDATE where OLD.status='compiled') is allowed;
-- once status='locked', any further UPDATE/DELETE is rejected. This makes the
-- sealed shadow (and therefore the Governance Receipt hash that embeds it)
-- tamper-evident at the database tier, independent of application code.
CREATE OR REPLACE FUNCTION prompt_constraint_shadows_lock_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'locked' THEN
    RAISE EXCEPTION 'prompt_constraint_shadows: locked shadow % is immutable; % is not permitted', OLD.id, TG_OP;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pcs_lock_immutable ON prompt_constraint_shadows;
CREATE TRIGGER trg_pcs_lock_immutable
  BEFORE UPDATE OR DELETE ON prompt_constraint_shadows
  FOR EACH ROW EXECUTE FUNCTION prompt_constraint_shadows_lock_immutable();

-- ─────────────────────────────────────────────────────────────────────────────
-- MANUAL STAGING VERIFICATION (run after applying this migration)
--
-- The backend test suite uses an in-memory Supabase mock that does NOT execute
-- Postgres triggers or unique indexes, so the four DB-tier guarantees below can
-- only be proven against a real Postgres/Supabase instance. Run this block on
-- staging to confirm immutability + uniqueness. Each step is annotated with the
-- expected outcome; wrap in a transaction and ROLLBACK so it leaves no data.
--
--   BEGIN;
--   -- seed one compiled shadow
--   INSERT INTO prompt_constraint_shadows (prompt_id, version_id, workspace_id, risk_tier, compiled_shadow, shadow_hash, status)
--   VALUES (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', gen_random_uuid(), 'tier_3_high', '{"risk_tier":"tier_3_high","rules":[]}', 'deadbeef', 'compiled');
--
--   -- (1) compiled -> locked transition is ALLOWED
--   UPDATE prompt_constraint_shadows SET status='locked', locked_at=now()
--     WHERE version_id='00000000-0000-0000-0000-0000000000a1';            -- expect: UPDATE 1
--
--   -- (2) a LOCKED row cannot be updated
--   UPDATE prompt_constraint_shadows SET risk_tier='tier_1_low'
--     WHERE version_id='00000000-0000-0000-0000-0000000000a1';            -- expect: ERROR (locked shadow ... is immutable; UPDATE not permitted)
--
--   -- (3) a LOCKED row cannot be deleted
--   DELETE FROM prompt_constraint_shadows
--     WHERE version_id='00000000-0000-0000-0000-0000000000a1';            -- expect: ERROR (... is immutable; DELETE not permitted)
--
--   -- (4) partial unique index prevents a 2nd LOCKED shadow for the same version
--   INSERT INTO prompt_constraint_shadows (prompt_id, version_id, workspace_id, risk_tier, compiled_shadow, shadow_hash, status)
--   VALUES (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', gen_random_uuid(), 'tier_3_high', '{}', 'beefdead', 'locked');
--                                                                          -- expect: ERROR (duplicate key value violates unique constraint "uq_pcs_one_locked_per_version")
--   ROLLBACK;
--
-- Object existence:
--   SELECT to_regclass('prompt_constraint_shadows');
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'prompt_constraint_shadows'::regclass;     -- expect trg_pcs_lock_immutable
--   SELECT indexname FROM pg_indexes WHERE tablename = 'prompt_constraint_shadows';          -- expect uq_pcs_one_locked_per_version + idx_pcs_*
-- ─────────────────────────────────────────────────────────────────────────────
