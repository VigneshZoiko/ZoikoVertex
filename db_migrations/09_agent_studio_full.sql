-- ZoikoVertex — Agent Studio: Complete Schema (Migration 09)
-- Run AFTER migration 08_agent_studio_extended.sql
-- Covers: permission sets, safety policies, platform checks, agent templates, incidents, profile readiness

-- 1. Agent Permission Sets: Granular action class permissions
CREATE TABLE IF NOT EXISTS agent_permission_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action_class VARCHAR(50) NOT NULL DEFAULT 'draft_only',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  tools TEXT[] NOT NULL DEFAULT '{}',
  scopes JSONB NOT NULL DEFAULT '{}',
  rate_limits JSONB NOT NULL DEFAULT '{"max_per_hour": 10, "max_per_day": 100}',
  spend_limits JSONB NOT NULL DEFAULT '{"daily": 0, "monthly": 0}',
  approval_required BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES domain_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_permission_sets_agent ON agent_permission_sets(agent_id);
ALTER TABLE agent_permission_sets ENABLE ROW LEVEL SECURITY;

-- 2. Safety Policy Results: Per-check outcome records
CREATE TABLE IF NOT EXISTS agent_safety_policy_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  test_id UUID REFERENCES agent_sandbox_tests(id),
  policy_id UUID,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  pass_fail BOOLEAN NOT NULL DEFAULT true,
  blocked_terms TEXT[] NOT NULL DEFAULT '{}',
  platform VARCHAR(50),
  evidence_id TEXT,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_policy_agent ON agent_safety_policy_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_safety_policy_test ON agent_safety_policy_results(test_id);
ALTER TABLE agent_safety_policy_results ENABLE ROW LEVEL SECURITY;

-- 3. Platform-Specific Checks Registry
CREATE TABLE IF NOT EXISTS agent_platform_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  check_type VARCHAR(100) NOT NULL,
  pass_fail BOOLEAN NOT NULL DEFAULT true,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  rule_ref TEXT,
  blocked_content TEXT,
  remediation TEXT,
  check_result JSONB NOT NULL DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_checks_agent ON agent_platform_checks(agent_id, platform);
ALTER TABLE agent_platform_checks ENABLE ROW LEVEL SECURITY;

-- 4. Agent Templates: Pre-configured agent blueprints
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  agent_type VARCHAR(50) NOT NULL,
  default_action_class VARCHAR(50) NOT NULL DEFAULT 'read_only',
  default_governance JSONB NOT NULL DEFAULT '{}',
  default_permissions JSONB NOT NULL DEFAULT '{}',
  default_runtime JSONB NOT NULL DEFAULT '{}',
  required_approvers TEXT[] NOT NULL DEFAULT '{}',
  risk_tier VARCHAR(20) NOT NULL DEFAULT 'low',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;

-- Insert the required 8 agent templates from the spec
INSERT INTO agent_templates (name, description, agent_type, default_action_class, default_governance, default_permissions, default_runtime, required_approvers, risk_tier) VALUES
('Content Research Agent', 'Read approved knowledge, analyze sources, produce briefs. No publishing.', 'research', 'read_only',
 '{"brand_review": "optional", "compliance_review": "required_for_regulated"}',
 '{"tools": ["read_knowledge", "analyze_sources", "produce_briefs"], "platforms": []}',
 '{"rate_limit": 100, "token_budget": 50000, "max_outputs_per_day": 50}',
 '{"governance_admin": "compliance_review"}', 'low'),

('Content Drafting Agent', 'Draft posts, captions, outlines, newsletters, and campaign copy. No external action.', 'content', 'draft_only',
 '{"brand_approval": "required"}',
 '{"tools": ["generate_captions", "generate_outlines", "draft_posts"], "platforms": []}',
 '{"rate_limit": 50, "token_budget": 100000, "max_outputs_per_day": 30}',
 '{"campaign_owner": "brand_approval"}', 'medium'),

('Social Response Agent', 'Draft replies and escalation recommendations. No auto-reply by default.', 'response', 'recommend_only',
 '{"human_review": "required", "auto_reply": "low_risk_only"}',
 '{"tools": ["draft_replies", "recommend_escalations"], "platforms": ["twitter", "facebook", "instagram", "linkedin"]}',
 '{"rate_limit": 20, "token_budget": 30000, "max_outputs_per_day": 100}',
 '{"governance_admin": "human_review_setup"}', 'medium'),

('Scheduling Recommendation Agent', 'Recommend schedule and channel sequencing. No posting unless approved.', 'optimization', 'recommend_only',
 '{"campaign_owner_approval": "required"}',
 '{"tools": ["recommend_schedule", "recommend_sequence"], "platforms": ["twitter", "facebook", "instagram", "linkedin", "tiktok", "youtube"]}',
 '{"rate_limit": 30, "token_budget": 20000, "max_outputs_per_day": 20}',
 '{"campaign_owner": "approval"}', 'low'),

