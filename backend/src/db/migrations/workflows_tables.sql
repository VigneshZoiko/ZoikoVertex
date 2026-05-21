-- Workflows Database Migration
-- Run this SQL against your Supabase database to create required tables

-- Workflow Templates
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  workspace_id UUID NOT NULL,
  brand_ids UUID[],
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) DEFAULT 'governed',
  status VARCHAR(50) DEFAULT 'Draft',
  risk_level VARCHAR(50) DEFAULT 'medium',
  owner_id UUID,
  owner_name VARCHAR(255),
  business_unit_id UUID,
  platforms VARCHAR(255)[],
  current_version_id UUID,
  active_from TIMESTAMP WITH TIME ZONE,
  retired_at TIMESTAMP WITH TIME ZONE,
  total_runs INTEGER DEFAULT 0,
  active_runs_count INTEGER DEFAULT 0,
  health VARCHAR(50) DEFAULT 'Healthy',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Versions
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  state VARCHAR(50) DEFAULT 'Draft',
  change_summary TEXT,
  change_reason TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID,
  activated_at TIMESTAMP WITH TIME ZONE,
  rollback_from UUID,
  rollback_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Steps
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  step_type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_role VARCHAR(100),
  owner_user_id UUID,
  sequence INTEGER NOT NULL,
  conditions JSONB,
  input_schema JSONB,
  output_schema JSONB,
  required_policy_checks VARCHAR(255)[],
  required_evidence VARCHAR(255)[],
  sla_minutes INTEGER,
  fallback_owner UUID,
  escalation_rule JSONB,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Edges
CREATE TABLE IF NOT EXISTS workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  from_step_id UUID NOT NULL,
  to_step_id UUID NOT NULL,
  condition JSONB,
  default_path BOOLEAN DEFAULT false,
  fail_safe_path BOOLEAN DEFAULT false,
  branch_label VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Instances
CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  version_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'QUEUED',
  trigger_type VARCHAR(100),
  trigger_source TEXT,
  started_by UUID,
  current_step_id UUID,
  priority INTEGER DEFAULT 5,
  risk_score INTEGER DEFAULT 0,
  confidence_score INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  evidence_bundle_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step Runs
CREATE TABLE IF NOT EXISTS step_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  input_ref TEXT,
  output_ref TEXT,
  actor_type VARCHAR(50),
  actor_id UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_code VARCHAR(100),
  reason_code VARCHAR(100),
  policy_result_id UUID,
  evidence_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval Records
CREATE TABLE IF NOT EXISTS approval_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES workflow_instances(id) ON DELETE SET NULL,
  step_id UUID,
  required_role VARCHAR(100) NOT NULL,
  approver_id UUID,
  approver_name VARCHAR(255),
  decision VARCHAR(50),
  decision_reason TEXT,
  edited_output_ref TEXT,
  requested_changes TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  evidence_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulation Runs
CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL,
  scenario_name VARCHAR(255),
  sample_input_ref TEXT,
  result VARCHAR(50),
  warnings JSONB,
  blocks JSONB,
  failed_steps JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evidence_ref TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_templates_workspace ON workflow_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_status ON workflow_templates(status);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_version ON workflow_steps(version_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_version ON workflow_edges(version_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow ON workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_step_runs_instance ON step_runs(instance_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_instance ON approval_records(instance_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_version ON simulation_runs(workflow_version_id);

-- Enable RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workflow templates can be viewed by workspace members" ON workflow_templates FOR SELECT USING (true);
CREATE POLICY "Workflow versions can be viewed by workspace members" ON workflow_versions FOR SELECT USING (true);
CREATE POLICY "Workflow steps can be viewed by workspace members" ON workflow_steps FOR SELECT USING (true);
CREATE POLICY "Workflow edges can be viewed by workspace members" ON workflow_edges FOR SELECT USING (true);
CREATE POLICY "Workflow instances can be viewed by workspace members" ON workflow_instances FOR SELECT USING (true);
CREATE POLICY "Step runs can be viewed by workspace members" ON step_runs FOR SELECT USING (true);
CREATE POLICY "Approval records can be viewed by workspace members" ON approval_records FOR SELECT USING (true);
CREATE POLICY "Simulation runs can be viewed by workspace members" ON simulation_runs FOR SELECT USING (true);
