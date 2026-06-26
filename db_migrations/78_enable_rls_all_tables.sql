-- Migration 78: Enable RLS + workspace-scoped policies on all unprotected tables
-- 
-- The audit found ~69 of 112 tables lacked RLS. Existing fix migrations (35, 37, 39, 40, 41)
-- addressed some gaps. This migration covers the remaining unprotected tables.
--
-- Strategy:
--   - Tables with workspace_id → direct workspace isolation via workspace_members join
--   - Tables with org_id → join through workspaces → workspace_members
--   - Child tables without direct tenant column → join through parent chain
--   - All operations wrapped in DO blocks with table-existence guards
--   - Uses auth.uid() (Supabase) for user identification
--   - Superadmin override on all management policies (checks users.is_superadmin)
--
-- IMPORTANT: The backend uses supabaseAdmin (service_role key) which bypasses RLS.
-- These policies protect against direct Supabase REST API access with the anon key,
-- which is publicly exposed in the browser bundle.

-- ============================================================================
-- HELPER: Returns the user's workspace_id from workspace_membership
-- ============================================================================
CREATE OR REPLACE FUNCTION public._current_user_workspace_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- HELPER: Returns all workspace_ids the current user belongs to
-- ============================================================================
CREATE OR REPLACE FUNCTION public._current_user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- HELPER: Returns org_ids accessible by the current user (via workspaces)
-- ============================================================================
CREATE OR REPLACE FUNCTION public._current_user_org_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT w.org_id FROM public.workspaces w
  WHERE w.id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    AND w.org_id IS NOT NULL;
$$;

-- ============================================================================
-- HELPER: Superadmin check (used in management policies)
-- ============================================================================
CREATE OR REPLACE FUNCTION public._is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_superadmin = true);
$$;

-- ============================================================================
-- DOMAIN 1: Organisation & Identity (04_canonical_schema.sql)
-- ============================================================================

-- ── organizations ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'organizations' AND schemaname = 'public') THEN
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_members_can_view_orgs ON public.organizations;
    CREATE POLICY workspace_members_can_view_orgs ON public.organizations
      FOR SELECT USING (
        id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );

    DROP POLICY IF EXISTS admins_can_manage_orgs ON public.organizations;
    CREATE POLICY admins_can_manage_orgs ON public.organizations
      FOR ALL USING (
        public._is_superadmin()
        OR (
          id IN (SELECT public._current_user_org_ids())
          AND EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid()
              AND workspace_id IN (SELECT id FROM public.workspaces WHERE org_id = organizations.id)
              AND role IN ('ADMIN', 'WORKSPACE_OWNER')
          )
        )
      );
  END IF;
END $$;

-- ── workspaces ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'workspaces' AND schemaname = 'public') THEN
    ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_members_can_view_workspaces ON public.workspaces;
    CREATE POLICY workspace_members_can_view_workspaces ON public.workspaces
      FOR SELECT USING (
        id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );

    DROP POLICY IF EXISTS admins_can_manage_workspaces ON public.workspaces;
    CREATE POLICY admins_can_manage_workspaces ON public.workspaces
      FOR ALL USING (
        public._is_superadmin()
        OR (
          id IN (SELECT public._current_user_workspace_ids())
          AND EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid() AND workspace_id = workspaces.id
              AND role IN ('ADMIN', 'WORKSPACE_OWNER')
          )
        )
      );
  END IF;
END $$;

-- ── roles ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'roles' AND schemaname = 'public') THEN
    ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_members_can_view_roles ON public.roles;
    CREATE POLICY workspace_members_can_view_roles ON public.roles
      FOR SELECT USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR org_id IS NULL  -- system-level roles visible to all
        OR public._is_superadmin()
      );

    DROP POLICY IF EXISTS admins_can_manage_roles ON public.roles;
    CREATE POLICY admins_can_manage_roles ON public.roles
      FOR ALL USING (
        public._is_superadmin()
        OR (
          org_id IN (SELECT public._current_user_org_ids())
          AND EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid()
              AND workspace_id IN (SELECT id FROM public.workspaces WHERE org_id = roles.org_id)
              AND role IN ('ADMIN', 'WORKSPACE_OWNER')
          )
        )
      );
  END IF;
END $$;

-- ── role_permissions ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'role_permissions' AND schemaname = 'public') THEN
    ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_role_permissions ON public.role_permissions;
    CREATE POLICY org_isolation_role_permissions ON public.role_permissions
      FOR ALL USING (
        public._is_superadmin()
        OR role_id IN (
          SELECT id FROM public.roles WHERE org_id IN (SELECT public._current_user_org_ids())
        )
      );
  END IF;
END $$;

