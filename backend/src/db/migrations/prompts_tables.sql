-- Prompts Database Migration
-- Run this SQL against your Supabase database to create required tables

-- Prompts Registry
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  prompt_type VARCHAR(100) DEFAULT 'system',
  owner_id UUID,
  owner_name VARCHAR(255),
  risk_tier VARCHAR(50) DEFAULT 'TIER_2_MEDIUM',
  status VARCHAR(50) DEFAULT 'DRAFT',
  current_version_id UUID,
  linked_agent VARCHAR(255),
  linked_agent_id UUID,
  linked_workflow VARCHAR(255),
  linked_workflow_id UUID,
  knowledge_sources TEXT[],
  tools_permitted TEXT[],
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Versions
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  body TEXT NOT NULL,
  body_hash VARCHAR(255) NOT NULL,
  variables_json JSONB,
  guardrails_json JSONB,
  model_routes_json JSONB,
  change_summary TEXT,
  created_by UUID,
  immutable BOOLEAN DEFAULT false,
  immutable_after TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Bindings (agent, workflow, channel, brand, locale, environment)
CREATE TABLE IF NOT EXISTS prompt_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
  agent_id UUID,
  workflow_id UUID,
  workflow_node_id UUID,
  channel_id UUID,
  brand_id UUID,
  locale VARCHAR(50),
  environment VARCHAR(50) DEFAULT 'staging',
  effective_from TIMESTAMP WITH TIME ZONE,
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Knowledge Bindings
CREATE TABLE IF NOT EXISTS prompt_knowledge_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
  kb_id UUID,
  collection_id UUID,
  retrieval_mode VARCHAR(50) DEFAULT 'optional',
  freshness_rule VARCHAR(100),
  citation_required BOOLEAN DEFAULT false,
  source_priority VARCHAR(50) DEFAULT 'authority',
  restricted_sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Tool Permissions
CREATE TABLE IF NOT EXISTS prompt_tool_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
  tool_id UUID,
  tool_name VARCHAR(255),
  allowed_actions TEXT[],
  conditions_json JSONB,
  approval_required BOOLEAN DEFAULT false,
  runtime_policy_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Test Suites
CREATE TABLE IF NOT EXISTS prompt_test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  suite_name VARCHAR(255) NOT NULL,
  suite_version INTEGER DEFAULT 1,
  required_for_risk_tier VARCHAR(50)[],
  scenario_count INTEGER DEFAULT 0,
  evaluator_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Test Runs
CREATE TABLE IF NOT EXISTS prompt_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
  suite_id UUID NOT NULL REFERENCES prompt_test_suites(id) ON DELETE CASCADE,
  environment VARCHAR(50) DEFAULT 'draft',
  pass_fail VARCHAR(10) DEFAULT 'PENDING',
  score_summary JSONB,
  run_metadata JSONB,
  output_artifacts_uri TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Approvals
CREATE TABLE IF NOT EXISTS prompt_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
  reviewer_id UUID,
  reviewer_role VARCHAR(100) NOT NULL,
  decision VARCHAR(50) NOT NULL,
  decision_reason TEXT,
  conditions TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  evidence_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Deployments
CREATE TABLE IF NOT EXISTS prompt_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
  environment VARCHAR(50) NOT NULL,
  scope_json JSONB,
  deployed_by UUID,
  release_note TEXT,
  rollback_to_version_id UUID,
  evidence_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Runtime Traces
CREATE TABLE IF NOT EXISTS prompt_runtime_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID,
  prompt_version_id UUID,
  model_id VARCHAR(255),
  input_hash VARCHAR(255),
  output_hash VARCHAR(255),
  policy_result VARCHAR(50),
  tool_calls JSONB,
  kb_sources TEXT[],
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompts_workspace ON prompts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_risk_tier ON prompts(risk_tier);
CREATE INDEX IF NOT EXISTS idx_prompts_type ON prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_bindings_version ON prompt_bindings(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_knowledge_bindings_version ON prompt_knowledge_bindings(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tool_permissions_version ON prompt_tool_permissions(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_suites_prompt ON prompt_test_suites(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_runs_version ON prompt_test_runs(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_approvals_version ON prompt_approvals(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_deployments_version ON prompt_deployments(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_version ON prompt_runtime_traces(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_execution ON prompt_runtime_traces(execution_id);

-- Enable RLS
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_knowledge_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_tool_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_runtime_traces ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Prompts can be viewed by workspace members" ON prompts FOR SELECT USING (true);
CREATE POLICY "Prompt versions can be viewed by workspace members" ON prompt_versions FOR SELECT USING (true);
CREATE POLICY "Prompt bindings can be viewed by workspace members" ON prompt_bindings FOR SELECT USING (true);
CREATE POLICY "Knowledge bindings can be viewed by workspace members" ON prompt_knowledge_bindings FOR SELECT USING (true);
CREATE POLICY "Tool permissions can be viewed by workspace members" ON prompt_tool_permissions FOR SELECT USING (true);
CREATE POLICY "Test suites can be viewed by workspace members" ON prompt_test_suites FOR SELECT USING (true);
CREATE POLICY "Test runs can be viewed by workspace members" ON prompt_test_runs FOR SELECT USING (true);
CREATE POLICY "Approvals can be viewed by workspace members" ON prompt_approvals FOR SELECT USING (true);
CREATE POLICY "Deployments can be viewed by workspace members" ON prompt_deployments FOR SELECT USING (true);
CREATE POLICY "Runtime traces can be viewed by workspace members" ON prompt_runtime_traces FOR SELECT USING (true);
