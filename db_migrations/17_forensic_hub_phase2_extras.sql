-- 17_forensic_hub_phase2_extras.sql
-- Phase 2 additions: escalated state, legal_hold_active index, SLA breach index

-- Add escalated to case status enum
DO $$ BEGIN
  ALTER TYPE forensic_case_status ADD VALUE 'escalated';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for SLA breach queries
CREATE INDEX IF NOT EXISTS idx_forensic_cases_sla_breach
  ON forensic_cases(sla_due_at)
  WHERE status NOT IN ('closed', 'reopened') AND sla_due_at IS NOT NULL;

-- Index for escalated cases
-- CREATE INDEX IF NOT EXISTS idx_forensic_cases_escalated
--   ON forensic_cases(status)
--   WHERE status = 'escalated';
