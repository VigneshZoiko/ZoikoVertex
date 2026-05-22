-- 18_forensic_exports.sql
-- Phase 3: Export packages, redaction profiles, privilege controls

-- Export package status enum
DO $$ BEGIN
  CREATE TYPE export_package_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'generating', 'ready', 'delivered', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Export format enum
DO $$ BEGIN
  CREATE TYPE export_package_format AS ENUM ('pdf', 'json', 'csv', 'zip');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Redaction profile enum
DO $$ BEGIN
  CREATE TYPE redaction_profile AS ENUM ('none', 'standard', 'legal', 'regulator', 'board', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Export packages
CREATE TABLE IF NOT EXISTS case_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES forensic_cases(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  package_type TEXT NOT NULL DEFAULT 'internal_investigation',
  format export_package_format NOT NULL DEFAULT 'json',
  redaction_profile redaction_profile NOT NULL DEFAULT 'standard',
  status export_package_status NOT NULL DEFAULT 'draft',
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  rejected_reason TEXT,
  scope JSONB DEFAULT '{}'::jsonb,
  manifest JSONB,
  redaction_log JSONB DEFAULT '[]'::jsonb,
  hash TEXT,
  file_size BIGINT,
  file_path TEXT,
  delivery_method TEXT,
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_exports_case ON case_exports(case_id);
CREATE INDEX IF NOT EXISTS idx_case_exports_status ON case_exports(status);
CREATE INDEX IF NOT EXISTS idx_case_exports_type ON case_exports(package_type);

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION update_case_export_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_case_export_updated
    BEFORE UPDATE ON case_exports
    FOR EACH ROW EXECUTE FUNCTION update_case_export_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS
ALTER TABLE case_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_exports ON case_exports
  USING (case_id IN (SELECT id FROM forensic_cases WHERE tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())));

-- Privilege flag on case_evidence_items (for marking items as privileged)
ALTER TABLE case_evidence_items ADD COLUMN IF NOT EXISTS privilege_flag BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE case_evidence_items ADD COLUMN IF NOT EXISTS privileged_by TEXT;
ALTER TABLE case_evidence_items ADD COLUMN IF NOT EXISTS privileged_at TIMESTAMPTZ;

-- Add event type registry entries for Phase 3
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('forensic.export_requested', 'evidence_legal', 'Export Requested', 'Export package requested for a forensic case.', 'medium', 'REGULATED'),
  ('forensic.export_approved', 'evidence_legal', 'Export Approved', 'Export package approved for delivery.', 'high', 'REGULATED'),
  ('forensic.export_generated', 'evidence_legal', 'Export Generated', 'Export package generated with manifest.', 'medium', 'REGULATED'),
  ('forensic.export_delivered', 'evidence_legal', 'Export Delivered', 'Export package delivered to recipient.', 'medium', 'EXTENDED'),
  ('forensic.privilege_applied', 'evidence_legal', 'Privilege Applied', 'Privilege classification applied to note or evidence.', 'high', 'LEGAL_HOLD'),
  ('forensic.evidence_unpinned', 'evidence_legal', 'Evidence Unpinned', 'Evidence removed from case view.', 'low', 'EXTENDED'),
  ('forensic.external_evidence_uploaded', 'evidence_legal', 'External Evidence Uploaded', 'External evidence attached to case.', 'medium', 'EXTENDED')
ON CONFLICT (event_type) DO NOTHING;
