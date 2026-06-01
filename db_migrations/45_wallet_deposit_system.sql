-- Migration 45: Wallet Deposit System
-- Adds processing/available credit split, fee tracking, tiered budget approvals

-- ── Extend wallet_transactions for deposit lifecycle ──────────

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'AVAILABLE'
                                          CHECK (status IN ('PROCESSING','AVAILABLE','FAILED','REFUNDED')),
  ADD COLUMN IF NOT EXISTS gross_amount   NUMERIC(12,2),   -- total charged to card
  ADD COLUMN IF NOT EXISTS stripe_fee     NUMERIC(12,4),   -- Stripe processing fee
  ADD COLUMN IF NOT EXISTS tax_amount     NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount     NUMERIC(12,2),   -- credits added to wallet
  ADD COLUMN IF NOT EXISTS available_at   TIMESTAMPTZ,     -- when PROCESSING → AVAILABLE
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS initiated_by   UUID,
  ADD COLUMN IF NOT EXISTS currency       TEXT DEFAULT 'USD';

-- Back-fill existing rows as AVAILABLE
UPDATE wallet_transactions SET status = 'AVAILABLE' WHERE status IS NULL;

-- ── Extend wallets for split balance display ──────────────────

ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS processing_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deposited     NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ── Extend budget_authorizations for tiered approval ─────────

ALTER TABLE budget_authorizations
  ADD COLUMN IF NOT EXISTS approval_tier        TEXT DEFAULT 'LOW'
                                                CHECK (approval_tier IN ('LOW','MEDIUM','HIGH')),
  ADD COLUMN IF NOT EXISTS approvals_required   INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approvals_received   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS second_approver_id   UUID,
  ADD COLUMN IF NOT EXISTS second_approved_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS second_decision_note TEXT;

-- Index for processing deposits sweep
CREATE INDEX IF NOT EXISTS idx_wallet_txns_processing
  ON wallet_transactions (status, available_at)
  WHERE status = 'PROCESSING';

-- Index for tiered budget auth
CREATE INDEX IF NOT EXISTS idx_budget_auth_tier
  ON budget_authorizations (approval_tier, status, workspace_id);
