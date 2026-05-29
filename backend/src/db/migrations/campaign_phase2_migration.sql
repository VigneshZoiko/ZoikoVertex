-- ============================================================
-- Campaign Phase 2 Migration
-- Adds governed agentic intelligence fields to campaigns
-- and creates campaign_events lightweight event log
-- Run this once against your Supabase project
-- ============================================================

-- ── 1. Extend the campaigns table ───────────────────────────

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS risk_tier            TEXT    DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS autonomy_level       TEXT    DEFAULT 'L1',
  ADD COLUMN IF NOT EXISTS campaign_manager_id  UUID,
  ADD COLUMN IF NOT EXISTS campaign_manager_name TEXT,
  ADD COLUMN IF NOT EXISTS budget_owner_id      UUID,
  ADD COLUMN IF NOT EXISTS budget_owner_name    TEXT,
  ADD COLUMN IF NOT EXISTS budget_currency      TEXT    DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS budget_pacing        TEXT    DEFAULT 'EVEN',
  ADD COLUMN IF NOT EXISTS spend_recorded       NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend_data_state     TEXT    DEFAULT 'PRELIMINARY',
  ADD COLUMN IF NOT EXISTS last_reconciled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS targeting            JSONB   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS creative             JSONB   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS launch_gate_status   JSONB   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_involvement       JSONB   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wizard_step          INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approval_tier        TEXT    DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS three_key_status     TEXT    DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS business_rationale   TEXT,
  ADD COLUMN IF NOT EXISTS success_metrics      TEXT,
  ADD COLUMN IF NOT EXISTS region               TEXT;

-- ── 2. Performance indexes on campaigns ─────────────────────

CREATE INDEX IF NOT EXISTS idx_campaigns_status       ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace    ON campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_risk_tier    ON campaigns(risk_tier);
CREATE INDEX IF NOT EXISTS idx_campaigns_manager_id   ON campaigns(campaign_manager_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_budget_owner ON campaigns(budget_owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_type         ON campaigns(campaign_type);

-- ── 3. campaign_events — lightweight lifecycle event log ─────
-- This is our own event log. Does not touch the Evidence Layer.

CREATE TABLE IF NOT EXISTS campaign_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL,
  campaign_id  UUID        NOT NULL,
  event_type   TEXT        NOT NULL,
  actor_id     UUID,
  actor_role   TEXT,
  prev_status  TEXT,
  new_status   TEXT,
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign   ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_workspace  ON campaign_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type       ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_created_at ON campaign_events(created_at DESC);
