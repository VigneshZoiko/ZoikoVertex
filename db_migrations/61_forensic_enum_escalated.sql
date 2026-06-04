-- Forensic Hub: add 'escalated' to case status enum
-- The spec defines 6 high-level states (Open, Assigned, In Progress, Under Review, Pending Closure, Closed).
-- The implementation uses 11 granular states mapped as:
--   Open             -> new, triage
--   Assigned         -> active_investigation
--   In Progress      -> awaiting_information, legal_review, legal_hold, remediation
--   Under Review     -> validation, escalated
--   Pending Closure  -> (escalated -> resolved)
--   Closed           -> closed, reopened

DO $$ BEGIN
  ALTER TYPE forensic_case_status ADD VALUE IF NOT EXISTS 'escalated';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
