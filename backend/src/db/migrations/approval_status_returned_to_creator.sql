-- Ensure RETURNED_TO_CREATOR is a valid value for approval_items.approval_status
-- and approval_decisions.decision. Safe to run multiple times (idempotent).
--
-- Run in Supabase SQL Editor → New Query → Run.

DO $$
DECLARE
  v_status_type text;
  v_decision_type text;
BEGIN
  -- Find the UDT name for approval_items.approval_status
  SELECT udt_name INTO v_status_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'approval_items'
    AND column_name = 'approval_status';

  -- If it's a named enum type (not text/varchar), add the missing values
  IF v_status_type IS NOT NULL AND v_status_type NOT IN ('text', 'varchar', 'character varying', 'bpchar') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = v_status_type AND e.enumlabel = 'RETURNED_TO_CREATOR'
    ) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE ''RETURNED_TO_CREATOR''', v_status_type);
      RAISE NOTICE 'Added RETURNED_TO_CREATOR to enum type %', v_status_type;
    ELSE
      RAISE NOTICE 'RETURNED_TO_CREATOR already in approval_status enum %', v_status_type;
    END IF;
  ELSE
    RAISE NOTICE 'approval_status is a text column — no enum change needed (type: %)', v_status_type;
  END IF;

  -- Find the UDT name for approval_decisions.decision
  SELECT udt_name INTO v_decision_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'approval_decisions'
    AND column_name = 'decision';

  IF v_decision_type IS NOT NULL AND v_decision_type NOT IN ('text', 'varchar', 'character varying', 'bpchar') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = v_decision_type AND e.enumlabel = 'RETURNED_TO_CREATOR'
    ) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE ''RETURNED_TO_CREATOR''', v_decision_type);
      RAISE NOTICE 'Added RETURNED_TO_CREATOR to decision enum type %', v_decision_type;
    ELSE
      RAISE NOTICE 'RETURNED_TO_CREATOR already in decision enum %', v_decision_type;
    END IF;
  ELSE
    RAISE NOTICE 'decision is a text column — no enum change needed (type: %)', v_decision_type;
  END IF;
END $$;

-- Verify: show the current enum values for both columns
SELECT
  c.table_name,
  c.column_name,
  c.udt_name AS type_name,
  e.enumlabel AS enum_value
FROM information_schema.columns c
LEFT JOIN pg_type t ON t.typname = c.udt_name
LEFT JOIN pg_enum e ON e.enumtypid = t.oid
WHERE c.table_schema = 'public'
  AND c.table_name IN ('approval_items', 'approval_decisions')
  AND c.column_name IN ('approval_status', 'decision')
ORDER BY c.table_name, c.column_name, e.enumsortorder;
