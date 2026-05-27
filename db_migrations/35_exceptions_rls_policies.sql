-- Migration 035: Add missing RLS policies for Exceptions domain
-- Migration 33 enabled RLS on all 8 exception tables but created ZERO policies.
-- This means all exception data was accessible cross-tenant — a data leak risk.

-- ============================================================================
-- EXCEPTION CASES
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_exception_cases ON public.exception_cases;
  CREATE POLICY tenant_isolation_exception_cases ON public.exception_cases
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- EXCEPTION BLOCKERS (via exception_cases join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_exception_blockers ON public.exception_blockers;
  CREATE POLICY tenant_isolation_exception_blockers ON public.exception_blockers
    FOR ALL USING (exception_id IN (
      SELECT id FROM public.exception_cases WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- EXCEPTION REMEDIATION (via exception_cases join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_exception_remediation ON public.exception_remediation;
  CREATE POLICY tenant_isolation_exception_remediation ON public.exception_remediation
    FOR ALL USING (exception_id IN (
      SELECT id FROM public.exception_cases WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- EXCEPTION ESCALATIONS (via exception_cases join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_exception_escalations ON public.exception_escalations;
  CREATE POLICY tenant_isolation_exception_escalations ON public.exception_escalations
    FOR ALL USING (exception_id IN (
      SELECT id FROM public.exception_cases WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- EXCEPTION OVERRIDES (via exception_cases join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_exception_overrides ON public.exception_overrides;
  CREATE POLICY tenant_isolation_exception_overrides ON public.exception_overrides
    FOR ALL USING (exception_id IN (
      SELECT id FROM public.exception_cases WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- EXCEPTION EVIDENCE (via exception_cases join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_exception_evidence ON public.exception_evidence;
  CREATE POLICY tenant_isolation_exception_evidence ON public.exception_evidence
    FOR ALL USING (exception_id IN (
      SELECT id FROM public.exception_cases WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- EXCEPTION RESOLUTIONS (via exception_cases join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_exception_resolutions ON public.exception_resolutions;
  CREATE POLICY tenant_isolation_exception_resolutions ON public.exception_resolutions
    FOR ALL USING (exception_id IN (
      SELECT id FROM public.exception_cases WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- EXCEPTION AUDIT LOG
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_exception_audit_log ON public.exception_audit_log;
  CREATE POLICY tenant_isolation_exception_audit_log ON public.exception_audit_log
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
