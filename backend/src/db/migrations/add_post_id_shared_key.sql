-- ============================================================
-- Add post_id as an explicit shared key on both agent_runs
-- and workflow_instances so the same post shows the same ID
-- on both the Operations page and the Workflows page.
--
-- For agent_runs (Content Publisher runs):
--   post_id  = task_id  (already set to publish_intent.id)
--
-- For workflow_instances (Publishing Workflow instances):
--   post_id  = trigger_source JSON -> 'post_id'
-- ============================================================

-- 1. agent_runs: add post_id column
ALTER TABLE agent_runs
  ADD COLUMN IF NOT EXISTS post_id uuid NULL;

-- Backfill from task_id for all publisher-type runs
UPDATE agent_runs
SET post_id = task_id::uuid
WHERE post_id IS NULL
  AND agent_type = 'publisher'
  AND task_id IS NOT NULL
  AND task_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_agent_runs_post_id ON agent_runs (post_id)
  WHERE post_id IS NOT NULL;

-- 2. workflow_instances: add post_id column
ALTER TABLE workflow_instances
  ADD COLUMN IF NOT EXISTS post_id uuid NULL;

-- Backfill from trigger_source JSON for all publish_hub instances
UPDATE workflow_instances
SET post_id = (
  CASE
    WHEN trigger_source LIKE '%"post_id"%'
    THEN (
      SELECT (trigger_source::jsonb)->>'post_id'
    )
    ELSE NULL
  END
)::uuid
WHERE post_id IS NULL
  AND trigger_source LIKE '%publish_hub%';

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_workflow_instances_post_id ON workflow_instances (post_id)
  WHERE post_id IS NOT NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify backfill
SELECT
  'agent_runs'        AS tbl,
  COUNT(*)            AS total,
  COUNT(post_id)      AS with_post_id
FROM agent_runs
WHERE agent_type = 'publisher'
UNION ALL
SELECT
  'workflow_instances',
  COUNT(*),
  COUNT(post_id)
FROM workflow_instances
WHERE trigger_source LIKE '%publish_hub%';
