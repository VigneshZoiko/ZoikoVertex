-- Migration 039: Add RLS policies for tables that had RLS enabled but no policies defined.
-- Risk: cross-tenant data exposure (read/write) on agent, forensic, vault, and review tables.
-- Each block guards against non-existent tables (some migrations may not have been run).

-- ============================================================================
-- HELPER: Apply tenant RLS policy via agents->org_id chain
-- ============================================================================
CREATE OR REPLACE FUNCTION public._apply_agent_rls_policy(tbl TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'DROP POLICY IF EXISTS tenant_isolation ON %I;
     CREATE POLICY tenant_isolation ON %I
       FOR ALL USING (agent_id IN (
         SELECT id FROM public.agents WHERE org_id = current_setting(''app.tenant_id'', true)::UUID
       ));',
    tbl, tbl
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AGENT TABLES (migrations 05, 08, 09)
-- Parent: agents(org_id) joins to organizations for tenant isolation
-- ============================================================================

-- agent_artifacts (05_agent_governance.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_artifacts' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_artifacts;
    CREATE POLICY tenant_isolation ON public.agent_artifacts
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_certifications (05_agent_governance.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_certifications' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_certifications;
    CREATE POLICY tenant_isolation ON public.agent_certifications
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_incidents (05_agent_governance.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_incidents' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_incidents;
    CREATE POLICY tenant_isolation ON public.agent_incidents
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_deployments (08_agent_studio_extended.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_deployments' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_deployments;
    CREATE POLICY tenant_isolation ON public.agent_deployments
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_approvals (08_agent_studio_extended.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_approvals' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_approvals;
    CREATE POLICY tenant_isolation ON public.agent_approvals
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_events (08_agent_studio_extended.sql) — has own tenant_id column
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_events' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_events;
    CREATE POLICY tenant_isolation ON public.agent_events
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
  END IF;
END $$;

-- agent_sandbox_tests (08_agent_studio_extended.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_sandbox_tests' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_sandbox_tests;
    CREATE POLICY tenant_isolation ON public.agent_sandbox_tests
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_permission_sets (09_agent_studio_full.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_permission_sets' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_permission_sets;
    CREATE POLICY tenant_isolation ON public.agent_permission_sets
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_safety_policy_results (09_agent_studio_full.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_safety_policy_results' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_safety_policy_results;
    CREATE POLICY tenant_isolation ON public.agent_safety_policy_results
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_platform_checks (09_agent_studio_full.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_platform_checks' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_platform_checks;
    CREATE POLICY tenant_isolation ON public.agent_platform_checks
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_governance_gates (09_agent_studio_full.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_governance_gates' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_governance_gates;
    CREATE POLICY tenant_isolation ON public.agent_governance_gates
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_evidence_records (09_agent_studio_full.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_evidence_records' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_evidence_records;
    CREATE POLICY tenant_isolation ON public.agent_evidence_records
      FOR ALL USING (agent_id IN (SELECT id FROM public.agents WHERE org_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- agent_templates (09_agent_studio_full.sql) — no FK, no tenant_id
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_templates' AND schemaname = 'public') THEN
    ALTER TABLE public.agent_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
    DROP POLICY IF EXISTS tenant_isolation ON public.agent_templates;
    CREATE POLICY tenant_isolation ON public.agent_templates
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
  END IF;
END $$;

-- ============================================================================
-- FORENSIC TABLES (migration 20_forensic_phase4.sql)
-- Parent: forensic_cases(tenant_id TEXT)
-- ============================================================================

-- case_ai_summaries
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'case_ai_summaries' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.case_ai_summaries;
    CREATE POLICY tenant_isolation ON public.case_ai_summaries
      FOR ALL USING (case_id IN (SELECT id FROM public.forensic_cases WHERE tenant_id = current_setting('app.tenant_id', true)));
  END IF;
END $$;

-- forensic_siem_routing
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'forensic_siem_routing' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.forensic_siem_routing;
    CREATE POLICY tenant_isolation ON public.forensic_siem_routing
      FOR ALL USING (case_id IN (SELECT id FROM public.forensic_cases WHERE tenant_id = current_setting('app.tenant_id', true)));
  END IF;
END $$;

-- auditor_sessions
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'auditor_sessions' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.auditor_sessions;
    CREATE POLICY tenant_isolation ON public.auditor_sessions
      FOR ALL USING (case_id IN (SELECT id FROM public.forensic_cases WHERE tenant_id = current_setting('app.tenant_id', true)));
  END IF;
END $$;

-- case_anomalies
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'case_anomalies' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.case_anomalies;
    CREATE POLICY tenant_isolation ON public.case_anomalies
      FOR ALL USING (case_id IN (SELECT id FROM public.forensic_cases WHERE tenant_id = current_setting('app.tenant_id', true)));
  END IF;
END $$;

-- ============================================================================
-- EVIDENCE VAULT TABLES (migrations 22, 23)
-- ============================================================================

-- vault_package_items (22_evidence_vault_phase2.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'vault_package_items' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.vault_package_items;
    CREATE POLICY tenant_isolation ON public.vault_package_items
      FOR ALL USING (package_id IN (SELECT id FROM public.vault_packages WHERE tenant_id = current_setting('app.tenant_id', true)));
  END IF;
END $$;

-- vault_redaction_policies (22_evidence_vault_phase2.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'vault_redaction_policies' AND schemaname = 'public') THEN
    ALTER TABLE public.vault_redaction_policies ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);
    DROP POLICY IF EXISTS tenant_isolation ON public.vault_redaction_policies;
    CREATE POLICY tenant_isolation ON public.vault_redaction_policies
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));
  END IF;
END $$;

-- vault_share_access_logs (23_evidence_vault_phase3.sql)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'vault_share_access_logs' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.vault_share_access_logs;
    CREATE POLICY tenant_isolation ON public.vault_share_access_logs
      FOR ALL USING (share_id IN (SELECT id FROM public.vault_shares WHERE tenant_id = current_setting('app.tenant_id', true)));
  END IF;
END $$;

-- ============================================================================
-- REVIEW QUEUE TABLES (migration 28_review_queue.sql)
-- Parent: review_items(tenant_id UUID)
-- ============================================================================

-- review_assignments
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'review_assignments' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.review_assignments;
    CREATE POLICY tenant_isolation ON public.review_assignments
      FOR ALL USING (review_item_id IN (SELECT id FROM public.review_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- review_notes
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'review_notes' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.review_notes;
    CREATE POLICY tenant_isolation ON public.review_notes
      FOR ALL USING (review_item_id IN (SELECT id FROM public.review_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- review_overrides
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'review_overrides' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.review_overrides;
    CREATE POLICY tenant_isolation ON public.review_overrides
      FOR ALL USING (review_item_id IN (SELECT id FROM public.review_items WHERE tenant_id = current_setting('app.tenant_id', true)::UUID));
  END IF;
END $$;

-- Cleanup helper function
DROP FUNCTION IF EXISTS public._apply_agent_rls_policy(TEXT);
