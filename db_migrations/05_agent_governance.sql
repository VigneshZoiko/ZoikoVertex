-- ZoikoVertex — Agent Studio & Identity Management
-- Migration 05: Agent Registry, DRIs, and Certification infrastructure

-- 1. Agents Table: The core identity of every AI operator
CREATE TABLE IF NOT EXISTS agents (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id       UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  -- type: 'content' | 'creative_brief' | 'research' | 'optimization' | 'response' | 'governance' | 'brand_alignment' | 'publishing' | 'reporting' | 'workflow' | 'supervisory'
  type               TEXT NOT NULL,
  -- status: 'DRAFT' | 'PENDING_CERTIFICATION' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'TERMINATED'
  status             TEXT NOT NULL DEFAULT 'DRAFT',
  -- autonomy_level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
  autonomy_level     TEXT NOT NULL DEFAULT 'L0',
  -- risk_tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  risk_tier          TEXT NOT NULL DEFAULT 'LOW',
  
  trust_score        NUMERIC(3,2) DEFAULT 0.0,
  faithfulness_score NUMERIC(3,2) DEFAULT 0.0,
  
  -- Accountability
  primary_dri_id     UUID REFERENCES domain_users(id),
  backup_dri_id      UUID REFERENCES domain_users(id),
  
  -- Configuration & Scope
  assigned_brand     TEXT,
  platforms          TEXT[], -- e.g. ['meta', 'google', 'linkedin']
  markets            TEXT[], -- e.g. ['US', 'UK', 'IN']
  
  -- Metadata for versioning and models
  prompt_version     TEXT,
  model_version      TEXT,
  
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Agent Artifacts: Immutable configuration snapshots (Agent-as-Code)
CREATE TABLE IF NOT EXISTS agent_artifacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version         INT NOT NULL,
  config_payload  JSONB NOT NULL DEFAULT '{}',
  created_by      UUID REFERENCES domain_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Agent Certification Log: Evidence of testing and approval
CREATE TABLE IF NOT EXISTS agent_certifications (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id             UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  artifact_id          UUID NOT NULL REFERENCES agent_artifacts(id),
  certified_level      TEXT NOT NULL, -- L0-L6
  -- certification_status: 'VALID' | 'EXPIRED' | 'REVOKED'
  status               TEXT NOT NULL DEFAULT 'VALID',
  evidence_vault_ref   TEXT,
  authorized_by        UUID REFERENCES domain_users(id),
  certified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ
);

-- 4. Agent Incidents: Tracking drift, policy violations, and malfunctions
CREATE TABLE IF NOT EXISTS agent_incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  -- severity: 'INFO' | 'WARNING' | 'CRITICAL'
  severity        TEXT NOT NULL DEFAULT 'WARNING',
  -- incident_type: 'POLICY_VIOLATION' | 'BRAND_DRIFT' | 'HALLUCINATION' | 'UNAUTHORIZED_ACTION'
  incident_type   TEXT NOT NULL,
  description     TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for fast registry lookups
CREATE INDEX IF NOT EXISTS idx_agents_org_workspace ON agents(org_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agent_artifacts_agent ON agent_artifacts(agent_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_agent_incidents_agent ON agent_incidents(agent_id, severity);

-- 6. Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_incidents ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (Basic Admin/DRI access)
-- Workspace users can view agents in their workspace
CREATE POLICY "Users can view agents in their workspace" ON agents
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM memberships WHERE user_id = (SELECT id FROM domain_users WHERE auth_user_id = auth.uid())
    )
  );

-- Only Admins and DRIs can update agents
CREATE POLICY "Admins and DRIs can update agents" ON agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN roles r ON m.role_id = r.id
      WHERE m.user_id = (SELECT id FROM domain_users WHERE auth_user_id = auth.uid())
      AND m.workspace_id = agents.workspace_id
      AND (r.name = 'ADMIN' OR agents.primary_dri_id = m.user_id)
    )
  );

SELECT 'Migration 05 — Agent Studio Registry applied successfully' AS status;
