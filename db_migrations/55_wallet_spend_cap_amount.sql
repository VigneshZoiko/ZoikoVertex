-- Migration 55: Add spend_cap_amount to wallets
-- Allows workspaces to set a monthly spend limit in dollars

ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS spend_cap_amount NUMERIC(12,2) DEFAULT NULL;
