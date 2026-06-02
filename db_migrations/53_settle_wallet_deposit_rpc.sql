-- Migration 53: settle_wallet_deposit RPC
-- Called by campaignWorker every 15 minutes to move matured deposits
-- from processing_balance into available balance.

CREATE OR REPLACE FUNCTION settle_wallet_deposit(
  p_wallet_id UUID,
  p_amount    NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE wallets
  SET
    balance            = balance + p_amount,
    processing_balance = GREATEST(0, processing_balance - p_amount),
    updated_at         = NOW()
  WHERE id = p_wallet_id;
END;
$$;
