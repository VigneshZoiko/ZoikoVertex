-- Add optional target publish date to publish_intents.
-- Governance posts will show on this date in the calendar (falls back to created_at when null).
ALTER TABLE publish_intents
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
