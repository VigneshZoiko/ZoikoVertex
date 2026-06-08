-- ============================================================
-- ZoikoVertex — workflow_templates schema patch
-- Safe to run repeatedly. Adds the table or any missing columns
-- the backend's createWorkflow() inserts into.
--
-- Backend writes these columns:
--   id, tenant_id, workspace_id, name, description, type,
--   status, risk_level, owner_id, owner_name, brand_ids,
--   platforms, created_at, updated_at
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- 1. Create table if absent (skipped if it already exists)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid,
  workspace_id uuid,
  name         text,
  description  text,
  type         text DEFAULT 'governed',
  status       text DEFAULT 'draft'
                 CHECK (status IN ('draft','testing','approved','active','paused','retired','failed')),
  risk_level   text DEFAULT 'medium',
  owner_id     uuid,
  owner_name   text,
  brand_ids    text[] DEFAULT '{}',
  platforms    text[] DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. Add columns defensively (no-op if already present)
ALTER TABLE workflow_templates
  ADD COLUMN IF NOT EXISTS tenant_id    uuid,
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS name         text,
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS type         text   DEFAULT 'governed',
  ADD COLUMN IF NOT EXISTS status       text   DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS risk_level   text   DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS owner_id     uuid,
  ADD COLUMN IF NOT EXISTS owner_name   text,
  ADD COLUMN IF NOT EXISTS brand_ids    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS platforms    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

-- 3. updated_at auto-trigger
DROP TRIGGER IF EXISTS workflow_templates_updated_at ON workflow_templates;
CREATE TRIGGER workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_wftpl_workspace ON workflow_templates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_wftpl_tenant    ON workflow_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_wftpl_status    ON workflow_templates (status);
CREATE INDEX IF NOT EXISTS idx_wftpl_risk      ON workflow_templates (risk_level);

-- 5. RLS (workspace isolation)
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_templates_workspace_isolation" ON workflow_templates;
CREATE POLICY "workflow_templates_workspace_isolation" ON workflow_templates
  FOR ALL
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

-- 6. Verify
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workflow_templates'
ORDER BY ordinal_position;
