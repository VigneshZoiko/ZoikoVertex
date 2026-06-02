-- Migration 49: Atomic wallet deduction via Postgres function
-- Prevents race condition where two concurrent approvals could double-deduct the same budget

CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_wallet_id UUID,
  p_amount    NUMERIC
)
RETURNS TABLE(new_balance NUMERIC, success BOOLEAN)
LANGUAGE plpgsql AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Lock the row for the duration of this transaction
  SELECT balance INTO v_balance
    FROM wallets
   WHERE id = p_wallet_id
     FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN QUERY SELECT 0::NUMERIC, FALSE;
    RETURN;
  END IF;

  IF v_balance < p_amount THEN
    RETURN QUERY SELECT v_balance, FALSE;
    RETURN;
  END IF;

  UPDATE wallets
     SET balance    = balance - p_amount,
         updated_at = now()
   WHERE id = p_wallet_id;

  RETURN QUERY
    SELECT balance, TRUE
      FROM wallets
     WHERE id = p_wallet_id;
END;
$$;
