-- Migration 41: Google Ads integration
-- Adds Google Ads customer ID to connected_accounts
-- Adds Google Ads resource IDs to campaign_boosts

ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT NULL;

ALTER TABLE campaign_boosts
  ADD COLUMN IF NOT EXISTS google_campaign_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_adgroup_id  TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_ad_id       TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_boosts_google ON campaign_boosts(google_campaign_id)
  WHERE google_campaign_id IS NOT NULL;
