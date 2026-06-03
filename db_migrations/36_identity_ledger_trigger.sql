-- Migration 036: DB-level enforcement of identity ledger hash chain integrity
-- BEFORE INSERT trigger sets prev_hash + computes hash atomically with
-- advisory lock, preventing race conditions between app-layer SELECT and INSERT.
--
-- The stable_jsonb helper produces alphabetically-sorted, null-preserving JSON
-- matching TypeScript's stableSort + JSON.stringify exactly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Helper: stable_jsonb — alphabetically-sorted JSON text (preserves nulls)
-- Matches TypeScript stableSort() + JSON.stringify() for hash computation.
-- Unlike sorted_jsonb, this preserves JSON null values in objects.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.stable_jsonb(j jsonb) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  key TEXT;
  val jsonb;
  items TEXT[] := '{}';
  elem jsonb;
  arr_items TEXT[] := '{}';
BEGIN
  IF j IS NULL THEN
    RETURN 'null';
  END IF;
  CASE jsonb_typeof(j)
    WHEN 'object' THEN
      FOR key, val IN SELECT * FROM jsonb_each(j) ORDER BY key LOOP
        items := items || (to_json(key)::TEXT || ':' || public.stable_jsonb(val));
      END LOOP;
      RETURN '{' || array_to_string(items, ',') || '}';
    WHEN 'array' THEN
      FOR elem IN SELECT * FROM jsonb_array_elements(j) LOOP
        arr_items := arr_items || public.stable_jsonb(elem);
      END LOOP;
      RETURN '[' || array_to_string(arr_items, ',') || ']';
    ELSE
      RETURN j::TEXT;
  END CASE;
END;
$$;

-- ============================================================================
-- Function: enforce_identity_ledger_chain
-- 1. Acquires advisory lock for this workspace (prevents concurrent inserts)
-- 2. Looks up the previous entry's hash
-- 3. Sets NEW.prev_hash and computes NEW.hash from the row data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_identity_ledger_chain()
RETURNS TRIGGER AS $$
DECLARE
  prev_entry_hash TEXT;
  hash_input JSONB;
  sorted_text TEXT;
BEGIN
  -- Advisory lock for this workspace — prevents race conditions between
  -- app-layer SELECT (getPreviousLedgerHash) and INSERT.
  PERFORM pg_advisory_xact_lock(hashtext('identity_ledger:' || COALESCE(NEW.workspace_id, '00000000-0000-0000-0000-000000000000')));

  -- Find the most recent entry in the same workspace
  SELECT ile.hash INTO prev_entry_hash
    FROM public.identity_ledger_entries ile
    WHERE ile.workspace_id = NEW.workspace_id
    ORDER BY ile.timestamp_utc DESC, ile.created_at DESC
    LIMIT 1;

  -- Set prev_hash
  NEW.prev_hash := prev_entry_hash;

  -- Build hash input matching TypeScript's buildLedgerEntryHash fields
  hash_input := jsonb_build_object(
    'actor_id', NEW.actor_id,
    'actor_type', NEW.actor_type,
    'approvals', COALESCE(NEW.approvals, '[]'::jsonb),
    'authority_change', COALESCE(NEW.authority_change, '{}'::jsonb),
    'data_residency', COALESCE(NEW.data_residency, 'auto'),
    'entry_category', COALESCE(NEW.entry_category, ''),
    'entry_type', COALESCE(NEW.entry_type, ''),
    'linked_authority_snapshot_id', NEW.linked_authority_snapshot_id,
    'prev_hash', to_jsonb(NEW.prev_hash),
    'retention', COALESCE(NEW.retention, '{}'::jsonb),
    'risk', COALESCE(NEW.risk, '{}'::jsonb),
    'schema_version', COALESCE(NEW.schema_version, '1.0'),
    'session_context', COALESCE(NEW.session_context, '{}'::jsonb),
    'source', COALESCE(NEW.source, '{}'::jsonb),
    'tenant_id', COALESCE(NEW.tenant_id, 'default'),
    'timestamp_utc', NEW.timestamp_utc,
    'workspace_id', NEW.workspace_id
  );

  sorted_text := public.stable_jsonb(hash_input);
  NEW.hash := encode(digest(sorted_text, 'sha256'), 'hex');

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