('Compliance Review Agent', 'Check claims, prohibited language, source support, risk, and policy fit.', 'governance', 'read_only',
 '{"governance_owned": true, "cannot_approve_own_output": true}',
 '{"tools": ["check_claims", "check_prohibited_language", "check_sources", "check_policy"], "platforms": []}',
 '{"rate_limit": 200, "token_budget": 200000, "max_outputs_per_day": 500}',
 '{"governance_admin": "owner"}', 'low'),

('Performance Insight Agent', 'Analyze campaign results and propose optimizations.', 'analytics', 'read_only',
 '{"read_only_analytics": true, "no_budget_control": true}',
 '{"tools": ["analyze_campaigns", "propose_optimizations", "generate_reports"], "platforms": []}',
 '{"rate_limit": 50, "token_budget": 100000, "max_outputs_per_day": 20}',
 '{}', 'low'),

('SMB Starter Agent', 'Simple draft, schedule recommendation, and brand-safe social posts for small teams.', 'content', 'draft_only',
 '{"governed_defaults": true, "no_unsafe_auto_publish": true}',
 '{"tools": ["draft_posts", "recommend_schedule", "generate_captions"], "platforms": ["facebook", "instagram", "linkedin", "twitter"]}',
 '{"rate_limit": 30, "token_budget": 50000, "max_outputs_per_day": 15}',
 '{"campaign_owner": "approval"}', 'medium'),

('Enterprise Governance Agent', 'Cross-brand policy review, evidence bundling, and risk reporting.', 'governance', 'read_only',
 '{"restricted_to_governance_roles": true, "full_evidence_capture": true}',
 '{"tools": ["cross_brand_policy_review", "bundle_evidence", "risk_reporting"], "platforms": []}',
 '{"rate_limit": 300, "token_budget": 500000, "max_outputs_per_day": 200}',
 '{"governance_admin": "owner", "compliance_reviewer": "reviewer"}', 'high');

-- 5. Agent Deployment: Enhanced with environment separation
ALTER TABLE agent_deployments ADD COLUMN IF NOT EXISTS rollback_evidence_id TEXT;
ALTER TABLE agent_deployments ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(20) NOT NULL DEFAULT 'standard';
ALTER TABLE agent_deployments ADD COLUMN IF NOT EXISTS approval_id UUID REFERENCES agent_approvals(id);

-- 6. Agent Incidents: Enhanced with full lifecycle
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS incident_type VARCHAR(100);
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS affected_channel VARCHAR(50);
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS output_id TEXT;
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS evidence_id TEXT;
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE agent_incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. Agent Governance Gates: Track gate passage status
CREATE TABLE IF NOT EXISTS agent_governance_gates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  gate_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  passed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failed_reason TEXT,
  evidence_ref TEXT,
  reviewed_by UUID REFERENCES domain_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_gates_agent ON agent_governance_gates(agent_id, gate_type);
ALTER TABLE agent_governance_gates ENABLE ROW LEVEL SECURITY;

-- 8. Agent Runtime Controls: Expanded
ALTER TABLE agents ADD COLUMN IF NOT EXISTS environment VARCHAR(20) NOT NULL DEFAULT 'sandbox';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS deployment_status VARCHAR(50) NOT NULL DEFAULT 'not_deployed';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES agent_versions(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS rollback_version_id UUID REFERENCES agent_versions(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS rate_limit_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS budget_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS escalation_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS failure_behavior JSONB NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS compliance_notes TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS success_metrics TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS prohibited_outcomes TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES agent_templates(id);

-- 9. Agent events: Expanded metadata
ALTER TABLE agent_events ADD COLUMN IF NOT EXISTS object_version UUID;
ALTER TABLE agent_events ADD COLUMN IF NOT EXISTS decision VARCHAR(50);
ALTER TABLE agent_events ADD COLUMN IF NOT EXISTS input_hash TEXT;
ALTER TABLE agent_events ADD COLUMN IF NOT EXISTS output_hash TEXT;

-- 10. Agent evidence bundles linkage
CREATE TABLE IF NOT EXISTS agent_evidence_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  actor_id UUID REFERENCES domain_users(id),
  object_version UUID,
  decision VARCHAR(50),
  reason TEXT,
  input_hash TEXT,
  output_hash TEXT,
  model_id TEXT,
  prompt_version TEXT,
  knowledge_snapshot TEXT,
  policy_results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_evidence_agent ON agent_evidence_records(agent_id, created_at DESC);
ALTER TABLE agent_evidence_records ENABLE ROW LEVEL SECURITY;

SELECT 'Migration 09 — Agent Studio Complete Schema applied successfully' AS status;
