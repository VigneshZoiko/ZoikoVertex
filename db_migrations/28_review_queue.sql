-- Review Queue — Accountability Layer Module 1
-- Core tables for the governed human review command center

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Review Items
CREATE TABLE IF NOT EXISTS public.review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'social_post', 'campaign_asset', 'inbox_reply', 'agent_action',
    'workflow_output', 'policy_flagged', 'validation_failed',
    'exception_item', 'scheduled_content'
  )),
  source_module TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_snapshot JSONB NOT NULL DEFAULT '{}',
  platform TEXT,
  campaign_id TEXT,
  submitted_by UUID NOT NULL,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN (
    'PENDING_REVIEW', 'ASSIGNED', 'IN_REVIEW', 'AWAITING_REVISION',
    'RESUBMITTED', 'APPROVED', 'REJECTED', 'ESCALATED', 'BLOCKED',
    'EXPIRED', 'RELEASED', 'ARCHIVED'
  )),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_category TEXT,
  validation_status TEXT CHECK (validation_status IN ('PASSED', 'WARNING', 'FAILED', 'BLOCKED', 'NOT_RUN')),
  policy_flag_status TEXT CHECK (policy_flag_status IN ('NONE', 'WARNING', 'FLAGGED', 'BLOCKED')),
  source_grounding_status TEXT CHECK (source_grounding_status IN ('GROUNDED', 'PARTIAL', 'UNGROUNDED', 'NOT_CHECKED')),
  approval_rule_id TEXT,
  decision_eligibility_state TEXT CHECK (decision_eligibility_state IN (
    'ELIGIBLE_FOR_APPROVAL', 'REVIEW_REQUIRED', 'ELEVATED_APPROVAL_REQUIRED',
    'REVISION_REQUIRED', 'ESCALATION_REQUIRED', 'BLOCKED',
    'OVERRIDE_ELIGIBLE', 'OVERRIDE_PROHIBITED'
  )),
  due_at TIMESTAMPTZ,
  sla_status TEXT CHECK (sla_status IN ('NORMAL', 'DUE_SOON', 'OVERDUE')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_items_tenant_status ON public.review_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_review_items_assigned_to ON public.review_items(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_items_risk_level ON public.review_items(risk_level);
CREATE INDEX IF NOT EXISTS idx_review_items_due_at ON public.review_items(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_items_submitted_at ON public.review_items(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_items_source_module ON public.review_items(source_module);
CREATE INDEX IF NOT EXISTS idx_review_items_item_type ON public.review_items(item_type);

-- 2. Review Decisions
CREATE TABLE IF NOT EXISTS public.review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_item_id UUID NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'ESCALATED', 'BLOCKED', 'OVERRIDE_APPLIED'
  )),
  decision_reason TEXT,
  decision_note TEXT,
  decided_by UUID NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audit_log_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_decisions_item ON public.review_decisions(review_item_id);

-- 3. Review Assignments
CREATE TABLE IF NOT EXISTS public.review_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_item_id UUID NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_team TEXT,
  due_at TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  assignment_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_assignments_item ON public.review_assignments(review_item_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_user ON public.review_assignments(assigned_to);

-- 4. Review Notes
CREATE TABLE IF NOT EXISTS public.review_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_item_id UUID NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  note_body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'INTERNAL_ONLY' CHECK (visibility IN ('INTERNAL_ONLY')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_notes_item ON public.review_notes(review_item_id);

-- 5. Review Audit Log
CREATE TABLE IF NOT EXISTS public.review_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  review_item_id UUID NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_audit_log_item ON public.review_audit_log(review_item_id);
CREATE INDEX IF NOT EXISTS idx_review_audit_log_tenant ON public.review_audit_log(tenant_id);

-- 6. Review Overrides
CREATE TABLE IF NOT EXISTS public.review_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_item_id UUID NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  override_reason TEXT NOT NULL,
  risk_acknowledgement TEXT,
  overridden_by UUID NOT NULL,
  overridden_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_overrides_item ON public.review_overrides(review_item_id);

-- 7. Row-Level Security
ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_overrides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_review_items ON public.review_items;
  CREATE POLICY tenant_isolation_review_items ON public.review_items
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_review_decisions ON public.review_decisions;
  CREATE POLICY tenant_isolation_review_decisions ON public.review_decisions
    USING (review_item_id IN (SELECT id FROM public.review_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_review_audit_log ON public.review_audit_log;
  CREATE POLICY tenant_isolation_review_audit_log ON public.review_audit_log
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 8. Event Type Registry
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class) VALUES
  ('review.item.submitted', 'evidence_legal', 'Review Item Submitted', 'Content submitted for human review.', 'low', 'REGULATED'),
  ('review.item.assigned', 'evidence_legal', 'Review Item Assigned', 'Review item assigned to a reviewer.', 'low', 'REGULATED'),
  ('review.item.approved', 'evidence_legal', 'Review Item Approved', 'Review item approved by reviewer.', 'medium', 'REGULATED'),
  ('review.item.rejected', 'evidence_legal', 'Review Item Rejected', 'Review item rejected by reviewer.', 'medium', 'REGULATED'),
  ('review.item.revision_requested', 'evidence_legal', 'Revision Requested', 'Reviewer requested changes to the item.', 'low', 'REGULATED'),
  ('review.item.escalated', 'evidence_legal', 'Review Item Escalated', 'Review item escalated for elevated review.', 'high', 'REGULATED'),
  ('review.item.blocked', 'evidence_legal', 'Review Item Blocked', 'Review item blocked from proceeding.', 'high', 'REGULATED'),
  ('review.item.override', 'evidence_legal', 'Review Override Applied', 'Controlled override applied to review item.', 'critical', 'LEGAL_HOLD'),
  ('review.item.released', 'evidence_legal', 'Review Item Released', 'Review item released to next workflow stage.', 'low', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;
