-- Migration 040: Unify tenant setting name across all RLS policies
-- Fixes policies still using the legacy 'app.current_tenant_id' setting name.
-- All policies now use 'app.tenant_id' with safe fallback.

-- Fix migration 26: identity_delegations
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'identity_delegations' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Tenant isolation for delegations" ON public.identity_delegations;
    CREATE POLICY "Tenant isolation for delegations" ON public.identity_delegations
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
  END IF;
END $$;

-- Fix migration 26: identity_break_glass_sessions
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'identity_break_glass_sessions' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Tenant isolation for break_glass_sessions" ON public.identity_break_glass_sessions;
    CREATE POLICY "Tenant isolation for break_glass_sessions" ON public.identity_break_glass_sessions
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
  END IF;
END $$;

-- Fix migration 32: approval_items
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'approval_items' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS approval_items_tenant_isolation ON public.approval_items;
    CREATE POLICY approval_items_tenant_isolation ON public.approval_items
      USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
  END IF;
END $$;
