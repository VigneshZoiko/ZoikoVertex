-- Migration 67: Storage add-on packs purchased by workspace
-- Tracks per-billing-cycle storage purchases; stacks on top of plan base quota

CREATE TABLE IF NOT EXISTS storage_addons (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pack_gb             INTEGER     NOT NULL,
  cost_usd            NUMERIC(10,4) NOT NULL,
  purchased_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  billing_cycle_start DATE        NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS storage_addons_workspace_cycle_idx
  ON storage_addons(workspace_id, billing_cycle_start);
