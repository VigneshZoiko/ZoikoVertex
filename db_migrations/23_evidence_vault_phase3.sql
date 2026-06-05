-- 23_evidence_vault_phase3.sql
-- Evidence Vault Phase 3: Enterprise Disclosure & Integrations

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE vault_dlp_scan_status AS ENUM (
    'pending', 'scanning', 'passed', 'flagged', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_dlp_detection_category AS ENUM (
    'pii', 'secrets', 'privileged', 'custom_policy', 'malware', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── External Shares (Auditor Portal) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id VARCHAR(50) NOT NULL,
  package_id UUID NOT NULL REFERENCES public.vault_packages(id),
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  access_token VARCHAR(512) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  disclosure_mode vault_disclosure_mode NOT NULL DEFAULT 'external_auditor_portal',
  redaction_policy_id UUID REFERENCES public.vault_redaction_policies(id),
  expires_at TIMESTAMPTZ NOT NULL,
  max_views INT DEFAULT 0,
  current_views INT DEFAULT 0,
  watermark VARCHAR(255),
  allow_download BOOLEAN DEFAULT false,
  require_mfa BOOLEAN DEFAULT false,
  last_accessed_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by VARCHAR(100),
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_shares_share_id ON public.vault_shares(share_id);
CREATE INDEX IF NOT EXISTS idx_vault_shares_package ON public.vault_shares(package_id);
CREATE INDEX IF NOT EXISTS idx_vault_shares_token_hash ON public.vault_shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_vault_shares_expires ON public.vault_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_vault_shares_revoked ON public.vault_shares(revoked);

-- ─── Share Access Logs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_share_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public.vault_shares(id) ON DELETE CASCADE,
  viewer_ip_hash VARCHAR(255),
  user_agent TEXT,
  package_section VARCHAR(100),
  viewed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_share_access_logs_share ON public.vault_share_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_vault_share_access_logs_viewed ON public.vault_share_access_logs(viewed_at DESC);

-- ─── DLP Scans ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_dlp_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.vault_packages(id),
  tenant_id VARCHAR(50) NOT NULL,
  scan_status vault_dlp_scan_status DEFAULT 'pending',
  detection_category vault_dlp_detection_category,
  findings JSONB DEFAULT '[]',
  scan_report TEXT,
  reviewer VARCHAR(100),
  remediation_state VARCHAR(50),
  scanned_by_worker VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Repair earlier partial installs where the table existed before tenant_id was added.
ALTER TABLE public.vault_dlp_scans ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);

UPDATE public.vault_dlp_scans d
SET tenant_id = p.tenant_id
FROM public.vault_packages p
WHERE d.package_id = p.id
  AND d.tenant_id IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.vault_dlp_scans WHERE tenant_id IS NULL) THEN
    ALTER TABLE public.vault_dlp_scans ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vault_dlp_scans_package ON public.vault_dlp_scans(package_id);
CREATE INDEX IF NOT EXISTS idx_vault_dlp_scans_status ON public.vault_dlp_scans(scan_status);

-- ─── Event Type Registry ──────────────────────────────────────────────────────

INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('evidence.share_created', 'evidence_legal', 'External Share Created', 'External auditor portal share created for package.', 'high', 'REGULATED'),
  ('evidence.share_revoked', 'evidence_legal', 'External Share Revoked', 'External auditor portal share revoked.', 'medium', 'EXTENDED'),
  ('evidence.share_viewed', 'evidence_legal', 'External Share Viewed', 'External auditor portal share was accessed.', 'low', 'EXTENDED'),
  ('evidence.export_blocked', 'evidence_legal', 'Export Blocked by DLP', 'Package export blocked by DLP detection.', 'high', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.vault_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_share_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_dlp_scans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_shares ON public.vault_shares;
  CREATE POLICY tenant_isolation_vault_shares ON public.vault_shares
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_dlp_scans ON public.vault_dlp_scans;
  CREATE POLICY tenant_isolation_vault_dlp_scans ON public.vault_dlp_scans
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
