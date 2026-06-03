-- ============================================================
-- ZoikoVertex — prompt_test_scenarios table for Phase 5C
-- Adversarial Testing
--
-- Adds the prompt_test_scenarios table that stores individual
-- adversarial probe definitions within a test suite. Each
-- scenario defines a detection category, probe pattern, and
-- evaluation configuration for deterministic adversarial
-- testing of prompt versions.
--
-- Apply via Supabase Dashboard → SQL Editor.
-- Safe to run repeatedly (IF NOT EXISTS).
-- ============================================================

-- Extension for moddatetime trigger (idempotent)
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ------------------------------------------------------------
-- prompt_test_scenarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_test_scenarios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id          UUID NOT NULL REFERENCES prompt_test_suites(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  severity          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  probe_template    TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  eval_config       JSONB DEFAULT '{}'::jsonb,
  is_default        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ptsc_suite_id   ON prompt_test_scenarios(suite_id);
CREATE INDEX IF NOT EXISTS idx_ptsc_category   ON prompt_test_scenarios(category);
CREATE INDEX IF NOT EXISTS idx_ptsc_severity   ON prompt_test_scenarios(severity);

-- Auto-update updated_at
CREATE TRIGGER IF NOT EXISTS mdt_prompt_test_scenarios
  BEFORE UPDATE ON prompt_test_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- ------------------------------------------------------------
-- Add scenario_count trigger to prompt_test_suites
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_suite_scenario_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prompt_test_suites
    SET scenario_count = (SELECT COUNT(*) FROM prompt_test_scenarios WHERE suite_id = NEW.suite_id)
    WHERE id = NEW.suite_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prompt_test_suites
    SET scenario_count = (SELECT COUNT(*) FROM prompt_test_scenarios WHERE suite_id = OLD.suite_id)
    WHERE id = OLD.suite_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_scenario_count_insert ON prompt_test_scenarios;
CREATE TRIGGER trg_update_scenario_count_insert
  AFTER INSERT ON prompt_test_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_suite_scenario_count();

DROP TRIGGER IF EXISTS trg_update_scenario_count_delete ON prompt_test_scenarios;
CREATE TRIGGER trg_update_scenario_count_delete
  AFTER DELETE ON prompt_test_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_suite_scenario_count();
