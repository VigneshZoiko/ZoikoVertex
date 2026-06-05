-- ============================================================
-- ZoikoVertex Workflows — Full Schema Migration
-- Based on: Workflows Page Build Contract (Document 2)
--
-- ⚠️ DESTRUCTIVE: drops and recreates all workflow tables.
--   Only run on environments where existing workflow data is
--   disposable (dev, staging, or fresh prod). Backup first.
-- ============================================================

-- ─── DROP EXISTING ───────────────────────────────────────────

DROP TABLE IF EXISTS simulation_runs         CASCADE;
DROP TABLE IF EXISTS dependency_records      CASCADE;
DROP TABLE IF EXISTS approval_records        CASCADE;
DROP TABLE IF EXISTS step_runs               CASCADE;
DROP TABLE IF EXISTS workflow_instances      CASCADE;
DROP TABLE IF EXISTS workflow_edges          CASCADE;
DROP TABLE IF EXISTS workflow_steps          CASCADE;
DROP TABLE IF EXISTS workflow_versions       CASCADE;
DROP TABLE IF EXISTS workflow_templates      CASCADE;

DROP TYPE IF EXISTS workflow_status          CASCADE;
DROP TYPE IF EXISTS workflow_version_state   CASCADE;
DROP TYPE IF EXISTS workflow_step_type       CASCADE;
DROP TYPE IF EXISTS workflow_instance_status CASCADE;
DROP TYPE IF EXISTS step_run_status          CASCADE;
DROP TYPE IF EXISTS approval_decision        CASCADE;
DROP TYPE IF EXISTS simulation_result        CASCADE;
DROP TYPE IF EXISTS dependency_type          CASCADE;
DROP TYPE IF EXISTS risk_level               CASCADE;
DROP TYPE IF EXISTS trigger_type             CASCADE;

-- ─── ENUMS ───────────────────────────────────────────────────

CREATE TYPE workflow_status AS ENUM (
  'draft',
  'testing',
  'pending_approval',
  'approved',
  'active',
  'paused',
  'blocked',
  'deprecated',
  'retired',
  'failed'
);

CREATE TYPE workflow_version_state AS ENUM (
  'draft',
  'test',
  'pending_approval',
  'approved',
  'active',
  'paused',
  'deprecated',
  'retired',
  'rollback'
);

CREATE TYPE workflow_step_type AS ENUM (
  'trigger',
  'agent_action',
  'prompt_execution',
  'knowledge_lookup',
  'policy_check',
  'human_review',
  'approval_gate',
  'schedule',
  'publish',
  'moderate',
  'notify',
  'escalate',
  'evidence_capture',
  'branch',
  'delay',
  'end'
);

CREATE TYPE workflow_instance_status AS ENUM (
  'pending',
  'running',
  'waiting_approval',
  'waiting_review',
  'paused',
  'blocked',
  'failed',
  'completed',
  'cancelled'
);

CREATE TYPE step_run_status AS ENUM (
  'pending',
  'running',
  'waiting',
  'completed',
  'failed',
  'skipped',
  'blocked'
);

CREATE TYPE approval_decision AS ENUM (
  'approved',
  'rejected',
  'changes_requested',
  'escalated',
  'delegated'
);

CREATE TYPE simulation_result AS ENUM (
  'pass',
  'warning',
  'blocked',
  'failed',
  'incomplete'
);

CREATE TYPE dependency_type AS ENUM (
  'agent',
  'prompt',
  'knowledge_source',
  'policy_pack',
  'connector',
  'campaign',
  'workflow'
);

CREATE TYPE risk_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE trigger_type AS ENUM (
  'manual',
  'schedule',
  'campaign_event',
  'content_request',
  'platform_event',
  'api'
);

-- ─── TABLE: workflow_templates ────────────────────────────────

