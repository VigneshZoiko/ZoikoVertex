-- Migration 041: Fix permissive RLS policy on approval_records
-- The original policy used USING (true), allowing cross-tenant access.
-- Step 1: Add workspace_id column (missing from applied migration 34)
-- Step 2: Replace permissive policy with tenant isolation

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'approval_records' AND schemaname = 'public')
     AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'workspaces' AND schemaname = 'public')
  THEN
    ALTER TABLE public.approval_records ADD COLUMN IF NOT EXISTS workspace_id UUID;
    DROP POLICY IF EXISTS tenant_isolation_approval_records ON public.approval_records;
    CREATE POLICY tenant_isolation_approval_records ON public.approval_records
      FOR ALL USING (workspace_id IN (
        SELECT id FROM public.workspaces WHERE org_id = current_setting('app.tenant_id', true)::UUID
      ));
  END IF;
END $$;
