-- 25_identity_ledger_phase1.sql
-- Identity Ledger Phase 1: Ledger Foundation

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Actor Registry ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.identity_actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(100) NOT NULL,
  workspace_id UUID NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  actor_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  email_hash TEXT,
  state TEXT NOT NULL DEFAULT 'active',
  external_identity_id TEXT,
  source_system TEXT NOT NULL DEFAULT 'zoikovertex',
  source_ref_id TEXT,
  authority_class TEXT NOT NULL DEFAULT 'standard',
  risk_level TEXT NOT NULL DEFAULT 'low',
  risk_flags JSONB NOT NULL DEFAULT '[]',
  current_roles TEXT[] NOT NULL DEFAULT '{}',
  current_permissions TEXT[] NOT NULL DEFAULT '{}',
  current_authority_snapshot_id VARCHAR(50),
  last_activity_at TIMESTAMPTZ,
  profile JSONB NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT identity_actors_actor_id_unique UNIQUE (actor_id),
  CONSTRAINT identity_actors_actor_type_valid CHECK (
    actor_type IN ('human_user', 'ai_agent', 'service_account', 'system', 'external_reviewer', 'delegated_actor', 'break_glass_actor')
  ),
  CONSTRAINT identity_actors_state_valid CHECK (
    state IN ('invited', 'active', 'restricted', 'suspended', 'revoked', 'expired', 'break_glass_active', 'under_legal_hold')
  ),
  CONSTRAINT identity_actors_risk_valid CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_identity_actors_workspace ON public.identity_actors(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_identity_actors_type ON public.identity_actors(actor_type);
CREATE INDEX IF NOT EXISTS idx_identity_actors_state ON public.identity_actors(state);
CREATE INDEX IF NOT EXISTS idx_identity_actors_risk ON public.identity_actors(risk_level);
CREATE INDEX IF NOT EXISTS idx_identity_actors_snapshot ON public.identity_actors(current_authority_snapshot_id);

-- ─── Ledger Entries ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.identity_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_entry_id VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  data_residency TEXT NOT NULL DEFAULT 'auto',
  schema_version TEXT NOT NULL DEFAULT '1.0',
  entry_type TEXT NOT NULL,
  entry_category TEXT NOT NULL,
  timestamp_utc TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  actor_id VARCHAR(100) NOT NULL,
  actor_type TEXT NOT NULL,
  source JSONB NOT NULL DEFAULT '{}',
  authority_change JSONB NOT NULL DEFAULT '{}',
  session_context JSONB NOT NULL DEFAULT '{}',
  approvals JSONB NOT NULL DEFAULT '[]',
  linked_authority_snapshot_id VARCHAR(50),
  risk JSONB NOT NULL DEFAULT '{}',
  retention JSONB NOT NULL DEFAULT '{}',
  hash TEXT NOT NULL,
  prev_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT identity_ledger_entries_entry_id_unique UNIQUE (ledger_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_ledger_entries_workspace ON public.identity_ledger_entries(workspace_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_identity_ledger_entries_actor ON public.identity_ledger_entries(actor_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_identity_ledger_entries_snapshot ON public.identity_ledger_entries(linked_authority_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_identity_ledger_entries_type ON public.identity_ledger_entries(entry_type);

-- ─── Authority Snapshots ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.identity_authority_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_snapshot_id VARCHAR(50) NOT NULL,
  actor_id VARCHAR(100) NOT NULL,
  actor_type TEXT NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  roles_at_time JSONB NOT NULL DEFAULT '[]',
  permissions_at_time JSONB NOT NULL DEFAULT '[]',
  policy_constraints JSONB NOT NULL DEFAULT '{}',
  delegation_context JSONB,
  agent_context JSONB,
  service_account_context JSONB,
  source_lineage JSONB NOT NULL DEFAULT '[]',
  snapshot_hash TEXT NOT NULL,
  created_by_ledger_entry_id VARCHAR(50) NOT NULL,
  superseded_by VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT identity_authority_snapshots_snapshot_id_unique UNIQUE (authority_snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_authority_snapshots_actor ON public.identity_authority_snapshots(actor_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_identity_authority_snapshots_workspace ON public.identity_authority_snapshots(workspace_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_identity_authority_snapshots_current ON public.identity_authority_snapshots(actor_id) WHERE effective_until IS NULL;

-- ─── Chain Verification ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.identity_chain_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'verified',
  last_verified_entry_id VARCHAR(50),
  verified_entry_count INT NOT NULL DEFAULT 0,
  broken_links JSONB NOT NULL DEFAULT '[]',
  verified_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT identity_chain_verifications_verification_id_unique UNIQUE (verification_id),
  CONSTRAINT identity_chain_verifications_status_valid CHECK (status IN ('verified', 'degraded', 'broken'))
);

CREATE INDEX IF NOT EXISTS idx_identity_chain_verifications_workspace ON public.identity_chain_verifications(workspace_id, verified_at DESC);

-- ─── Audit Trail Read Optimizers ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_events_authority_snapshot
  ON public.audit_events ((authority->>'authority_snapshot_id'));

CREATE INDEX IF NOT EXISTS idx_audit_events_actor_event_time
  ON public.audit_events ((actor->>'actor_id'), timestamp_utc DESC);

-- ─── Event Type Registry ─────────────────────────────────────────────────────

INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('identity.created', 'user_identity', 'Identity Created', 'Canonical actor created or synchronized into the Identity Ledger.', 'low', 'REGULATED'),
  ('agent.created', 'ai_agent', 'Agent Identity Created', 'AI agent identity synchronized into the Identity Ledger.', 'low', 'REGULATED'),
  ('service_account.created', 'platform_integration', 'Service Account Created', 'Service account identity synchronized into the Identity Ledger.', 'medium', 'REGULATED'),
  ('authority.snapshot_created', 'user_identity', 'Authority Snapshot Created', 'Authority snapshot created or rotated for an actor.', 'medium', 'REGULATED'),
  ('identity_ledger.viewed', 'user_identity', 'Identity Ledger Viewed', 'Identity Ledger data was viewed by an authorized actor.', 'low', 'REGULATED'),
  ('authority_proof.generated', 'user_identity', 'Authority Proof Generated', 'Point-in-time authority proof was generated for an audit-linked action.', 'medium', 'REGULATED'),
  ('identity.chain_verified', 'system_security', 'Identity Chain Verified', 'Identity Ledger hash chain verification was executed.', 'low', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;

-- ─── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.identity_actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_authority_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_chain_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_identity_actors ON public.identity_actors;
  CREATE POLICY tenant_isolation_identity_actors ON public.identity_actors
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_identity_ledger_entries ON public.identity_ledger_entries;
  CREATE POLICY tenant_isolation_identity_ledger_entries ON public.identity_ledger_entries
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_identity_authority_snapshots ON public.identity_authority_snapshots;
  CREATE POLICY tenant_isolation_identity_authority_snapshots ON public.identity_authority_snapshots
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_identity_chain_verifications ON public.identity_chain_verifications;
  CREATE POLICY tenant_isolation_identity_chain_verifications ON public.identity_chain_verifications
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
