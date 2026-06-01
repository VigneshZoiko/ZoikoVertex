-- Migration 48: Agency default account support
-- Allows admin to mark one connected account per platform as the agency's default
-- All client campaigns use this account automatically — no per-client account selection

ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS is_agency_default   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agency_ad_account_id TEXT,   -- agency's Meta Ad Account ID (act_xxx)
  ADD COLUMN IF NOT EXISTS agency_page_id       TEXT;   -- agency's Facebook Page ID for ad creatives

-- Enforce: only one default per platform per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_accounts_agency_default
  ON connected_accounts (workspace_id, platform)
  WHERE is_agency_default = TRUE;
