-- Migration 56: Client-owned campaign model
-- Distinguishes client's own Meta accounts from agency accounts
-- Adds selected_meta_account_id on campaigns table

ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS is_client_account   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_business_id  TEXT;

-- Mark all existing accounts as client accounts by default
-- (agency accounts are those with is_agency_default = TRUE)
UPDATE connected_accounts
  SET is_client_account = TRUE
  WHERE is_agency_default = FALSE OR is_agency_default IS NULL;

-- Campaigns: which client account is used for this campaign's ads
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS selected_meta_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meta_ad_account_id       TEXT;

CREATE INDEX IF NOT EXISTS idx_connected_accounts_client
  ON connected_accounts(workspace_id, is_client_account)
  WHERE is_client_account = TRUE;
