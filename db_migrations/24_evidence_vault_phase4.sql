-- 24_evidence_vault_phase4.sql
-- Evidence Vault Phase 4: Advanced Assurance

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE vault_job_type AS ENUM (
    'preserve_bulk', 'verify_bulk', 'export_package',
    'generate_package', 'dlp_scan', 'archive_old'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_job_status AS ENUM (
    'queued', 'processing', 'completed', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_anchor_status AS ENUM (
    'pending', 'anchored', 'confirmed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Async Job Queue ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_async_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(50) NOT NULL,
  job_type vault_job_type NOT NULL,
  status vault_job_status DEFAULT 'queued',
  priority INT DEFAULT 0,
  progress INT DEFAULT 0,
  total INT DEFAULT 0,
  params JSONB DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Repair earlier partial installs where scope columns or idempotency support were missing.
ALTER TABLE public.vault_async_jobs ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.vault_async_jobs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);
ALTER TABLE public.vault_async_jobs ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE public.vault_async_jobs ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.vault_async_jobs
    WHERE workspace_id IS NULL OR tenant_id IS NULL OR created_by IS NULL
  ) THEN
    ALTER TABLE public.vault_async_jobs ALTER COLUMN workspace_id SET NOT NULL;
    ALTER TABLE public.vault_async_jobs ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.vault_async_jobs ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_async_jobs_job_id ON public.vault_async_jobs(job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_async_jobs_idempotency ON public.vault_async_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vault_async_jobs_status ON public.vault_async_jobs(status);
CREATE INDEX IF NOT EXISTS idx_vault_async_jobs_type ON public.vault_async_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_vault_async_jobs_created ON public.vault_async_jobs(created_at DESC);

-- ─── Chain Anchoring ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_chain_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_id VARCHAR(50) NOT NULL,
  package_id UUID REFERENCES public.vault_packages(id),
  item_id UUID REFERENCES public.vault_evidence_items(id),
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  anchor_provider VARCHAR(100) NOT NULL,
  anchor_tx_hash VARCHAR(255),
  anchor_timestamp TIMESTAMPTZ,
  anchor_data JSONB DEFAULT '{}',
  status vault_anchor_status DEFAULT 'pending',
  schema_version VARCHAR(10) DEFAULT '1.0',
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  confirmed_at TIMESTAMPTZ
);

ALTER TABLE public.vault_chain_anchors ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.vault_chain_anchors ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);

UPDATE public.vault_chain_anchors a
SET workspace_id = COALESCE(a.workspace_id, p.workspace_id),
    tenant_id = COALESCE(a.tenant_id, p.tenant_id)
FROM public.vault_packages p
WHERE a.package_id = p.id
  AND (a.workspace_id IS NULL OR a.tenant_id IS NULL);

UPDATE public.vault_chain_anchors a
SET workspace_id = COALESCE(a.workspace_id, i.workspace_id),
    tenant_id = COALESCE(a.tenant_id, i.tenant_id)
FROM public.vault_evidence_items i
WHERE a.item_id = i.id
  AND (a.workspace_id IS NULL OR a.tenant_id IS NULL);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.vault_chain_anchors
    WHERE workspace_id IS NULL OR tenant_id IS NULL
  ) THEN
    ALTER TABLE public.vault_chain_anchors ALTER COLUMN workspace_id SET NOT NULL;
    ALTER TABLE public.vault_chain_anchors ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vault_chain_anchors_target_required'
      AND conrelid = 'public.vault_chain_anchors'::regclass
  ) THEN
    ALTER TABLE public.vault_chain_anchors
      ADD CONSTRAINT vault_chain_anchors_target_required
      CHECK (package_id IS NOT NULL OR item_id IS NOT NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_chain_anchors_anchor_id ON public.vault_chain_anchors(anchor_id);
CREATE INDEX IF NOT EXISTS idx_vault_chain_anchors_package ON public.vault_chain_anchors(package_id);
CREATE INDEX IF NOT EXISTS idx_vault_chain_anchors_item ON public.vault_chain_anchors(item_id);
CREATE INDEX IF NOT EXISTS idx_vault_chain_anchors_workspace ON public.vault_chain_anchors(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_chain_anchors_status ON public.vault_chain_anchors(status);

-- ─── Template Versions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  package_type vault_package_type NOT NULL,
  template_version VARCHAR(50) NOT NULL,
  schema JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vault_template_versions ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.vault_template_versions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.vault_template_versions
    WHERE workspace_id IS NULL OR tenant_id IS NULL
  ) THEN
    ALTER TABLE public.vault_template_versions ALTER COLUMN workspace_id SET NOT NULL;
    ALTER TABLE public.vault_template_versions ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_template_versions_template_id ON public.vault_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_vault_template_versions_type ON public.vault_template_versions(package_type);
CREATE INDEX IF NOT EXISTS idx_vault_template_versions_workspace ON public.vault_template_versions(workspace_id, created_at DESC);

-- ─── Idempotency Keys on Existing Tables ────────────────────────────────────────

ALTER TABLE public.vault_evidence_items ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_evidence_items_idempotency ON public.vault_evidence_items(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.vault_exports ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_exports_idempotency ON public.vault_exports(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.vault_shares ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_shares_idempotency ON public.vault_shares(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.vault_holds ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_holds_idempotency ON public.vault_holds(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ─── Event Type Registry ──────────────────────────────────────────────────────

INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('evidence.job_queued', 'evidence_legal', 'Async Job Queued', 'Background job queued for bulk vault operation.', 'low', 'STANDARD'),
  ('evidence.job_completed', 'evidence_legal', 'Async Job Completed', 'Background job completed successfully.', 'low', 'STANDARD'),
  ('evidence.job_failed', 'evidence_legal', 'Async Job Failed', 'Background job failed after retries.', 'medium', 'EXTENDED'),
  ('evidence.chain_anchored', 'evidence_legal', 'Chain Anchor Created', 'Package/item hash anchored to external chain.', 'low', 'REGULATED'),
  ('evidence.template_created', 'evidence_legal', 'Package Template Created', 'Custom package template version created.', 'low', 'STANDARD')
ON CONFLICT (event_type) DO NOTHING;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.vault_async_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_chain_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_template_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_async_jobs ON public.vault_async_jobs;
  CREATE POLICY tenant_isolation_vault_async_jobs ON public.vault_async_jobs
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_chain_anchors ON public.vault_chain_anchors;
  CREATE POLICY tenant_isolation_vault_chain_anchors ON public.vault_chain_anchors
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_template_versions ON public.vault_template_versions;
  CREATE POLICY tenant_isolation_vault_template_versions ON public.vault_template_versions
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
