-- Business Units: organizational groupings scoped to a workspace
CREATE TABLE IF NOT EXISTS business_units (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_business_units_workspace ON business_units(workspace_id);

ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_units"
  ON business_units FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
