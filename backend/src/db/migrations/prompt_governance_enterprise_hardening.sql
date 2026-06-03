-- ============================================================
-- ZoikoVertex - Prompt Governance enterprise hardening
--
-- Idempotent patch for columns the Prompt Governance services
-- already read/write as part of version locking, deployment,
-- rollback, approval evidence, and lifecycle auditability.
-- Scope: Prompt Governance tables only.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS prompt_test_suites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_type text DEFAULT 'system_prompt',
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS owner_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_tier text DEFAULT 'tier_2_medium',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS linked_agent text DEFAULT '',
  ADD COLUMN IF NOT EXISTS linked_agent_id uuid,
  ADD COLUMN IF NOT EXISTS linked_workflow text DEFAULT '',
  ADD COLUMN IF NOT EXISTS linked_workflow_id uuid,
  ADD COLUMN IF NOT EXISTS knowledge_sources text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tools_permitted text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE prompts
SET tenant_id = COALESCE(tenant_id, workspace_id)
WHERE tenant_id IS NULL;

ALTER TABLE prompt_versions
  ADD COLUMN IF NOT EXISTS prompt_id uuid,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS body_hash text,
  ADD COLUMN IF NOT EXISTS variables_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS guardrails_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS model_routes_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS change_summary text DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS immutable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS immutable_after timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE prompt_test_suites
  ADD COLUMN IF NOT EXISTS prompt_id uuid,
  ADD COLUMN IF NOT EXISTS suite_name text,
  ADD COLUMN IF NOT EXISTS required_for_risk_tier text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scenario_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluator_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS prompt_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid,
  suite_id uuid,
  environment text NOT NULL DEFAULT 'draft',
  pass_fail text NOT NULL DEFAULT 'PENDING',
  score_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_artifacts_uri text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid,
  reviewer_id uuid,
  reviewer_role text NOT NULL,
  decision text NOT NULL,
  decision_reason text NOT NULL DEFAULT '',
  conditions text NOT NULL DEFAULT '',
  evidence_id uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid,
  environment text NOT NULL,
  scope_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  deployed_by uuid,
  release_note text NOT NULL DEFAULT '',
  rollback_to_version_id uuid,
  evidence_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid,
  agent_id uuid,
  workflow_id uuid,
  workflow_node_id uuid,
  channel_id uuid,
  brand_id uuid,
  locale text NOT NULL DEFAULT '',
  environment text NOT NULL DEFAULT 'staging',
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_knowledge_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid,
  kb_id uuid,
  collection_id uuid,
  retrieval_mode text NOT NULL DEFAULT 'optional',
  freshness_rule text NOT NULL DEFAULT '',
  citation_required boolean NOT NULL DEFAULT false,
  source_priority text NOT NULL DEFAULT 'authority',
  restricted_sources text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_tool_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id uuid,
  tool_name text NOT NULL,
  tool_id uuid,
  allowed_actions text[] NOT NULL DEFAULT '{}',
  conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_required boolean NOT NULL DEFAULT false,
  runtime_policy_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompts_workspace_status ON prompts (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_prompts_current_version ON prompts (current_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_number ON prompt_versions (prompt_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_test_suites_prompt ON prompt_test_suites (prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_runs_version_created ON prompt_test_runs (prompt_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_approvals_version_created ON prompt_approvals (prompt_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_deployments_version_created ON prompt_deployments (prompt_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_bindings_version ON prompt_bindings (prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_knowledge_bindings_version ON prompt_knowledge_bindings (prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tool_permissions_version ON prompt_tool_permissions (prompt_version_id);

DROP TRIGGER IF EXISTS prompts_updated_at ON prompts;
CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DROP TRIGGER IF EXISTS prompt_versions_updated_at ON prompt_versions;
CREATE TRIGGER prompt_versions_updated_at
  BEFORE UPDATE ON prompt_versions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DROP TRIGGER IF EXISTS prompt_test_suites_updated_at ON prompt_test_suites;
CREATE TRIGGER prompt_test_suites_updated_at
  BEFORE UPDATE ON prompt_test_suites
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DROP TRIGGER IF EXISTS prompt_test_runs_updated_at ON prompt_test_runs;
CREATE TRIGGER prompt_test_runs_updated_at
  BEFORE UPDATE ON prompt_test_runs
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DROP TRIGGER IF EXISTS prompt_approvals_updated_at ON prompt_approvals;
CREATE TRIGGER prompt_approvals_updated_at
  BEFORE UPDATE ON prompt_approvals
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DROP TRIGGER IF EXISTS prompt_deployments_updated_at ON prompt_deployments;
CREATE TRIGGER prompt_deployments_updated_at
  BEFORE UPDATE ON prompt_deployments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DROP TRIGGER IF EXISTS prompt_bindings_updated_at ON prompt_bindings;
CREATE TRIGGER prompt_bindings_updated_at
  BEFORE UPDATE ON prompt_bindings
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DROP TRIGGER IF EXISTS prompt_knowledge_bindings_updated_at ON prompt_knowledge_bindings;
CREATE TRIGGER prompt_knowledge_bindings_updated_at
  BEFORE UPDATE ON prompt_knowledge_bindings
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DROP TRIGGER IF EXISTS prompt_tool_permissions_updated_at ON prompt_tool_permissions;
CREATE TRIGGER prompt_tool_permissions_updated_at
  BEFORE UPDATE ON prompt_tool_permissions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

NOTIFY pgrst, 'reload schema';
