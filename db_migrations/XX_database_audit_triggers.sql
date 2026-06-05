-- Migration: XX_database_audit_triggers
-- Strengthening Audit Integrity by capturing manual/direct database modifications.
-- This migration adds triggers to core tables to ensure all changes are logged in the Audit Trail.

-- 1. Register additional canonical event types for DB-level auditing
INSERT INTO public.event_type_registry (event_type, category, display_title, default_risk_level, default_retention_class) VALUES
  ('ai.created', 'ai_agent', 'AI Agent Created', 'low', 'EXTENDED'),
  ('ai.updated', 'ai_agent', 'AI Agent Updated', 'low', 'EXTENDED'),
  ('ai.deleted', 'ai_agent', 'AI Agent Deleted', 'medium', 'EXTENDED'),
  ('user.membership_created', 'user_identity', 'Workspace Membership Created', 'low', 'STANDARD'),
  ('user.membership_deleted', 'user_identity', 'Workspace Membership Removed', 'medium', 'STANDARD'),
  ('system.manual_modification', 'system_security', 'Manual Table Modification', 'high', 'REGULATED')
ON CONFLICT (event_type) DO NOTHING;

-- 2. Create the unified audit trigger function
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_data JSONB;
  v_category TEXT;
  v_type TEXT;
  v_risk TEXT := 'low';
  v_workspace_id UUID;
  v_org_id UUID;
  v_actor JSONB;
  v_object JSONB;
  v_change JSONB;
  v_title TEXT;
  v_summary TEXT;
