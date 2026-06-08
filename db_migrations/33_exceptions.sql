-- Migration 033: Exceptions (Accountability Layer)
-- Creates tables for exception case management, blockers, remediation,
-- escalation, overrides, evidence, resolution, and audit logging.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
CREATE TYPE exception_status AS ENUM (
  'NEW',
  'TRIAGE',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_ON_SOURCE',
  'WAITING_ON_VALIDATION',
  'WAITING_ON_APPROVAL',
  'ESCALATED',
  'OVERRIDE_REQUESTED',
  'OVERRIDE_APPROVED',
  'OVERRIDE_DENIED',
  'BLOCKED',
  'RESOLVED',
  'CLOSED',
  'ARCHIVED',
  'CANCELLED'
);

CREATE TYPE exception_severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

-- FIX: Missing enum
CREATE TYPE approval_risk_level AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE exception_category AS ENUM (
  'VALIDATION_BLOCK',
  'APPROVAL_BLOCK',
  'RULE_CONFLICT',
  'CALLBACK_FAILURE',
  'INTEGRATION_FAILURE',
  'POLICY_BREACH',
  'EVIDENCE_GAP',
  'QUALITY_FAILURE',
  'SENSITIVE_ENGAGEMENT',
  'AGENT_SAFETY',
  'RESTRICTED_OPERATION',
  'SLA_BREACH',
  'MANUAL_OVERRIDE_REQUEST',
  'UNKNOWN'
);

CREATE TYPE blocker_type AS ENUM (
  'VALIDATION_FAILURE',
  'APPROVAL_BLOCK',
  'RULE_CONFLICT',
  'CALLBACK_FAILURE',
  'MISSING_APPROVER',
  'MISSING_EVIDENCE',
  'POLICY_VIOLATION',
  'SENSITIVE_CONTENT',
  'AGENT_LIMIT_REACHED',
  'RESTRICTED_MODE',
  'INTEGRATION_ERROR',
  'UNKNOWN'
);

CREATE TYPE remediation_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'SKIPPED'
);

CREATE TYPE override_status AS ENUM (
  'REQUESTED',
  'APPROVED',
  'DENIED',
  'EXPIRED'
);

-- ============================================================================
-- EXCEPTION CASES
-- ============================================================================
CREATE TABLE exception_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id UUID NOT NULL,
  workspace_id UUID NOT NULL,

  exception_title TEXT NOT NULL,

  exception_category exception_category
    NOT NULL DEFAULT 'UNKNOWN',

  exception_status exception_status
    NOT NULL DEFAULT 'NEW',

  severity exception_severity
    NOT NULL DEFAULT 'MEDIUM',

  risk_level approval_risk_level
    NOT NULL DEFAULT 'MEDIUM',

  source_module TEXT NOT NULL,
  source_entity_type TEXT,
  source_entity_id UUID,
  source_owner_id UUID,

  exception_owner_id UUID,
  created_by UUID NOT NULL,

  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  restricted_mode BOOLEAN NOT NULL DEFAULT FALSE,

  current_blocker TEXT,
  workflow_impact TEXT,
  recommended_route TEXT,

  required_authority INTEGER DEFAULT 1,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXCEPTION BLOCKERS
-- ============================================================================
CREATE TABLE exception_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  exception_id UUID NOT NULL
    REFERENCES exception_cases(id)
    ON DELETE CASCADE,

  blocker_type blocker_type NOT NULL,

  blocker_description TEXT NOT NULL,

  blocker_severity exception_severity
    NOT NULL DEFAULT 'MEDIUM',

  triggered_by UUID,

  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  related_rule_id UUID,
  related_validation_id UUID,
  related_approval_id UUID,
  related_callback_id UUID,

  blocking_dependency TEXT,
  required_action TEXT,
  required_owner_id UUID,

  automatic_remediation_available BOOLEAN
    NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXCEPTION REMEDIATION
