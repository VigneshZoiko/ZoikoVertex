-- Quality Audit — Accountability Layer Module 3
-- Quality assurance command center with scorecards, defects, corrective actions, and evidence preservation

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Quality Audit Items
CREATE TABLE IF NOT EXISTS public.quality_audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  source_module TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'social_post', 'inbox_reply', 'campaign_asset', 'agent_action',
    'workflow_output', 'approval_decision', 'validation_override',
    'escalation_outcome', 'published_content_check', 'sampled_item'
  )),
  title TEXT NOT NULL,
  campaign_id TEXT,
  platform TEXT,
  original_status TEXT,
  audit_status TEXT NOT NULL DEFAULT 'AUDIT_PENDING' CHECK (audit_status IN (
    'AUDIT_PENDING', 'IN_AUDIT', 'PASSED', 'FAILED', 'NEEDS_CORRECTION',
    'CORRECTIVE_ACTION_OPEN', 'CORRECTIVE_ACTION_COMPLETE', 'ESCALATED',
    'CLOSED', 'ARCHIVED'
  )),
  risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  quality_score DECIMAL(5,2),
  score_band TEXT GENERATED ALWAYS AS (
    CASE
      WHEN quality_score IS NULL THEN NULL
      WHEN quality_score >= 90 THEN 'EXCELLENT'
      WHEN quality_score >= 75 THEN 'ACCEPTABLE'
      WHEN quality_score >= 60 THEN 'NEEDS_IMPROVEMENT'
      WHEN quality_score >= 40 THEN 'POOR'
      ELSE 'CRITICAL_FAILURE'
    END
  ) STORED,
  defect_count INTEGER NOT NULL DEFAULT 0,
  highest_defect_severity TEXT CHECK (highest_defect_severity IN ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL')),
  assigned_auditor UUID,
  original_reviewer TEXT,
  agent_id TEXT,
  content_snapshot JSONB DEFAULT '{}',
  ai_draft TEXT,
  human_edited_version TEXT,
  approved_version TEXT,
  published_version TEXT,
  validation_results JSONB DEFAULT '{}',
  approval_history JSONB DEFAULT '{}',
  published_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
  sampled_by UUID,
  sample_reason TEXT,
  published_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  audit_due_at TIMESTAMPTZ,
  audit_started_at TIMESTAMPTZ,
  audit_completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_audit_items_tenant_status ON public.quality_audit_items(tenant_id, audit_status);
CREATE INDEX IF NOT EXISTS idx_quality_audit_items_assigned_auditor ON public.quality_audit_items(assigned_auditor) WHERE assigned_auditor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quality_audit_items_risk_level ON public.quality_audit_items(risk_level);
CREATE INDEX IF NOT EXISTS idx_quality_audit_items_score ON public.quality_audit_items(quality_score);
CREATE INDEX IF NOT EXISTS idx_quality_audit_items_defect_count ON public.quality_audit_items(defect_count DESC);
CREATE INDEX IF NOT EXISTS idx_quality_audit_items_type ON public.quality_audit_items(item_type);
CREATE INDEX IF NOT EXISTS idx_quality_audit_items_source_module ON public.quality_audit_items(source_module);
CREATE INDEX IF NOT EXISTS idx_quality_audit_items_campaign ON public.quality_audit_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_items_published_mismatch ON public.quality_audit_items(published_mismatch) WHERE published_mismatch = TRUE;

-- 2. Quality Audit Scorecards
CREATE TABLE IF NOT EXISTS public.quality_audit_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_item_id UUID NOT NULL REFERENCES public.quality_audit_items(id) ON DELETE CASCADE,
  accuracy_score INTEGER NOT NULL CHECK (accuracy_score >= 0 AND accuracy_score <= 5),
  brand_voice_score INTEGER NOT NULL CHECK (brand_voice_score >= 0 AND brand_voice_score <= 5),
  compliance_readiness_score INTEGER NOT NULL CHECK (compliance_readiness_score >= 0 AND compliance_readiness_score <= 5),
  source_grounding_score INTEGER NOT NULL CHECK (source_grounding_score >= 0 AND source_grounding_score <= 5),
  platform_fit_score INTEGER NOT NULL CHECK (platform_fit_score >= 0 AND platform_fit_score <= 5),
  tone_clarity_score INTEGER NOT NULL CHECK (tone_clarity_score >= 0 AND tone_clarity_score <= 5),
  audience_relevance_score INTEGER NOT NULL CHECK (audience_relevance_score >= 0 AND audience_relevance_score <= 5),
  review_integrity_score INTEGER NOT NULL CHECK (review_integrity_score >= 0 AND review_integrity_score <= 5),
  publication_consistency_score INTEGER NOT NULL CHECK (publication_consistency_score >= 0 AND publication_consistency_score <= 5),
  overall_score DECIMAL(5,2) GENERATED ALWAYS AS (
    ROUND(
      (accuracy_score + brand_voice_score + compliance_readiness_score +
       source_grounding_score + platform_fit_score + tone_clarity_score +
       audience_relevance_score + review_integrity_score + publication_consistency_score)::DECIMAL / 45 * 100,
      2
    )
  ) STORED,
  score_override DECIMAL(5,2),
  score_override_reason TEXT,
  score_override_note TEXT,
  score_overridden_by UUID,
  score_overridden_at TIMESTAMPTZ,
  scored_by UUID NOT NULL,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_audit_scorecards_item ON public.quality_audit_scorecards(audit_item_id);

-- 3. Quality Audit Defects
CREATE TABLE IF NOT EXISTS public.quality_audit_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_item_id UUID NOT NULL REFERENCES public.quality_audit_items(id) ON DELETE CASCADE,
  defect_category TEXT NOT NULL CHECK (defect_category IN (
    'accuracy_issue', 'brand_voice_issue', 'compliance_issue', 'unsupported_claim',
    'source_grounding_issue', 'tone_issue', 'platform_formatting_issue',
    'audience_mismatch', 'approval_path_issue', 'published_version_mismatch',
    'missing_evidence', 'poor_ai_output', 'human_edit_introduced_issue',
    'reviewer_missed_issue', 'escalation_mishandled', 'other'
  )),
  defect_severity TEXT NOT NULL CHECK (defect_severity IN ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL')),
  defect_description TEXT NOT NULL,
  evidence_reference TEXT,
  responsible_source TEXT,
  corrective_action_required BOOLEAN NOT NULL DEFAULT FALSE,
  owner UUID,
  due_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quality_audit_defects_item ON public.quality_audit_defects(audit_item_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_defects_severity ON public.quality_audit_defects(defect_severity);
CREATE INDEX IF NOT EXISTS idx_quality_audit_defects_category ON public.quality_audit_defects(defect_category);
CREATE INDEX IF NOT EXISTS idx_quality_audit_defects_owner ON public.quality_audit_defects(owner) WHERE owner IS NOT NULL;

-- 4. Quality Audit Corrective Actions
CREATE TABLE IF NOT EXISTS public.quality_audit_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_item_id UUID NOT NULL REFERENCES public.quality_audit_items(id) ON DELETE CASCADE,
  defect_id UUID REFERENCES public.quality_audit_defects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  owner UUID,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  required_action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'ESCALATED', 'CLOSED'
  )),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_audit_corrective_actions_item ON public.quality_audit_corrective_actions(audit_item_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_corrective_actions_status ON public.quality_audit_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_quality_audit_corrective_actions_owner ON public.quality_audit_corrective_actions(owner) WHERE owner IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quality_audit_corrective_actions_due ON public.quality_audit_corrective_actions(due_at) WHERE due_at IS NOT NULL;

-- 5. Quality Audit Notes
CREATE TABLE IF NOT EXISTS public.quality_audit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_item_id UUID NOT NULL REFERENCES public.quality_audit_items(id) ON DELETE CASCADE,
  parent_note_id UUID REFERENCES public.quality_audit_notes(id) ON DELETE CASCADE,
  note_body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (visibility IN ('INTERNAL')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_audit_notes_item ON public.quality_audit_notes(audit_item_id);

-- 6. Quality Audit Evidence
CREATE TABLE IF NOT EXISTS public.quality_audit_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_item_id UUID NOT NULL REFERENCES public.quality_audit_items(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'source_snapshot', 'ai_draft', 'human_edits', 'approved_version',
    'published_version', 'validation_results', 'approval_history',
    'policy_flag', 'platform_proof', 'audit_decision', 'defect_record',
    'corrective_action', 'audit_export', 'supplemental'
  )),
  evidence_reference TEXT NOT NULL,
  source_module TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_audit_evidence_item ON public.quality_audit_evidence(audit_item_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_evidence_type ON public.quality_audit_evidence(evidence_type);

-- 7. Quality Audit Log
CREATE TABLE IF NOT EXISTS public.quality_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  audit_item_id UUID NOT NULL REFERENCES public.quality_audit_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  payload JSONB DEFAULT '{}',
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_audit_log_tenant ON public.quality_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_log_item ON public.quality_audit_log(audit_item_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_log_action ON public.quality_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_quality_audit_log_performed_at ON public.quality_audit_log(performed_at DESC);

-- 8. Quality Audit Callbacks
CREATE TABLE IF NOT EXISTS public.quality_audit_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_item_id UUID NOT NULL REFERENCES public.quality_audit_items(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_quality_audit_callbacks_item ON public.quality_audit_callbacks(audit_item_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_callbacks_status ON public.quality_audit_callbacks(callback_status);

-- Enable RLS
ALTER TABLE public.quality_audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audit_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audit_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audit_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audit_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audit_callbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: tenant isolation
DROP POLICY IF EXISTS tenant_isolation ON public.quality_audit_items;
CREATE POLICY tenant_isolation ON public.quality_audit_items FOR ALL USING (tenant_id = current_setting('app.tenant_id')::UUID);

DROP POLICY IF EXISTS tenant_isolation ON public.quality_audit_scorecards;
CREATE POLICY tenant_isolation ON public.quality_audit_scorecards FOR ALL USING (audit_item_id IN (SELECT id FROM public.quality_audit_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));

DROP POLICY IF EXISTS tenant_isolation ON public.quality_audit_defects;
CREATE POLICY tenant_isolation ON public.quality_audit_defects FOR ALL USING (audit_item_id IN (SELECT id FROM public.quality_audit_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));

DROP POLICY IF EXISTS tenant_isolation ON public.quality_audit_corrective_actions;
CREATE POLICY tenant_isolation ON public.quality_audit_corrective_actions FOR ALL USING (audit_item_id IN (SELECT id FROM public.quality_audit_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));

DROP POLICY IF EXISTS tenant_isolation ON public.quality_audit_notes;
CREATE POLICY tenant_isolation ON public.quality_audit_notes FOR ALL USING (audit_item_id IN (SELECT id FROM public.quality_audit_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));

DROP POLICY IF EXISTS tenant_isolation ON public.quality_audit_evidence;
CREATE POLICY tenant_isolation ON public.quality_audit_evidence FOR ALL USING (audit_item_id IN (SELECT id FROM public.quality_audit_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));

DROP POLICY IF EXISTS tenant_isolation ON public.quality_audit_log;
CREATE POLICY tenant_isolation ON public.quality_audit_log FOR ALL USING (tenant_id = current_setting('app.tenant_id')::UUID);

DROP POLICY IF EXISTS tenant_isolation ON public.quality_audit_callbacks;
CREATE POLICY tenant_isolation ON public.quality_audit_callbacks FOR ALL USING (audit_item_id IN (SELECT id FROM public.quality_audit_items WHERE tenant_id = current_setting('app.tenant_id')::UUID));

-- Extend event_type_registry category constraint to include new modules
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
  ('quality_audit.item.created', 'quality_audit', 'Audit Item Created', 'Audit item created.', 'low', 'REGULATED'),
  ('quality_audit.item.assigned', 'quality_audit', 'Auditor Assigned', 'Auditor assigned to audit item.', 'low', 'REGULATED'),
  ('quality_audit.item.started', 'quality_audit', 'Audit Started', 'Audit started.', 'low', 'REGULATED'),
  ('quality_audit.item.passed', 'quality_audit', 'Audit Passed', 'Audit passed.', 'medium', 'REGULATED'),
  ('quality_audit.item.failed', 'quality_audit', 'Audit Failed', 'Audit failed.', 'high', 'REGULATED'),
  ('quality_audit.item.needs_correction', 'quality_audit', 'Needs Correction', 'Item marked needs correction.', 'medium', 'REGULATED'),
  ('quality_audit.item.escalated', 'quality_audit', 'Audit Escalated', 'Audit escalated.', 'high', 'REGULATED'),
  ('quality_audit.item.closed', 'quality_audit', 'Audit Closed', 'Audit closed.', 'low', 'REGULATED'),
  ('quality_audit.scorecard.updated', 'quality_audit', 'Scorecard Updated', 'Scorecard updated.', 'low', 'REGULATED'),
  ('quality_audit.scorecard.overridden', 'quality_audit', 'Score Override Applied', 'Score override applied.', 'high', 'LEGAL_HOLD'),
  ('quality_audit.defect.created', 'quality_audit', 'Defect Recorded', 'Defect recorded.', 'medium', 'REGULATED'),
  ('quality_audit.defect.resolved', 'quality_audit', 'Defect Resolved', 'Defect resolved.', 'low', 'REGULATED'),
  ('quality_audit.corrective_action.created', 'quality_audit', 'Corrective Action Created', 'Corrective action created.', 'medium', 'REGULATED'),
  ('quality_audit.corrective_action.updated', 'quality_audit', 'Corrective Action Updated', 'Corrective action updated.', 'low', 'REGULATED'),
  ('quality_audit.note.added', 'quality_audit', 'Audit Note Added', 'Audit note added.', 'low', 'REGULATED'),
  ('quality_audit.evidence.added', 'quality_audit', 'Evidence Added', 'Evidence added to audit.', 'low', 'REGULATED'),
  ('quality_audit.callback.succeeded', 'quality_audit', 'Callback Succeeded', 'Source module callback succeeded.', 'low', 'REGULATED'),
  ('quality_audit.callback.failed', 'quality_audit', 'Callback Failed', 'Source module callback failed.', 'medium', 'REGULATED'),
   ('quality_audit.callback.retried', 'quality_audit', 'Callback Retried', 'Source module callback retried.', 'low', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;

-- Fix callback_status check constraint to allow COMPLETED (services write COMPLETED, not SUCCEEDED)
DO $$ BEGIN
  ALTER TABLE public.quality_audit_callbacks DROP CONSTRAINT IF EXISTS quality_audit_callbacks_callback_status_check;
  ALTER TABLE public.quality_audit_callbacks ADD CONSTRAINT quality_audit_callbacks_callback_status_check
    CHECK (callback_status IN ('PENDING', 'SUCCEEDED', 'COMPLETED', 'FAILED'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
