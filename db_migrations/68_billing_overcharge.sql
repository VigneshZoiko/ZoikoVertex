-- Migration 68: Overcharge billing toggle + billing_events + workspace billing_status

-- 1. Add overcharge_enabled to wallets (replaces spend_cap model)
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS overcharge_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add billing_status to workspaces
--    active    = normal
--    suspended = quota exceeded + wallet empty, services blocked until top-up or cycle reset
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'active';

-- 3. billing_events — audit log for every deduction, suspension, and cycle reset
CREATE TABLE IF NOT EXISTS billing_events (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type          TEXT          NOT NULL,
  -- ai_overage_charge | storage_overage_charge | addon_purchase | suspension | cycle_reset
  amount_usd          NUMERIC(10,4) NOT NULL DEFAULT 0,
  description         TEXT,
  metadata            JSONB         NOT NULL DEFAULT '{}',
  billing_cycle_start DATE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_events_workspace_idx
  ON billing_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS billing_events_workspace_cycle_idx
  ON billing_events(workspace_id, billing_cycle_start, event_type);
