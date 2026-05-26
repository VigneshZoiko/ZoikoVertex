-- 16_forensic_cases.sql
-- Forensic Hub: Cases, Evidence Items, Actions, and supporting types

-- Case lifecycle state enum
DO $$ BEGIN
  CREATE TYPE forensic_case_status AS ENUM (
    'new', 'triage', 'active_investigation', 'awaiting_information',
    'legal_review', 'legal_hold', 'remediation', 'validation',
    'closed', 'reopened'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Case severity enum
DO $$ BEGIN
  CREATE TYPE forensic_case_severity AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Case type enum
DO $$ BEGIN
  CREATE TYPE forensic_case_type AS ENUM (
    'ai_agent_misfire', 'unauthorized_publish', 'policy_override_review',
    'security_incident', 'brand_regulatory_risk', 'evidence_request',
    'operational_failure', 'chain_integrity_alert'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Case source enum
DO $$ BEGIN
  CREATE TYPE forensic_case_source AS ENUM ('manual', 'rule_trigger', 'audit_event', 'evidence_request', 'external');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Evidence relevance enum
DO $$ BEGIN
  CREATE TYPE forensic_evidence_relevance AS ENUM ('primary', 'supporting', 'contextual', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Evidence source type enum
DO $$ BEGIN
  CREATE TYPE forensic_evidence_source_type AS ENUM (
    'audit_event', 'vault_item', 'file', 'content_snapshot', 'platform_receipt', 'identity_record'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Note class enum
DO $$ BEGIN
  CREATE TYPE forensic_note_class AS ENUM (
    'internal_investigation', 'legal_privileged', 'external_shareable', 'system', 'ai_summary_draft'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Closure outcome enum
DO $$ BEGIN
  CREATE TYPE forensic_closure_outcome AS ENUM ('substantiated', 'unsubstantiated', 'no_action', 'duplicate', 'merged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Retention class for cases
DO $$ BEGIN
  CREATE TYPE forensic_retention_class AS ENUM ('standard', 'extended', 'regulated', 'legal_hold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FORENSIC CASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS forensic_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT UNIQUE NOT NULL DEFAULT 'CASE-' || upper(substr(md5(random()::text)::text, 1, 8)),
  tenant_id TEXT NOT NULL DEFAULT 'TEN-001',
  workspace_id TEXT NOT NULL DEFAULT 'WRK-001',
  case_type forensic_case_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  severity forensic_case_severity NOT NULL DEFAULT 'medium',
  status forensic_case_status NOT NULL DEFAULT 'new',
  owner_user_id TEXT,
  source forensic_case_source NOT NULL DEFAULT 'manual',
  source_event_ids TEXT[] DEFAULT '{}',
  related_object_ids JSONB DEFAULT '[]'::jsonb,
  legal_hold_active BOOLEAN NOT NULL DEFAULT false,
  privilege_flag BOOLEAN NOT NULL DEFAULT false,
  retention_class forensic_retention_class NOT NULL DEFAULT 'standard',
  sla_due_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closure JSONB,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  data_residency TEXT NOT NULL DEFAULT 'auto',
  chain_hash TEXT,
  prev_hash TEXT,
  block_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_forensic_cases_tenant ON forensic_cases(tenant_id);
CREATE INDEX idx_forensic_cases_workspace ON forensic_cases(workspace_id);
CREATE INDEX idx_forensic_cases_status ON forensic_cases(status);
CREATE INDEX idx_forensic_cases_severity ON forensic_cases(severity);
CREATE INDEX idx_forensic_cases_owner ON forensic_cases(owner_user_id);
CREATE INDEX idx_forensic_cases_type ON forensic_cases(case_type);
CREATE INDEX idx_forensic_cases_sla ON forensic_cases(sla_due_at) WHERE sla_due_at IS NOT NULL;
CREATE INDEX idx_forensic_cases_legal_hold ON forensic_cases(legal_hold_active) WHERE legal_hold_active = true;

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION update_forensic_case_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forensic_case_updated
  BEFORE UPDATE ON forensic_cases
  FOR EACH ROW EXECUTE FUNCTION update_forensic_case_timestamp();

-- ============================================================================
-- CASE PARTICIPANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role_in_case TEXT NOT NULL DEFAULT 'investigator',
  added_by TEXT NOT NULL,
  added_reason TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, user_id)
);

CREATE INDEX idx_case_participants_case ON case_participants(case_id);
CREATE INDEX idx_case_participants_user ON case_participants(user_id);

-- ============================================================================
-- CASE EVIDENCE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  source_type forensic_evidence_source_type NOT NULL,
  source_id TEXT NOT NULL,
  relevance forensic_evidence_relevance NOT NULL DEFAULT 'contextual',
  vault_status TEXT NOT NULL DEFAULT 'not_preserved',
  hash TEXT,
  chain_block_number INTEGER,
  added_by TEXT NOT NULL,
  added_reason TEXT NOT NULL,
  pin_reason TEXT,
  pinned_at TIMESTAMPTZ,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  removed_at TIMESTAMPTZ,
  removal_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_case ON case_evidence_items(case_id);
CREATE INDEX idx_evidence_source ON case_evidence_items(source_type, source_id);
CREATE INDEX idx_evidence_pinned ON case_evidence_items(is_pinned, case_id) WHERE is_pinned = true;
CREATE INDEX idx_evidence_vault ON case_evidence_items(vault_status) WHERE vault_status != 'not_preserved';

-- ============================================================================
-- CASE NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  note_class forensic_note_class NOT NULL DEFAULT 'internal_investigation',
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  original_content TEXT,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_notes_case ON case_notes(case_id);
CREATE INDEX idx_case_notes_class ON case_notes(note_class);

-- ============================================================================
-- CASE ACTIONS (immutable event log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  audit_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_actions_case ON case_actions(case_id);
CREATE INDEX idx_case_actions_type ON case_actions(action_type);
CREATE INDEX idx_case_actions_actor ON case_actions(actor_id);
CREATE INDEX idx_case_actions_audit ON case_actions(audit_event_id) WHERE audit_event_id IS NOT NULL;

-- ============================================================================
-- CASE TASKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  evidence_link JSONB,
  completion_proof TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_case_tasks_case ON case_tasks(case_id);
CREATE INDEX idx_case_tasks_owner ON case_tasks(owner_id);
CREATE INDEX idx_case_tasks_status ON case_tasks(status);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE forensic_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_tasks ENABLE ROW LEVEL SECURITY;

-- Tenant-isolated policies
CREATE POLICY tenant_isolation_forensic_cases ON forensic_cases
  USING (tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_participants ON case_participants
  USING (case_id IN (SELECT id FROM forensic_cases WHERE tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())));

CREATE POLICY tenant_isolation_evidence ON case_evidence_items
  USING (case_id IN (SELECT id FROM forensic_cases WHERE tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())));

CREATE POLICY tenant_isolation_notes ON case_notes
  USING (case_id IN (SELECT id FROM forensic_cases WHERE tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())));

CREATE POLICY tenant_isolation_actions ON case_actions
  USING (case_id IN (SELECT id FROM forensic_cases WHERE tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())));

CREATE POLICY tenant_isolation_tasks ON case_tasks
  USING (case_id IN (SELECT id FROM forensic_cases WHERE tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())));

-- ============================================================================
-- Event Type Registry Entries (must match existing public.event_type_registry schema)
-- ============================================================================
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('forensic.case_created', 'evidence_legal', 'Case Created', 'A forensic case was created manually, by rule, or from audit event.', 'medium', 'EXTENDED'),
  ('forensic.case_assigned', 'evidence_legal', 'Case Assigned', 'Owner or participant added or changed on a case.', 'low', 'EXTENDED'),
  ('forensic.status_changed', 'evidence_legal', 'Status Changed', 'Case lifecycle state changed.', 'medium', 'EXTENDED'),
  ('forensic.severity_changed', 'evidence_legal', 'Severity Changed', 'Case severity raised or lowered.', 'high', 'REGULATED'),
  ('forensic.evidence_added', 'evidence_legal', 'Evidence Added', 'Evidence item added to case.', 'low', 'EXTENDED'),
  ('forensic.evidence_pinned', 'evidence_legal', 'Evidence Pinned', 'Evidence marked as key evidence.', 'medium', 'REGULATED'),
  ('forensic.sent_to_vault', 'evidence_legal', 'Sent to Vault', 'Evidence sent for preservation.', 'medium', 'REGULATED'),
  ('forensic.legal_hold_applied', 'evidence_legal', 'Legal Hold Applied', 'Legal hold applied or extended.', 'high', 'LEGAL_HOLD'),
  ('forensic.privilege_applied', 'evidence_legal', 'Privilege Applied', 'Privilege classification applied to note or evidence.', 'high', 'LEGAL_HOLD'),
  ('forensic.note_added', 'evidence_legal', 'Note Added', 'Case note added.', 'low', 'EXTENDED'),
  ('forensic.export_requested', 'evidence_legal', 'Export Requested', 'Export package requested.', 'medium', 'REGULATED'),
  ('forensic.export_approved', 'evidence_legal', 'Export Approved', 'Export package approved.', 'medium', 'REGULATED'),
  ('forensic.case_closed', 'evidence_legal', 'Case Closed', 'Case closed with outcome.', 'medium', 'REGULATED'),
  ('forensic.case_reopened', 'evidence_legal', 'Case Reopened', 'Closed case reopened.', 'high', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;
