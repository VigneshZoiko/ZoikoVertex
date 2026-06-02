-- Migration 52: Per-post boost budget override
-- Allows clients to override the campaign default boost budget for individual posts

ALTER TABLE publish_intents
  ADD COLUMN IF NOT EXISTS boost_budget_override NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN publish_intents.boost_budget_override IS
  'Optional per-post boost budget. Overrides campaign.boost_per_post_budget when set.';
