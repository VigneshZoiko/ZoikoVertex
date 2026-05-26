-- ============================================================
-- Diagnose: 23503 foreign key violation on POST /api/v1/agents
--
-- Run in Supabase SQL Editor → returns 2 result tabs.
-- ============================================================

-- 1. List every FK constraint on the agents table.
-- This tells us which column points to which parent table.
SELECT
  tc.constraint_name,
  kcu.column_name              AS agents_column,
  ccu.table_name               AS references_table,
  ccu.column_name              AS references_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema    = 'public'
  AND tc.table_name      = 'agents'
ORDER BY agents_column;


-- 2. Show recent agent_versions inserts to see what userId the
--    backend passes for created_by — confirms which "user id"
--    table your frontend is actually pulling from.
SELECT
  ledger_entry_id,
  actor_id,
  actor_type,
  entry_type,
  created_at
FROM identity_ledger_entries
WHERE entry_type LIKE '%agent%'
ORDER BY created_at DESC
LIMIT 5;
