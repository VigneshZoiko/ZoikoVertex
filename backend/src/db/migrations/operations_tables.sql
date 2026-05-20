-- Agent Operations Database Migration
-- Run this SQL against your Supabase database to create required tables
-- v2.0 — adds policy_results, runtime_control_actions, agent_version

-- Agent Runs table
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  workspace_id UUID NOT NULL,
  brand_id UUID,
  environment VARCHAR(50) DEFAULT 'production',
  agent_id UUID NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  agent_type VARCHAR(100),
  agent_version VARCHAR(50),
  workflow_id UUID,
  workflow_name VARCHAR(255),
  workflow_version VARCHAR(50),
  task_id UUID,
  task_objective TEXT,
  status VARCHAR(50) DEFAULT 'QUEUED',
  severity VARCHAR(50) DEFAULT 'normal',
  owner_id UUID,
  owner_name VARCHAR(255),
  priority INTEGER DEFAULT 5,
  previous_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_at TIMESTAMP WITH TIME ZONE,
  last_event_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  policy_result VARCHAR(50),
  evidence_status VARCHAR(50) DEFAULT 'pending',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Run Events table
CREATE TABLE IF NOT EXISTS run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  actor_type VARCHAR(50),
  actor_id UUID,
  actor_name VARCHAR(255),
  previous_state VARCHAR(50),
  new_state VARCHAR(50) NOT NULL,
  reason TEXT,
  payload_ref TEXT,
  correlation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy Results table
CREATE TABLE IF NOT EXISTS policy_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL,
  policy_version VARCHAR(50),
  outcome VARCHAR(50) NOT NULL,
  severity VARCHAR(50) DEFAULT 'info',
  failed_rule TEXT,
  affected_output_ref TEXT,
  remediation_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Runtime Control Actions table
CREATE TABLE IF NOT EXISTS runtime_control_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  requested_by UUID NOT NULL,
  approved_by UUID,
  reason TEXT,
  impact_scope TEXT,
  result VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queue Items table
CREATE TABLE IF NOT EXISTS queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  queue_type VARCHAR(100) NOT NULL,
  priority INTEGER DEFAULT 5,
  assignee_id UUID,
  assignee_name VARCHAR(255),
  team_id UUID,
  due_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'PENDING',
  claimed_by UUID,
  claimed_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  severity VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  owner_id UUID,
  owner_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'OPEN',
  created_by UUID NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_at TIMESTAMP WITH TIME ZONE,
  root_cause TEXT,
  remediation TEXT,
  closed_by UUID,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Evidence Bundles table
CREATE TABLE IF NOT EXISTS evidence_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  hash VARCHAR(255),
  locked_at TIMESTAMP WITH TIME ZONE,
  exported_by UUID,
  exported_at TIMESTAMP WITH TIME ZONE,
  export_reason TEXT,
  storage_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant ON agent_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON agent_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_run_events_run ON run_events(run_id);
CREATE INDEX IF NOT EXISTS idx_run_events_event_type ON run_events(event_type);
CREATE INDEX IF NOT EXISTS idx_policy_results_run ON policy_results(run_id);
CREATE INDEX IF NOT EXISTS idx_runtime_control_actions_run ON runtime_control_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_queue_items_workspace ON queue_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);
CREATE INDEX IF NOT EXISTS idx_queue_items_queue_type ON queue_items(queue_type);
CREATE INDEX IF NOT EXISTS idx_incidents_workspace ON incidents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_evidence_bundles_workspace ON evidence_bundles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_evidence_bundles_run ON evidence_bundles(run_id);

-- Enable RLS
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_control_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_bundles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust as needed for your setup)
CREATE POLICY "Agent runs can be viewed by workspace members" ON agent_runs
  FOR SELECT USING (true);
CREATE POLICY "Run events can be viewed by workspace members" ON run_events
  FOR SELECT USING (true);
CREATE POLICY "Policy results can be viewed by workspace members" ON policy_results
  FOR SELECT USING (true);
CREATE POLICY "Runtime control actions can be viewed by workspace members" ON runtime_control_actions
  FOR SELECT USING (true);
CREATE POLICY "Queue items can be viewed by workspace members" ON queue_items
  FOR SELECT USING (true);
CREATE POLICY "Incidents can be viewed by workspace members" ON incidents
  FOR SELECT USING (true);
CREATE POLICY "Evidence bundles can be viewed by workspace members" ON evidence_bundles
  FOR SELECT USING (true);
