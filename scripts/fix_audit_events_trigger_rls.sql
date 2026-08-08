-- ============================================================================
-- FIX: audit_events trigger writes blocked by RLS (error 42501)
-- ============================================================================
-- Symptom: "new row violates row-level security policy for table
--           'audit_events'" when UPDATing public.workspaces after a trial
--           (or subscription) becomes active. Every workspaces UPDATE in
--           trial state dies -> settleBillingState can never settle an
--           expired trial.
--
-- Root cause: a live-DB trigger on public.workspaces writes a
--   'audit.subscription_changed' event into public.audit_events, but that
--   table has ONLY SELECT policies (see migration 14). No INSERT policy
--   exists, and the trigger function does not run with a BYPASSRLS role.
--
-- Fix (defense in depth):
--   1. Harden every non-internal trigger function on public.workspaces to
--      SECURITY DEFINER owned by postgres -> its audit_events INSERT runs
--      with superuser privileges and bypasses RLS.
--   2. Add a service_role-only INSERT policy on audit_events as a fallback.
--      (service_role is the server-side key, never exposed to browsers, so
--      tenant isolation for end users is unchanged.)
--
-- Idempotent. Safe to re-run. Run in Supabase SQL Editor as postgres.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 0 (diagnostic - keep for the record): show what the trigger actually is
-- ----------------------------------------------------------------------------
SELECT t.tgname,
       t.tgenabled,
       p.proname                                                   AS fn_name,
       p.prosecdef                                                  AS security_definer,
       pg_get_userbyid(p.proowner)                                  AS fn_owner,
       pg_get_triggerdef(t.oid)                                     AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.workspaces'::regclass
  AND NOT t.tgisinternal;

-- ----------------------------------------------------------------------------
-- STEP 1: harden trigger functions on public.workspaces
--         (runs as postgres in the SQL Editor; dynamic so no hardcoded names)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  fn_oid OID;
  fn_sig REGPROCEDURE;
BEGIN
  FOR fn_oid IN
    SELECT DISTINCT p.oid
    FROM pg_proc p
    JOIN pg_trigger t ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'public.workspaces'::regclass
      AND NOT t.tgisinternal
  LOOP
    SELECT p.oid::regprocedure INTO fn_sig FROM pg_proc p WHERE p.oid = fn_oid;

    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER SET search_path = public', fn_sig);
    EXECUTE format('ALTER FUNCTION %s OWNER TO postgres', fn_sig);

    RAISE NOTICE 'Hardened trigger function: %', fn_sig;
  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE 'No non-internal triggers found on public.workspaces';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: allow server-side (service_role) writes to audit_events
--         (fallback path; harmless because service_role already bypasses RLS)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS service_role_can_write_audit ON public.audit_events;
CREATE POLICY service_role_can_write_audit ON public.audit_events
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- STEP 3 (verify): confirm the hardening took effect
-- ----------------------------------------------------------------------------
SELECT t.tgname,
       p.proname,
       p.prosecdef  AS security_definer_now,
       pg_get_userbyid(p.proowner) AS fn_owner_now
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.workspaces'::regclass
  AND NOT t.tgisinternal;

-- Verify the new policy exists
SELECT polname, polcmd, pg_get_expr(polwithcheck, polrelid) AS with_check
FROM pg_policy
WHERE polrelid = 'public.audit_events'::regclass
  AND polname = 'service_role_can_write_audit';
