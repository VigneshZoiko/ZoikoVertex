-- ============================================================
-- ZoikoVertex — Agent Studio Migration v5
-- agents table EXISTS with these columns already:
--   id, org_id, workspace_id, name, type, status,
--   autonomy_level, risk_tier, trust_score, faithfulness_score,
--   primary_dri_id, backup_dri_id, assigned_brand, platforms,
--   markets, prompt_version, model_version, created_at,
--   updated_at, metadata
--
-- Strategy:
--   1. ALTER agents — add only the missing columns
--   2. CREATE all child tables from scratch
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ─────────────────────────────────────────────────────────────
-- 1. PATCH agents — add EVERY column the backend writes to.
-- All columns use IF NOT EXISTS so this is safe to run repeatedly.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agents
  -- Identity / scope
  ADD COLUMN IF NOT EXISTS name                     text,
  ADD COLUMN IF NOT EXISTS type                     text,
  ADD COLUMN IF NOT EXISTS workspace_id             uuid,
  ADD COLUMN IF NOT EXISTS org_id                   uuid,
  ADD COLUMN IF NOT EXISTS primary_dri_id           uuid,
  ADD COLUMN IF NOT EXISTS backup_dri_id            uuid,
  ADD COLUMN IF NOT EXISTS assigned_brand           text,
  ADD COLUMN IF NOT EXISTS platforms                text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS markets                  text[]      DEFAULT '{}',
  -- Lifecycle + scoring (columns the v5 header *assumed* existed)
  ADD COLUMN IF NOT EXISTS status                   text        DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS autonomy_level           text        DEFAULT 'L0',
  ADD COLUMN IF NOT EXISTS risk_tier                text,
  ADD COLUMN IF NOT EXISTS trust_score              numeric(4,3) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS faithfulness_score       numeric(4,3) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS prompt_version           text,
  ADD COLUMN IF NOT EXISTS model_version            text,
  ADD COLUMN IF NOT EXISTS metadata                 jsonb       DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at               timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at               timestamptz NOT NULL DEFAULT now(),
  -- Studio v5 additions
  ADD COLUMN IF NOT EXISTS purpose                  text,
  ADD COLUMN IF NOT EXISTS mode                     text        DEFAULT 'draft_only',
  ADD COLUMN IF NOT EXISTS risk_level               text        DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS permitted_actions        text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prohibited_actions       text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_channels          text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_prompts           text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_workflows         text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_policies          text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_knowledge_sources text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_required        boolean     DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_required        boolean     DEFAULT true,
  ADD COLUMN IF NOT EXISTS runtime_controls         jsonb       DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS success_metrics          text,
  ADD COLUMN IF NOT EXISTS prohibited_outcomes      text,
  ADD COLUMN IF NOT EXISTS compliance_notes         text,
  ADD COLUMN IF NOT EXISTS last_activity            text,
  ADD COLUMN IF NOT EXISTS last_activity_at         timestamptz;

