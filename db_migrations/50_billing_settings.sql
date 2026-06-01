-- Migration 50: Billing Settings — spend cap, billing email, payment method tracking

-- Spend cap on wallets (true = capped at plan quota, false = pay-as-you-go overages)
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS spend_cap_enabled BOOLEAN NOT NULL DEFAULT true;

-- Billing email recipients on workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS billing_email              TEXT,
  ADD COLUMN IF NOT EXISTS billing_additional_emails  JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Track Stripe payment method ID set as default (denormalized cache for fast reads)
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS default_payment_method_id TEXT;