CREATE TABLE workflow_templates (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID             NOT NULL,
  workspace_id        UUID             NOT NULL,
  name                TEXT             NOT NULL,
  description         TEXT,
  type                TEXT,
  status              workflow_status  NOT NULL DEFAULT 'draft',
  owner_id            UUID,
  owner_name          TEXT,
  business_unit_id    UUID,
  brand_ids           UUID[]           DEFAULT '{}',
  platforms           TEXT[]           DEFAULT '{}',
  risk_level          risk_level       NOT NULL DEFAULT 'medium',
  created_by          UUID,
  updated_by          UUID,
  current_version_id  UUID,
  active_from         TIMESTAMPTZ,
  retired_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_templates_workspace  ON workflow_templates(workspace_id);
CREATE INDEX idx_workflow_templates_tenant     ON workflow_templates(tenant_id);
CREATE INDEX idx_workflow_templates_status     ON workflow_templates(status);
CREATE INDEX idx_workflow_templates_owner      ON workflow_templates(owner_id);
CREATE INDEX idx_workflow_templates_risk       ON workflow_templates(risk_level);
CREATE INDEX idx_workflow_templates_created    ON workflow_templates(created_at DESC);

-- ─── TABLE: workflow_versions ─────────────────────────────────

CREATE TABLE workflow_versions (
  id               UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id      UUID                   NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  version_number   INTEGER                NOT NULL DEFAULT 1,
  state            workflow_version_state NOT NULL DEFAULT 'draft',
  change_summary   TEXT,
  change_reason    TEXT,
  created_by       UUID,
  approved_by      UUID,
  approved_at      TIMESTAMPTZ,
  activated_by     UUID,
  activated_at     TIMESTAMPTZ,
  rollback_from    UUID                   REFERENCES workflow_versions(id) ON DELETE SET NULL,
  rollback_reason  TEXT,
  created_at       TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ            NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_versions_workflow  ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_versions_state     ON workflow_versions(state);
CREATE INDEX idx_workflow_versions_created   ON workflow_versions(created_at DESC);

-- ─── TABLE: workflow_steps ────────────────────────────────────

CREATE TABLE workflow_steps (
  id                      UUID                NOT NULL DEFAULT gen_random_uuid(),
  version_id              UUID                NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  step_type               workflow_step_type  NOT NULL,
  name                    TEXT                NOT NULL,
  description             TEXT,
  owner_role              TEXT,
  owner_user_id           UUID,
  sequence                INTEGER             NOT NULL DEFAULT 0,
  conditions              JSONB               DEFAULT '{}',
  input_schema            JSONB               DEFAULT '{}',
  output_schema           JSONB               DEFAULT '{}',
  required_policy_checks  TEXT[]              DEFAULT '{}',
  required_evidence       BOOLEAN             NOT NULL DEFAULT false,
  sla_minutes             INTEGER,
  fallback_owner          UUID,
  escalation_rule         JSONB               DEFAULT '{}',
  config                  JSONB               DEFAULT '{}',
  created_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX idx_workflow_steps_version   ON workflow_steps(version_id);
CREATE INDEX idx_workflow_steps_type      ON workflow_steps(step_type);
CREATE INDEX idx_workflow_steps_sequence  ON workflow_steps(sequence);

-- ─── TABLE: workflow_edges ────────────────────────────────────

CREATE TABLE workflow_edges (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id      UUID        NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  from_step_id    UUID        NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  to_step_id      UUID        NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  condition       JSONB       DEFAULT '{}',
  default_path    BOOLEAN     NOT NULL DEFAULT false,
  fail_safe_path  BOOLEAN     NOT NULL DEFAULT false,
  branch_label    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_edges_version    ON workflow_edges(version_id);
CREATE INDEX idx_workflow_edges_from_step  ON workflow_edges(from_step_id);
CREATE INDEX idx_workflow_edges_to_step    ON workflow_edges(to_step_id);

-- ─── TABLE: workflow_instances ────────────────────────────────

CREATE TABLE workflow_instances (
  id                UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id       UUID                     NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  version_id        UUID                     NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  workspace_id      UUID                     NOT NULL,
  status            workflow_instance_status NOT NULL DEFAULT 'pending',
  trigger_type      trigger_type             NOT NULL DEFAULT 'manual',
  trigger_source    TEXT,
  started_by        UUID,
  current_step_id   UUID                     REFERENCES workflow_steps(id) ON DELETE SET NULL,
  priority          INTEGER                  NOT NULL DEFAULT 5,
  risk_score        NUMERIC(5,2),
  confidence_score  NUMERIC(5,2),
  evidence_bundle_id UUID,
  started_at        TIMESTAMPTZ,
  due_at             TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  paused_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ              NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_instances_workflow   ON workflow_instances(workflow_id);
CREATE INDEX idx_workflow_instances_workspace  ON workflow_instances(workspace_id);
CREATE INDEX idx_workflow_instances_status     ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_created    ON workflow_instances(created_at DESC);

-- ─── TABLE: step_runs ────────────────────────────────────────

CREATE TABLE step_runs (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID             NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id           UUID             NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  status            step_run_status  NOT NULL DEFAULT 'pending',
  input_ref         TEXT,
  output_ref        TEXT,
  actor_type        TEXT,
  actor_id          UUID,
  error_code        TEXT,
  reason_code       TEXT,
  policy_result_id  UUID,
  evidence_ref      TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_step_runs_instance  ON step_runs(instance_id);
CREATE INDEX idx_step_runs_step      ON step_runs(step_id);
CREATE INDEX idx_step_runs_status    ON step_runs(status);
CREATE INDEX idx_step_runs_created   ON step_runs(created_at DESC);

-- ─── TABLE: approval_records ─────────────────────────────────

CREATE TABLE approval_records (
  id                   UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          UUID               NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id              UUID               NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  required_role        TEXT,
  approver_id          UUID,
  approver_name        TEXT,
  decision             approval_decision,
  decision_reason      TEXT,
  edited_output_ref    TEXT,
  requested_changes    TEXT,
  decided_at           TIMESTAMPTZ,
  evidence_ref         TEXT,
  due_at               TIMESTAMPTZ,
  created_at           TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_records_instance  ON approval_records(instance_id);
CREATE INDEX idx_approval_records_step      ON approval_records(step_id);
CREATE INDEX idx_approval_records_approver  ON approval_records(approver_id);
CREATE INDEX idx_approval_records_decision  ON approval_records(decision);
CREATE INDEX idx_approval_records_created   ON approval_records(created_at DESC);

-- ─── TABLE: simulation_runs ───────────────────────────────────

CREATE TABLE simulation_runs (
  id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID               NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  scenario_name       TEXT,
  sample_input_ref    TEXT,
  result              simulation_result,
  warnings            JSONB              DEFAULT '[]',
  blocks              JSONB              DEFAULT '[]',
  failed_steps        JSONB              DEFAULT '[]',
  created_by          UUID,
  evidence_ref        TEXT,
  created_at          TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX idx_simulation_runs_version  ON simulation_runs(workflow_version_id);
CREATE INDEX idx_simulation_runs_result   ON simulation_runs(result);
CREATE INDEX idx_simulation_runs_created  ON simulation_runs(created_at DESC);

-- ─── TABLE: dependency_records ───────────────────────────────

CREATE TABLE dependency_records (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID             NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  dependency_type     dependency_type  NOT NULL,
  dependency_id_ref   UUID             NOT NULL,
  required_status     TEXT,
  current_status      TEXT,
  impact_level        risk_level       NOT NULL DEFAULT 'medium',
  last_checked_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_dependency_records_version  ON dependency_records(workflow_version_id);
CREATE INDEX idx_dependency_records_type     ON dependency_records(dependency_type);
CREATE INDEX idx_dependency_records_ref      ON dependency_records(dependency_id_ref);

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_workflow_versions_updated_at
  BEFORE UPDATE ON workflow_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_workflow_instances_updated_at
  BEFORE UPDATE ON workflow_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE workflow_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_records   ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES ────────────────────────────────────────────

CREATE POLICY "workspace_access_workflow_templates"
  ON workflow_templates FOR ALL
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "workspace_access_workflow_instances"
  ON workflow_instances FOR ALL
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "version_scoped_workflow_versions"
  ON workflow_versions FOR ALL
  USING (
    workflow_id IN (
      SELECT id FROM workflow_templates
      WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );

CREATE POLICY "version_scoped_workflow_steps"
  ON workflow_steps FOR ALL
  USING (
    version_id IN (
      SELECT wv.id FROM workflow_versions wv
      JOIN workflow_templates wt ON wv.workflow_id = wt.id
      WHERE wt.workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );

CREATE POLICY "version_scoped_workflow_edges"
  ON workflow_edges FOR ALL
  USING (
    version_id IN (
      SELECT wv.id FROM workflow_versions wv
      JOIN workflow_templates wt ON wv.workflow_id = wt.id
      WHERE wt.workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );

CREATE POLICY "instance_scoped_step_runs"
  ON step_runs FOR ALL
  USING (
    instance_id IN (
      SELECT id FROM workflow_instances
      WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );

CREATE POLICY "instance_scoped_approval_records"
  ON approval_records FOR ALL
  USING (
    instance_id IN (
      SELECT id FROM workflow_instances
      WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );

CREATE POLICY "version_scoped_simulation_runs"
  ON simulation_runs FOR ALL
  USING (
    workflow_version_id IN (
      SELECT wv.id FROM workflow_versions wv
      JOIN workflow_templates wt ON wv.workflow_id = wt.id
      WHERE wt.workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );

CREATE POLICY "version_scoped_dependency_records"
  ON dependency_records FOR ALL
  USING (
    workflow_version_id IN (
      SELECT wv.id FROM workflow_versions wv
      JOIN workflow_templates wt ON wv.workflow_id = wt.id
      WHERE wt.workspace_id = (auth.jwt() ->> 'workspace_id')::uuid
    )
  );

-- ─── DONE ────────────────────────────────────────────────────
-- Tables created:
--   workflow_templates, workflow_versions, workflow_steps,
--   workflow_edges, workflow_instances, step_runs,
--   approval_records, simulation_runs, dependency_records
-- ─────────────────────────────────────────────────────────────
