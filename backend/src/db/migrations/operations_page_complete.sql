-- ============================================================================
--  AGENT OPERATIONS PAGE — COMPLETE SCHEMA ALIGNMENT (single, idempotent file)
-- ============================================================================
--  Purpose
--    Brings the live database fully in line with what the Agent Operations
--    code expects. The original `agent_operations_control_room.sql` migration
--    was only partially applied, which caused:
--      • Stop action failing  -> run_status enum had no 'STOPPED'
--      • Pause/Stop/Quarantine -> operations_transition_run() function missing
--      • Run detail fields blank -> agent_runs missing agent_name / workflow_name
--                                   / inputs / output columns
--
--  Safety
--    Every statement is idempotent and additive (ADD VALUE IF NOT EXISTS,
--    ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE OR REPLACE).
--    It does NOT drop or rewrite existing data. Safe to run more than once.
--
--  How to run
--    Supabase Dashboard -> SQL Editor -> paste -> Run.
--    (ALTER TYPE ... ADD VALUE auto-commits; do not wrap in BEGIN/COMMIT.)
--
--  Tables involved (already exist; created by earlier migrations):
--    agent_runs, run_events, policy_results, queue_items, incidents,
--    evidence_bundles, runtime_control_actions
--  Enum types in use:
--    run_status, severity_level, evidence_status, policy_outcome
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) ENUM VALUES
--    The runtime control bar transitions runs to STOPPED / CANCELLED, which
--    were absent from the deployed run_status enum.
-- ----------------------------------------------------------------------------
ALTER TYPE run_status ADD VALUE IF NOT EXISTS 'STOPPED';
ALTER TYPE run_status ADD VALUE IF NOT EXISTS 'CANCELLED';


-- ----------------------------------------------------------------------------
-- 2) agent_runs COLUMNS
--    The AgentRun model + run detail drawer reference these display / payload
--    fields. They were missing from the live table (only task_name + metadata
--    existed), so the drawer's name/inputs/output sections came back empty.
-- ----------------------------------------------------------------------------
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS agent_name        text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS agent_type        text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS workflow_name     text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS brand_name        text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS campaign_name     text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS workspace_name    text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS next_action       text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS previous_status   text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS prompt_template   text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS prompt_version    text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS output_snapshot   text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS output_status     text;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS inputs            jsonb;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS knowledge_sources jsonb;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();


-- ----------------------------------------------------------------------------
-- 3) BACKFILL display name for existing rows
--    Populate agent_name from the best available source so older rows render
--    a name in the operations table. Non-destructive (only fills NULLs).
-- ----------------------------------------------------------------------------
UPDATE agent_runs
   SET agent_name = COALESCE(agent_name, NULLIF(metadata->>'agent_name', ''), task_name)
 WHERE agent_name IS NULL;

UPDATE agent_runs
   SET workflow_name = COALESCE(workflow_name, NULLIF(metadata->>'workflow_name', ''))
 WHERE workflow_name IS NULL;


