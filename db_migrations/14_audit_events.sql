-- ZoikoVertex Audit Trail Module
-- Evidence Layer | Module 1 of 4
-- Cryptographically chained, append-only audit event ledger
-- Based on locked build spec v2.0 (20 May 2026)

-- 0. Enable pgcrypto for SHA256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create the audit_events table
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  workspace_id UUID NOT NULL,
  org_id UUID,
  chain_id TEXT NOT NULL DEFAULT 'primary',
  block_number BIGINT NOT NULL,
  hash TEXT NOT NULL,
  prev_hash TEXT,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  data_residency TEXT NOT NULL DEFAULT 'auto',
  event_category TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL DEFAULT '',
  event_summary TEXT NOT NULL DEFAULT '',
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  actor JSONB NOT NULL DEFAULT '{}',
  object JSONB NOT NULL DEFAULT '{}',
  related_objects JSONB DEFAULT '[]',
  correlation JSONB DEFAULT '{}',
  authority JSONB DEFAULT '{}',
  change JSONB DEFAULT '{}',
  ai_context JSONB DEFAULT '{}',
  risk_level TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'success',
  evidence_state TEXT NOT NULL DEFAULT 'not_preserved',
  retention_class TEXT NOT NULL DEFAULT 'STANDARD',
  retention_until TIMESTAMP WITH TIME ZONE,
  sealed_at TIMESTAMP WITH TIME ZONE,
  sealed_by TEXT,
  integrity_check_at TIMESTAMP WITH TIME ZONE,
  idempotency_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT unique_chain_block UNIQUE (tenant_id, chain_id, block_number),
  CONSTRAINT unique_idempotency UNIQUE (idempotency_key),
  CONSTRAINT valid_event_category CHECK (event_category IN (
    'user_identity', 'content_lifecycle', 'ai_agent', 'approval',
    'policy_governance', 'platform_integration', 'evidence_legal', 'system_security'
  )),
  CONSTRAINT valid_risk CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'blocked', 'pending', 'overridden', 'preserved', 'sealed')),
  CONSTRAINT valid_evidence_state CHECK (evidence_state IN ('not_preserved', 'preserved', 'sealed', 'archived', 'legal_hold')),
  CONSTRAINT valid_retention CHECK (retention_class IN ('STANDARD', 'EXTENDED', 'REGULATED', 'LEGAL_HOLD')),
  CONSTRAINT valid_actor_type CHECK (
    (actor->>'actor_type') IS NULL OR
    (actor->>'actor_type') IN ('human_user', 'ai_agent', 'service_account', 'system', 'api_key')
  )
);

-- 2. Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON public.audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_category ON public.audit_events(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_events_risk ON public.audit_events(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_events_status ON public.audit_events(status);
CREATE INDEX IF NOT EXISTS idx_audit_events_retention ON public.audit_events(retention_class);
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace ON public.audit_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events USING gin(actor jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_audit_events_object ON public.audit_events USING gin(object jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation ON public.audit_events USING gin(correlation jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_audit_events_chain ON public.audit_events(tenant_id, chain_id, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_id ON public.audit_events(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON public.audit_events(timestamp_utc DESC);

-- 3. Create sequence for block_number generation per chain
CREATE SEQUENCE IF NOT EXISTS audit_events_block_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- 4. Create function to assign next block_number and prev_hash
CREATE OR REPLACE FUNCTION public.assign_audit_chain_position()
RETURNS TRIGGER AS $$
DECLARE
  last_hash TEXT;
  last_block BIGINT;
  seq_val BIGINT;
BEGIN
  -- Get the last event in the same chain
  SELECT hash, block_number INTO last_hash, last_block
  FROM public.audit_events
  WHERE tenant_id = NEW.tenant_id AND chain_id = NEW.chain_id
  ORDER BY block_number DESC
  LIMIT 1;

  -- Assign block number
  IF last_block IS NULL THEN
    NEW.block_number := 1;
    NEW.prev_hash := NULL;
  ELSE
    NEW.block_number := last_block + 1;
    NEW.prev_hash := last_hash;
  END IF;

  -- Set retention_until based on retention_class
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until := CASE NEW.retention_class
      WHEN 'STANDARD' THEN timezone('utc'::text, now()) + INTERVAL '2 years'
      WHEN 'EXTENDED' THEN timezone('utc'::text, now()) + INTERVAL '7 years'
      WHEN 'REGULATED' THEN timezone('utc'::text, now()) + INTERVAL '10 years'
      WHEN 'LEGAL_HOLD' THEN NULL
      ELSE timezone('utc'::text, now()) + INTERVAL '2 years'
    END;
  END IF;

  -- Auto-generate event_id if not provided
  IF NEW.event_id IS NULL OR NEW.event_id = '' THEN
    NEW.event_id := 'AUD-' || TO_CHAR(timezone('utc'::text, now()), 'YYYY') || '-' || LPAD(NEXTVAL('audit_events_block_seq')::TEXT, 8, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to auto-assign chain position before insert
DROP TRIGGER IF EXISTS trg_assign_audit_chain_position ON public.audit_events;
CREATE TRIGGER trg_assign_audit_chain_position
  BEFORE INSERT ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_audit_chain_position();

-- 6. Create function to verify chain integrity for a tenant
CREATE OR REPLACE FUNCTION public.verify_audit_chain(
  p_tenant_id TEXT DEFAULT 'default',
  p_chain_id TEXT DEFAULT 'primary',
  p_start_block BIGINT DEFAULT 1,
  p_end_block BIGINT DEFAULT NULL
)
RETURNS TABLE(
  block_number BIGINT,
  event_id TEXT,
  hash TEXT,
  prev_hash TEXT,
  chain_verified BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  rec RECORD;
  prev_rec RECORD;
  prev_ok BOOLEAN := TRUE;
BEGIN
  FOR rec IN
    SELECT * FROM public.audit_events
    WHERE tenant_id = p_tenant_id AND chain_id = p_chain_id
      AND block_number >= p_start_block
      AND (p_end_block IS NULL OR block_number <= p_end_block)
    ORDER BY block_number ASC
  LOOP
    IF rec.block_number = 1 THEN
      -- Genesis block: prev_hash must be NULL
      IF rec.prev_hash IS NOT NULL THEN
        chain_verified := FALSE;
        error_message := 'Genesis block has non-null prev_hash';
      ELSE
        chain_verified := TRUE;
        error_message := NULL;
      END IF;
    ELSE
      -- Check prev_hash matches previous block's hash
      SELECT hash INTO prev_rec.hash
      FROM public.audit_events
      WHERE tenant_id = p_tenant_id AND chain_id = p_chain_id
        AND block_number = rec.block_number - 1;

      IF rec.prev_hash IS NULL OR rec.prev_hash != prev_rec.hash THEN
        chain_verified := FALSE;
        error_message := 'prev_hash mismatch: expected ' || COALESCE(prev_rec.hash, 'NULL') || ' but got ' || COALESCE(rec.prev_hash, 'NULL');
      ELSE
        chain_verified := TRUE;
        error_message := NULL;
      END IF;
    END IF;

    block_number := rec.block_number;
    event_id := rec.event_id;
    hash := rec.hash;
    prev_hash := rec.prev_hash;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to seal expired records
CREATE OR REPLACE FUNCTION public.seal_expired_audit_events()
RETURNS BIGINT AS $$
DECLARE
  affected BIGINT;
BEGIN
  UPDATE public.audit_events
  SET
    evidence_state = 'sealed',
    sealed_at = timezone('utc'::text, now()),
    sealed_by = 'system',
    actor = jsonb_build_object('actor_type', 'system', 'actor_name', 'Retention Manager'),
    -- Clear sensitive fields, keep hash and metadata only
    object = jsonb_build_object(
      'object_type', object->>'object_type',
      'object_id', object->>'object_id'
    ),
    authority = '{}',
    change = '{}',
    ai_context = '{}'
  WHERE
    retention_class != 'LEGAL_HOLD'
    AND retention_until IS NOT NULL
    AND retention_until <= timezone('utc'::text, now())
    AND evidence_state NOT IN ('sealed', 'archived', 'legal_hold');

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- 8. Enable Row Level Security
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for tenant isolation
CREATE POLICY "Users can view audit events in their workspace"
ON public.audit_events FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_superadmin = true)
);

CREATE POLICY "Admins can view all audit events in their workspace"
ON public.audit_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
    AND workspace_members.workspace_id = audit_events.workspace_id
    AND workspace_members.role IN ('ADMIN', 'WORKSPACE_OWNER')
  )
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_superadmin = true)
);

-- 10. Create function to atomically allocate chain position, compute hash, and create audit event
CREATE OR REPLACE FUNCTION public.create_audit_event(
  p_event_data JSONB
) RETURNS JSONB AS $$
DECLARE
  last_rec RECORD;
  new_block BIGINT;
  new_prev_hash TEXT;
  new_hash TEXT;
  new_event_id TEXT;
  v_tenant_id TEXT;
  v_chain_id TEXT;
  canonical_payload TEXT;
  string_to_hash TEXT;
  v_timestamp_utc TIMESTAMPTZ;
  v_retention_until TIMESTAMPTZ;
  inserted_row public.audit_events;
  result_json JSONB;
BEGIN
  v_tenant_id := COALESCE(p_event_data->>'tenant_id', 'default');
  v_chain_id := COALESCE(p_event_data->>'chain_id', 'primary');

  -- Advisory lock for this chain to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(v_tenant_id || ':' || v_chain_id));

  -- Get the last event in the chain
  SELECT hash, block_number INTO last_rec
  FROM public.audit_events
  WHERE tenant_id = v_tenant_id AND chain_id = v_chain_id
  ORDER BY block_number DESC
  LIMIT 1;

  -- Assign block number and prev_hash
  IF last_rec.hash IS NULL THEN
    new_block := 1;
    new_prev_hash := NULL;
  ELSE
    new_block := last_rec.block_number + 1;
    new_prev_hash := last_rec.hash;
  END IF;

  -- Auto-generate event_id
  new_event_id := COALESCE(
    p_event_data->>'event_id',
    'AUD-' || TO_CHAR(timezone('utc'::text, now()), 'YYYY') || '-' || LPAD(NEXTVAL('audit_events_block_seq')::TEXT, 8, '0')
  );

  v_timestamp_utc := COALESCE((p_event_data->>'timestamp_utc')::TIMESTAMPTZ, timezone('utc'::text, now()));

  -- Build deterministic string for hashing using pipe-delimited fields
  -- Each JSON field is converted to sorted-key, no-whitespace, null-stripped JSON via jsonb::TEXT
  -- Order MUST match TypeScript computeEventHash exactly
  string_to_hash :=
    v_tenant_id || '|' ||
    v_chain_id || '|' ||
    new_block || '|' ||
    COALESCE(p_event_data->>'schema_version', '1.0') || '|' ||
    COALESCE(p_event_data->>'event_category', '') || '|' ||
    COALESCE(p_event_data->>'event_type', '') || '|' ||
    COALESCE(p_event_data->>'event_title', '') || '|' ||
    COALESCE(p_event_data->>'event_summary', '') || '|' ||
    COALESCE(jsonb_strip_nulls(p_event_data->'actor')::TEXT, '{}') || '|' ||
    COALESCE(jsonb_strip_nulls(p_event_data->'object')::TEXT, '{}') || '|' ||
    COALESCE(jsonb_strip_nulls(p_event_data->'correlation')::TEXT, '{}') || '|' ||
    COALESCE(jsonb_strip_nulls(p_event_data->'authority')::TEXT, '{}') || '|' ||
    COALESCE(jsonb_strip_nulls(p_event_data->'change')::TEXT, '{}') || '|' ||
    COALESCE(jsonb_strip_nulls(p_event_data->'ai_context')::TEXT, '{}') || '|' ||
    COALESCE(p_event_data->>'risk_level', 'low') || '|' ||
    COALESCE(p_event_data->>'status', 'success') || '|' ||
    COALESCE(p_event_data->>'retention_class', 'STANDARD') || '|' ||
    COALESCE(new_prev_hash, '');

  new_hash := 'sha256:' || encode(digest(string_to_hash, 'sha256'), 'hex');

  -- Compute retention_until
  v_retention_until := CASE COALESCE(p_event_data->>'retention_class', 'STANDARD')
    WHEN 'STANDARD' THEN timezone('utc'::text, now()) + INTERVAL '2 years'
    WHEN 'EXTENDED' THEN timezone('utc'::text, now()) + INTERVAL '7 years'
    WHEN 'REGULATED' THEN timezone('utc'::text, now()) + INTERVAL '10 years'
    ELSE NULL
  END;

  INSERT INTO public.audit_events (
    event_id, tenant_id, workspace_id, org_id, chain_id, block_number,
    hash, prev_hash, schema_version, data_residency,
    event_category, event_type, event_title, event_summary,
    timestamp_utc, received_at,
    actor, object, related_objects, correlation,
    authority, change, ai_context,
    risk_level, status, evidence_state,
    retention_class, retention_until,
    idempotency_key
  ) VALUES (
    new_event_id,
    v_tenant_id,
    (p_event_data->>'workspace_id')::UUID,
    (p_event_data->>'org_id')::UUID,
    v_chain_id,
    new_block,
    new_hash,
    new_prev_hash,
    COALESCE(p_event_data->>'schema_version', '1.0'),
    COALESCE(p_event_data->>'data_residency', 'auto'),
    p_event_data->>'event_category',
    p_event_data->>'event_type',
    COALESCE(p_event_data->>'event_title', ''),
    COALESCE(p_event_data->>'event_summary', ''),
    v_timestamp_utc,
    timezone('utc'::text, now()),
    COALESCE(p_event_data->'actor', '{}'::jsonb),
    COALESCE(p_event_data->'object', '{}'::jsonb),
    COALESCE(p_event_data->'related_objects', '[]'::jsonb),
    COALESCE(p_event_data->'correlation', '{}'::jsonb),
    COALESCE(p_event_data->'authority', '{}'::jsonb),
    COALESCE(p_event_data->'change', '{}'::jsonb),
    COALESCE(p_event_data->'ai_context', '{}'::jsonb),
    COALESCE(p_event_data->>'risk_level', 'low'),
    COALESCE(p_event_data->>'status', 'success'),
    COALESCE(p_event_data->>'evidence_state', 'not_preserved'),
    COALESCE(p_event_data->>'retention_class', 'STANDARD'),
    v_retention_until,
    p_event_data->>'idempotency_key'
  )
  RETURNING * INTO inserted_row;

  result_json := jsonb_build_object(
    'id', inserted_row.id,
    'event_id', inserted_row.event_id,
    'block_number', inserted_row.block_number,
    'hash', inserted_row.hash,
    'prev_hash', inserted_row.prev_hash,
    'chain_id', inserted_row.chain_id,
    'created_at', inserted_row.created_at
  );

  RETURN result_json;
END;
$$ LANGUAGE plpgsql;

-- 11. Create audit_events index on workspace + timestamp for paginated queries
CREATE INDEX IF NOT EXISTS idx_audit_events_ws_time
  ON public.audit_events(workspace_id, created_at DESC)
  WHERE evidence_state != 'sealed';

-- 11. Create materialized view for audit stats (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.audit_event_stats AS
SELECT
  workspace_id,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE created_at >= timezone('utc'::text, now()) - INTERVAL '24 hours') AS events_today,
  COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical')) AS high_risk_events,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_events,
  COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_events,
  COUNT(*) FILTER (WHERE event_category = 'ai_agent') AS ai_events,
  COUNT(*) FILTER (WHERE evidence_state IN ('preserved', 'legal_hold')) AS preserved_events,
  COUNT(*) FILTER (WHERE retention_class = 'LEGAL_HOLD') AS legal_hold_events,
  MAX(created_at) AS last_event_at,
  MIN(block_number) AS first_block,
  MAX(block_number) AS last_block
FROM public.audit_events
GROUP BY workspace_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_event_stats_ws
  ON public.audit_event_stats(workspace_id);

-- 13. Create audit_export_jobs table
CREATE TABLE IF NOT EXISTS public.audit_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  reason TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('csv', 'json', 'pdf')),
  filters JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  result_url TEXT,
  record_count INT,
  manifest_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_audit_export_jobs_ws ON public.audit_export_jobs(workspace_id, created_at DESC);

-- Add file_url column for worker compatibility (worker writes file_url, migration had result_url)
ALTER TABLE public.audit_export_jobs ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 14. Create event_type_registry table to enforce canonical event types (Appendix A)
CREATE TABLE IF NOT EXISTS public.event_type_registry (
  event_type TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'user_identity', 'content_lifecycle', 'ai_agent', 'approval',
    'policy_governance', 'platform_integration', 'evidence_legal', 'system_security'
  )),
  display_title TEXT NOT NULL,
  description TEXT,
  default_risk_level TEXT NOT NULL DEFAULT 'low' CHECK (default_risk_level IN ('low', 'medium', 'high', 'critical')),
  default_retention_class TEXT NOT NULL DEFAULT 'STANDARD' CHECK (default_retention_class IN ('STANDARD', 'EXTENDED', 'REGULATED', 'LEGAL_HOLD')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed the 40 canonical event types from Appendix A
INSERT INTO public.event_type_registry (event_type, category, display_title, default_risk_level, default_retention_class) VALUES
  -- User & Identity (7)
  ('user.login', 'user_identity', 'User Login', 'low', 'STANDARD'),
  ('user.logout', 'user_identity', 'User Logout', 'low', 'STANDARD'),
  ('user.login_failed', 'user_identity', 'Login Failed', 'low', 'STANDARD'),
  ('user.mfa_changed', 'user_identity', 'MFA Changed', 'low', 'STANDARD'),
  ('user.role_changed', 'user_identity', 'Role Changed', 'medium', 'STANDARD'),
  ('user.permission_elevated', 'user_identity', 'Permission Elevated', 'high', 'REGULATED'),
  ('user.deactivated', 'user_identity', 'User Deactivated', 'low', 'STANDARD'),
  -- Content Lifecycle (7)
  ('content.created', 'content_lifecycle', 'Content Created', 'low', 'STANDARD'),
  ('content.edited', 'content_lifecycle', 'Content Edited', 'low', 'STANDARD'),
  ('content.submitted', 'content_lifecycle', 'Content Submitted', 'low', 'STANDARD'),
  ('content.approved_for_review', 'content_lifecycle', 'Approved for Review', 'low', 'STANDARD'),
  ('content.published', 'content_lifecycle', 'Content Published', 'medium', 'EXTENDED'),
  ('content.deleted', 'content_lifecycle', 'Content Deleted', 'low', 'STANDARD'),
  ('content.withdrawn', 'content_lifecycle', 'Content Withdrawn', 'low', 'STANDARD'),
  -- AI & Agent (8)
  ('ai.draft_generated', 'ai_agent', 'AI Draft Generated', 'low', 'EXTENDED'),
  ('ai.recommendation', 'ai_agent', 'AI Recommendation', 'low', 'EXTENDED'),
  ('ai.action_requested', 'ai_agent', 'AI Action Requested', 'low', 'EXTENDED'),
  ('ai.action_approved', 'ai_agent', 'AI Action Approved', 'low', 'EXTENDED'),
  ('ai.action_rejected', 'ai_agent', 'AI Action Rejected', 'low', 'EXTENDED'),
  ('ai.action_blocked', 'ai_agent', 'AI Action Blocked', 'high', 'EXTENDED'),
  ('ai.confidence_low', 'ai_agent', 'Low AI Confidence', 'low', 'EXTENDED'),
  ('ai.policy_grounding_failed', 'ai_agent', 'AI Policy Grounding Failed', 'low', 'EXTENDED'),
  -- Approval (7)
  ('approval.started', 'approval', 'Approval Started', 'low', 'EXTENDED'),
  ('approval.granted', 'approval', 'Approval Granted', 'low', 'EXTENDED'),
  ('approval.rejected', 'approval', 'Approval Rejected', 'low', 'EXTENDED'),
  ('approval.escalated', 'approval', 'Approval Escalated', 'low', 'EXTENDED'),
  ('approval.rule_overridden', 'approval', 'Approval Rule Overridden', 'low', 'EXTENDED'),
  ('approval.emergency_used', 'approval', 'Emergency Approval Used', 'low', 'REGULATED'),
  ('approval.quorum_failed', 'approval', 'Approval Quorum Failed', 'low', 'EXTENDED'),
  -- Policy & Governance (7)
  ('policy.rule_triggered', 'policy_governance', 'Policy Rule Triggered', 'medium', 'EXTENDED'),
  ('policy.rule_failed', 'policy_governance', 'Policy Rule Failed', 'low', 'EXTENDED'),
  ('policy.override', 'policy_governance', 'Policy Override', 'high', 'REGULATED'),
  ('policy.rule_created', 'policy_governance', 'Policy Rule Created', 'low', 'EXTENDED'),
  ('policy.rule_edited', 'policy_governance', 'Policy Rule Edited', 'low', 'EXTENDED'),
  ('policy.emergency_pause', 'policy_governance', 'Emergency Pause', 'critical', 'REGULATED'),
  ('policy.simulation_run', 'policy_governance', 'Policy Simulation Run', 'low', 'EXTENDED'),
  -- Platform & Integration (7)
  ('platform.connected', 'platform_integration', 'Platform Connected', 'low', 'EXTENDED'),
  ('platform.disconnected', 'platform_integration', 'Platform Disconnected', 'low', 'EXTENDED'),
  ('platform.token_refreshed', 'platform_integration', 'Token Refreshed', 'low', 'STANDARD'),
  ('platform.webhook_failed', 'platform_integration', 'Webhook Failed', 'low', 'STANDARD'),
  ('integration.error', 'platform_integration', 'Integration Error', 'low', 'STANDARD'),
  ('integration.sync_failed', 'platform_integration', 'Sync Failed', 'low', 'STANDARD'),
  ('integration.permission_changed', 'platform_integration', 'Integration Permission Changed', 'low', 'REGULATED'),
  -- Evidence & Legal (7)
  ('evidence.preserved', 'evidence_legal', 'Evidence Preserved', 'low', 'STANDARD'),
  ('evidence.exported', 'evidence_legal', 'Evidence Exported', 'medium', 'REGULATED'),
  ('evidence.legal_hold_applied', 'evidence_legal', 'Legal Hold Applied', 'high', 'REGULATED'),
  ('evidence.legal_hold_released', 'evidence_legal', 'Legal Hold Released', 'high', 'REGULATED'),
  ('investigation.created', 'evidence_legal', 'Investigation Created', 'low', 'EXTENDED'),
  ('chain.verification_run', 'evidence_legal', 'Chain Verification Run', 'low', 'STANDARD'),
  ('chain.integrity_failure', 'evidence_legal', 'Chain Integrity Failure', 'critical', 'REGULATED'),
  -- System & Security (6)
  ('system.config_changed', 'system_security', 'System Config Changed', 'low', 'STANDARD'),
  ('system.deployment', 'system_security', 'System Deployment', 'low', 'STANDARD'),
  ('security.alert', 'system_security', 'Security Alert', 'low', 'REGULATED'),
  ('security.incident', 'system_security', 'Security Incident', 'critical', 'REGULATED'),
  ('audit.access', 'system_security', 'Audit Access', 'low', 'STANDARD'),
  ('audit.field_redacted', 'system_security', 'Field Redacted', 'low', 'STANDARD'),
  ('audit.subscription_changed', 'system_security', 'Subscription Changed', 'low', 'STANDARD')
ON CONFLICT (event_type) DO NOTHING;

-- 15. Create function to validate event_type against registry
CREATE OR REPLACE FUNCTION public.validate_audit_event_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.event_type_registry WHERE event_type = NEW.event_type AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive event_type: %. Must be a registered canonical type.', NEW.event_type
      USING HINT = 'See event_type_registry table for valid types.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_audit_event_type ON public.audit_events;
CREATE TRIGGER trg_validate_audit_event_type
  BEFORE INSERT ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_audit_event_type();

SELECT 'Audit Trail module migration applied successfully!' as status;
