-- ============================================================
-- ZoikoVertex Workflow Three-Key Approval — Schema Migration
--
-- Adds approval chain tracking for workflow governance:
--   Low risk    → 1 key (AGENT_ARCHITECT)
--   Medium risk  → 2 keys (AGENT_ARCHITECT + ADMIN/WORKSPACE_OWNER)
--   High/Critical → 3 keys (AGENT_ARCHITECT + ADMIN/WORKSPACE_OWNER + GOVERNANCE_ADMIN)
--
-- Rules enforced at application layer:
--   - Same user cannot satisfy multiple keys
--   - Self-approval prohibited
--   - Duplicate approvals prohibited
--   - Missing key blocks activation
-- ============================================================

-- ─── TABLE: workflow_approval_chains ───────────────────────────
-- Tracks the approval chain header for a workflow version

CREATE TABLE IF NOT EXISTS workflow_approval_chains (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         UUID             NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  version_id          UUID             NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  risk_level          TEXT             NOT NULL,
  status              TEXT             NOT NULL DEFAULT 'pending',
  -- pending | in_progress | approved | rejected
  created_by          UUID,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_chains_workflow  ON workflow_approval_chains(workflow_id);
CREATE INDEX idx_approval_chains_version   ON workflow_approval_chains(version_id);
CREATE INDEX idx_approval_chains_status    ON workflow_approval_chains(status);

-- ─── TABLE: workflow_approval_keys ─────────────────────────────
-- Individual approval records (keys) in the chain

CREATE TABLE IF NOT EXISTS workflow_approval_keys (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id            UUID             NOT NULL REFERENCES workflow_approval_chains(id) ON DELETE CASCADE,
  approval_sequence   INTEGER          NOT NULL,
  required_role       TEXT             NOT NULL,
  approver_id         UUID,
  approver_name       TEXT,
  decision            TEXT,
  -- approved | rejected | changes_requested
  decision_reason     TEXT,
  decided_at          TIMESTAMPTZ,
  evidence_ref        TEXT,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_keys_chain     ON workflow_approval_keys(chain_id);
CREATE INDEX idx_approval_keys_sequence  ON workflow_approval_keys(chain_id, approval_sequence);
CREATE INDEX idx_approval_keys_approver  ON workflow_approval_keys(approver_id);

-- ─── UPDATED_AT TRIGGER FOR chains ─────────────────────────────

CREATE OR REPLACE FUNCTION update_approval_chain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_approval_chain_updated_at
  BEFORE UPDATE ON workflow_approval_chains
  FOR EACH ROW EXECUTE FUNCTION update_approval_chain_updated_at();

-- ─── RLS ───────────────────────────────────────────────────────

ALTER TABLE workflow_approval_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approval_keys   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_access_approval_chains"
  ON workflow_approval_chains FOR ALL
  USING (
    workflow_id IN (
      SELECT id FROM workflow_templates
      WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );

CREATE POLICY "workspace_access_approval_keys"
  ON workflow_approval_keys FOR ALL
  USING (
    chain_id IN (
      SELECT wac.id FROM workflow_approval_chains wac
      JOIN workflow_templates wt ON wac.workflow_id = wt.id
      WHERE wt.workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );
