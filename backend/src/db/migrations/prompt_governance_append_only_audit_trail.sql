-- ============================================================
-- ZoikoVertex - Prompt Governance Append-Only Audit Trail
--
-- Batch 2: a DEDICATED, immutable governance audit ledger for
-- Prompt Governance. This is independent from system_logs and
-- independent from the Evidence Vault.
--
--   Evidence Vault answers:  "What happened?"  (content-hashed artifact)
--   Audit Ledger answers:    "Who did it, when, why, and what changed?"
--
-- Every Prompt Governance lifecycle action (create, update, clone,
-- version, test, approve, reject, deploy, rollback, retire, archive,
-- restore, risk change, ownership change, knowledge binding change,
-- tool permission change, dependency change) writes an append-only
-- record here. Records are append-only: no UPDATE, no DELETE, enforced
-- at the database tier by a mutation-blocking trigger.
--
-- Scope: Prompt Governance only. Does NOT modify system_logs, the
-- Evidence Vault, Agent Studio, Knowledge Base, Workflows, or Agent
-- Operations. Idempotent: safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS prompt_audit_ledger (
  -- Audit ID (immutable primary key)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-readable audit reference (PAUD-...)
  audit_ref text,
  -- Tenant isolation
  workspace_id uuid NOT NULL,
  tenant_id uuid,
  -- Subject of the audit record
  prompt_id uuid,
  version_id uuid,
  -- Actor identity at the time of the action
  actor_id uuid,
  actor_name text NOT NULL DEFAULT 'system',
  actor_role text NOT NULL DEFAULT 'system',
  -- What happened
  event_type text NOT NULL,
  reason text NOT NULL DEFAULT '',
  -- Approval / governance context for the action (reviewer role, completion, environment, etc.)
  approval_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_level text NOT NULL DEFAULT 'medium',
  -- What changed
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Cross-references
  evidence_reference text,
  source_ip text,
  correlation_id text,
  -- When
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill columns if the table pre-existed from an earlier partial run.
ALTER TABLE prompt_audit_ledger
  ADD COLUMN IF NOT EXISTS audit_ref text,
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS prompt_id uuid,
  ADD COLUMN IF NOT EXISTS version_id uuid,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS actor_name text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS actor_role text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS approval_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_reference text,
  ADD COLUMN IF NOT EXISTS source_ip text,
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- The hot path is "audit for ONE prompt within ONE workspace, newest first"
-- (GET /prompts/:id/audit and /timeline). This composite index fully serves
-- that query (tenant filter + prompt filter + ORDER BY created_at DESC + range
-- pagination) without a sort step, keeping it fast as the ledger grows to
-- hundreds of thousands of rows.
CREATE INDEX IF NOT EXISTS idx_prompt_audit_ledger_ws_prompt_created
  ON prompt_audit_ledger (workspace_id, prompt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_ledger_prompt_created
  ON prompt_audit_ledger (prompt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_ledger_workspace_created
  ON prompt_audit_ledger (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_ledger_event_type
  ON prompt_audit_ledger (event_type);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_ledger_actor
  ON prompt_audit_ledger (actor_id);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_ledger_version
  ON prompt_audit_ledger (version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_ledger_risk_level
  ON prompt_audit_ledger (risk_level);
CREATE INDEX IF NOT EXISTS idx_prompt_audit_ledger_correlation
  ON prompt_audit_ledger (correlation_id);

-- ── Immutability: append-only enforcement at the database tier ──────────────
-- No UPDATE, no DELETE, no overwrite. There is no update or delete endpoint in
-- the API, and any direct mutation attempt against the ledger is rejected here.
CREATE OR REPLACE FUNCTION prompt_audit_ledger_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'prompt_audit_ledger is append-only; % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompt_audit_ledger_no_mutation ON prompt_audit_ledger;
CREATE TRIGGER prompt_audit_ledger_no_mutation
  BEFORE UPDATE OR DELETE ON prompt_audit_ledger
  FOR EACH ROW EXECUTE FUNCTION prompt_audit_ledger_block_mutation();

NOTIFY pgrst, 'reload schema';
