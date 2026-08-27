-- 87_wallet_txn_revenue_class.sql
-- ZV-COM-BILL-001 §10/§21 — Revenue classification for wallet transactions.
-- Separates ZoikoVertex recognized revenue (subscription + add-ons) from
-- customer advertising/media spend, which is pass-through and MUST NOT be
-- counted as ZoikoVertex subscription revenue in finance/reconciliation.
--
--   SUBSCRIPTION — recurring plan revenue (Growth/Scale monthly)
--   ADDON        — catalog add-on revenue (storage packs, approved overages)
--   MEDIA        — customer ad/media funding + spend (pass-through, NOT revenue)
--   FEE          — payment-processing fees
--   OTHER        — uncategorized / status markers (e.g. payment-failure records)

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS revenue_class TEXT NOT NULL DEFAULT 'MEDIA';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_revenue_class_check'
  ) THEN
    ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_revenue_class_check
      CHECK (revenue_class IN ('SUBSCRIPTION','ADDON','MEDIA','FEE','OTHER'));
  END IF;
END $$;

-- Backfill existing rows from their description (best-effort historical classification).
UPDATE wallet_transactions SET revenue_class = 'SUBSCRIPTION'
  WHERE revenue_class = 'MEDIA' AND description ILIKE '%subscription%';
UPDATE wallet_transactions SET revenue_class = 'ADDON'
  WHERE revenue_class = 'MEDIA' AND (description ILIKE '%add-on%' OR description ILIKE '%addon%' OR description ILIKE '%overage%');

CREATE INDEX IF NOT EXISTS idx_wallet_txn_revenue_class ON wallet_transactions (revenue_class, created_at DESC);