-- ── domain_users ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'domain_users' AND schemaname = 'public') THEN
    ALTER TABLE public.domain_users ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.domain_users ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_domain_users ON public.domain_users;
    CREATE POLICY org_isolation_domain_users ON public.domain_users
      FOR SELECT USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR auth_user_id = auth.uid()  -- users can always see themselves
        OR public._is_superadmin()
      );

    DROP POLICY IF EXISTS admins_can_manage_domain_users ON public.domain_users;
    CREATE POLICY admins_can_manage_domain_users ON public.domain_users
      FOR ALL USING (
        public._is_superadmin()
        OR (
          org_id IN (SELECT public._current_user_org_ids())
          AND EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid()
              AND workspace_id IN (SELECT id FROM public.workspaces WHERE org_id = domain_users.org_id)
              AND role IN ('ADMIN', 'WORKSPACE_OWNER')
          )
        )
      );
  END IF;
END $$;

-- ── memberships ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'memberships' AND schemaname = 'public') THEN
    ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_memberships ON public.memberships;
    CREATE POLICY workspace_isolation_memberships ON public.memberships
      FOR SELECT USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR user_id = auth.uid()  -- users can see their own memberships
        OR public._is_superadmin()
      );

    DROP POLICY IF EXISTS admins_can_manage_memberships ON public.memberships;
    CREATE POLICY admins_can_manage_memberships ON public.memberships
      FOR ALL USING (
        public._is_superadmin()
        OR (
          workspace_id IN (SELECT public._current_user_workspace_ids())
          AND EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid() AND workspace_id = memberships.workspace_id
              AND role IN ('ADMIN', 'WORKSPACE_OWNER')
          )
        )
      );
  END IF;
END $$;

-- ============================================================================
-- DOMAIN 2: Content & Asset (04_canonical_schema.sql)
-- ============================================================================

