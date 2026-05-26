-- Approval Rules — Accountability Layer Module 2
-- Approval policy engine interface — defines when approval is required,
-- who must approve, in what order, what blocks approval, and post-decision behavior.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Approval Rules
CREATE TABLE IF NOT EXISTS public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_owner_id UUID NOT NULL,
  rule_priority INTEGER NOT NULL DEFAULT 1000,
  rule_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (rule_status IN (
    'DRAFT', 'NEEDS_REVIEW', 'READY_TO_PUBLISH', 'ACTIVE',
    'ACTIVE_WITH_DRAFT_CHANGES', 'DISABLED', 'ARCHIVED', 'CONFLICT_DETECTED', 'INVALID'
  )),
  risk_classification TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_classification IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  active_version INTEGER NOT NULL DEFAULT 0,
  draft_version INTEGER,
  effective_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]',
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, rule_name)
);

CREATE INDEX IF NOT EXISTS idx_approval_rules_tenant_status ON public.approval_rules(tenant_id, rule_status);
CREATE INDEX IF NOT EXISTS idx_approval_rules_risk ON public.approval_rules(risk_classification);
CREATE INDEX IF NOT EXISTS idx_approval_rules_owner ON public.approval_rules(rule_owner_id);

-- 2. Approval Rule Scopes
CREATE TABLE IF NOT EXISTS public.approval_rule_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  brand_id UUID,
  campaign_id UUID,
  source_module TEXT,
  item_type TEXT,
  platform TEXT,
  jurisdiction TEXT,
  language TEXT,
  audience_segment TEXT,
  department_id UUID,
  team_id UUID,
  user_role TEXT,
  agent_id UUID,
  workflow_id UUID,
  restricted_mode_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_scopes_rule ON public.approval_rule_scopes(approval_rule_id);

