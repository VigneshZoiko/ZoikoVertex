-- 21_evidence_vault_phase1.sql
-- Evidence Vault: Evidence item preservation, collections, hashing, retention

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE vault_item_state AS ENUM (
    'requested', 'capturing', 'preserved', 'sealed', 'legal_hold',
    'archived', 'quarantined', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_retention_class AS ENUM (
    'standard', 'extended', 'regulated', 'legal_hold', 'contractual_custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_source_type AS ENUM (
    'audit_event', 'forensic_case', 'social_payload', 'ai_output',
    'policy_snapshot', 'identity_proof', 'file', 'webhook_payload'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vault_sensitivity AS ENUM ('public', 'internal', 'restricted', 'confidential', 'legal_privileged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Vault Evidence Items ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(50) NOT NULL,
  schema_version VARCHAR(10) DEFAULT '1.0',
  tenant_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  data_residency VARCHAR(50) DEFAULT 'auto',

  -- Source
  source_type vault_source_type NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  source_system VARCHAR(100) NOT NULL,
  source_timestamp_utc TIMESTAMPTZ,

  -- Classification
  evidence_type VARCHAR(100),
  risk_level VARCHAR(20) DEFAULT 'medium',
  sensitivity vault_sensitivity DEFAULT 'internal',
  contains_pii BOOLEAN DEFAULT false,
  contains_ai_output BOOLEAN DEFAULT false,
  jurisdictions TEXT[] DEFAULT '{}',

  -- Integrity hashes
  original_content_hash VARCHAR(255),
  normalized_content_hash VARCHAR(255),
  metadata_hash VARCHAR(255),
  preservation_receipt_hash VARCHAR(255),
  hash_algorithm VARCHAR(50) DEFAULT 'SHA-256',

  -- Custody
  preserved_by_actor_id VARCHAR(100) NOT NULL,
  authority VARCHAR(255),
  preservation_reason TEXT NOT NULL,
  origin_ip_hash VARCHAR(255),

  -- Retention
  retention_class vault_retention_class DEFAULT 'standard',
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN DEFAULT false,
  hold_ids UUID[] DEFAULT '{}',

  -- State
  vault_state vault_item_state DEFAULT 'requested',
  access_policy_id VARCHAR(100),

  -- Content (encrypted payload reference)
  payload_ref TEXT,
  payload_size BIGINT DEFAULT 0,
  mime_type VARCHAR(100),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  verification_count INT DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  last_verified_by VARCHAR(100),

  -- Tracking
  captured_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_items_workspace ON public.vault_evidence_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_source ON public.vault_evidence_items(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_state ON public.vault_evidence_items(vault_state);
CREATE INDEX IF NOT EXISTS idx_vault_items_retention ON public.vault_evidence_items(retention_class);
CREATE INDEX IF NOT EXISTS idx_vault_items_legal_hold ON public.vault_evidence_items(legal_hold);
CREATE INDEX IF NOT EXISTS idx_vault_items_created ON public.vault_evidence_items(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_items_item_id ON public.vault_evidence_items(item_id);

-- ─── Evidence Collections ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_evidence_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scope JSONB DEFAULT '{}',
  initial_item_hash VARCHAR(255),
  item_count INT DEFAULT 0,
  created_by VARCHAR(100) NOT NULL,
  created_reason TEXT,
  schema_version VARCHAR(10) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_collections_id ON public.vault_evidence_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_vault_collections_workspace ON public.vault_evidence_collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vault_collections_created ON public.vault_evidence_collections(created_at DESC);

-- ─── Collection-Item Junction ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.vault_evidence_collections(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.vault_evidence_items(id) ON DELETE CASCADE,
  added_by VARCHAR(100) NOT NULL,
  added_reason TEXT,
  added_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(collection_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_vault_col_items_collection ON public.vault_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_vault_col_items_item ON public.vault_collection_items(item_id);

-- ─── Event Type Registry ──────────────────────────────────────────────────────

INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('evidence.item_preserved', 'evidence_legal', 'Evidence Item Preserved', 'Evidence item preserved in the Vault with hash receipt.', 'medium', 'REGULATED'),
  ('evidence.item_verified', 'evidence_legal', 'Evidence Item Verified', 'Hash verification completed for a vault evidence item.', 'low', 'EXTENDED'),
  ('evidence.item_failed', 'evidence_legal', 'Evidence Preservation Failed', 'Evidence preservation attempt failed.', 'high', 'REGULATED'),
  ('evidence.collection_created', 'evidence_legal', 'Collection Created', 'Evidence collection created from items or source scope.', 'low', 'EXTENDED'),
  ('evidence.collection_appended', 'evidence_legal', 'Collection Appended', 'Items appended to an existing evidence collection.', 'low', 'EXTENDED'),
  ('evidence.vault_quarantine', 'evidence_legal', 'Vault Quarantine', 'Evidence item entered quarantine state due to partial preservation.', 'high', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.vault_evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_evidence_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_collection_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_items ON public.vault_evidence_items;
  CREATE POLICY tenant_isolation_vault_items ON public.vault_evidence_items
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_collections ON public.vault_evidence_collections;
  CREATE POLICY tenant_isolation_vault_collections ON public.vault_evidence_collections
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_vault_col_items ON public.vault_collection_items;
  CREATE POLICY tenant_isolation_vault_col_items ON public.vault_collection_items
    USING (collection_id IN (SELECT id FROM public.vault_evidence_collections WHERE tenant_id = current_setting('app.tenant_id', true)));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
