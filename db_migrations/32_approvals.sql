-- Migration 032: Approvals (Accountability Layer)

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname='approval_risk_level'
    ) THEN
        CREATE TYPE approval_risk_level AS ENUM (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        );
    END IF;
END $$;

CREATE TYPE approval_item_status AS ENUM (
  'PENDING_APPROVAL',
  'IN_REVIEW',
  'WAITING_ON_OTHERS',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'ESCALATED',
  'CONDITIONAL_APPROVAL',
  'BLOCKED',
  'CANCELLED',
  'COMPLETED',
  'ARCHIVED'
);

CREATE TYPE approval_item_type AS ENUM (
  'SOCIAL_POST',
  'INBOX_REPLY',
  'CAMPAIGN_ASSET',
  'AGENT_ACTION',
  'WORKFLOW_OUTPUT',
  'VALIDATION_OVERRIDE',
  'EXCEPTION_OUTCOME',
  'RESTRICTED_OPERATION',
  'COMPLIANCE_SENSITIVE_ITEM',
  'PUBLISHING_ACTION'
);

CREATE TYPE approval_decision_value AS ENUM (
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'CONDITIONAL_APPROVAL',
  'ESCALATED'
);

CREATE TYPE approval_path_type AS ENUM (
  'SINGLE',
  'SEQUENTIAL',
  'PARALLEL',
  'QUORUM',
  'ROLE_BASED',
  'SPECIALIST',
  'CONDITIONAL',
  'EMERGENCY',
  'EXECUTIVE'
);

CREATE TYPE approval_stage_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
  'SKIPPED',
  'ESCALATED'
);

CREATE TYPE callback_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE eligibility_status AS ENUM (
  'APPROVAL_ELIGIBLE',
  'REJECTION_ELIGIBLE',
  'CHANGES_REQUEST_ELIGIBLE',
  'CONDITIONAL_APPROVAL_ELIGIBLE',
  'ESCALATION_REQUIRED',
  'WAITING_ON_PRIOR_STAGE',
  'MISSING_REQUIRED_APPROVER',
  'VALIDATION_BLOCKED',
  'REVALIDATION_REQUIRED',
  'PERMISSION_DENIED',
  'ALREADY_DECIDED',
  'WORKFLOW_COMPLETED'
);



CREATE TABLE approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id UUID NOT NULL,
  workspace_id UUID NOT NULL,

  source_module TEXT NOT NULL,
  source_entity_id UUID NOT NULL,

  item_type approval_item_type NOT NULL,

  title TEXT NOT NULL,

  content_snapshot TEXT,
  content_snapshot_version INTEGER DEFAULT 1,

  approval_status approval_item_status
    NOT NULL DEFAULT 'PENDING_APPROVAL',

  approval_stage TEXT,

  approval_rule_id UUID,
  approval_rule_version INTEGER,

  required_approval_level INTEGER NOT NULL DEFAULT 1,

  assigned_approver_id UUID,

  submitted_by UUID NOT NULL,

  validation_status TEXT,

  risk_level approval_risk_level
    NOT NULL DEFAULT 'LOW',

  due_at TIMESTAMPTZ,

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_approval_items_tenant
ON approval_items(tenant_id);

CREATE INDEX idx_approval_items_status
ON approval_items(approval_status);

CREATE INDEX idx_approval_items_assigned
ON approval_items(assigned_approver_id);

CREATE INDEX idx_approval_items_submitted
ON approval_items(submitted_by);

CREATE INDEX idx_approval_items_due
ON approval_items(due_at)
WHERE due_at IS NOT NULL;

CREATE INDEX idx_approval_items_source
ON approval_items(source_module, source_entity_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_approval_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_approval_items_updated_at
BEFORE UPDATE
ON approval_items
FOR EACH ROW
EXECUTE FUNCTION update_approval_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE approval_items
ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_items_tenant_isolation
ON approval_items
USING (
    tenant_id =
    current_setting('app.current_tenant_id')::UUID
);