BEGIN
  -- Determine category and type based on table name and operation
  CASE TG_TABLE_NAME
    WHEN 'campaigns' THEN
      v_category := 'content_lifecycle';
      v_type := CASE TG_OP
        WHEN 'INSERT' THEN 'content.created'
        WHEN 'UPDATE' THEN 'content.edited'
        WHEN 'DELETE' THEN 'content.deleted'
      END;
      v_title := 'Campaign ' || INITCAP(LOWER(TG_OP));
      
    WHEN 'agents' THEN
      v_category := 'ai_agent';
      v_type := CASE TG_OP
        WHEN 'INSERT' THEN 'ai.created'
        WHEN 'UPDATE' THEN 'ai.updated'
        WHEN 'DELETE' THEN 'ai.deleted'
      END;
      v_title := 'AI Agent ' || INITCAP(LOWER(TG_OP));

    WHEN 'memberships' THEN
      v_category := 'user_identity';
      v_type := CASE TG_OP
        WHEN 'INSERT' THEN 'user.membership_created'
        WHEN 'UPDATE' THEN 'user.role_changed'
        WHEN 'DELETE' THEN 'user.membership_deleted'
      END;
      v_title := 'Membership ' || INITCAP(LOWER(TG_OP));

    WHEN 'organizations' THEN
      v_category := 'system_security';
      v_type := 'system.manual_modification';
      v_title := 'Organization ' || INITCAP(LOWER(TG_OP));

    WHEN 'workspaces' THEN
      v_category := 'system_security';
      v_type := 'system.manual_modification';
      v_title := 'Workspace ' || INITCAP(LOWER(TG_OP));

    ELSE
      v_category := 'system_security';
      v_type := 'system.manual_modification';
      v_title := 'Manual Modification: ' || TG_TABLE_NAME;
  END CASE;

  -- Extract IDs and construct object/change data with schema-awareness
  IF (TG_OP = 'DELETE') THEN
    -- Object mapping for DELETE
    IF (TG_TABLE_NAME = 'organizations') THEN
      v_org_id := OLD.id;
      v_workspace_id := NULL;
    ELSIF (TG_TABLE_NAME = 'workspaces') THEN
      v_org_id := OLD.org_id;
      v_workspace_id := OLD.id;
    ELSIF (TG_TABLE_NAME = 'memberships') THEN
      v_workspace_id := OLD.workspace_id;
      SELECT org_id INTO v_org_id FROM workspaces WHERE id = v_workspace_id;
    ELSE
      v_workspace_id := OLD.workspace_id;
      v_org_id := OLD.org_id;
    END IF;

    v_object := jsonb_build_object('object_type', TG_TABLE_NAME, 'object_id', OLD.id);
    v_change := jsonb_build_object('deleted_record', row_to_json(OLD));
    v_summary := 'Record deleted from ' || TG_TABLE_NAME || ' (ID: ' || OLD.id || ')';
  ELSE
    -- Object mapping for INSERT/UPDATE
    IF (TG_TABLE_NAME = 'organizations') THEN
      v_org_id := NEW.id;
      v_workspace_id := NULL;
    ELSIF (TG_TABLE_NAME = 'workspaces') THEN
      v_org_id := NEW.org_id;
      v_workspace_id := NEW.id;
    ELSIF (TG_TABLE_NAME = 'memberships') THEN
      v_workspace_id := NEW.workspace_id;
      SELECT org_id INTO v_org_id FROM workspaces WHERE id = v_workspace_id;
    ELSE
      v_workspace_id := NEW.workspace_id;
      v_org_id := NEW.org_id;
    END IF;

    v_object := jsonb_build_object('object_type', TG_TABLE_NAME, 'object_id', NEW.id);
    IF (TG_OP = 'UPDATE') THEN
      v_change := jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW));
      v_summary := 'Record updated in ' || TG_TABLE_NAME || ' (ID: ' || NEW.id || ')';
    ELSE
      v_change := jsonb_build_object('inserted_record', row_to_json(NEW));
      v_summary := 'New record inserted into ' || TG_TABLE_NAME || ' (ID: ' || NEW.id || ')';
    END IF;
  END IF;

  -- Construct actor (In DB triggers, we assume system/manual unless we can find auth context)
  BEGIN
    IF (current_setting('request.jwt.claims', true) IS NOT NULL) THEN
      v_actor := jsonb_build_object(
        'actor_type', 'human_user',
        'actor_id', (current_setting('request.jwt.claims')::jsonb)->>'sub',
        'actor_name', 'Authenticated User (via SQL/API)'
      );
    ELSE
      v_actor := jsonb_build_object(
        'actor_type', 'system',
        'actor_name', 'DB Trigger (Manual/Service Access)'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_actor := jsonb_build_object(
      'actor_type', 'system',
      'actor_name', 'DB Trigger (System)'
    );
  END;

  -- Final risk assessment
  IF (TG_OP = 'DELETE') THEN v_risk := 'medium'; END IF;
  IF (v_category = 'system_security') THEN v_risk := 'high'; END IF;

  -- Call the canonical create_audit_event function
  v_event_data := jsonb_build_object(
    'workspace_id', v_workspace_id,
    'org_id', v_org_id,
    'event_category', v_category,
    'event_type', v_type,
    'event_title', v_title,
    'event_summary', v_summary,
    'actor', v_actor,
    'object', v_object,
    'change', v_change,
    'risk_level', v_risk,
    'timestamp_utc', NOW(),
    'status', 'success',
    'retention_class', CASE WHEN v_category = 'system_security' THEN 'REGULATED' ELSE 'STANDARD' END
  );

  PERFORM public.create_audit_event(v_event_data);

  RETURN NULL; -- AFTER trigger, doesn't modify the row
END;
$$ LANGUAGE plpgsql;

-- 3. Apply triggers to core tables
-- Campaigns
DROP TRIGGER IF EXISTS trg_audit_campaigns ON public.campaigns;
CREATE TRIGGER trg_audit_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

-- Agents
DROP TRIGGER IF EXISTS trg_audit_agents ON public.agents;
CREATE TRIGGER trg_audit_agents
  AFTER INSERT OR UPDATE OR DELETE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

-- Memberships (Permissions/Roles)
DROP TRIGGER IF EXISTS trg_audit_memberships ON public.memberships;
CREATE TRIGGER trg_audit_memberships
  AFTER INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

-- Organizations (Critical Config)
DROP TRIGGER IF EXISTS trg_audit_organizations ON public.organizations;
CREATE TRIGGER trg_audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

-- Workspaces
DROP TRIGGER IF EXISTS trg_audit_workspaces ON public.workspaces;
CREATE TRIGGER trg_audit_workspaces
  AFTER INSERT OR UPDATE OR DELETE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();