-- ============================================================================
CREATE TABLE exception_remediation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  exception_id UUID NOT NULL
    REFERENCES exception_cases(id)
    ON DELETE CASCADE,

  remediation_owner_id UUID,

  remediation_action TEXT NOT NULL,

  due_at TIMESTAMPTZ,
  dependency TEXT,
  target_destination TEXT,

  required_validation BOOLEAN NOT NULL DEFAULT FALSE,
  required_approval BOOLEAN NOT NULL DEFAULT FALSE,

  required_evidence TEXT,

  completion_status remediation_status
    NOT NULL DEFAULT 'PENDING',

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- EXCEPTION ESCALATIONS
-- ============================================================================
CREATE TABLE exception_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  exception_id UUID NOT NULL
    REFERENCES exception_cases(id)
    ON DELETE CASCADE,

  escalation_reason TEXT NOT NULL,

  severity exception_severity
    NOT NULL DEFAULT 'MEDIUM',

  escalated_by UUID NOT NULL,
  escalated_to_role TEXT,
  escalated_to_user_id UUID,

  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  response_status TEXT DEFAULT 'PENDING',
  escalation_note TEXT,
  outcome TEXT,
  sla_impact TEXT
);

-- ============================================================================
-- EXCEPTION OVERRIDES
-- ============================================================================
CREATE TABLE exception_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  exception_id UUID NOT NULL
    REFERENCES exception_cases(id)
    ON DELETE CASCADE,

  override_reason TEXT NOT NULL,
  requested_by UUID NOT NULL,
  requested_outcome TEXT NOT NULL,

  risk_acknowledgement TEXT,

  evidence_attached TEXT[] DEFAULT '{}',

  expires_at TIMESTAMPTZ,

  approving_authority_id UUID,

  override_status override_status
    NOT NULL DEFAULT 'REQUESTED',

  override_decision_note TEXT,

  decided_by UUID,
  decided_at TIMESTAMPTZ,

  post_override_quality_audit_required
    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- EXCEPTION EVIDENCE
-- ============================================================================
CREATE TABLE exception_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  exception_id UUID NOT NULL
    REFERENCES exception_cases(id)
    ON DELETE CASCADE,

  evidence_type TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,

  source_module TEXT NOT NULL,

  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXCEPTION RESOLUTIONS
-- ============================================================================
CREATE TABLE exception_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  exception_id UUID NOT NULL
    REFERENCES exception_cases(id)
    ON DELETE CASCADE,

  resolution_outcome TEXT NOT NULL,
  resolution_summary TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  final_destination TEXT,

  evidence_attached TEXT[] DEFAULT '{}',

  post_resolution_audit_required BOOLEAN
    NOT NULL DEFAULT FALSE,

  resolved_by UUID NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXCEPTION AUDIT LOG
-- ============================================================================
CREATE TABLE exception_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id UUID NOT NULL,

  exception_id UUID NOT NULL
    REFERENCES exception_cases(id)
    ON DELETE CASCADE,

  action TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,

  performed_by UUID NOT NULL,

  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  note TEXT,
  metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_exception_cases_tenant
ON exception_cases(tenant_id);

CREATE INDEX idx_exception_cases_status
ON exception_cases(exception_status);

CREATE INDEX idx_exception_cases_severity
ON exception_cases(severity);

CREATE INDEX idx_exception_cases_owner
ON exception_cases(exception_owner_id);

CREATE INDEX idx_exception_cases_due
ON exception_cases(due_at)
WHERE due_at IS NOT NULL;

CREATE INDEX idx_exception_blockers_case
ON exception_blockers(exception_id);

CREATE INDEX idx_exception_remediation_case
ON exception_remediation(exception_id);

CREATE INDEX idx_exception_escalations_case
ON exception_escalations(exception_id);

CREATE INDEX idx_exception_overrides_case
ON exception_overrides(exception_id);

CREATE INDEX idx_exception_evidence_case
ON exception_evidence(exception_id);

CREATE INDEX idx_exception_resolutions_case
ON exception_resolutions(exception_id);

CREATE INDEX idx_exception_audit_log_case
ON exception_audit_log(exception_id);

-- ============================================================================
-- TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_exception_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exception_cases_updated_at
BEFORE UPDATE ON exception_cases
FOR EACH ROW
EXECUTE FUNCTION update_exception_updated_at();

CREATE TRIGGER trg_exception_blockers_updated_at
BEFORE UPDATE ON exception_blockers
FOR EACH ROW
EXECUTE FUNCTION update_exception_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE exception_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_remediation ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_audit_log ENABLE ROW LEVEL SECURITY;