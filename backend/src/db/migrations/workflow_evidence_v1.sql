CREATE TABLE IF NOT EXISTS workflow_evidence_bundles (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         UUID             NOT NULL,
  version_id          UUID             NOT NULL,
  workspace_id        UUID             NOT NULL,
  bundle_type         TEXT             NOT NULL DEFAULT 'run',
  actor_id            UUID,
  actor_name          TEXT,
  input_snapshot      JSONB            DEFAULT '{}',
  output_snapshot     JSONB            DEFAULT '{}',
  policy_results      JSONB            DEFAULT '[]',
  dependency_results  JSONB            DEFAULT '[]',
  approval_chain_state JSONB           DEFAULT '{}',
  errors              JSONB            DEFAULT '[]',
  warnings            JSONB            DEFAULT '[]',
  blocks              JSONB            DEFAULT '[]',
  canonical_hash      TEXT             NOT NULL,
  hash_algo           TEXT             NOT NULL DEFAULT 'sha-256',
  evidence_ref        TEXT,
  source_run_id       TEXT,
  sealed_at           TIMESTAMPTZ,
  created_by          UUID,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wev_workflow    ON workflow_evidence_bundles(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wev_version     ON workflow_evidence_bundles(version_id);
CREATE INDEX IF NOT EXISTS idx_wev_workspace   ON workflow_evidence_bundles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wev_type        ON workflow_evidence_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_wev_hash        ON workflow_evidence_bundles(canonical_hash);
CREATE INDEX IF NOT EXISTS idx_wev_ref         ON workflow_evidence_bundles(evidence_ref);
CREATE INDEX IF NOT EXISTS idx_wev_created     ON workflow_evidence_bundles(created_at DESC);

ALTER TABLE workflow_evidence_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_wev_access"
  ON workflow_evidence_bundles FOR ALL
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);
