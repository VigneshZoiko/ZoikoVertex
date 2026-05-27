-- Migration 38: Campaign Boosts — Meta Ads integration
-- Stores the Meta platform post ID after publishing (needed for boost creative)
-- Adds ad account fields to connected_accounts
-- Creates campaign_boosts table for tracking Meta ad boosts

ALTER TABLE publish_intents
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT NULL;

ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS ad_account_id   TEXT NULL,
  ADD COLUMN IF NOT EXISTS ad_account_name TEXT NULL;

CREATE TABLE IF NOT EXISTS campaign_boosts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL,
  campaign_id          UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  publish_intent_id    UUID REFERENCES publish_intents(id) ON DELETE SET NULL,
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL,

  platform     TEXT NOT NULL,
  boost_type   TEXT NOT NULL CHECK (boost_type IN ('POST', 'CAMPAIGN')),
  status       TEXT NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING','ACTIVE','PAUSED','COMPLETED','FAILED','CANCELLED')),

  budget_total     NUMERIC(12,2),
  budget_daily     NUMERIC(12,2),
  budget_currency  TEXT DEFAULT 'USD',
  start_at         TIMESTAMPTZ,
  end_at           TIMESTAMPTZ,

  objective TEXT DEFAULT 'POST_ENGAGEMENT',
  targeting JSONB DEFAULT '{}'::JSONB,

  -- Meta-specific IDs
  ad_account_id    TEXT,
  meta_campaign_id TEXT,
  meta_adset_id    TEXT,
  meta_ad_id       TEXT,
  meta_creative_id TEXT,

  -- Metrics (synced from Meta Insights API)
  impressions      BIGINT        DEFAULT 0,
  reach            BIGINT        DEFAULT 0,
  clicks           BIGINT        DEFAULT 0,
  spend_recorded   NUMERIC(12,2) DEFAULT 0,

  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaign_boosts_workspace ON campaign_boosts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_boosts_campaign  ON campaign_boosts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_boosts_intent    ON campaign_boosts(publish_intent_id);
