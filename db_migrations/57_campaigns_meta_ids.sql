-- Migration 57: Add Meta API IDs to campaigns table
-- Stores the Meta object IDs after publishing to Meta API

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS meta_campaign_id  TEXT,
  ADD COLUMN IF NOT EXISTS meta_adset_id     TEXT,
  ADD COLUMN IF NOT EXISTS meta_creative_id  TEXT,
  ADD COLUMN IF NOT EXISTS meta_ad_id        TEXT,
  ADD COLUMN IF NOT EXISTS published_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_error        TEXT;  -- last Meta API error message

CREATE INDEX IF NOT EXISTS idx_campaigns_meta_campaign_id
  ON campaigns(meta_campaign_id)
  WHERE meta_campaign_id IS NOT NULL;