-- updated_at auto-trigger
DROP TRIGGER IF EXISTS agents_updated_at ON agents;
CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Indexes for catalog filters (now safe — every referenced column is guaranteed by the ALTER above)
CREATE INDEX IF NOT EXISTS idx_agents_workspace  ON agents (workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_org        ON agents (org_id);
CREATE INDEX IF NOT EXISTS idx_agents_status     ON agents (status);
CREATE INDEX IF NOT EXISTS idx_agents_risk       ON agents (risk_level);
CREATE INDEX IF NOT EXISTS idx_agents_brand      ON agents (assigned_brand);
CREATE INDEX IF NOT EXISTS idx_agents_channels   ON agents USING gin (linked_channels);
CREATE INDEX IF NOT EXISTS idx_agents_workflows  ON agents USING gin (linked_workflows);
CREATE INDEX IF NOT EXISTS idx_agents_knowledge  ON agents USING gin (linked_knowledge_sources);


-- ─────────────────────────────────────────────────────────────
-- 2. AGENT VERSIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_versions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_by            uuid,
  change_reason         text,
  change_detail         text,
  snapshot              jsonb,
  version_number        integer     NOT NULL DEFAULT 1,
  is_current            boolean     NOT NULL DEFAULT false,
  prompt_version_id     uuid,
  knowledge_snapshot_id uuid,
  workflow_ids          text[]      DEFAULT '{}',
  tool_permissions      jsonb       DEFAULT '{}'::jsonb,
  runtime_policy_id     uuid,
  approved_by           uuid,
  approved_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent   ON agent_versions (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_versions_current ON agent_versions (agent_id, is_current);


-- ─────────────────────────────────────────────────────────────
-- 3. AGENT APPROVALS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_approvals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  approver_role   text        NOT NULL,
  required_reason text,
  risk_tier       text,
  agent_type      text,
  status          text        NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  requested_by    uuid,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  notes           text,
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  sla_hours       integer     DEFAULT 48,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS agent_approvals_updated_at ON agent_approvals;
CREATE TRIGGER agent_approvals_updated_at
  BEFORE UPDATE ON agent_approvals
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX IF NOT EXISTS idx_approvals_agent  ON agent_approvals (agent_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON agent_approvals (status);
CREATE INDEX IF NOT EXISTS idx_approvals_role   ON agent_approvals (approver_role);


-- ─────────────────────────────────────────────────────────────
-- 4. AGENT DEPLOYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_deployments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  environment      text        NOT NULL DEFAULT 'production'
                     CHECK (environment IN ('sandbox','staging','production')),
  status           text        NOT NULL DEFAULT 'DEPLOYED'
                     CHECK (status IN ('DEPLOYED','PAUSED','ROLLED_BACK','RETIRED','FAILED')),
  deployed_by      uuid,
  deployed_at      timestamptz NOT NULL DEFAULT now(),
  deployment_notes text,
  agent_version_id    uuid     REFERENCES agent_versions(id),
  rollback_version_id uuid     REFERENCES agent_versions(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS agent_deployments_updated_at ON agent_deployments;
CREATE TRIGGER agent_deployments_updated_at
  BEFORE UPDATE ON agent_deployments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX IF NOT EXISTS idx_deployments_agent       ON agent_deployments (agent_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status      ON agent_deployments (status);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON agent_deployments (environment);


-- ─────────────────────────────────────────────────────────────
-- 5. AGENT INCIDENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_incidents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  severity         text        NOT NULL DEFAULT 'medium',
  incident_type    text,
  description      text,
  affected_channel text,
  output_id        uuid,
  status           text        NOT NULL DEFAULT 'open',
  owner_id         uuid,
  remediation      text,
  closed_at        timestamptz,
  evidence_id      uuid,
  run_id           uuid,
  category         text,
  root_cause       text,
  resolution       text,
  due_at           timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS agent_incidents_updated_at ON agent_incidents;
CREATE TRIGGER agent_incidents_updated_at
  BEFORE UPDATE ON agent_incidents
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX IF NOT EXISTS idx_incidents_agent    ON agent_incidents (agent_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON agent_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status   ON agent_incidents (status);


-- ─────────────────────────────────────────────────────────────
-- 6. AGENT CERTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_certifications (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id           uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  artifact_id        uuid,
  certified_level    text        NOT NULL,
  status             text        NOT NULL DEFAULT 'VALID'
                       CHECK (status IN ('VALID','EXPIRED','REVOKED')),
  evidence_vault_ref text,
  certified_at       timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certifications_agent ON agent_certifications (agent_id);


-- ─────────────────────────────────────────────────────────────
-- 7. AGENT ARTIFACTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_artifacts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version    integer     NOT NULL DEFAULT 1,
  artifact   jsonb       DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_agent   ON agent_artifacts (agent_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_version ON agent_artifacts (agent_id, version DESC);


-- ─────────────────────────────────────────────────────────────
-- 8. AGENT EVIDENCE  (append-only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_evidence (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id           uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type         text        NOT NULL,
  actor_id           uuid,
  object_version     text,
  decision           text,
  reason             text,
  input_hash         text,
  output_hash        text,
  model_id           text,
  prompt_version     text,
  knowledge_snapshot text,
  policy_results     jsonb       DEFAULT '{}'::jsonb,
  bundle_id          uuid        DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_agent   ON agent_evidence (agent_id);
CREATE INDEX IF NOT EXISTS idx_evidence_bundle  ON agent_evidence (bundle_id);
CREATE INDEX IF NOT EXISTS idx_evidence_created ON agent_evidence (created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- 9. AGENT PERMISSION SETS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_permission_sets (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action_class      text        NOT NULL DEFAULT 'recommend_only',
  platforms         text[]      DEFAULT '{}',
  tools             text[]      DEFAULT '{}',
  scopes            text[]      DEFAULT '{}',
  rate_limits       jsonb       DEFAULT '{}'::jsonb,
  spend_limits      jsonb       DEFAULT '{}'::jsonb,
  approval_required boolean     NOT NULL DEFAULT true,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS agent_permission_sets_updated_at ON agent_permission_sets;
CREATE TRIGGER agent_permission_sets_updated_at
  BEFORE UPDATE ON agent_permission_sets
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX IF NOT EXISTS idx_permission_sets_agent ON agent_permission_sets (agent_id);


-- ─────────────────────────────────────────────────────────────
-- 10. AGENT SAFETY RESULTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_safety_results (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  check_type      text        NOT NULL DEFAULT 'general',
  content_checked text,
  pass_fail       boolean     NOT NULL,
  blocked_terms   text[]      DEFAULT '{}',
  severity        text        DEFAULT 'low',
  platform        text,
  result_detail   jsonb       DEFAULT '{}'::jsonb,
  reviewer_notes  text,
  evidence_id     uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_safety_agent ON agent_safety_results (agent_id);
CREATE INDEX IF NOT EXISTS idx_safety_pass  ON agent_safety_results (agent_id, pass_fail);


-- ─────────────────────────────────────────────────────────────
-- 11. AGENT SANDBOX RUNS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_sandbox_runs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id           uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  target_level       text        NOT NULL DEFAULT 'L1',
  risk_level         text        DEFAULT 'medium',
  status             text        NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','running','passed','failed','error')),
  pass_fail          boolean,
  risk_notes         text,
  trust_score        numeric(4,3),
  faithfulness_score numeric(4,3),
  results            jsonb       DEFAULT '[]'::jsonb,
  evidence_id        uuid,
  prompt_version     text,
  knowledge_snapshot text,
  model_used         text,
  reviewer_notes     text,
  started_at         timestamptz DEFAULT now(),
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_agent  ON agent_sandbox_runs (agent_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_status ON agent_sandbox_runs (status);


-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_approvals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_deployments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_incidents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_certifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_artifacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_evidence        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_permission_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_safety_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sandbox_runs    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_workspace_isolation" ON agents;
CREATE POLICY "agents_workspace_isolation" ON agents FOR ALL
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

DROP POLICY IF EXISTS "agent_versions_scope" ON agent_versions;
CREATE POLICY "agent_versions_scope" ON agent_versions FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_approvals_scope" ON agent_approvals;
CREATE POLICY "agent_approvals_scope" ON agent_approvals FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_deployments_scope" ON agent_deployments;
CREATE POLICY "agent_deployments_scope" ON agent_deployments FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_incidents_scope" ON agent_incidents;
CREATE POLICY "agent_incidents_scope" ON agent_incidents FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_certifications_scope" ON agent_certifications;
CREATE POLICY "agent_certifications_scope" ON agent_certifications FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_artifacts_scope" ON agent_artifacts;
CREATE POLICY "agent_artifacts_scope" ON agent_artifacts FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_evidence_scope" ON agent_evidence;
CREATE POLICY "agent_evidence_scope" ON agent_evidence FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_evidence_no_delete" ON agent_evidence;
CREATE POLICY "agent_evidence_no_delete" ON agent_evidence FOR DELETE USING (false);

DROP POLICY IF EXISTS "agent_evidence_no_update" ON agent_evidence;
CREATE POLICY "agent_evidence_no_update" ON agent_evidence FOR UPDATE USING (false);

DROP POLICY IF EXISTS "agent_permission_sets_scope" ON agent_permission_sets;
CREATE POLICY "agent_permission_sets_scope" ON agent_permission_sets FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_safety_results_scope" ON agent_safety_results;
CREATE POLICY "agent_safety_results_scope" ON agent_safety_results FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));

DROP POLICY IF EXISTS "agent_sandbox_runs_scope" ON agent_sandbox_runs;
CREATE POLICY "agent_sandbox_runs_scope" ON agent_sandbox_runs FOR ALL
  USING (agent_id IN (SELECT id FROM agents WHERE workspace_id = (auth.jwt() ->> 'workspace_id')::uuid));


-- ─────────────────────────────────────────────────────────────
-- VERIFY
-- ─────────────────────────────────────────────────────────────
SELECT table_name, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'agents','agent_versions','agent_approvals','agent_deployments',
    'agent_incidents','agent_certifications','agent_artifacts',
    'agent_evidence','agent_permission_sets','agent_safety_results',
    'agent_sandbox_runs'
  )
GROUP BY table_name
ORDER BY table_name;
