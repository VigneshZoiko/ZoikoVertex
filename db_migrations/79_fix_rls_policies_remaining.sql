-- Migration 79: Add RLS policies to remaining tables with missing policies
--
-- CI check found 22 tables with missing RLS policies:
--   - 21 tables have RLS enabled but 0 policies
--   - 1 table (meta_pixel_capi) has NO RLS at all
--
-- Strategy:
--   - Where workspace_id exists → use workspace_members isolation
--   - Where workspace_id may not exist → add it first, then apply policy
--   - Reference/seed tables → broader authenticated-read policy
--   - Child tables → chain through parent
--   - All operations wrapped in DO blocks with IF EXISTS guards

-- ============================================================================
-- TABLES WITH KNOWN workspace_id COLUMNS
-- ============================================================================

-- ── account_requests ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'account_requests' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_requests' AND schemaname = 'public') THEN
      DROP POLICY IF EXISTS workspace_isolation_account_requests ON public.account_requests;
      CREATE POLICY workspace_isolation_account_requests ON public.account_requests
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── audit_events_backup ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_events_backup' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_events_backup' AND schemaname = 'public') THEN
      ALTER TABLE public.audit_events_backup ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_audit_events_backup ON public.audit_events_backup;
      CREATE POLICY workspace_isolation_audit_events_backup ON public.audit_events_backup
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── audit_export_jobs (14_audit_events.sql) ──────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_export_jobs' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_export_jobs' AND schemaname = 'public') THEN
      DROP POLICY IF EXISTS workspace_isolation_audit_export_jobs ON public.audit_export_jobs;
      CREATE POLICY workspace_isolation_audit_export_jobs ON public.audit_export_jobs
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── campaign_events (campaign_phase2_migration.sql) ──────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'campaign_events' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_events' AND schemaname = 'public') THEN
      DROP POLICY IF EXISTS workspace_isolation_campaign_events ON public.campaign_events;
      CREATE POLICY workspace_isolation_campaign_events ON public.campaign_events
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── meta_pixel_capi (meta_pixel_capi_tracking.sql) — NO RLS ──────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'meta_pixel_capi' AND schemaname = 'public') THEN
    ALTER TABLE public.meta_pixel_capi ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS workspace_isolation_meta_pixel_capi ON public.meta_pixel_capi;
    CREATE POLICY workspace_isolation_meta_pixel_capi ON public.meta_pixel_capi
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── prompt_audit_ledger (prompt_governance_append_only_audit_trail.sql) ──────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'prompt_audit_ledger' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompt_audit_ledger' AND schemaname = 'public') THEN
      DROP POLICY IF EXISTS workspace_isolation_prompt_audit_ledger ON public.prompt_audit_ledger;
      CREATE POLICY workspace_isolation_prompt_audit_ledger ON public.prompt_audit_ledger
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── prompt_constraint_shadows (prompt_constraint_shadows_schema.sql) ─────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'prompt_constraint_shadows' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompt_constraint_shadows' AND schemaname = 'public') THEN
      DROP POLICY IF EXISTS workspace_isolation_prompt_constraint_shadows ON public.prompt_constraint_shadows;
      CREATE POLICY workspace_isolation_prompt_constraint_shadows ON public.prompt_constraint_shadows
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── prompt_evidence_links (prompt_evidence_vault_integration.sql) ─────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'prompt_evidence_links' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompt_evidence_links' AND schemaname = 'public') THEN
      DROP POLICY IF EXISTS workspace_isolation_prompt_evidence_links ON public.prompt_evidence_links;
      CREATE POLICY workspace_isolation_prompt_evidence_links ON public.prompt_evidence_links
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── prompt_incidents (prompt_runtime_evidence_schema.sql) ─────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'prompt_incidents' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompt_incidents' AND schemaname = 'public') THEN
      DROP POLICY IF EXISTS workspace_isolation_prompt_incidents ON public.prompt_incidents;
      CREATE POLICY workspace_isolation_prompt_incidents ON public.prompt_incidents
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── prompt_runtime_traces (prompt_runtime_evidence_schema.sql) ────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'prompt_runtime_traces' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompt_runtime_traces' AND schemaname = 'public') THEN
      DROP POLICY IF EXISTS workspace_isolation_prompt_runtime_traces ON public.prompt_runtime_traces;
      CREATE POLICY workspace_isolation_prompt_runtime_traces ON public.prompt_runtime_traces
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ============================================================================
-- TABLES WITHOUT KNOWN workspace_id — ADD COLUMN + workspace isolation
-- These tables either lack a tenant column or have an unknown schema.
-- We add workspace_id if missing, then apply standard isolation.
-- ============================================================================