-- 3. Approval Rule Conditions
CREATE TABLE IF NOT EXISTS public.approval_rule_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  condition_group_id UUID,
  field_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  value TEXT NOT NULL,
  logical_operator TEXT DEFAULT 'AND' CHECK (logical_operator IN ('AND', 'OR')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_conditions_rule ON public.approval_rule_conditions(approval_rule_id);

-- 4. Approval Rule Validation Prerequisites
CREATE TABLE IF NOT EXISTS public.approval_rule_validation_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  validation_required BOOLEAN NOT NULL DEFAULT true,
  allowed_validation_statuses TEXT[] NOT NULL DEFAULT '{"PASSED","WARNING"}',
  manual_check_required BOOLEAN NOT NULL DEFAULT false,
  failed_blocks_approval BOOLEAN NOT NULL DEFAULT true,
  blocked_always_blocks_approval BOOLEAN NOT NULL DEFAULT true,
  revalidation_required_blocks_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_validation_rule ON public.approval_rule_validation_prerequisites(approval_rule_id);

-- 5. Approval Rule Paths
CREATE TABLE IF NOT EXISTS public.approval_rule_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  path_type TEXT NOT NULL CHECK (path_type IN (
    'SINGLE_APPROVER', 'SEQUENTIAL', 'PARALLEL', 'QUORUM',
    'ROLE_BASED', 'SPECIALIST', 'CONDITIONAL', 'EMERGENCY', 'EXECUTIVE', 'MULTI_STAGE_HYBRID'
  )),
  required_approval_level INTEGER NOT NULL DEFAULT 1 CHECK (required_approval_level BETWEEN 1 AND 5),
  quorum_required BOOLEAN NOT NULL DEFAULT false,
  quorum_count INTEGER,
  allow_conditional_approval BOOLEAN NOT NULL DEFAULT false,
  allow_delegation BOOLEAN NOT NULL DEFAULT true,
  emergency_route_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_paths_rule ON public.approval_rule_paths(approval_rule_id);

-- 6. Approval Rule Stages
CREATE TABLE IF NOT EXISTS public.approval_rule_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_path_id UUID NOT NULL REFERENCES public.approval_rule_paths(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_type TEXT NOT NULL DEFAULT 'APPROVAL' CHECK (stage_type IN (
    'REVIEW', 'VALIDATION', 'APPROVAL', 'GOVERNANCE', 'SPECIALIST', 'FINAL'
  )),
  required_role TEXT,
  required_user_id UUID,
  approver_group_id UUID,
  quorum_count INTEGER,
  fallback_approver_id UUID,
  escalation_target_id UUID,
  sla_minutes INTEGER,
  decision_note_required BOOLEAN NOT NULL DEFAULT false,
  allow_reject BOOLEAN NOT NULL DEFAULT true,
  allow_request_changes BOOLEAN NOT NULL DEFAULT true,
  allow_conditional_approval BOOLEAN NOT NULL DEFAULT false,
  allow_delegation BOOLEAN NOT NULL DEFAULT true,
  self_approval_allowed BOOLEAN NOT NULL DEFAULT true,
  separation_of_duties_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_stages_path ON public.approval_rule_stages(approval_rule_path_id);

-- 7. Approval Rule Escalations
CREATE TABLE IF NOT EXISTS public.approval_rule_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  escalation_trigger TEXT NOT NULL,
  escalation_target_role TEXT,
  escalation_target_user_id UUID,
  max_escalation_count INTEGER NOT NULL DEFAULT 3,
  escalation_notification_channels TEXT[] DEFAULT '{"in_app"}',
  fallback_after_escalation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_escalations_rule ON public.approval_rule_escalations(approval_rule_id);

-- 8. Approval Rule Conflicts
CREATE TABLE IF NOT EXISTS public.approval_rule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN (
    'OVERLAPPING_SCOPE', 'CONTRADICTORY_OUTCOME', 'MISSING_APPROVER',
    'AUTHORITY_GAP', 'CIRCULAR_ESCALATION', 'SLA_GAP',
    'RESTRICTED_MODE_GAP', 'VALIDATION_CONTRADICTION', 'PRIORITY_COLLISION',
    'POST_DECISION_CONFLICT', 'REPLACEMENT_COVERAGE_GAP'
  )),
  conflict_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (conflict_status IN ('OPEN', 'WARNING', 'BLOCKING', 'NEEDS_REVIEW', 'RESOLVED')),
  conflict_summary TEXT,
  blocking BOOLEAN NOT NULL DEFAULT false,
  related_rule_id UUID,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_conflicts_rule ON public.approval_rule_conflicts(approval_rule_id);
CREATE INDEX IF NOT EXISTS idx_approval_rule_conflicts_status ON public.approval_rule_conflicts(conflict_status);

-- 9. Approval Rule Versions
CREATE TABLE IF NOT EXISTS public.approval_rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  configuration_snapshot JSONB NOT NULL DEFAULT '{}',
  change_summary TEXT,
  publish_note TEXT,
  author_id UUID NOT NULL,
  reviewer_id UUID,
  publisher_id UUID,
  effective_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_versions_rule ON public.approval_rule_versions(approval_rule_id);
CREATE INDEX IF NOT EXISTS idx_approval_rule_versions_number ON public.approval_rule_versions(approval_rule_id, version_number);

-- 10. Approval Rule Audit Log
CREATE TABLE IF NOT EXISTS public.approval_rule_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  reason_note TEXT,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_audit_logs_rule ON public.approval_rule_audit_logs(approval_rule_id);
CREATE INDEX IF NOT EXISTS idx_approval_rule_audit_logs_tenant ON public.approval_rule_audit_logs(tenant_id);

-- 11. Approval Rule Simulations
CREATE TABLE IF NOT EXISTS public.approval_rule_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_rule_id UUID NOT NULL REFERENCES public.approval_rules(id) ON DELETE CASCADE,
  simulated_by UUID NOT NULL,
  simulation_input JSONB NOT NULL DEFAULT '{}',
  matched BOOLEAN,
  matched_conditions TEXT[],
  generated_path JSONB,
  generated_sla JSONB,
  generated_escalation JSONB,
  generated_fallback JSONB,
  conflict_warnings TEXT[],
  blocked_reasons TEXT[],
  simulated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_rule_simulations_rule ON public.approval_rule_simulations(approval_rule_id);

-- 12. Row-Level Security
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_validation_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rule_simulations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rules ON public.approval_rules;
  CREATE POLICY tenant_isolation_approval_rules ON public.approval_rules
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_scopes ON public.approval_rule_scopes;
  CREATE POLICY tenant_isolation_approval_rule_scopes ON public.approval_rule_scopes
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_audit_logs ON public.approval_rule_audit_logs;
  CREATE POLICY tenant_isolation_approval_rule_audit_logs ON public.approval_rule_audit_logs
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 13. Event Type Registry
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class) VALUES
  ('approval_rule.created', 'policy_governance', 'Approval Rule Created', 'New approval rule created.', 'low', 'REGULATED'),
  ('approval_rule.edited', 'policy_governance', 'Approval Rule Edited', 'Draft approval rule updated.', 'low', 'REGULATED'),
  ('approval_rule.submitted_for_review', 'policy_governance', 'Rule Submitted for Review', 'Draft rule sent for governance review.', 'medium', 'REGULATED'),
  ('approval_rule.published', 'policy_governance', 'Approval Rule Published', 'Rule published and now enforceable.', 'high', 'REGULATED'),
  ('approval_rule.deactivated', 'policy_governance', 'Approval Rule Deactivated', 'Rule deactivated and no longer enforced.', 'medium', 'REGULATED'),
  ('approval_rule.conflict_detected', 'policy_governance', 'Rule Conflict Detected', 'Conflict detected between rules.', 'high', 'LEGAL_HOLD'),
  ('approval_rule.conflict_resolved', 'policy_governance', 'Rule Conflict Resolved', 'Rule conflict resolved.', 'low', 'REGULATED'),
  ('approval_rule.simulation_run', 'policy_governance', 'Rule Simulation Run', 'Rule simulation executed.', 'low', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;

-- 14. Seed default rules
WITH rule1 AS (
  INSERT INTO public.approval_rules (id, tenant_id, workspace_id, rule_name, rule_description, rule_owner_id, rule_priority, rule_status, risk_classification, active_version, created_by, updated_by)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'EU High-Risk Financial Protocol',
    'Approval path for high-risk financial content targeting EU markets. Requires management, compliance, legal, and admin approval.',
    '00000000-0000-0000-0000-000000000000', 100, 'ACTIVE', 'HIGH', 1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
  ON CONFLICT (tenant_id, rule_name) DO NOTHING
  RETURNING id
)
INSERT INTO public.approval_rule_scopes (approval_rule_id, tenant_id, workspace_id, jurisdiction, source_module, item_type) VALUES
  ((SELECT id FROM rule1), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'EU', 'Media Engine', 'compliance-sensitive_item');

WITH rule1_path AS (
  INSERT INTO public.approval_rule_paths (approval_rule_id, path_type, required_approval_level, allow_conditional_approval)
  SELECT id, 'SEQUENTIAL', 3, false FROM public.approval_rules WHERE rule_name = 'EU High-Risk Financial Protocol' LIMIT 1
  RETURNING id
)
INSERT INTO public.approval_rule_stages (approval_rule_path_id, stage_name, stage_order, stage_type, required_role, sla_minutes, decision_note_required) VALUES
  ((SELECT id FROM rule1_path), 'Manager Review', 1, 'REVIEW', 'MANAGER', 240, false),
  ((SELECT id FROM rule1_path), 'Compliance Check', 2, 'GOVERNANCE', 'COMPLIANCE_REVIEWER', 480, true),
  ((SELECT id FROM rule1_path), 'Legal Review', 3, 'SPECIALIST', 'LEGAL_REVIEWER', 720, true),
  ((SELECT id FROM rule1_path), 'Final Authorization', 4, 'FINAL', 'ADMIN', 240, true);

WITH rule2 AS (
  INSERT INTO public.approval_rules (id, tenant_id, workspace_id, rule_name, rule_description, rule_owner_id, rule_priority, rule_status, risk_classification, active_version, created_by, updated_by)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Global Instagram Creative Flow',
    'Standard approval for Instagram creative content. Requires creative director and manager approval.',
    '00000000-0000-0000-0000-000000000000', 500, 'ACTIVE', 'LOW', 1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
  ON CONFLICT (tenant_id, rule_name) DO NOTHING
  RETURNING id
)
INSERT INTO public.approval_rule_scopes (approval_rule_id, tenant_id, workspace_id, platform, source_module, item_type) VALUES
  ((SELECT id FROM rule2), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Instagram', 'Media Engine', 'social_post');

WITH rule2_path AS (
  INSERT INTO public.approval_rule_paths (approval_rule_id, path_type, required_approval_level, allow_conditional_approval)
  SELECT id, 'SEQUENTIAL', 1, true FROM public.approval_rules WHERE rule_name = 'Global Instagram Creative Flow' LIMIT 1
  RETURNING id
)
INSERT INTO public.approval_rule_stages (approval_rule_path_id, stage_name, stage_order, stage_type, required_role, sla_minutes) VALUES
  ((SELECT id FROM rule2_path), 'Creative Direction', 1, 'REVIEW', 'CREATIVE_DIR', 120),
  ((SELECT id FROM rule2_path), 'Manager Approval', 2, 'APPROVAL', 'MANAGER', 120);

WITH rule3 AS (
  INSERT INTO public.approval_rules (id, tenant_id, workspace_id, rule_name, rule_description, rule_owner_id, rule_priority, rule_status, risk_classification, active_version, created_by, updated_by)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Standard X/Twitter Operations',
    'Low-risk default approval for X/Twitter content. Single manager approval.',
    '00000000-0000-0000-0000-000000000000', 900, 'ACTIVE', 'LOW', 1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
  ON CONFLICT (tenant_id, rule_name) DO NOTHING
  RETURNING id
)
INSERT INTO public.approval_rule_scopes (approval_rule_id, tenant_id, workspace_id, platform, source_module) VALUES
  ((SELECT id FROM rule3), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'X (Twitter)', 'Media Engine');

WITH rule3_path AS (
  INSERT INTO public.approval_rule_paths (approval_rule_id, path_type, required_approval_level)
  SELECT id, 'SINGLE_APPROVER', 1 FROM public.approval_rules WHERE rule_name = 'Standard X/Twitter Operations' LIMIT 1
  RETURNING id
)
INSERT INTO public.approval_rule_stages (approval_rule_path_id, stage_name, stage_order, stage_type, required_role, sla_minutes) VALUES
  ((SELECT id FROM rule3_path), 'Manager Approval', 1, 'APPROVAL', 'MANAGER', 60);

WITH rule4 AS (
  INSERT INTO public.approval_rules (id, tenant_id, workspace_id, rule_name, rule_description, rule_owner_id, rule_priority, rule_status, risk_classification, active_version, created_by, updated_by)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'APAC Market Entry Campaign',
    'Multi-stage approval for emerging market campaigns in APAC region.',
    '00000000-0000-0000-0000-000000000000', 300, 'ACTIVE', 'MEDIUM', 1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
  ON CONFLICT (tenant_id, rule_name) DO NOTHING
  RETURNING id
)
INSERT INTO public.approval_rule_scopes (approval_rule_id, tenant_id, workspace_id, jurisdiction, source_module) VALUES
  ((SELECT id FROM rule4), '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'APAC', 'Campaigns');

WITH rule4_path AS (
  INSERT INTO public.approval_rule_paths (approval_rule_id, path_type, required_approval_level)
  SELECT id, 'SEQUENTIAL', 2 FROM public.approval_rules WHERE rule_name = 'APAC Market Entry Campaign' LIMIT 1
  RETURNING id
)
INSERT INTO public.approval_rule_stages (approval_rule_path_id, stage_name, stage_order, stage_type, required_role, sla_minutes) VALUES
  ((SELECT id FROM rule4_path), 'Manager Review', 1, 'REVIEW', 'MANAGER', 240),
  ((SELECT id FROM rule4_path), 'Admin Approval', 2, 'APPROVAL', 'ADMIN', 240);
