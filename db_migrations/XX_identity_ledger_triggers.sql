-- Migration: XX_identity_ledger_triggers
-- Automatically sync core identity changes to the cryptographically chained Identity Ledger.

-- 1. Helper to sync actor registry (identity_actors)
CREATE OR REPLACE FUNCTION public.sync_actor_registry()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_full_name TEXT;
  v_workspace_id UUID;
  v_roles TEXT[];
BEGIN
  -- Get user details from domain_users
  SELECT email, full_name INTO v_user_email, v_full_name FROM domain_users WHERE id = NEW.user_id;
  
  -- Get all roles for this user in this workspace
  SELECT array_agg(r.name) INTO v_roles
  FROM memberships m
  JOIN roles r ON m.role_id = r.id
  WHERE m.user_id = NEW.user_id AND m.workspace_id = NEW.workspace_id AND m.status = 'ACTIVE';

  -- Upsert into identity_actors
  INSERT INTO public.identity_actors (
    actor_id, workspace_id, tenant_id, actor_type, display_name, email, state, source_system, authority_class, current_roles
  ) VALUES (
    NEW.user_id::text, NEW.workspace_id, 'default', 'human_user', v_full_name, v_user_email, 
    LOWER(NEW.status), 'zoikovertex', 'standard', COALESCE(v_roles, '{}')
  )
  ON CONFLICT (actor_id) DO UPDATE SET
    state = EXCLUDED.state,
    current_roles = EXCLUDED.current_roles,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger for actor registry sync
DROP TRIGGER IF EXISTS trg_sync_actor_registry ON public.memberships;
CREATE TRIGGER trg_sync_actor_registry
  AFTER INSERT OR UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.sync_actor_registry();

-- 3. Function to log ledger entry for authority changes
CREATE OR REPLACE FUNCTION public.log_authority_change_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_change_type TEXT;
  v_role_name TEXT;
BEGIN
  v_change_type := CASE TG_OP
    WHEN 'INSERT' THEN 'identity.created'
    WHEN 'UPDATE' THEN 'authority.snapshot_created'
    WHEN 'DELETE' THEN 'identity.revoked'
  END;

  SELECT name INTO v_role_name FROM roles WHERE id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.role_id ELSE NEW.role_id END);

  INSERT INTO public.identity_ledger_entries (
    ledger_entry_id, tenant_id, workspace_id, entry_type, entry_category, 
    timestamp_utc, actor_id, actor_type, authority_change, risk
  ) VALUES (
    'IDL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(floor(random()*1000000)::text, 6, '0'),
    'default',
    CASE WHEN TG_OP = 'DELETE' THEN OLD.workspace_id ELSE NEW.workspace_id END,
    v_change_type, 'authority_management', NOW(),
    CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id::text ELSE NEW.user_id::text END,
    'human_user',
    jsonb_build_object('role', v_role_name, 'operation', TG_OP),
    jsonb_build_object('risk_level', 'low')
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for ledger logging
DROP TRIGGER IF EXISTS trg_log_authority_ledger ON public.memberships;
CREATE TRIGGER trg_log_authority_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.log_authority_change_to_ledger();