-- ── content_assets ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'content_assets' AND schemaname = 'public') THEN
    ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_content_assets ON public.content_assets;
    CREATE POLICY workspace_isolation_content_assets ON public.content_assets
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── content_variants ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'content_variants' AND schemaname = 'public') THEN
    ALTER TABLE public.content_variants ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS asset_isolation_content_variants ON public.content_variants;
    CREATE POLICY asset_isolation_content_variants ON public.content_variants
      FOR ALL USING (
        public._is_superadmin()
        OR asset_id IN (
          SELECT id FROM public.content_assets WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── asset_versions ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'asset_versions' AND schemaname = 'public') THEN
    ALTER TABLE public.asset_versions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS asset_isolation_asset_versions ON public.asset_versions;
    CREATE POLICY asset_isolation_asset_versions ON public.asset_versions
      FOR ALL USING (
        public._is_superadmin()
        OR asset_id IN (
          SELECT id FROM public.content_assets WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── asset_usage_links ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'asset_usage_links' AND schemaname = 'public') THEN
    ALTER TABLE public.asset_usage_links ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS asset_isolation_asset_usage_links ON public.asset_usage_links;
    CREATE POLICY asset_isolation_asset_usage_links ON public.asset_usage_links
      FOR ALL USING (
        public._is_superadmin()
        OR asset_id IN (
          SELECT id FROM public.content_assets WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- DOMAIN 3: Channel & Platform (04_canonical_schema.sql)
-- ============================================================================

-- ── channels ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'channels' AND schemaname = 'public') THEN
    ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_channels ON public.channels;
    CREATE POLICY workspace_isolation_channels ON public.channels
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── platform_accounts ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'platform_accounts' AND schemaname = 'public') THEN
    ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS channel_isolation_platform_accounts ON public.platform_accounts;
    CREATE POLICY channel_isolation_platform_accounts ON public.platform_accounts
      FOR ALL USING (
        public._is_superadmin()
        OR channel_id IN (
          SELECT id FROM public.channels WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── connector_bindings ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'connector_bindings' AND schemaname = 'public') THEN
    ALTER TABLE public.connector_bindings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS platform_account_isolation_connector_bindings ON public.connector_bindings;
    CREATE POLICY platform_account_isolation_connector_bindings ON public.connector_bindings
      FOR ALL USING (
        public._is_superadmin()
        OR platform_account_id IN (
          SELECT id FROM public.platform_accounts WHERE channel_id IN (
            SELECT id FROM public.channels WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
          )
        )
      );
  END IF;
END $$;

-- ── capability_maps ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'capability_maps' AND schemaname = 'public') THEN
    ALTER TABLE public.capability_maps ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS platform_account_isolation_capability_maps ON public.capability_maps;
    CREATE POLICY platform_account_isolation_capability_maps ON public.capability_maps
      FOR ALL USING (
        public._is_superadmin()
        OR platform_account_id IN (
          SELECT id FROM public.platform_accounts WHERE channel_id IN (
            SELECT id FROM public.channels WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
          )
        )
      );
  END IF;
END $$;

-- ============================================================================
-- DOMAIN 4: Audience & Behavioural Intelligence (04_canonical_schema.sql)
-- ============================================================================

-- ── contacts ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'contacts' AND schemaname = 'public') THEN
    ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_contacts ON public.contacts;
    CREATE POLICY workspace_isolation_contacts ON public.contacts
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── audience_segments ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audience_segments' AND schemaname = 'public') THEN
    ALTER TABLE public.audience_segments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_audience_segments ON public.audience_segments;
    CREATE POLICY workspace_isolation_audience_segments ON public.audience_segments
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── contact_segment_memberships ───────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'contact_segment_memberships' AND schemaname = 'public') THEN
    ALTER TABLE public.contact_segment_memberships ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS segment_isolation_contact_segment_memberships ON public.contact_segment_memberships;
    CREATE POLICY segment_isolation_contact_segment_memberships ON public.contact_segment_memberships
      FOR ALL USING (
        public._is_superadmin()
        OR segment_id IN (
          SELECT id FROM public.audience_segments WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── behavioural_scores ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'behavioural_scores' AND schemaname = 'public') THEN
    ALTER TABLE public.behavioural_scores ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.behavioural_scores ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_behavioural_scores ON public.behavioural_scores;
    CREATE POLICY org_isolation_behavioural_scores ON public.behavioural_scores
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── lifecycle_states ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'lifecycle_states' AND schemaname = 'public') THEN
    ALTER TABLE public.lifecycle_states ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS contact_isolation_lifecycle_states ON public.lifecycle_states;
    CREATE POLICY contact_isolation_lifecycle_states ON public.lifecycle_states
      FOR ALL USING (
        public._is_superadmin()
        OR contact_id IN (
          SELECT id FROM public.contacts WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- DOMAIN 5: Decision Engine (04_canonical_schema.sql)
-- ============================================================================

-- ── decisions ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'decisions' AND schemaname = 'public') THEN
    ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_decisions ON public.decisions;
    CREATE POLICY workspace_isolation_decisions ON public.decisions
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── decision_candidates ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'decision_candidates' AND schemaname = 'public') THEN
    ALTER TABLE public.decision_candidates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS decision_isolation_decision_candidates ON public.decision_candidates;
    CREATE POLICY decision_isolation_decision_candidates ON public.decision_candidates
      FOR ALL USING (
        public._is_superadmin()
        OR decision_id IN (
          SELECT id FROM public.decisions WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── scoring_snapshots ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scoring_snapshots' AND schemaname = 'public') THEN
    ALTER TABLE public.scoring_snapshots ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS decision_isolation_scoring_snapshots ON public.scoring_snapshots;
    CREATE POLICY decision_isolation_scoring_snapshots ON public.scoring_snapshots
      FOR ALL USING (
        public._is_superadmin()
        OR decision_id IN (
          SELECT id FROM public.decisions WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── decision_explanations ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'decision_explanations' AND schemaname = 'public') THEN
    ALTER TABLE public.decision_explanations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS decision_isolation_decision_explanations ON public.decision_explanations;
    CREATE POLICY decision_isolation_decision_explanations ON public.decision_explanations
      FOR ALL USING (
        public._is_superadmin()
        OR decision_id IN (
          SELECT id FROM public.decisions WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- DOMAIN 6: Campaign & Execution (04_canonical_schema.sql)
-- ============================================================================

-- ── campaigns ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'campaigns' AND schemaname = 'public') THEN
    ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_campaigns ON public.campaigns;
    CREATE POLICY workspace_isolation_campaigns ON public.campaigns
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── campaign_channel_links ────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'campaign_channel_links' AND schemaname = 'public') THEN
    ALTER TABLE public.campaign_channel_links ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS campaign_isolation_campaign_channel_links ON public.campaign_channel_links;
    CREATE POLICY campaign_isolation_campaign_channel_links ON public.campaign_channel_links
      FOR ALL USING (
        public._is_superadmin()
        OR campaign_id IN (
          SELECT id FROM public.campaigns WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── campaign_schedules ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'campaign_schedules' AND schemaname = 'public') THEN
    ALTER TABLE public.campaign_schedules ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS campaign_isolation_campaign_schedules ON public.campaign_schedules;
    CREATE POLICY campaign_isolation_campaign_schedules ON public.campaign_schedules
      FOR ALL USING (
        public._is_superadmin()
        OR campaign_id IN (
          SELECT id FROM public.campaigns WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── execution_jobs ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'execution_jobs' AND schemaname = 'public') THEN
    ALTER TABLE public.execution_jobs ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.execution_jobs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_execution_jobs ON public.execution_jobs;
    CREATE POLICY org_isolation_execution_jobs ON public.execution_jobs
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── execution_receipts ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'execution_receipts' AND schemaname = 'public') THEN
    ALTER TABLE public.execution_receipts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS job_isolation_execution_receipts ON public.execution_receipts;
    CREATE POLICY job_isolation_execution_receipts ON public.execution_receipts
      FOR ALL USING (
        public._is_superadmin()
        OR execution_job_id IN (
          SELECT id FROM public.execution_jobs WHERE org_id IN (SELECT public._current_user_org_ids())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- DOMAIN 7: Governance & Policy (04_canonical_schema.sql)
-- ============================================================================

-- ── policies ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'policies' AND schemaname = 'public') THEN
    ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_policies ON public.policies;
    CREATE POLICY workspace_isolation_policies ON public.policies
      FOR ALL USING (
        public._is_superadmin()
        OR workspace_id IN (SELECT public._current_user_workspace_ids())
        OR (workspace_id IS NULL AND org_id IN (SELECT public._current_user_org_ids()))
        OR (workspace_id IS NULL AND org_id IS NULL)  -- global policies
      );
  END IF;
END $$;

-- ── policy_versions ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'policy_versions' AND schemaname = 'public') THEN
    ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS policy_isolation_policy_versions ON public.policy_versions;
    CREATE POLICY policy_isolation_policy_versions ON public.policy_versions
      FOR ALL USING (
        public._is_superadmin()
        OR policy_id IN (
          SELECT id FROM public.policies WHERE
            workspace_id IN (SELECT public._current_user_workspace_ids())
            OR (workspace_id IS NULL AND org_id IN (SELECT public._current_user_org_ids()))
            OR (workspace_id IS NULL AND org_id IS NULL)
        )
      );
  END IF;
END $$;

-- ── policy_evaluations ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'policy_evaluations' AND schemaname = 'public') THEN
    ALTER TABLE public.policy_evaluations ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.policy_evaluations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_policy_evaluations ON public.policy_evaluations;
    CREATE POLICY org_isolation_policy_evaluations ON public.policy_evaluations
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── approvals (canonical — not to be confused with approval_items) ────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'approvals' AND schemaname = 'public') THEN
    -- Only enable RLS and create policy if not already done
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approvals' AND schemaname = 'public') THEN
      ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS org_id UUID;
      ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS org_isolation_approvals ON public.approvals;
      CREATE POLICY org_isolation_approvals ON public.approvals
        FOR ALL USING (
          org_id IN (SELECT public._current_user_org_ids())
          OR public._is_superadmin()
        );
    END IF;
  END IF;
END $$;

-- ── approval_actions ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'approval_actions' AND schemaname = 'public') THEN
    ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS approval_isolation_approval_actions ON public.approval_actions;
    CREATE POLICY approval_isolation_approval_actions ON public.approval_actions
      FOR ALL USING (
        public._is_superadmin()
        OR approval_id IN (
          SELECT id FROM public.approvals WHERE org_id IN (SELECT public._current_user_org_ids())
        )
      );
  END IF;
END $$;

-- ── governance_tokens ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'governance_tokens' AND schemaname = 'public') THEN
    ALTER TABLE public.governance_tokens ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.governance_tokens ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_governance_tokens ON public.governance_tokens;
    CREATE POLICY org_isolation_governance_tokens ON public.governance_tokens
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ============================================================================
-- DOMAIN 8: Attribution & Revenue (04_canonical_schema.sql)
-- ============================================================================

