-- ============================================================
-- publish_intents: add SLA tracking columns
--
-- slaBreachWorker queries sla_due_at and sla_breached_at but these columns
-- were never added to the table, causing:
--   "column publish_intents.sla_due_at does not exist" (code 42703)
-- on every worker poll. Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.publish_intents
  ADD COLUMN IF NOT EXISTS sla_due_at      timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_publish_intents_sla_due_at
  ON public.publish_intents (sla_due_at)
  WHERE sla_due_at IS NOT NULL;

-- Reload PostgREST schema cache so the columns are immediately queryable.
NOTIFY pgrst, 'reload schema';
