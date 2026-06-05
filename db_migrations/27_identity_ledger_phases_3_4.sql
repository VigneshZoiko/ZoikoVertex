-- 27_identity_ledger_phases_3_4.sql
-- Identity Ledger Phase 3 (Evidence Integration) and Phase 4 (Advanced Assurance)

-- 1. Legal Hold Enhancements
ALTER TABLE public.identity_ledger_entries 
ADD COLUMN IF NOT EXISTS legal_hold_status BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_hold_expiry TIMESTAMPTZ;

ALTER TABLE public.identity_authority_snapshots 
ADD COLUMN IF NOT EXISTS legal_hold_status BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_hold_expiry TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_identity_ledger_entries_legal_hold 
ON public.identity_ledger_entries(legal_hold_status) WHERE legal_hold_status = true;

CREATE INDEX IF NOT EXISTS idx_identity_authority_snapshots_legal_hold 
ON public.identity_authority_snapshots(legal_hold_status) WHERE legal_hold_status = true;


-- 2. Phase 4: Automated Access Certification
CREATE TABLE IF NOT EXISTS public.identity_access_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id VARCHAR(50) NOT NULL UNIQUE,
  tenant_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  actor_id VARCHAR(100) NOT NULL,
  reviewer_actor_id VARCHAR(100) NOT NULL,
  role_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REVOKED, EXPIRED
  justification TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT identity_access_certifications_status_valid CHECK (status IN ('PENDING', 'APPROVED', 'REVOKED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_identity_access_certs_workspace 
ON public.identity_access_certifications(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_identity_access_certs_reviewer 
ON public.identity_access_certifications(reviewer_actor_id, status);


-- 3. Phase 4: Identity Graph Analytics Nodes
CREATE TABLE IF NOT EXISTS public.identity_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL,
  workspace_id UUID NOT NULL,
  actor_id VARCHAR(100) NOT NULL,
  node_type TEXT NOT NULL, -- e.g., 'DEVICE', 'IP', 'DELEGATION_CHAIN', 'ROLE'
  node_value TEXT NOT NULL,
  weight NUMERIC(5,2) DEFAULT 1.0,
  last_seen_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_identity_graph_nodes_lookup 
ON public.identity_graph_nodes(tenant_id, workspace_id, actor_id, node_type);


-- 4. Event Type Registry Inserts
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class)
VALUES
  ('identity.legal_hold_applied', 'evidence_legal', 'Legal Hold Applied', 'Identity Ledger entry placed under legal hold.', 'low', 'LEGAL_HOLD'),
  ('identity.legal_hold_released', 'evidence_legal', 'Legal Hold Released', 'Legal hold removed from Identity Ledger entry.', 'medium', 'REGULATED'),
  ('identity.recertification_started', 'policy_governance', 'Recertification Campaign Started', 'A privilege recertification campaign was initiated.', 'low', 'REGULATED'),
  ('identity.recertification_approved', 'policy_governance', 'Privilege Recertified', 'Actor privileges were re-certified by a reviewer.', 'low', 'REGULATED'),
  ('identity.recertification_revoked', 'policy_governance', 'Privilege Revoked via Recertification', 'Actor privileges were revoked during recertification.', 'medium', 'REGULATED'),
  ('identity.chain_head_anchored', 'system_security', 'Chain Head Anchored', 'Identity Ledger chain head was anchored externally.', 'low', 'REGULATED'),
  ('identity.anomaly_detected', 'system_security', 'Identity Anomaly Detected', 'Identity graph analytics flagged an anomalous event.', 'high', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;


-- 5. Row-Level Security
ALTER TABLE public.identity_access_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_graph_nodes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_identity_access_certs ON public.identity_access_certifications;
  CREATE POLICY tenant_isolation_identity_access_certs ON public.identity_access_certifications
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_identity_graph_nodes ON public.identity_graph_nodes;
  CREATE POLICY tenant_isolation_identity_graph_nodes ON public.identity_graph_nodes
    USING (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
