-- Migration 40: Campaign Wallet & Transactions
-- Supports Phase 5 Stripe top-up and campaign fund holds

CREATE TABLE IF NOT EXISTS wallets (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  balance                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency                  TEXT NOT NULL DEFAULT 'USD',
  auto_topup_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  auto_topup_threshold      NUMERIC(12,2) NOT NULL DEFAULT 50,
  auto_topup_amount         NUMERIC(12,2) NOT NULL DEFAULT 500,
  stripe_customer_id        TEXT,
  stripe_payment_method_id  TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id                 UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  campaign_id               UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  amount                    NUMERIC(12,2) NOT NULL,
  type                      TEXT NOT NULL CHECK (type IN ('CREDIT','DEBIT')),
  description               TEXT,
  stripe_payment_intent_id  TEXT,
  created_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_workspace        ON wallets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet       ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_campaign     ON wallet_transactions(campaign_id);
