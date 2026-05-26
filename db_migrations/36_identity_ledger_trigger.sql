-- Migration 036: DB-level enforcement of identity ledger hash chain integrity
-- BEFORE INSERT trigger auto-populates prev_hash from the last entry and validates
-- the chain link, preventing orphan or broken chains even when bypassing the app layer.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Function: enforce_identity_ledger_chain
-- 1. Auto-populates prev_hash from the most recent entry in the same workspace
-- 2. If prev_hash was provided, validates it matches the previous entry's hash
-- 3. Does NOT recompute the hash field (app-layer owns hash computation)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_identity_ledger_chain()
RETURNS TRIGGER AS $$
DECLARE
  prev_entry_hash TEXT;
BEGIN
  -- Find the most recent entry in the same workspace (by timestamp then created_at)
  SELECT hash INTO prev_entry_hash
    FROM public.identity_ledger_entries
    WHERE workspace_id = NEW.workspace_id
    ORDER BY timestamp_utc DESC, created_at DESC
    LIMIT 1;

  IF NEW.prev_hash IS NULL AND prev_entry_hash IS NOT NULL THEN
    -- Auto-link to previous entry
    NEW.prev_hash := prev_entry_hash;
  ELSIF NEW.prev_hash IS NOT NULL AND prev_entry_hash IS NOT NULL AND NEW.prev_hash != prev_entry_hash THEN
    RAISE EXCEPTION 'Ledger chain broken for workspace %: prev_hash % does not match previous entry hash %',
      NEW.workspace_id, NEW.prev_hash, prev_entry_hash;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BEFORE INSERT trigger on identity_ledger_entries
-- ============================================================================
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_identity_ledger_chain ON public.identity_ledger_entries;
  CREATE TRIGGER trg_identity_ledger_chain
    BEFORE INSERT ON public.identity_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.enforce_identity_ledger_chain();
END $$;
