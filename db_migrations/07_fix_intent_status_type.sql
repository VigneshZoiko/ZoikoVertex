-- ZoikoVertex — Migration 07: Convert publish_intents.status from enum → TEXT
-- The original intent_status enum only contained role-based PENDING_ values
-- (e.g. PENDING_ADMIN, PENDING_MANAGER). The approval workflow added new status
-- names (PENDING_REVIEW, PENDING_VALIDATION, etc.) that the enum doesn't know about.
-- Changing to TEXT is safer and more flexible going forward.
-- Safe to run multiple times (idempotent via DO block).

DO $$
BEGIN
  -- Only alter if the column is still an enum type (not already TEXT)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name   = 'publish_intents'
      AND column_name  = 'status'
      AND data_type    = 'USER-DEFINED'
  ) THEN
    ALTER TABLE publish_intents
      ALTER COLUMN status TYPE TEXT USING status::text;

    RAISE NOTICE 'publish_intents.status converted from enum → TEXT';
  ELSE
    RAISE NOTICE 'publish_intents.status is already TEXT — skipping';
  END IF;
END $$;

-- Drop the old enum type only if nothing else references it
DROP TYPE IF EXISTS intent_status;

-- Recreate the index (harmless if it already exists as TEXT)
DROP INDEX IF EXISTS idx_publish_intents_risk;
CREATE INDEX IF NOT EXISTS idx_publish_intents_risk
  ON publish_intents(risk_level, status);

SELECT 'Migration 07 — intent_status enum → TEXT complete' AS status;
