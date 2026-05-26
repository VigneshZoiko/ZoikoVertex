-- 22_evidence_vault_phase2.sql
-- Evidence Vault Phase 2: Packages, Legal Holds, Exports, Redaction

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE vault_package_type AS ENUM (
    'regulatory_response', 'litigation_hold', 'customer_assurance',
    'board_executive', 'security_incident', 'ai_governance'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_package_status AS ENUM (
    'draft', 'building', 'sealed', 'exporting', 'exported', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_hold_scope_type AS ENUM (
    'item', 'package', 'collection', 'case', 'campaign', 'actor', 'time_range', 'source_system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_export_status AS ENUM (
    'requested', 'processing', 'ready', 'delivered', 'failed', 'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_disclosure_mode AS ENUM (
    'internal_full', 'internal_redacted', 'external_regulator', 'external_customer', 'external_auditor_portal'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Evidence Packages ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  package_type vault_package_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source_collection_id UUID REFERENCES public.vault_evidence_collections(id),
  manifest JSONB,
  manifest_hash VARCHAR(255),
  prior_manifest_hash VARCHAR(255),
  template_version VARCHAR(50) DEFAULT '1.0',
  redaction_policy_version VARCHAR(50) DEFAULT '1.0',
  item_count INT DEFAULT 0,
  status vault_package_status DEFAULT 'draft',
  is_complete BOOLEAN DEFAULT false,
  is_redacted BOOLEAN DEFAULT false,
  is_partially_redacted BOOLEAN DEFAULT false,
  is_externally_shared BOOLEAN DEFAULT false,
  created_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  sealed_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_packages_package_id ON public.vault_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_vault_packages_workspace ON public.vault_packages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vault_packages_type ON public.vault_packages(package_type);
CREATE INDEX IF NOT EXISTS idx_vault_packages_status ON public.vault_packages(status);
CREATE INDEX IF NOT EXISTS idx_vault_packages_created ON public.vault_packages(created_at DESC);

-- ─── Package Items ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.vault_packages(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.vault_evidence_items(id) ON DELETE CASCADE,
  inclusion_reason TEXT,
  redaction_status VARCHAR(50) DEFAULT 'none',
  added_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(package_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_vault_pkg_items_package ON public.vault_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_vault_pkg_items_item ON public.vault_package_items(item_id);

-- ─── Legal Holds ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  scope_type vault_hold_scope_type NOT NULL,
  scope_id UUID,
  scope_query JSONB,
  matter_ref VARCHAR(255) NOT NULL,
  jurisdiction VARCHAR(100),
  reason TEXT NOT NULL,
  requester_id VARCHAR(100) NOT NULL,
  approver_id VARCHAR(100),
  effective_date DATE NOT NULL,
  review_date DATE,
  released BOOLEAN DEFAULT false,
  released_at TIMESTAMPTZ,
  released_reason TEXT,
  released_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_holds_hold_id ON public.vault_holds(hold_id);
CREATE INDEX IF NOT EXISTS idx_vault_holds_workspace ON public.vault_holds(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vault_holds_scope ON public.vault_holds(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_vault_holds_matter ON public.vault_holds(matter_ref);
CREATE INDEX IF NOT EXISTS idx_vault_holds_released ON public.vault_holds(released);

-- ─── Exports ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id VARCHAR(50) NOT NULL,
  package_id UUID NOT NULL REFERENCES public.vault_packages(id),
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  requester_id VARCHAR(100) NOT NULL,
  approver_id VARCHAR(100),
  disclosure_mode vault_disclosure_mode NOT NULL,
  redaction_policy_id UUID,
  export_hash VARCHAR(255),
  file_size BIGINT DEFAULT 0,
  mime_type VARCHAR(100) DEFAULT 'application/zip',
  status vault_export_status DEFAULT 'requested',
  requester_reason TEXT,
  delivery_method VARCHAR(50),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_exports_export_id ON public.vault_exports(export_id);
CREATE INDEX IF NOT EXISTS idx_vault_exports_package ON public.vault_exports(package_id);
CREATE INDEX IF NOT EXISTS idx_vault_exports_status ON public.vault_exports(status);
CREATE INDEX IF NOT EXISTS idx_vault_exports_requester ON public.vault_exports(requester_id);

-- ─── Redaction Policies ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_redaction_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  policy_version VARCHAR(50) DEFAULT '1.0',
  rules JSONB NOT NULL DEFAULT '[]',
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_redaction_policy_id ON public.vault_redaction_policies(policy_id);
CREATE INDEX IF NOT EXISTS idx_vault_redaction_policies_version ON public.vault_redaction_policies(policy_version);

-- ─── Event Type Registry ──────────────────────────────────────────────────────

INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('evidence.package_created', 'evidence_legal', 'Package Created', 'Evidence package created and sealed.', 'medium', 'REGULATED'),
  ('evidence.package_sealed', 'evidence_legal', 'Package Sealed', 'Evidence package sealed with manifest hash.', 'medium', 'REGULATED'),
  ('evidence.package_verified', 'evidence_legal', 'Package Verified', 'Package manifest and item hashes verified.', 'low', 'EXTENDED'),
  ('evidence.hold_applied', 'evidence_legal', 'Legal Hold Applied', 'Legal hold applied to evidence scope.', 'high', 'LEGAL_HOLD'),
  ('evidence.hold_released', 'evidence_legal', 'Legal Hold Released', 'Legal hold released from evidence scope.', 'medium', 'EXTENDED'),
  ('evidence.export_requested', 'evidence_legal', 'Export Requested', 'Package export requested by authorized user.', 'medium', 'REGULATED'),
  ('evidence.export_completed', 'evidence_legal', 'Export Completed', 'Package export completed with hash receipt.', 'low', 'EXTENDED'),
  ('evidence.redaction_policy_created', 'evidence_legal', 'Redaction Policy Created', 'Redaction policy created for package use.', 'low', 'EXTENDED')
ON CONFLICT (event_type) DO NOTHING;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.vault_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_redaction_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_packages ON public.vault_packages;
  CREATE POLICY tenant_isolation_vault_packages ON public.vault_packages
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_holds ON public.vault_holds;
  CREATE POLICY tenant_isolation_vault_holds ON public.vault_holds
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_exports ON public.vault_exports;
  CREATE POLICY tenant_isolation_vault_exports ON public.vault_exports
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
