-- ============================================================
-- Fix: 23503 foreign key violation on agents.primary_dri_id
--
-- Root cause: agents.primary_dri_id and agents.backup_dri_id FK to
--   domain_users(id), but the wizard's member dropdown is populated
--   from public.users (via /api/v1/team/members → listMembers, which
--   returns id: m.user_id from workspace_members).
--
-- Fix: repoint both FKs from domain_users(id) to public.users(id).
-- ============================================================

-- Drop the existing FKs that point to domain_users
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_primary_dri_id_fkey;
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_backup_dri_id_fkey;

-- Step 1: NULL out any orphan dri IDs that don't exist in public.users.
-- These were inserted while the old FK pointed at domain_users; they would
-- block the new FK from being created. Setting to NULL is safe because the
-- column is nullable and an agent without an assigned DRI is a valid state
-- (you can reassign one through the UI).
UPDATE agents
   SET primary_dri_id = NULL
 WHERE primary_dri_id IS NOT NULL
   AND primary_dri_id NOT IN (SELECT id FROM public.users);

UPDATE agents
   SET backup_dri_id = NULL
 WHERE backup_dri_id IS NOT NULL
   AND backup_dri_id NOT IN (SELECT id FROM public.users);

-- Step 2: add new FKs pointing to public.users (which is what the wizard sends).
-- ON DELETE SET NULL — if the user is removed, the agent keeps existing,
-- just without an assigned DRI (safer than CASCADE-deleting agents).
ALTER TABLE agents
  ADD CONSTRAINT agents_primary_dri_id_fkey
    FOREIGN KEY (primary_dri_id) REFERENCES public.users(id)
    ON DELETE SET NULL;

ALTER TABLE agents
  ADD CONSTRAINT agents_backup_dri_id_fkey
    FOREIGN KEY (backup_dri_id) REFERENCES public.users(id)
    ON DELETE SET NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify — should show both FKs now pointing to users
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
