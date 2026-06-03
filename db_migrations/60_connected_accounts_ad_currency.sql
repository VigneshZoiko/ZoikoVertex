-- Migration 60: Store ad account currency on connected_accounts
ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS ad_account_currency TEXT;
