-- Migration 51: Resource usage tracking table
-- Records metered usage events (AI tokens, social API calls, storage)
-- so the monitoring endpoint and billing page can show real consumption.

CREATE TABLE IF NOT EXISTS resource_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('AI_TOKENS','SOCIAL_API_CALLS','STORAGE_MB','CONTENT_POSTS','AGENT_RUNS')),
  quantity      NUMERIC(18,6) NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(12,8) NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'units',
  reference_id  UUID,          -- optional FK to the thing that consumed (campaign, post, etc.)
  reference_type TEXT,         -- 'campaign', 'post', 'agent_run', etc.
  metadata      JSONB DEFAULT '{}'::jsonb,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the queries the monitoring controller runs
CREATE INDEX IF NOT EXISTS idx_resource_usage_workspace_time
  ON resource_usage (workspace_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_resource_usage_type
  ON resource_usage (workspace_id, resource_type, timestamp DESC);

-- RLS: workspaces can only see their own usage
ALTER TABLE resource_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'resource_usage'
    AND policyname = 'resource_usage_workspace_isolation'
  ) THEN
    CREATE POLICY resource_usage_workspace_isolation
      ON resource_usage
      USING (workspace_id = (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
        LIMIT 1
      ));
  END IF;
END $$;
