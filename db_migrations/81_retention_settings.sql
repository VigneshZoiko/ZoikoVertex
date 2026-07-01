-- ZoikoVertex — Migration 83: Workspace Retention Settings
-- Per-workspace/org retention policy configuration.
-- Defaults match the ZV-PRIV-DATA-RET-001 policy specification.
-- Run in Supabase SQL Editor. Idempotent.

-- ─── Retention Settings ───────────────────────────────────────────────────────
-- Each workspace gets one row with all retention categories.
-- Default periods follow the policy document. Workspace admins can view
-- these defaults; enterprise customers may override within min/max bounds.

CREATE TABLE IF NOT EXISTS workspace_retention_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,

  -- Audit Events (policy: 7 years for governance/security/evidence events)
  audit_events_months   INTEGER NOT NULL DEFAULT 84,   -- 7 years

  -- Evidence Vault Records (policy: 7 years default for sealed/evidence-linked)
  evidence_vault_months INTEGER NOT NULL DEFAULT 84,   -- 7 years

  -- Forensic Cases (policy: 7 years after closure; longer if legal hold)
  forensic_cases_months INTEGER NOT NULL DEFAULT 84,   -- 7 years after closure

  -- Decision Ledger (policy: 7 years — stores decision rationale)
  decision_ledger_months INTEGER NOT NULL DEFAULT 84,  -- 7 years

  -- Identity & Access Logs (policy: 2-7 years; 7 years privileged)
  identity_access_months INTEGER NOT NULL DEFAULT 84,  -- 7 years default

  -- Content History (policy: 3 years default / 7 years if published/evidence-linked)
  content_history_months INTEGER NOT NULL DEFAULT 36,  -- 3 years default

  -- Inbox Messages (policy: 12 months default / 24 months enterprise; 7 years if dispute)
  inbox_messages_months  INTEGER NOT NULL DEFAULT 12,  -- 12 months default

  -- Analytics Data — Identifiable (policy: 24 months identifiable / 60 months aggregated)
  analytics_identifiable_months  INTEGER NOT NULL DEFAULT 24,
  analytics_aggregated_months    INTEGER NOT NULL DEFAULT 60,

  -- Billing, Tax & Contract Records (policy: 7 years minimum)
  billing_records_months INTEGER NOT NULL DEFAULT 84,  -- 7 years

  -- Backups (policy: 30-90 days rolling — backups are resilience, not archives)
  backups_days           INTEGER NOT NULL DEFAULT 90,  -- 90 days rolling

  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional enterprise overrides (NULL = use default)
  enterprise_override   JSONB DEFAULT NULL
    -- e.g. { "inbox_messages_months": 24, "content_history_months": 84 }
);

-- RLS: workspace members can READ their own settings
ALTER TABLE workspace_retention_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own workspace retention settings" ON workspace_retention_settings;
CREATE POLICY "Users can read own workspace retention settings"
  ON workspace_retention_settings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update workspace retention settings" ON workspace_retention_settings;
CREATE POLICY "Admins can update workspace retention settings"
  ON workspace_retention_settings FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN')
    )
  );

-- Index for worker queries
CREATE INDEX IF NOT EXISTS idx_retention_settings_workspace ON workspace_retention_settings(workspace_id);

-- ─── Legal Holds Table (entities under active legal hold that override deletion) ──
-- Already exists as legal_holds in forensic/evidence modules.
-- This table is referenced by the retention worker to skip held records.

-- ─── Retention Execution Log ───────────────────────────────────────────────────
-- Records every retention worker run so admins can audit what was deleted.

CREATE TABLE IF NOT EXISTS retention_execution_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category        TEXT NOT NULL,       -- e.g. 'audit_events', 'content_history'
  records_before  INTEGER NOT NULL DEFAULT 0,
  records_deleted INTEGER NOT NULL DEFAULT 0,
  records_held    INTEGER NOT NULL DEFAULT 0,   -- skipped due to legal hold
  retention_months INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'completed',  -- 'completed', 'partial', 'failed'
  error_message   TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_retention_log_workspace ON retention_execution_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_retention_log_executed  ON retention_execution_log(executed_at DESC);

-- Enable realtime for the log so workspace admins see live updates
ALTER PUBLICATION supabase_realtime ADD TABLE retention_execution_log;

SELECT 'Migration 83 — retention settings applied' AS status;
