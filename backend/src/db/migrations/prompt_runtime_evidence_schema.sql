-- ============================================================
-- ZoikoVertex - Prompt Governance Runtime Evidence Schema
--
-- Phase 4 / Batch 4.1: runtime evidence + incident schema for
-- Prompt Governance. Records what a production execution actually
-- used (prompt version, model, policy result, tools, KB sources)
-- and the incidents raised in response.
--
--   prompt_runtime_traces : APPEND-ONLY immutable execution facts.
--                           Ingestion-only — the Runtime Engine remains
--                           the source of truth; Prompt Governance
--                           records and reads, it does NOT enforce.
--   prompt_incidents      : prompt-scoped incident records with an
--                           open -> investigating -> resolved -> closed
--                           lifecycle. The row is mutable for status
--                           transitions, but is DELETE-blocked (never
--                           erasable); immutable history is preserved by
--                           mirroring every transition to the append-only
--                           prompt_audit_ledger (service tier, Batch 4.4).
--
-- Evidence linkage reuses PromptEvidenceService / the Evidence Vault
-- (evidence_id / evidence_ref / evidence_hash mirror the receipt from
-- preserveEvidence()). The canonical chain remains prompt_evidence_links.
--
-- Scope: Prompt Governance tables only. Does NOT modify the Runtime
-- Engine, Evidence Vault infrastructure, Audit Ledger infrastructure,
-- Agent Studio, Knowledge Base, Workflows, or Agent Operations.
-- No foreign keys (loose uuid linkage, per project convention).
-- Idempotent: safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ============================================================
-- 1. prompt_runtime_traces  (APPEND-ONLY)
-- ============================================================
CREATE TABLE IF NOT EXISTS prompt_runtime_traces (
  -- Immutable primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Tenant isolation
  workspace_id uuid NOT NULL,
  tenant_id uuid,
  -- Subject of the trace
  prompt_id uuid,
  prompt_version_id uuid,
  -- Runtime execution fact (Doc 3 section 13 - PromptRuntimeTrace)
  execution_id text NOT NULL DEFAULT '',
  environment text NOT NULL DEFAULT 'production',
  model_id text,
  input_hash text,
  output_hash text,
  policy_result text,
  policy_result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  kb_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  runtime_policy_id uuid,
  violation boolean NOT NULL DEFAULT false,
  violation_reason text,
  -- Phase 3B reuse: dependency-health snapshot at execution time
  dependency_health_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Deployment linkage (loose uuid, no FK)
  deployment_id uuid,
  -- Evidence linkage (receipt from PromptEvidenceService.record())
  evidence_id uuid,
  evidence_ref text,
  evidence_hash text,
  -- Provenance
  actor_id uuid,
  source_ip text,
  correlation_id text,
  -- When (append-only; no updated_at)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill columns if the table pre-existed from an earlier partial run.
ALTER TABLE prompt_runtime_traces
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS prompt_id uuid,
  ADD COLUMN IF NOT EXISTS prompt_version_id uuid,
  ADD COLUMN IF NOT EXISTS execution_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS input_hash text,
  ADD COLUMN IF NOT EXISTS output_hash text,
  ADD COLUMN IF NOT EXISTS policy_result text,
  ADD COLUMN IF NOT EXISTS policy_result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kb_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS runtime_policy_id uuid,
  ADD COLUMN IF NOT EXISTS violation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS violation_reason text,
  ADD COLUMN IF NOT EXISTS dependency_health_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deployment_id uuid,
  ADD COLUMN IF NOT EXISTS evidence_id uuid,
  ADD COLUMN IF NOT EXISTS evidence_ref text,
  ADD COLUMN IF NOT EXISTS evidence_hash text,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS source_ip text,
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- Hot path: "runtime traces for ONE prompt within ONE workspace, newest first".
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_ws_prompt_created
  ON prompt_runtime_traces (workspace_id, prompt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_version_created
  ON prompt_runtime_traces (prompt_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_workspace_created
  ON prompt_runtime_traces (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_execution
  ON prompt_runtime_traces (execution_id);
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_runtime_policy_id
  ON prompt_runtime_traces (runtime_policy_id);
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_deployment
  ON prompt_runtime_traces (deployment_id);
-- Partial index for violation rollups (Batch 4.6 dashboard).
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_traces_violations
  ON prompt_runtime_traces (workspace_id, created_at DESC)
  WHERE violation = true;

-- ── Immutability: append-only enforcement at the database tier ──────────────
-- No UPDATE, no DELETE. Runtime traces are immutable execution facts.
CREATE OR REPLACE FUNCTION prompt_runtime_traces_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'prompt_runtime_traces is append-only; % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompt_runtime_traces_no_mutation ON prompt_runtime_traces;
CREATE TRIGGER prompt_runtime_traces_no_mutation
  BEFORE UPDATE OR DELETE ON prompt_runtime_traces
  FOR EACH ROW EXECUTE FUNCTION prompt_runtime_traces_block_mutation();

-- ============================================================
-- 2. prompt_incidents  (mutable lifecycle, DELETE-blocked)
-- ============================================================
CREATE TABLE IF NOT EXISTS prompt_incidents (
  -- Immutable primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-readable incident reference (PINC-...)
  incident_ref text,
  -- Tenant isolation
  workspace_id uuid NOT NULL,
  tenant_id uuid,
  -- Subject of the incident
  prompt_id uuid,
  prompt_version_id uuid,
  -- Incident linkage: the runtime trace that triggered it (one-way; traces
  -- are append-only and cannot be back-patched with an incident_id).
  runtime_trace_id uuid,
  -- Deployment linkage (loose uuid, no FK)
  deployment_id uuid,
  rollback_deployment_id uuid,
  rollback_to_version_id uuid,
  -- Classification + lifecycle
  severity text NOT NULL DEFAULT 'medium',
  category text,
  trigger text,
  status text NOT NULL DEFAULT 'open',
  runtime_policy_id uuid,
  -- People + remediation
  detected_by text,
  owner_id uuid,
  remediation text NOT NULL DEFAULT '',
  post_incident_note text NOT NULL DEFAULT '',
  affected_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Evidence linkage (receipt from PromptEvidenceService.record())
  evidence_id uuid,
  evidence_ref text,
  evidence_hash text,
  -- Timing
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill columns if the table pre-existed from an earlier partial run.
ALTER TABLE prompt_incidents
  ADD COLUMN IF NOT EXISTS incident_ref text,
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS prompt_id uuid,
  ADD COLUMN IF NOT EXISTS prompt_version_id uuid,
  ADD COLUMN IF NOT EXISTS runtime_trace_id uuid,
  ADD COLUMN IF NOT EXISTS deployment_id uuid,
  ADD COLUMN IF NOT EXISTS rollback_deployment_id uuid,
  ADD COLUMN IF NOT EXISTS rollback_to_version_id uuid,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS trigger text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS runtime_policy_id uuid,
  ADD COLUMN IF NOT EXISTS detected_by text,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS remediation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS post_incident_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS affected_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_id uuid,
  ADD COLUMN IF NOT EXISTS evidence_ref text,
  ADD COLUMN IF NOT EXISTS evidence_hash text,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prompt_incidents_ws_prompt_created
  ON prompt_incidents (workspace_id, prompt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_incidents_version
  ON prompt_incidents (prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_incidents_status
  ON prompt_incidents (status);
CREATE INDEX IF NOT EXISTS idx_prompt_incidents_severity
  ON prompt_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_prompt_incidents_runtime_trace
  ON prompt_incidents (runtime_trace_id);
CREATE INDEX IF NOT EXISTS idx_prompt_incidents_deployment
  ON prompt_incidents (deployment_id);
CREATE INDEX IF NOT EXISTS idx_prompt_incidents_runtime_policy_id
  ON prompt_incidents (runtime_policy_id);

-- ── Immutability: history is preserved by blocking DELETE only ──────────────
-- Incidents have an open -> investigating -> resolved -> closed lifecycle, so
-- the row must remain UPDATE-able. It is never erasable (DELETE blocked), and
-- every transition is mirrored to the append-only prompt_audit_ledger by the
-- service tier (Batch 4.4).
CREATE OR REPLACE FUNCTION prompt_incidents_block_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'prompt_incidents is delete-protected; DELETE is not permitted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompt_incidents_no_delete ON prompt_incidents;
CREATE TRIGGER prompt_incidents_no_delete
  BEFORE DELETE ON prompt_incidents
  FOR EACH ROW EXECUTE FUNCTION prompt_incidents_block_delete();

-- updated_at maintenance on lifecycle transitions.
DROP TRIGGER IF EXISTS prompt_incidents_updated_at ON prompt_incidents;
CREATE TRIGGER prompt_incidents_updated_at
  BEFORE UPDATE ON prompt_incidents
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 3. In-scope hardening: index the pre-existing runtime_policy_id
--    on prompt_tool_permissions (closes a Phase 3B known limitation).
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prompt_tool_permissions_runtime_policy_id
  ON prompt_tool_permissions (runtime_policy_id);

NOTIFY pgrst, 'reload schema';
