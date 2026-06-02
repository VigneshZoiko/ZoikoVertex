-- Migration 43: Add Google Ads columns to campaign_boosts + extend boost types
-- Fixes the broken Google Ads path and adds new ad creative types for Meta + Google

ALTER TABLE campaign_boosts
  ADD COLUMN IF NOT EXISTS google_campaign_id       TEXT,
  ADD COLUMN IF NOT EXISTS google_adgroup_id        TEXT,
  ADD COLUMN IF NOT EXISTS google_ad_id             TEXT,
  ADD COLUMN IF NOT EXISTS google_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS advertising_channel_type TEXT,
  ADD COLUMN IF NOT EXISTS ad_image_url             TEXT,
  ADD COLUMN IF NOT EXISTS ad_square_image_url      TEXT,
  ADD COLUMN IF NOT EXISTS lead_form_id             TEXT,
  ADD COLUMN IF NOT EXISTS ad_headline              TEXT,
  ADD COLUMN IF NOT EXISTS ad_body                  TEXT;

-- Extend boost_type to cover all ad formats
ALTER TABLE campaign_boosts DROP CONSTRAINT IF EXISTS campaign_boosts_boost_type_check;
ALTER TABLE campaign_boosts
  ADD CONSTRAINT campaign_boosts_boost_type_check
  CHECK (boost_type IN (
    'POST',
    'CAMPAIGN',
    'IMAGE_AD',
    'VIDEO_AD',
    'LEAD_AD',
    'DISPLAY_AD',
    'SEARCH_AD'
  ));

-- Index for Google campaign ID lookups
CREATE INDEX IF NOT EXISTS idx_campaign_boosts_google_campaign_id
  ON campaign_boosts (google_campaign_id)
  WHERE google_campaign_id IS NOT NULL;
