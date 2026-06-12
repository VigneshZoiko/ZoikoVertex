-- Migration 62: Add reviewer tracking fields to publish_intents
-- Enables the Review Queue to record who reviewed a post and their feedback.

ALTER TABLE publish_intents
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_feedback TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_publish_intents_reviewer ON publish_intents(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_publish_intents_status_created ON publish_intents(status, created_at);
