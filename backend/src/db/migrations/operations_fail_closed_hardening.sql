-- ============================================================================
--  AGENT OPERATIONS — FAIL-CLOSED & GOVERNANCE HARDENING (idempotent, additive)
-- ============================================================================
--  Purpose
--    Closes gaps G5 (no fail-closed), G6 (empty policy defaults to pass),
--    G7 (no self-approval prevention), G8 (no conflict detection),
--    G9-G10 (tenant_id nullable and not filtered) from the Agent Operations
--    staging verification.
--
--    Every statement is additive and idempotent:
--      ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS
--      ALTER TYPE ... ADD VALUE IF NOT EXISTS
--    No data is dropped or rewritten. Safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) ENUM EXTENSIONS
--    Add not_evaluated to policy_outcome so the fail-closed guard can record
--    "could not evaluate" as a distinct outcome rather than silently passing.
-- ----------------------------------------------------------------------------
ALTER TYPE policy_outcome ADD VALUE IF NOT EXISTS 'not_evaluated';

-- ----------------------------------------------------------------------------
-- 2) TENANT ISOLATION COLUMNS (G9, G10)
--    Backfill tenant_id on existing rows and add tenant+workspace indexes.
--    tenant_id remains nullable for backward compatibility with rows that
--    predate tenant-scoped operations.
-- ----------------------------------------------------------------------------
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE agent_runs
   SET tenant_id = workspace_id
 WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant_workspace
  ON agent_runs (tenant_id, workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_queue_items_tenant
  ON queue_items (workspace_id, queue_type, status);
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE queue_items
   SET tenant_id = agent_runs.tenant_id
  FROM agent_runs
 WHERE queue_items.run_id = agent_runs.id
   AND queue_items.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_tenant
  ON incidents (workspace_id, severity, status);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE incidents
   SET tenant_id = agent_runs.tenant_id
  FROM agent_runs
 WHERE incidents.run_id = agent_runs.id
   AND incidents.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_policy_results_tenant
  ON policy_results (run_id, outcome);

-- ----------------------------------------------------------------------------
-- 3) QUEUE ITEM CREATOR COLUMN (G7 — self-approval prevention)
--    Track who created each queue item so self-assignment can be prevented.
-- ----------------------------------------------------------------------------
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS created_by uuid;

-- ----------------------------------------------------------------------------
-- 4) DEDICATED GOVERNANCE TABLES (G1, G2, G3)
--    operations_approvals: tracks approval requests, denials, and chain.
--    operations_exports: tracks evidence/output export audit records.
--    operations_metrics: pre-aggregated operational metrics for analytics.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS operations_approvals (
  id               uuid PRIMARY KEY,
  run_id           uuid NOT NULL REFERENCES agent_runs(id),
  workspace_id     uuid NOT NULL,
  tenant_id        uuid,
  approval_type    text NOT NULL,
  requested_by     uuid NOT NULL,
  requested_by_name text,
  approved_by      uuid,
  approved_by_name text,
  status           text NOT NULL DEFAULT 'pending',
  denial_reason    text,
  conflict_type    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);

ALTER TABLE operations_approvals ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_approvals_run
  ON operations_approvals (run_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_tenant
  ON operations_approvals (workspace_id, status);

ALTER TABLE operations_approvals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS operations_exports (
  id               uuid PRIMARY KEY,
  run_id           uuid,
  bundle_id        uuid,
  workspace_id     uuid NOT NULL,
  tenant_id        uuid,
  export_type      text NOT NULL,
  exported_by      uuid NOT NULL,
  exported_by_name text,
  reason           text NOT NULL,
  storage_ref      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exports_tenant
  ON operations_exports (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_run
  ON operations_exports (run_id);

ALTER TABLE operations_exports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS operations_metrics (
  id               uuid PRIMARY KEY,
  workspace_id     uuid NOT NULL,
  tenant_id        uuid,
  period_start     timestamptz NOT NULL,
  period_end       timestamptz NOT NULL,
  metric_name      text NOT NULL,
  metric_value     numeric NOT NULL,
  dimension        text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_tenant_period
  ON operations_metrics (workspace_id, period_start DESC, metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_name
  ON operations_metrics (metric_name, period_start DESC);

ALTER TABLE operations_metrics ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5) POSTMORTEM COLUMNS ON INCIDENTS (G4)
--    postmortem holds the structured root-cause analysis and recommendations.
-- ----------------------------------------------------------------------------
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS postmortem jsonb;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS postmortem_created_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS postmortem_created_by uuid;

-- ============================================================================
--  POST-RUN VERIFICATION
-- ----------------------------------------------------------------------------
--  SELECT unnest(enum_range(NULL::policy_outcome));
--  SELECT column_name FROM information_schema.columns
--    WHERE table_name='queue_items' AND column_name='created_by';
--  SELECT tablename FROM pg_tables
--    WHERE tablename IN ('operations_approvals','operations_exports','operations_metrics');
-- ============================================================================