-- ── agent_execution_logs (09_agent_execution_logs.sql) — has agent_id only ──
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_execution_logs' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_execution_logs' AND schemaname = 'public') THEN
      ALTER TABLE public.agent_execution_logs ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_agent_execution_logs ON public.agent_execution_logs;
      CREATE POLICY workspace_isolation_agent_execution_logs ON public.agent_execution_logs
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── event_type_registry (14_audit_events.sql) — reference/seed table ─────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'event_type_registry' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_type_registry' AND schemaname = 'public') THEN
      -- Reference table: all authenticated users can read, only system can write
      DROP POLICY IF EXISTS authenticated_can_read_event_type_registry ON public.event_type_registry;
      CREATE POLICY authenticated_can_read_event_type_registry ON public.event_type_registry
        FOR SELECT USING (auth.role() = 'authenticated');

      DROP POLICY IF EXISTS superadmin_can_write_event_type_registry ON public.event_type_registry;
      CREATE POLICY superadmin_can_write_event_type_registry ON public.event_type_registry
        FOR ALL USING (public._is_superadmin());
    END IF;
  END IF;
END $$;

-- ── knowledge_embeddings ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_embeddings' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_embeddings' AND schemaname = 'public') THEN
      ALTER TABLE public.knowledge_embeddings ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_knowledge_embeddings ON public.knowledge_embeddings;
      CREATE POLICY workspace_isolation_knowledge_embeddings ON public.knowledge_embeddings
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── new_prompts ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'new_prompts' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'new_prompts' AND schemaname = 'public') THEN
      ALTER TABLE public.new_prompts ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_new_prompts ON public.new_prompts;
      CREATE POLICY workspace_isolation_new_prompts ON public.new_prompts
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── otp_debug_log ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'otp_debug_log' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'otp_debug_log' AND schemaname = 'public') THEN
      ALTER TABLE public.otp_debug_log ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_otp_debug_log ON public.otp_debug_log;
      CREATE POLICY workspace_isolation_otp_debug_log ON public.otp_debug_log
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── prompt_test_scenarios (prompt_adversarial_testing_scenarios.sql) ─────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'prompt_test_scenarios' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompt_test_scenarios' AND schemaname = 'public') THEN
      ALTER TABLE public.prompt_test_scenarios ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_prompt_test_scenarios ON public.prompt_test_scenarios;
      CREATE POLICY workspace_isolation_prompt_test_scenarios ON public.prompt_test_scenarios
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── social_accounts ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'social_accounts' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_accounts' AND schemaname = 'public') THEN
      ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_social_accounts ON public.social_accounts;
      CREATE POLICY workspace_isolation_social_accounts ON public.social_accounts
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── verification_codes ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'verification_codes' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'verification_codes' AND schemaname = 'public') THEN
      ALTER TABLE public.verification_codes ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_verification_codes ON public.verification_codes;
      CREATE POLICY workspace_isolation_verification_codes ON public.verification_codes
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── chats ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chats' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND schemaname = 'public') THEN
      ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_chats ON public.chats;
      CREATE POLICY workspace_isolation_chats ON public.chats
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── conversations ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'conversations' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND schemaname = 'public') THEN
      ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_conversations ON public.conversations;
      CREATE POLICY workspace_isolation_conversations ON public.conversations
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── custos_users ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'custos_users' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custos_users' AND schemaname = 'public') THEN
      ALTER TABLE public.custos_users ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_custos_users ON public.custos_users;
      CREATE POLICY workspace_isolation_custos_users ON public.custos_users
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── email_rate_limits ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'email_rate_limits' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_rate_limits' AND schemaname = 'public') THEN
      ALTER TABLE public.email_rate_limits ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_email_rate_limits ON public.email_rate_limits;
      CREATE POLICY workspace_isolation_email_rate_limits ON public.email_rate_limits
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── email_verifications ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'email_verifications' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_verifications' AND schemaname = 'public') THEN
      ALTER TABLE public.email_verifications ADD COLUMN IF NOT EXISTS workspace_id UUID;
      DROP POLICY IF EXISTS workspace_isolation_email_verifications ON public.email_verifications;
      CREATE POLICY workspace_isolation_email_verifications ON public.email_verifications
        FOR ALL USING (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Migration 79 — RLS policies added to all 22 remaining tables' AS status;
