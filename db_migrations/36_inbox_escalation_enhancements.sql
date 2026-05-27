-- Migration 36: Inbox escalation enhancements
-- Adds: resolved_by (who resolved), is_auto_escalated (system vs manual),
--       makes escalated_by nullable for system-generated escalations

ALTER TABLE inbox_escalations
  ADD COLUMN IF NOT EXISTS resolved_by       UUID NULL,
  ADD COLUMN IF NOT EXISTS is_auto_escalated BOOLEAN NOT NULL DEFAULT FALSE;

-- Allow system-generated escalations to have no human escalated_by
ALTER TABLE inbox_escalations
  ALTER COLUMN escalated_by DROP NOT NULL;

-- Allow null risk_category for auto-escalations
ALTER TABLE inbox_escalations
  ALTER COLUMN risk_category DROP NOT NULL;