-- ── margin_profiles ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'margin_profiles' AND schemaname = 'public') THEN
    ALTER TABLE public.margin_profiles ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.margin_profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_margin_profiles ON public.margin_profiles;
    CREATE POLICY org_isolation_margin_profiles ON public.margin_profiles
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── attribution_paths ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'attribution_paths' AND schemaname = 'public') THEN
    ALTER TABLE public.attribution_paths ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.attribution_paths ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_attribution_paths ON public.attribution_paths;
    CREATE POLICY org_isolation_attribution_paths ON public.attribution_paths
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── roi_snapshots ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'roi_snapshots' AND schemaname = 'public') THEN
    ALTER TABLE public.roi_snapshots ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.roi_snapshots ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_roi_snapshots ON public.roi_snapshots;
    CREATE POLICY org_isolation_roi_snapshots ON public.roi_snapshots
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── reconciliation_runs ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'reconciliation_runs' AND schemaname = 'public') THEN
    ALTER TABLE public.reconciliation_runs ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_reconciliation_runs ON public.reconciliation_runs;
    CREATE POLICY org_isolation_reconciliation_runs ON public.reconciliation_runs
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ============================================================================
-- DOMAIN 9: Orchestration (04_canonical_schema.sql)
-- ============================================================================

-- ── workflow_instances ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'workflow_instances' AND schemaname = 'public') THEN
    ALTER TABLE public.workflow_instances ADD COLUMN IF NOT EXISTS org_id UUID;
    ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_isolation_workflow_instances ON public.workflow_instances;
    CREATE POLICY org_isolation_workflow_instances ON public.workflow_instances
      FOR ALL USING (
        org_id IN (SELECT public._current_user_org_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── orchestration_steps ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'orchestration_steps' AND schemaname = 'public') THEN
    ALTER TABLE public.orchestration_steps ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workflow_isolation_orchestration_steps ON public.orchestration_steps;
    CREATE POLICY workflow_isolation_orchestration_steps ON public.orchestration_steps
      FOR ALL USING (
        public._is_superadmin()
        OR workflow_instance_id IN (
          SELECT id FROM public.workflow_instances WHERE org_id IN (SELECT public._current_user_org_ids())
        )
      );
  END IF;
END $$;

-- ── workflow_failures ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'workflow_failures' AND schemaname = 'public') THEN
    ALTER TABLE public.workflow_failures ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workflow_isolation_workflow_failures ON public.workflow_failures;
    CREATE POLICY workflow_isolation_workflow_failures ON public.workflow_failures
      FOR ALL USING (
        public._is_superadmin()
        OR workflow_instance_id IN (
          SELECT id FROM public.workflow_instances WHERE org_id IN (SELECT public._current_user_org_ids())
        )
      );
  END IF;
