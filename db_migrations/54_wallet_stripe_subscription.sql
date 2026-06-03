-- Migration 54: Add Stripe subscription fields to wallets
-- Required for plan subscriptions and renewal date tracking

ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS stripe_customer_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id    TEXT,
  ADD COLUMN IF NOT EXISTS plan_renewal_date         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wallets_stripe_customer
  ON wallets (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
