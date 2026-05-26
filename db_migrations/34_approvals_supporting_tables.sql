-- Migration 034: Approval Supporting Tables + Workflow Approval Records
-- Completes the Approvals module schema per Accountability Layer wireframe
-- Adds 7 missing wireframe-specified tables and approval_records for workflow approvals

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- APPROVAL DECISIONS (Wireframe 37.2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_item_id UUID NOT NULL REFERENCES public.approval_items(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL,
  decision approval_decision_value NOT NULL,
  decision_reason TEXT,
  decision_note TEXT,
  condition_text TEXT,
  condition_owner UUID,
  condition_due_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_decisions_item ON public.approval_decisions(approval_item_id);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_approver ON public.approval_decisions(approver_id);

-- ============================================================================
-- APPROVAL PATHS (Wireframe 37.3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_item_id UUID NOT NULL REFERENCES public.approval_items(id) ON DELETE CASCADE,
  path_type approval_path_type NOT NULL,
  current_stage TEXT,
  required_roles TEXT[] NOT NULL DEFAULT '{}',
  required_users UUID[] NOT NULL DEFAULT '{}',
  quorum_required BOOLEAN NOT NULL DEFAULT false,
  quorum_count INTEGER,
  fallback_approver UUID,
  escalation_target UUID,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_paths_item ON public.approval_paths(approval_item_id);

-- ============================================================================
-- APPROVAL STAGES (Wireframe 37.4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_path_id UUID NOT NULL REFERENCES public.approval_paths(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  stage_type TEXT NOT NULL DEFAULT 'APPROVAL' CHECK (stage_type IN (
    'REVIEW', 'VALIDATION', 'APPROVAL', 'GOVERNANCE', 'SPECIALIST', 'FINAL'
  )),
  required_role TEXT,
  required_user UUID,
  assigned_user UUID,
  stage_status approval_stage_status NOT NULL DEFAULT 'PENDING',
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_stages_path ON public.approval_stages(approval_path_id);
CREATE INDEX IF NOT EXISTS idx_approval_stages_status ON public.approval_stages(stage_status);

-- ============================================================================
-- APPROVAL COMMENTS (Wireframe 37.5)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_item_id UUID NOT NULL REFERENCES public.approval_items(id) ON DELETE CASCADE,
  comment_body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal_only' CHECK (visibility IN ('internal_only')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_comments_item ON public.approval_comments(approval_item_id);

-- ============================================================================
-- APPROVAL EVIDENCE (Wireframe 37.6)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_item_id UUID NOT NULL REFERENCES public.approval_items(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  source_module TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_evidence_item ON public.approval_evidence(approval_item_id);

-- ============================================================================
-- APPROVAL AUDIT LOG (Wireframe 37.7)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  approval_item_id UUID NOT NULL REFERENCES public.approval_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_audit_log_item ON public.approval_audit_log(approval_item_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_tenant ON public.approval_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_time ON public.approval_audit_log(performed_at DESC);

-- ============================================================================
-- APPROVAL CALLBACKS (Wireframe 37.8)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_item_id UUID NOT NULL REFERENCES public.approval_items(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  callback_status callback_status NOT NULL DEFAULT 'PENDING',
  callback_payload JSONB DEFAULT '{}',
  last_attempt_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_callbacks_item ON public.approval_callbacks(approval_item_id);
CREATE INDEX IF NOT EXISTS idx_approval_callbacks_status ON public.approval_callbacks(callback_status);

-- ============================================================================
-- WORKFLOW APPROVAL RECORDS (used by workflowApproval.service.ts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  workspace_id UUID,
  required_role TEXT NOT NULL,
  approver_id UUID,
  approver_name TEXT,
  decision TEXT NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CONDITIONAL_APPROVAL', 'ESCALATED')),
  decision_reason TEXT,
  edited_output_ref TEXT,
  requested_changes TEXT,
  evidence_ref TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_records_instance ON public.approval_records(instance_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_decision ON public.approval_records(decision);
CREATE INDEX IF NOT EXISTS idx_approval_records_role ON public.approval_records(required_role);

-- ============================================================================
-- RLS ENABLE
-- ============================================================================
ALTER TABLE public.approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES — Tenant Isolation
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_decisions ON public.approval_decisions;
  CREATE POLICY tenant_isolation_approval_decisions ON public.approval_decisions
    FOR ALL USING (approval_item_id IN (
      SELECT id FROM public.approval_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_paths ON public.approval_paths;
  CREATE POLICY tenant_isolation_approval_paths ON public.approval_paths
    FOR ALL USING (approval_item_id IN (
      SELECT id FROM public.approval_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_stages ON public.approval_stages;
  CREATE POLICY tenant_isolation_approval_stages ON public.approval_stages
    FOR ALL USING (approval_path_id IN (
      SELECT ap.id FROM public.approval_paths ap
      JOIN public.approval_items ai ON ai.id = ap.approval_item_id
      WHERE ai.tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_comments ON public.approval_comments;
  CREATE POLICY tenant_isolation_approval_comments ON public.approval_comments
    FOR ALL USING (approval_item_id IN (
      SELECT id FROM public.approval_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_evidence ON public.approval_evidence;
  CREATE POLICY tenant_isolation_approval_evidence ON public.approval_evidence
    FOR ALL USING (approval_item_id IN (
      SELECT id FROM public.approval_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_audit_log ON public.approval_audit_log;
  CREATE POLICY tenant_isolation_approval_audit_log ON public.approval_audit_log
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_callbacks ON public.approval_callbacks;
  CREATE POLICY tenant_isolation_approval_callbacks ON public.approval_callbacks
    FOR ALL USING (approval_item_id IN (
      SELECT id FROM public.approval_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_records ON public.approval_records;
  CREATE POLICY tenant_isolation_approval_records ON public.approval_records
    FOR ALL USING (true);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_approval_support_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_approval_paths_updated_at
  BEFORE UPDATE ON public.approval_paths
  FOR EACH ROW EXECUTE FUNCTION update_approval_support_updated_at();

CREATE TRIGGER trg_approval_stages_updated_at
  BEFORE UPDATE ON public.approval_stages
  FOR EACH ROW EXECUTE FUNCTION update_approval_support_updated_at();

CREATE TRIGGER trg_approval_callbacks_updated_at
  BEFORE UPDATE ON public.approval_callbacks
  FOR EACH ROW EXECUTE FUNCTION update_approval_support_updated_at();

CREATE TRIGGER trg_approval_records_updated_at
  BEFORE UPDATE ON public.approval_records
  FOR EACH ROW EXECUTE FUNCTION update_approval_support_updated_at();
