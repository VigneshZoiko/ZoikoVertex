-- Migration 39: Budget Authorization Workflow
-- Tracks formal budget approval requests from campaign managers to budget owners
-- Launch gate condition 06 checks for an APPROVED record before allowing launch

CREATE TABLE IF NOT EXISTS budget_authorizations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL,
  campaign_id      UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  requested_by     UUID,
  budget_owner_id  UUID,

  requested_amount NUMERIC(12,2) NOT NULL,
  requested_daily  NUMERIC(12,2),
  currency         TEXT DEFAULT 'USD',
  justification    TEXT,

  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED')),

  decision_by   UUID,
  decision_at   TIMESTAMPTZ,
  decision_note TEXT,

  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_auths_workspace ON budget_authorizations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budget_auths_campaign  ON budget_authorizations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_budget_auths_owner     ON budget_authorizations(budget_owner_id);
CREATE INDEX IF NOT EXISTS idx_budget_auths_status    ON budget_authorizations(status);
