-- ============================================================
-- Diagnose: agent created but not visible in studio list
-- ============================================================

-- 1. Show the most recently created agents (last 10).
-- This bypasses RLS because supabase SQL Editor runs as postgres superuser.
-- If your new agent is here, the row exists — the issue is filtering / RLS.
SELECT
  id,
  name,
  status,
  workspace_id,
  org_id,
  primary_dri_id,
  created_at
FROM agents
ORDER BY created_at DESC
LIMIT 10;


-- 2. Show all workspaces — confirm which one your wizard's payload used.
SELECT id, name, created_at
FROM workspaces
ORDER BY created_at DESC;


-- 3. Show your workspace_members rows — confirm which workspace your
--    JWT considers "current" via workspace_members.user_id = auth.uid().
--    (Returns nothing in SQL Editor since there's no JWT here, but you
--     can match the workspace_id of agents created via wizard against
--     this list manually.)
SELECT
  wm.workspace_id,
  wm.user_id,
  wm.role,
  u.email AS user_email,
  w.name  AS workspace_name
FROM workspace_members wm
LEFT JOIN public.users u ON u.id = wm.user_id
LEFT JOIN workspaces w  ON w.id = wm.workspace_id
ORDER BY wm.workspace_id;
