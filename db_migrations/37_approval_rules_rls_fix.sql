-- Migration 037: Add missing RLS policies for Approval Rules child tables
-- Migration 29 enabled RLS on 11 tables but only defined policies for 3 of them
-- (approval_rules, approval_rule_scopes, approval_rule_audit_logs).
-- The remaining 8 tables had no policies — a data leak risk.

-- ============================================================================
-- APPROVAL RULE CONDITIONS (via approval_rules join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_conditions ON public.approval_rule_conditions;
  CREATE POLICY tenant_isolation_approval_rule_conditions ON public.approval_rule_conditions
    FOR ALL USING (approval_rule_id IN (
      SELECT id FROM public.approval_rules WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- APPROVAL RULE VALIDATION PREREQUISITES (via approval_rules join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_validation_prerequisites ON public.approval_rule_validation_prerequisites;
  CREATE POLICY tenant_isolation_approval_rule_validation_prerequisites ON public.approval_rule_validation_prerequisites
    FOR ALL USING (approval_rule_id IN (
      SELECT id FROM public.approval_rules WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- APPROVAL RULE PATHS (via approval_rules join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_paths ON public.approval_rule_paths;
  CREATE POLICY tenant_isolation_approval_rule_paths ON public.approval_rule_paths
    FOR ALL USING (approval_rule_id IN (
      SELECT id FROM public.approval_rules WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- APPROVAL RULE STAGES (via approval_rule_paths -> approval_rules join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_stages ON public.approval_rule_stages;
  CREATE POLICY tenant_isolation_approval_rule_stages ON public.approval_rule_stages
    FOR ALL USING (approval_rule_path_id IN (
      SELECT p.id FROM public.approval_rule_paths p
      JOIN public.approval_rules r ON r.id = p.approval_rule_id
      WHERE r.tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- APPROVAL RULE ESCALATIONS (via approval_rules join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_escalations ON public.approval_rule_escalations;
  CREATE POLICY tenant_isolation_approval_rule_escalations ON public.approval_rule_escalations
    FOR ALL USING (approval_rule_id IN (
      SELECT id FROM public.approval_rules WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- APPROVAL RULE CONFLICTS (via approval_rules join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_conflicts ON public.approval_rule_conflicts;
  CREATE POLICY tenant_isolation_approval_rule_conflicts ON public.approval_rule_conflicts
    FOR ALL USING (approval_rule_id IN (
      SELECT id FROM public.approval_rules WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- APPROVAL RULE VERSIONS (via approval_rules join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_versions ON public.approval_rule_versions;
  CREATE POLICY tenant_isolation_approval_rule_versions ON public.approval_rule_versions
    FOR ALL USING (approval_rule_id IN (
      SELECT id FROM public.approval_rules WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- APPROVAL RULE SIMULATIONS (via approval_rules join)
-- ============================================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation_approval_rule_simulations ON public.approval_rule_simulations;
  CREATE POLICY tenant_isolation_approval_rule_simulations ON public.approval_rule_simulations
    FOR ALL USING (approval_rule_id IN (
      SELECT id FROM public.approval_rules WHERE tenant_id = current_setting('app.tenant_id', true)::UUID
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