END $$;

-- ── outbox_events ─────────────────────────────────────────────────────────────
-- Outbox events don't have workspace_id or org_id. They're append-only event records.
-- Any authenticated user can read; writing is controlled app-side.
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'outbox_events' AND schemaname = 'public') THEN
    ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS authenticated_can_read_outbox ON public.outbox_events;
    CREATE POLICY authenticated_can_read_outbox ON public.outbox_events
      FOR SELECT USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS service_can_write_outbox ON public.outbox_events;
    CREATE POLICY service_can_write_outbox ON public.outbox_events
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================================
-- KNOWLEDGE ENTERPRISE TABLES (006_knowledge_enterprise.sql)
-- These reference knowledge_sources which is the parent table (created in earlier migration).
-- knowledge_sources has workspace_id via knowledge_collections → knowledge_sources chain.
-- ============================================================================

-- ── knowledge_source_versions ─────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_source_versions' AND schemaname = 'public') THEN
    ALTER TABLE public.knowledge_source_versions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS source_isolation_knowledge_source_versions ON public.knowledge_source_versions;
    CREATE POLICY source_isolation_knowledge_source_versions ON public.knowledge_source_versions
      FOR ALL USING (
        public._is_superadmin()
        OR source_id IN (
          SELECT id FROM public.knowledge_sources
          WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── knowledge_claims ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_claims' AND schemaname = 'public') THEN
    ALTER TABLE public.knowledge_claims ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS source_isolation_knowledge_claims ON public.knowledge_claims;
    CREATE POLICY source_isolation_knowledge_claims ON public.knowledge_claims
      FOR ALL USING (
        public._is_superadmin()
        OR source_id IN (
          SELECT id FROM public.knowledge_sources
          WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── knowledge_citations ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_citations' AND schemaname = 'public') THEN
    ALTER TABLE public.knowledge_citations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS source_isolation_knowledge_citations ON public.knowledge_citations;
    CREATE POLICY source_isolation_knowledge_citations ON public.knowledge_citations
      FOR ALL USING (
        public._is_superadmin()
        OR source_id IN (
          SELECT id FROM public.knowledge_sources
          WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── knowledge_scan_log ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_scan_log' AND schemaname = 'public') THEN
    ALTER TABLE public.knowledge_scan_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS source_isolation_knowledge_scan_log ON public.knowledge_scan_log;
    CREATE POLICY source_isolation_knowledge_scan_log ON public.knowledge_scan_log
      FOR ALL USING (
        public._is_superadmin()
        OR source_id IN (
          SELECT id FROM public.knowledge_sources
          WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── knowledge_notifications ───────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_notifications' AND schemaname = 'public') THEN
    ALTER TABLE public.knowledge_notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_knowledge_notifications ON public.knowledge_notifications;
    CREATE POLICY workspace_isolation_knowledge_notifications ON public.knowledge_notifications
      FOR ALL USING (
        public._is_superadmin()
        OR workspace_id IN (
          SELECT workspace_id::TEXT FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── knowledge_conflicts ───────────────────────────────────────────────────────
-- No direct workspace_id or source_id FK. Visible to superadmins; app-layer controls writes.
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_conflicts' AND schemaname = 'public') THEN
    ALTER TABLE public.knowledge_conflicts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS superadmin_knowledge_conflicts ON public.knowledge_conflicts;
    CREATE POLICY superadmin_knowledge_conflicts ON public.knowledge_conflicts
      FOR ALL USING (public._is_superadmin());

    DROP POLICY IF EXISTS authenticated_can_read_knowledge_conflicts ON public.knowledge_conflicts;
    CREATE POLICY authenticated_can_read_knowledge_conflicts ON public.knowledge_conflicts
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── knowledge_reviews ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_reviews' AND schemaname = 'public') THEN
    ALTER TABLE public.knowledge_reviews ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS source_isolation_knowledge_reviews ON public.knowledge_reviews;
    CREATE POLICY source_isolation_knowledge_reviews ON public.knowledge_reviews
      FOR ALL USING (
        public._is_superadmin()
        OR source_id IN (
          SELECT id FROM public.knowledge_sources
          WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── knowledge_access_policies ─────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'knowledge_access_policies' AND schemaname = 'public') THEN
    ALTER TABLE public.knowledge_access_policies ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS superadmin_knowledge_access_policies ON public.knowledge_access_policies;
    CREATE POLICY superadmin_knowledge_access_policies ON public.knowledge_access_policies
      FOR ALL USING (public._is_superadmin());

    DROP POLICY IF EXISTS authenticated_can_read_knowledge_access_policies ON public.knowledge_access_policies;
    CREATE POLICY authenticated_can_read_knowledge_access_policies ON public.knowledge_access_policies
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================================
-- EVIDENCE VAULT BASE TABLES (10_evidence_vault_tables.sql)
-- ============================================================================

-- ── legal_holds ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'legal_holds' AND schemaname = 'public') THEN
    ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_legal_holds ON public.legal_holds;
    CREATE POLICY workspace_isolation_legal_holds ON public.legal_holds
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── evidence_packs ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'evidence_packs' AND schemaname = 'public') THEN
    ALTER TABLE public.evidence_packs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_evidence_packs ON public.evidence_packs;
    CREATE POLICY workspace_isolation_evidence_packs ON public.evidence_packs
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ============================================================================
-- INBOX TABLES (05_inbox_schema.sql)
-- ============================================================================

-- ── inbox_messages ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'inbox_messages' AND schemaname = 'public') THEN
    ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_inbox_messages ON public.inbox_messages;
    CREATE POLICY workspace_isolation_inbox_messages ON public.inbox_messages
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── inbox_replies ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'inbox_replies' AND schemaname = 'public') THEN
    ALTER TABLE public.inbox_replies ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_inbox_replies ON public.inbox_replies;
    CREATE POLICY workspace_isolation_inbox_replies ON public.inbox_replies
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── inbox_escalations ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'inbox_escalations' AND schemaname = 'public') THEN
    ALTER TABLE public.inbox_escalations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_inbox_escalations ON public.inbox_escalations;
    CREATE POLICY workspace_isolation_inbox_escalations ON public.inbox_escalations
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── inbox_notes ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'inbox_notes' AND schemaname = 'public') THEN
    ALTER TABLE public.inbox_notes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_inbox_notes ON public.inbox_notes;
    CREATE POLICY workspace_isolation_inbox_notes ON public.inbox_notes
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── inbox_audit_log ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'inbox_audit_log' AND schemaname = 'public') THEN
    ALTER TABLE public.inbox_audit_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_inbox_audit_log ON public.inbox_audit_log;
    CREATE POLICY workspace_isolation_inbox_audit_log ON public.inbox_audit_log
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── inbox_auto_reply_rules ────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'inbox_auto_reply_rules' AND schemaname = 'public') THEN
    ALTER TABLE public.inbox_auto_reply_rules ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_inbox_auto_reply_rules ON public.inbox_auto_reply_rules;
    CREATE POLICY workspace_isolation_inbox_auto_reply_rules ON public.inbox_auto_reply_rules
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── inbox_recipient_account (37_inbox_recipient_account.sql) ──────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'inbox_recipient_account' AND schemaname = 'public') THEN
    ALTER TABLE public.inbox_recipient_account ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_inbox_recipient_account ON public.inbox_recipient_account;
    CREATE POLICY workspace_isolation_inbox_recipient_account ON public.inbox_recipient_account
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ============================================================================
-- API KEYS & WEBHOOKS (09_api_keys_and_webhooks.sql)
-- ============================================================================

-- ── api_keys ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'api_keys' AND schemaname = 'public') THEN
    ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_api_keys ON public.api_keys;
    CREATE POLICY workspace_isolation_api_keys ON public.api_keys
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── webhook_endpoints ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'webhook_endpoints' AND schemaname = 'public') THEN
    ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_webhook_endpoints ON public.webhook_endpoints;
    CREATE POLICY workspace_isolation_webhook_endpoints ON public.webhook_endpoints
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── webhook_delivery_log ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'webhook_delivery_log' AND schemaname = 'public') THEN
    ALTER TABLE public.webhook_delivery_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS endpoint_isolation_webhook_delivery_log ON public.webhook_delivery_log;
    CREATE POLICY endpoint_isolation_webhook_delivery_log ON public.webhook_delivery_log
      FOR ALL USING (
        public._is_superadmin()
        OR webhook_endpoint_id IN (
          SELECT id FROM public.webhook_endpoints WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- WALLETS (40_wallets.sql)
-- ============================================================================

-- ── wallets ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'wallets' AND schemaname = 'public') THEN
    ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_wallets ON public.wallets;
    CREATE POLICY workspace_isolation_wallets ON public.wallets
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── wallet_transactions ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'wallet_transactions' AND schemaname = 'public') THEN
    ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS wallet_isolation_wallet_transactions ON public.wallet_transactions;
    CREATE POLICY wallet_isolation_wallet_transactions ON public.wallet_transactions
      FOR ALL USING (
        public._is_superadmin()
        OR wallet_id IN (
          SELECT id FROM public.wallets WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- CAMPAIGN SUPPORT TABLES
-- ============================================================================

-- ── projects (14_campaigns_projects.sql) ──────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'projects' AND schemaname = 'public') THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_projects ON public.projects;
    CREATE POLICY workspace_isolation_projects ON public.projects
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── campaign_boosts (38_campaign_boosts.sql) ──────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'campaign_boosts' AND schemaname = 'public') THEN
    ALTER TABLE public.campaign_boosts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_campaign_boosts ON public.campaign_boosts;
    CREATE POLICY workspace_isolation_campaign_boosts ON public.campaign_boosts
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── budget_authorizations (39_budget_authorizations.sql) ──────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'budget_authorizations' AND schemaname = 'public') THEN
    ALTER TABLE public.budget_authorizations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_budget_authorizations ON public.budget_authorizations;
    CREATE POLICY workspace_isolation_budget_authorizations ON public.budget_authorizations
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── publish_intents ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'publish_intents' AND schemaname = 'public') THEN
    ALTER TABLE public.publish_intents ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_publish_intents ON public.publish_intents;
    CREATE POLICY workspace_isolation_publish_intents ON public.publish_intents
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── scheduled_posts (01_scheduler_schema.sql + 02_scheduler_enhancements.sql) ─
-- Already has RLS but with broad 'auth.role() = authenticated' policy.
-- workspace_id column added by migration 02. Replace policies with workspace-scoped.
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scheduled_posts' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Allow authenticated full access to scheduled posts" ON public.scheduled_posts;

    DROP POLICY IF EXISTS "Users can view own scheduled posts" ON public.scheduled_posts;
    DROP POLICY IF EXISTS "Users can insert own scheduled posts" ON public.scheduled_posts;
    DROP POLICY IF EXISTS "Users can update own scheduled posts" ON public.scheduled_posts;
    DROP POLICY IF EXISTS "Users can delete own scheduled posts" ON public.scheduled_posts;

    DROP POLICY IF EXISTS workspace_isolation_scheduled_posts ON public.scheduled_posts;
    CREATE POLICY workspace_isolation_scheduled_posts ON public.scheduled_posts
      FOR ALL USING (
        creator_id = auth.uid()
        OR workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── scheduler_jobs (01_scheduler_schema.sql) ──────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scheduler_jobs' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Allow authenticated full access to scheduler jobs" ON public.scheduler_jobs;

    DROP POLICY IF EXISTS post_isolation_scheduler_jobs ON public.scheduler_jobs;
    CREATE POLICY post_isolation_scheduler_jobs ON public.scheduler_jobs
      FOR ALL USING (
        public._is_superadmin()
        OR post_id IN (
          SELECT id FROM public.scheduled_posts
          WHERE creator_id = auth.uid()
             OR workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- AGENT OPERATIONS CONTROL ROOM (43_agent_operations_control_room.sql)
-- ============================================================================

-- ── agent_runs ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_runs' AND schemaname = 'public') THEN
    ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_agent_runs ON public.agent_runs;
    CREATE POLICY workspace_isolation_agent_runs ON public.agent_runs
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── run_events ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'run_events' AND schemaname = 'public') THEN
    ALTER TABLE public.run_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS run_isolation_run_events ON public.run_events;
    CREATE POLICY run_isolation_run_events ON public.run_events
      FOR ALL USING (
        public._is_superadmin()
        OR run_id IN (
          SELECT id FROM public.agent_runs WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── policy_results ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'policy_results' AND schemaname = 'public') THEN
    ALTER TABLE public.policy_results ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS run_isolation_policy_results ON public.policy_results;
    CREATE POLICY run_isolation_policy_results ON public.policy_results
      FOR ALL USING (
        public._is_superadmin()
        OR run_id IN (
          SELECT id FROM public.agent_runs WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ── queue_items ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'queue_items' AND schemaname = 'public') THEN
    ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_queue_items ON public.queue_items;
    CREATE POLICY workspace_isolation_queue_items ON public.queue_items
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── incidents ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'incidents' AND schemaname = 'public') THEN
    ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_incidents ON public.incidents;
    CREATE POLICY workspace_isolation_incidents ON public.incidents
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── evidence_bundles ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'evidence_bundles' AND schemaname = 'public') THEN
    ALTER TABLE public.evidence_bundles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_evidence_bundles ON public.evidence_bundles;
    CREATE POLICY workspace_isolation_evidence_bundles ON public.evidence_bundles
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── runtime_control_actions ───────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'runtime_control_actions' AND schemaname = 'public') THEN
    ALTER TABLE public.runtime_control_actions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS run_isolation_runtime_control_actions ON public.runtime_control_actions;
    CREATE POLICY run_isolation_runtime_control_actions ON public.runtime_control_actions
      FOR ALL USING (
        public._is_superadmin()
        OR run_id IN (
          SELECT id FROM public.agent_runs WHERE workspace_id IN (SELECT public._current_user_workspace_ids())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- WORKFLOW GAP FIX TABLES (43_workflow_gap_fix.sql)
-- ============================================================================

-- ── routing_trail ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'routing_trail' AND schemaname = 'public') THEN
    ALTER TABLE public.routing_trail ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_routing_trail ON public.routing_trail;
    CREATE POLICY workspace_isolation_routing_trail ON public.routing_trail
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── agent_safety_policy_results (43_workflow_gap_fix.sql) ─────────────────────
-- Note: agent_safety_policy_results also exists in migration 09 with RLS.
-- This covers the version from migration 43 if it was created instead.
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_safety_policy_results' AND schemaname = 'public')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_safety_policy_results' AND schemaname = 'public')
  THEN
    ALTER TABLE public.agent_safety_policy_results ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS agent_isolation_safety_policy_results ON public.agent_safety_policy_results;
    CREATE POLICY agent_isolation_safety_policy_results ON public.agent_safety_policy_results
      FOR ALL USING (
        public._is_superadmin()
        OR agent_id IN (
          SELECT id FROM public.agents
        )
      );
  END IF;
END $$;

-- ============================================================================
-- STORAGE & BILLING TABLES
-- ============================================================================

-- ── storage_addons (67_storage_addons.sql) ────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'storage_addons' AND schemaname = 'public') THEN
    ALTER TABLE public.storage_addons ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_storage_addons ON public.storage_addons;
    CREATE POLICY workspace_isolation_storage_addons ON public.storage_addons
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── billing_events (68_billing_overcharge.sql) ────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'billing_events' AND schemaname = 'public') THEN
    ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_billing_events ON public.billing_events;
    CREATE POLICY workspace_isolation_billing_events ON public.billing_events
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ── connected_accounts (various migrations) ───────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'connected_accounts' AND schemaname = 'public') THEN
    ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS workspace_isolation_connected_accounts ON public.connected_accounts;
    CREATE POLICY workspace_isolation_connected_accounts ON public.connected_accounts
      FOR ALL USING (
        workspace_id IN (SELECT public._current_user_workspace_ids())
        OR public._is_superadmin()
      );
  END IF;