-- ----------------------------------------------------------------------------
-- 4) RUNTIME TRANSITION FUNCTION
--    Atomic state change + immutable event + control-action record. The app
--    has a JS fallback, but restoring this keeps transitions transactional and
--    matches the Agent Operations spec. SECURITY DEFINER so the API role can
--    execute it under RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION operations_transition_run(
  p_run_id      uuid,
  p_new_status  text,
  p_reason      text,
  p_actor_id    text,
  p_actor_name  text,
  p_action_type text,
  p_impact_scope text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run        agent_runs%rowtype;
  v_allowed    text[];
  v_event_id   uuid := gen_random_uuid();
  v_action_id  uuid := gen_random_uuid();
  v_now        timestamptz := now();
  v_actor_uuid uuid;
BEGIN
  SELECT * INTO v_run FROM agent_runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run not found' USING errcode = 'P0002';
  END IF;

  v_allowed := CASE v_run.status
    WHEN 'SCHEDULED'            THEN ARRAY['PAUSED','STOPPED','CANCELLED']
    WHEN 'QUEUED'              THEN ARRAY['RUNNING','PAUSED','STOPPED','CANCELLED','POLICY_BLOCKED']
    WHEN 'RUNNING'             THEN ARRAY['PAUSED','STOPPED','COMPLETED','FAILED','POLICY_BLOCKED','QUARANTINED']
    WHEN 'WAITING_HUMAN_REVIEW' THEN ARRAY['PAUSED','STOPPED','POLICY_BLOCKED','QUARANTINED']
    WHEN 'PAUSED'              THEN ARRAY['RUNNING','STOPPED','QUARANTINED']
    WHEN 'POLICY_BLOCKED'      THEN ARRAY['QUARANTINED','STOPPED']
    WHEN 'FAILED'              THEN ARRAY['QUEUED']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Cannot transition run from % to %', v_run.status, p_new_status
      USING errcode = 'P0001';
  END IF;

  IF p_actor_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_actor_uuid := p_actor_id::uuid;
  END IF;

  UPDATE agent_runs
     SET status        = p_new_status::run_status,
         previous_status = v_run.status,
         started_at    = CASE WHEN p_new_status = 'RUNNING' THEN v_now ELSE started_at END,
         completed_at  = CASE WHEN p_new_status IN ('COMPLETED','FAILED','STOPPED','CANCELLED')
                              THEN v_now ELSE completed_at END,
         last_event_at = v_now,
         updated_at    = v_now
   WHERE id = p_run_id;

  -- run_events.actor_id is uuid in this DB; use the parsed uuid (NULL for
  -- non-uuid system actors) to avoid a text->uuid cast error.
  INSERT INTO run_events (
    id, run_id, event_type, actor_type, actor_id, actor_name,
    previous_state, new_state, reason, created_at
  ) VALUES (
    v_event_id, p_run_id, 'state.' || lower(p_new_status), 'user', v_actor_uuid, p_actor_name,
    v_run.status, p_new_status, p_reason, v_now
  );

  INSERT INTO runtime_control_actions (
    id, run_id, action_type, requested_by, reason, impact_scope, result, created_at
  ) VALUES (
    v_action_id, p_run_id, p_action_type, v_actor_uuid, p_reason, p_impact_scope, 'completed', v_now
  );

  RETURN jsonb_build_object(
    'previous_status',   v_run.status,
    'new_status',        p_new_status,
    'event_id',          v_event_id,
    'runtime_action_id', v_action_id,
    'workspace_id',      v_run.workspace_id
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 5) INDEXES (operational read paths)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace_state
  ON agent_runs (workspace_id, status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_retry_linkage
  ON agent_runs (original_run_id) WHERE original_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_run_events_run_time
  ON run_events (run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_policy_results_run
  ON policy_results (run_id, outcome, severity);
CREATE INDEX IF NOT EXISTS idx_queue_items_workspace_status
  ON queue_items (workspace_id, status, queue_type, due_at);
CREATE INDEX IF NOT EXISTS idx_incidents_workspace_status
  ON incidents (workspace_id, status, severity, due_at);
CREATE INDEX IF NOT EXISTS idx_evidence_bundles_run
  ON evidence_bundles (run_id, status);
CREATE INDEX IF NOT EXISTS idx_runtime_control_actions_run
  ON runtime_control_actions (run_id, created_at DESC);


-- ============================================================================
--  POST-RUN VERIFICATION (optional — run as separate SELECTs to confirm)
-- ----------------------------------------------------------------------------
--  SELECT unnest(enum_range(NULL::run_status));            -- expect STOPPED, CANCELLED
--  SELECT proname FROM pg_proc WHERE proname = 'operations_transition_run';
--  SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'agent_runs' AND column_name = 'agent_name';
-- ============================================================================
