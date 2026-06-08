-- ZoikoVertex — Agent Studio: Extended Schema (Migration 08)
-- Run AFTER migration 05_agent_governance.sql
-- Adds: new agent fields, deployment tracking, approval workflow, and event taxonomy

-- 1. Extend agents table with Agent Studio v2 fields
ALTER TABLE agents ADD COLUMN IF NOT EXISTS risk_level          TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS permitted_actions   TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS prohibited_actions TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS linked_prompts       TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS linked_workflows    TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS linked_policies    TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS linked_knowledge_sources TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS linked_channels     TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS evidence_required  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS approval_required   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_activity        TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS purpose             TEXT;

-- 2. Extend agent_incidents with retirement and closure fields
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS owner_id    UUID REFERENCES domain_users(id);
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS remediation TEXT;
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS closed_at   TIMESTAMPTZ;

-- 3. Agent Deployments: Immutable deployment records per environment
CREATE TABLE IF NOT EXISTS agent_deployments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  -- environment: 'sandbox' | 'staging' | 'production'
  environment       TEXT NOT NULL DEFAULT 'production',
  -- status: 'DEPLOYED' | 'PAUSED' | 'ROLLED_BACK' | 'RETIRED'
  status            TEXT NOT NULL DEFAULT 'DEPLOYED',
  deployed_by       UUID REFERENCES domain_users(id),
  deployed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rollback_version_id UUID REFERENCES agent_artifacts(id),
  deployment_notes  TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_deployments_agent  ON agent_deployments(agent_id, deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_env   ON agent_deployments(environment);

ALTER TABLE agent_deployments ENABLE ROW LEVEL SECURITY;

-- 4. Agent Approvals: Per-role approval request tracking
CREATE TABLE IF NOT EXISTS agent_approvals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id         UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  -- approver_role: 'CAMPAIGN_OWNER' | 'GOVERNANCE_ADMIN' | 'BRAND_GOVERNANCE' | 'COMPLIANCE_REVIEWER' | 'SECURITY_ADMIN'
  approver_role    TEXT NOT NULL,
  required_reason  TEXT,
  risk_tier        TEXT,
  agent_type       TEXT,
  -- status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  status           TEXT NOT NULL DEFAULT 'PENDING',
  requested_by     UUID REFERENCES domain_users(id),
  reviewed_by      UUID REFERENCES domain_users(id),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  notes            TEXT,
  -- SLA: soft deadline for review
  sla_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_approvals_agent    ON agent_approvals(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_role    ON agent_approvals(approver_role, status);

ALTER TABLE agent_approvals ENABLE ROW LEVEL SECURITY;

-- 5. Agent Events: Lifecycle event log for audit and observability
CREATE TABLE IF NOT EXISTS agent_events (
  event_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES domain_users(id),
  tenant_id     UUID REFERENCES organizations(id),
  workspace_id  UUID REFERENCES workspaces(id),
  metadata     JSONB NOT NULL DEFAULT '{}',
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent      ON agent_events(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_type       ON agent_events(event_type, timestamp DESC);

ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;

-- 6. Agent Sandbox Tests: Structured test run records
CREATE TABLE IF NOT EXISTS agent_sandbox_tests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  target_level    TEXT NOT NULL,
  risk_level      TEXT NOT NULL DEFAULT 'medium',
  -- result: 'PASS' | 'FAIL' | 'PARTIAL'
  result          TEXT NOT NULL DEFAULT 'PASS',
  score           NUMERIC(5,2) NOT NULL DEFAULT 0,
  test_categories JSONB NOT NULL DEFAULT '[]',
  logs            TEXT,
  evidence_id     TEXT,
  tested_by       UUID REFERENCES domain_users(id),
  tested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sandbox_tests_agent ON agent_sandbox_tests(agent_id, tested_at DESC);

ALTER TABLE agent_sandbox_tests ENABLE ROW LEVEL SECURITY;

-- 7. Add unique constraint to prevent duplicate agent versions
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_artifacts_unique_version
  ON agent_artifacts(agent_id, version);

SELECT 'Migration 08 — Agent Studio Extended Schema applied successfully' AS status;