END $$;

-- ============================================================================
-- TABLES WITH EXISTING COVERAGE (not modified by this migration)
-- ============================================================================
-- Brand tables (72_brand_profiles.sql): brand_profiles, brand_linguistic_rules,
--   brand_claims — all have RLS + policies from migration 72.
-- Notifications (06_notifications_and_fixes.sql) — already has RLS with user-scoped policies.
-- Support tickets (17_support_tickets.sql) — already has RLS with user+superadmin policies.
-- Wire tables (74-77) — only add columns to existing tables, no new tables.
-- approval_items (32_approvals.sql) — already has RLS with tenant isolation.
-- All evidence vault phase tables (21-24) — already have RLS with policies.
-- All forensic tables (16-20) — already have RLS with policies.
-- All identity ledger tables (25-27) — already have RLS with policies.
-- All review queue tables (28) — already have RLS with policies.
-- All approval rules tables (29) — already have RLS with policies.
-- All quality audit tables (30) — already have RLS with policies.
-- All validation desk tables (31) — already have RLS with policies.
-- All exception tables (33) — already have RLS with policies (migration 35).
-- All approvals supporting tables (34) — already have RLS with policies.
-- All agent operations/studio tables (05, 08, 09) — already have RLS + policies/migration 39.
-- audit_events (14) — already has RLS with policies.
-- audit_subscriptions (15) — already has RLS with policies.
-- resource_usage (51) — already has RLS with workspace isolation policy.
-- public.users (65) — already has RLS with user-scoped policies.
-- agent_safety_policies, agent_enforcement_events (67) — already have RLS.
-- business_units (13) — already has RLS.
-- business_unit_* tables (71) — already have RLS with policies.
-- data_connectors, connector_sync_logs (12) — already have RLS with policies.
-- posting_windows (01) — already has RLS.

SELECT 'Migration 78 — RLS enabled on all remaining unprotected tables' AS status;
