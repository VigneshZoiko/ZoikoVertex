-- Validation Desk — Accountability Layer Module 5
-- Rule-checking and readiness-validation center for content, replies, campaigns, agent actions, and workflow outputs

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Validation Items
CREATE TABLE IF NOT EXISTS public.validation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  source_module TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'social_post', 'inbox_reply', 'campaign_asset', 'agent_action',
    'workflow_output', 'revision_item', 'escalated_item',
    'approval_bound_item', 'platform_specific_content', 'source_claim_item'
  )),
  title TEXT NOT NULL,
  campaign_id TEXT,
  platform TEXT,
  content_snapshot JSONB DEFAULT '{}',
  content_snapshot_version TEXT,
  validation_status TEXT NOT NULL DEFAULT 'PENDING_VALIDATION' CHECK (validation_status IN (
    'PENDING_VALIDATION', 'IN_VALIDATION', 'PASSED', 'WARNING', 'FAILED',
    'BLOCKED', 'NEEDS_REVISION', 'MANUAL_CHECK_REQUIRED', 'ESCALATION_REQUIRED',
    'OVERRIDE_ELIGIBLE', 'PASSED_WITH_OVERRIDE', 'OVERRIDE_PROHIBITED',
    'REVALIDATION_NEEDED', 'COMPLETED', 'ARCHIVED'
  )),
  highest_severity TEXT CHECK (highest_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  failed_rule_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  blocked_rule_count INTEGER NOT NULL DEFAULT 0,
  manual_check_count INTEGER NOT NULL DEFAULT 0,
  validation_score INTEGER,
  source_grounding_status TEXT CHECK (source_grounding_status IN (
    'GROUNDED', 'PARTIALLY_GROUNDED', 'UNGROUNDED', 'SOURCE_OUTDATED', 'SOURCE_CONFLICT', 'NOT_CHECKED'
  )),
  platform_readiness_status TEXT CHECK (platform_readiness_status IN ('READY', 'ISSUES', 'NOT_READY', 'NOT_CHECKED')),
  approval_readiness_status TEXT CHECK (approval_readiness_status IN (
    'READY_FOR_REVIEW', 'READY_FOR_APPROVAL', 'REVISION_REQUIRED',
    'MANUAL_CHECK_REQUIRED', 'ESCALATION_REQUIRED', 'BLOCKED',
    'OVERRIDE_REQUIRED', 'REVALIDATION_REQUIRED'
  )),
  assigned_validator UUID,
  submitted_by UUID NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  due_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_items_tenant_status ON public.validation_items(tenant_id, validation_status);
CREATE INDEX IF NOT EXISTS idx_validation_items_assigned ON public.validation_items(assigned_validator) WHERE assigned_validator IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_validation_items_risk ON public.validation_items(risk_level);
CREATE INDEX IF NOT EXISTS idx_validation_items_type ON public.validation_items(item_type);
CREATE INDEX IF NOT EXISTS idx_validation_items_source ON public.validation_items(source_module);
CREATE INDEX IF NOT EXISTS idx_validation_items_due ON public.validation_items(due_at) WHERE due_at IS NOT NULL;

-- 2. Validation Runs
CREATE TABLE IF NOT EXISTS public.validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_item_id UUID NOT NULL REFERENCES public.validation_items(id) ON DELETE CASCADE,
  rule_set_id TEXT,
  rule_set_version TEXT,
  validation_engine_version TEXT,
  content_snapshot_version TEXT,
  run_status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (run_status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  run_by UUID NOT NULL,
  result_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_validation_runs_item ON public.validation_runs(validation_item_id);

-- 3. Validation Rule Results
CREATE TABLE IF NOT EXISTS public.validation_rule_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_run_id UUID NOT NULL REFERENCES public.validation_runs(id) ON DELETE CASCADE,
  rule_id TEXT,
  rule_name TEXT NOT NULL,
  rule_category TEXT NOT NULL CHECK (rule_category IN (
    'brand_rules', 'policy_rules', 'compliance_checks', 'source_grounding',
    'platform_readiness', 'claim_safety', 'tone_sensitivity',
    'approval_readiness', 'manual_check'
  )),
  rule_version TEXT,
  rule_set_version TEXT,
  result TEXT NOT NULL CHECK (result IN (
    'PASSED', 'WARNING', 'FAILED', 'BLOCKED', 'NOT_APPLICABLE', 'NOT_RUN',
    'MANUAL_CHECK_REQUIRED', 'RESOLVED', 'OVERRIDDEN'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  explanation TEXT,
  affected_text TEXT,
  recommended_fix TEXT,
  override_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  manual_check_required BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason TEXT,
  overridden_by UUID,
  overridden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_rule_results_run ON public.validation_rule_results(validation_run_id);
CREATE INDEX IF NOT EXISTS idx_validation_rule_results_category ON public.validation_rule_results(rule_category);
CREATE INDEX IF NOT EXISTS idx_validation_rule_results_result ON public.validation_rule_results(result);

-- 4. Source Grounding Results
CREATE TABLE IF NOT EXISTS public.validation_source_grounding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_run_id UUID NOT NULL REFERENCES public.validation_runs(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  source_reference TEXT,
  source_status TEXT CHECK (source_status IN ('VERIFIED', 'PENDING', 'EXPIRED', 'CONFLICTING', 'NOT_FOUND')),
  source_confidence TEXT CHECK (source_confidence IN ('HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED')),
  grounding_status TEXT NOT NULL CHECK (grounding_status IN (
    'GROUNDED', 'PARTIALLY_GROUNDED', 'UNGROUNDED', 'SOURCE_OUTDATED', 'SOURCE_CONFLICT'
  )),
  issue_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_source_grounding_run ON public.validation_source_grounding(validation_run_id);

-- 5. Validation Overrides
CREATE TABLE IF NOT EXISTS public.validation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_item_id UUID NOT NULL REFERENCES public.validation_items(id) ON DELETE CASCADE,
  rule_result_id UUID REFERENCES public.validation_rule_results(id) ON DELETE SET NULL,
  override_reason TEXT NOT NULL,
  risk_acknowledgement TEXT,
  note TEXT,
  overridden_by UUID NOT NULL,
  overridden_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_overrides_item ON public.validation_overrides(validation_item_id);

-- 6. Manual Checks
CREATE TABLE IF NOT EXISTS public.validation_manual_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_item_id UUID NOT NULL REFERENCES public.validation_items(id) ON DELETE CASCADE,
  rule_result_id UUID REFERENCES public.validation_rule_results(id) ON DELETE SET NULL,
  assigned_validator UUID NOT NULL,
  manual_check_result TEXT CHECK (manual_check_result IN (
    'PASSED', 'FAILED', 'NEEDS_REVISION', 'ESCALATION_REQUIRED', 'NOT_APPLICABLE'
  )),
  note TEXT,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_manual_checks_item ON public.validation_manual_checks(validation_item_id);

-- 7. Validator Notes
CREATE TABLE IF NOT EXISTS public.validation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_item_id UUID NOT NULL REFERENCES public.validation_items(id) ON DELETE CASCADE,
  parent_note_id UUID REFERENCES public.validation_notes(id) ON DELETE CASCADE,
  note_body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (visibility IN ('INTERNAL')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_notes_item ON public.validation_notes(validation_item_id);

-- 8. Validation Audit Log
CREATE TABLE IF NOT EXISTS public.validation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  validation_item_id UUID NOT NULL REFERENCES public.validation_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  payload JSONB DEFAULT '{}',
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_audit_log_tenant ON public.validation_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_validation_audit_log_item ON public.validation_audit_log(validation_item_id);
CREATE INDEX IF NOT EXISTS idx_validation_audit_log_action ON public.validation_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_validation_audit_log_time ON public.validation_audit_log(performed_at DESC);

-- 9. Validation Callbacks
CREATE TABLE IF NOT EXISTS public.validation_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_item_id UUID NOT NULL REFERENCES public.validation_items(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  callback_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (callback_status IN ('PENDING', 'SUCCEEDED', 'COMPLETED', 'FAILED')),
  callback_payload JSONB DEFAULT '{}',
  last_attempt_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_callbacks_item ON public.validation_callbacks(validation_item_id);
CREATE INDEX IF NOT EXISTS idx_validation_callbacks_status ON public.validation_callbacks(callback_status);

-- Enable RLS
ALTER TABLE public.validation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_rule_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_source_grounding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_manual_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_callbacks ENABLE ROW LEVEL SECURITY;

-- RLS: tenant isolation
CREATE POLICY tenant_isolation ON public.validation_items FOR ALL USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation ON public.validation_runs FOR ALL USING (validation_item_id IN (SELECT id FROM public.validation_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));
CREATE POLICY tenant_isolation ON public.validation_rule_results FOR ALL USING (validation_run_id IN (SELECT r.id FROM public.validation_runs r JOIN public.validation_items i ON i.id = r.validation_item_id WHERE i.tenant_id = current_setting('app.tenant_id')::UUID));
CREATE POLICY tenant_isolation ON public.validation_source_grounding FOR ALL USING (validation_run_id IN (SELECT r.id FROM public.validation_runs r JOIN public.validation_items i ON i.id = r.validation_item_id WHERE i.tenant_id = current_setting('app.tenant_id')::UUID));
CREATE POLICY tenant_isolation ON public.validation_overrides FOR ALL USING (validation_item_id IN (SELECT id FROM public.validation_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));
CREATE POLICY tenant_isolation ON public.validation_manual_checks FOR ALL USING (validation_item_id IN (SELECT id FROM public.validation_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));
CREATE POLICY tenant_isolation ON public.validation_notes FOR ALL USING (validation_item_id IN (SELECT id FROM public.validation_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));
CREATE POLICY tenant_isolation ON public.validation_audit_log FOR ALL USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation ON public.validation_callbacks FOR ALL USING (validation_item_id IN (SELECT id FROM public.validation_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));

-- Extend event_type_registry category constraint to include validation
ALTER TABLE public.event_type_registry DROP CONSTRAINT IF EXISTS event_type_registry_category_check;
ALTER TABLE public.event_type_registry ADD CONSTRAINT event_type_registry_category_check
  CHECK (category IN (
    'user_identity', 'content_lifecycle', 'ai_agent', 'approval',
    'policy_governance', 'platform_integration', 'evidence_legal', 'system_security',
    'review_queue', 'quality_audit', 'validation'
  ));

-- Event Type Registry
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('validation.item.created', 'validation', 'Validation Item Created', 'Validation item created.', 'low', 'REGULATED'),
  ('validation.item.assigned', 'validation', 'Validator Assigned', 'Validator assigned.', 'low', 'REGULATED'),
  ('validation.run.started', 'validation', 'Validation Run Started', 'Validation run started.', 'low', 'REGULATED'),
  ('validation.run.completed', 'validation', 'Validation Run Completed', 'Validation run completed.', 'low', 'REGULATED'),
  ('validation.item.passed', 'validation', 'Item Passed Validation', 'Item passed validation.', 'medium', 'REGULATED'),
  ('validation.item.warning', 'validation', 'Item Passed With Warnings', 'Item passed with warnings.', 'low', 'REGULATED'),
  ('validation.item.failed', 'validation', 'Item Failed Validation', 'Item failed validation.', 'high', 'REGULATED'),
  ('validation.item.blocked', 'validation', 'Item Blocked By Rule', 'Item blocked by rule.', 'high', 'REGULATED'),
  ('validation.item.revision_requested', 'validation', 'Revision Requested', 'Revision requested.', 'medium', 'REGULATED'),
  ('validation.item.escalated', 'validation', 'Item Escalated', 'Item escalated.', 'high', 'REGULATED'),
  ('validation.override.applied', 'validation', 'Override Applied', 'Validation override applied.', 'critical', 'LEGAL_HOLD'),
  ('validation.manual_check.completed', 'validation', 'Manual Check Completed', 'Manual check completed.', 'low', 'REGULATED'),
  ('validation.item.sent_to_review_queue', 'validation', 'Sent to Review Queue', 'Item sent to Review Queue.', 'low', 'REGULATED'),
  ('validation.item.sent_to_approvals', 'validation', 'Sent to Approvals', 'Item sent to Approvals.', 'low', 'REGULATED'),
  ('validation.note.added', 'validation', 'Validator Note Added', 'Validator note added.', 'low', 'REGULATED'),
  ('validation.callback.succeeded', 'validation', 'Callback Succeeded', 'Source module callback succeeded.', 'low', 'REGULATED'),
  ('validation.callback.failed', 'validation', 'Callback Failed', 'Source module callback failed.', 'medium', 'REGULATED'),
   ('validation.callback.retried', 'validation', 'Callback Retried', 'Source module callback retried.', 'low', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;

-- Fix callback_status check constraint to allow COMPLETED (services write COMPLETED, not SUCCEEDED)
DO $$ BEGIN
  ALTER TABLE public.validation_callbacks DROP CONSTRAINT IF EXISTS validation_callbacks_callback_status_check;
  ALTER TABLE public.validation_callbacks ADD CONSTRAINT validation_callbacks_callback_status_check
    CHECK (callback_status IN ('PENDING', 'SUCCEEDED', 'COMPLETED', 'FAILED'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
