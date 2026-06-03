-- ============================================================
-- ZoikoVertex - Prompt Governance Evidence Vault integration
--
-- Batch 1 / Phase 9: wires Prompt Governance lifecycle events to
-- the immutable Evidence Vault (vault_evidence_items). This patch
-- adds a link table that ties each preserved vault record back to
-- the prompt and prompt version that produced it, so the Prompt
-- Governance UI can retrieve a prompt's full immutable evidence
-- chain (creation, modification, approval, deployment, rollback,
-- retirement, testing, policy results).
--
-- Scope: Prompt Governance tables only. Does not modify Agent
-- Studio, Knowledge Base, Workflows, Agent Operations, Dashboard,
-- or the shared Evidence Vault schema.
-- Idempotent: safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS prompt_evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid,
  prompt_version_id uuid,
  workspace_id uuid,
  tenant_id uuid,
  event_type text NOT NULL,
  -- Human-readable vault item identifier (EVI-...) from vault_evidence_items.item_id
  vault_item_id text,
  -- vault_evidence_items.id (UUID) for direct joins
  vault_item_uuid uuid,
  -- preservation_receipt_hash captured at preservation time for fast display
  evidence_hash text,
  risk_level text NOT NULL DEFAULT 'medium',
  actor_id uuid,
  reason text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill columns if the table pre-existed from an earlier partial run.
ALTER TABLE prompt_evidence_links
  ADD COLUMN IF NOT EXISTS prompt_id uuid,
  ADD COLUMN IF NOT EXISTS prompt_version_id uuid,
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS vault_item_id text,
  ADD COLUMN IF NOT EXISTS vault_item_uuid uuid,
  ADD COLUMN IF NOT EXISTS evidence_hash text,
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_prompt_evidence_links_prompt_created
  ON prompt_evidence_links (prompt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_evidence_links_version
  ON prompt_evidence_links (prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_evidence_links_workspace
  ON prompt_evidence_links (workspace_id);

-- prompt_evidence_links is an append-only link log. Block UPDATE/DELETE so
-- the evidence chain cannot be mutated through the database tier.
CREATE OR REPLACE FUNCTION prompt_evidence_links_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'prompt_evidence_links is append-only; % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompt_evidence_links_no_update ON prompt_evidence_links;
CREATE TRIGGER prompt_evidence_links_no_update
  BEFORE UPDATE OR DELETE ON prompt_evidence_links
  FOR EACH ROW EXECUTE FUNCTION prompt_evidence_links_block_mutation();

NOTIFY pgrst, 'reload schema';
