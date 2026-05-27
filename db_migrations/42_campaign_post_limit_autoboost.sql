-- Migration 42: Campaign Post Limit & Auto-Boost
-- Adds post_limit, auto_boost settings, and boost_settings JSONB to campaigns.
-- Also adds auto_boost_status to publish_intents so each post tracks its boost state.

-- ── campaigns additions ────────────────────────────────────────────────────

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS post_limit            INTEGER        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_boost_enabled    BOOLEAN        NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS boost_per_post_budget NUMERIC(12,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS boost_settings        JSONB          DEFAULT NULL;

-- boost_settings shape (stored per campaign, used for every auto-boost):
-- {
--   "duration_days": 3,
--   "objective": "POST_ENGAGEMENT",
--   "meta": {
--     "connected_account_id": "<uuid>",
--     "ad_account_id": "act_XXXXXXX",
--     "targeting": { "age_min": 18, "age_max": 65, "genders": [0], "geo_locations": {"countries": ["AE","SA"]} }
--   },
--   "google": {
--     "connected_account_id": "<uuid>",
--     "customer_id": "XXX-XXX-XXXX"
--   }
-- }

-- ── publish_intents additions ──────────────────────────────────────────────

ALTER TABLE publish_intents
  ADD COLUMN IF NOT EXISTS auto_boost_status TEXT DEFAULT NULL
    CHECK (auto_boost_status IN ('QUEUED','BOOSTING','LIVE','FAILED','SKIPPED','LIMIT_REACHED','LOW_BALANCE') OR auto_boost_status IS NULL),
  ADD COLUMN IF NOT EXISTS auto_boost_at     TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS boost_id          UUID REFERENCES campaign_boosts(id) ON DELETE SET NULL DEFAULT NULL;

-- ── indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_publish_intents_campaign_status
  ON publish_intents(campaign_id, status)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_publish_intents_auto_boost
  ON publish_intents(auto_boost_status)
  WHERE auto_boost_status IS NOT NULL;
