-- Agent Operations control-room persistence.
-- Mirrors backend/src/db/migrations/agent_operations_control_room.sql for deployment pipelines that read root migrations.

create extension if not exists pgcrypto;

create table if not exists agent_runs (
  id uuid primary key,
  tenant_id uuid,
  workspace_id uuid not null,
  brand_id uuid,
  environment text not null default 'production',
  agent_id uuid,
  agent_name text not null,
  agent_type text not null,
  agent_version text,
  workflow_id uuid,
  workflow_name text,
  workflow_version text,
  task_id uuid,
  task_objective text not null,
  current_step text,
  channel text,
  trigger_source text,
  status text not null,
  severity text not null default 'normal',
  owner_id uuid,
  owner_name text,
  priority integer not null default 3,
  previous_status text,
  policy_result text not null default 'pending',
  evidence_status text not null default 'pending',
  original_run_id uuid references agent_runs(id),
  retry_attempt integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  due_at timestamptz,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table agent_runs add column if not exists current_step text;
alter table agent_runs add column if not exists channel text;
alter table agent_runs add column if not exists trigger_source text;
alter table agent_runs add column if not exists original_run_id uuid references agent_runs(id);
alter table agent_runs add column if not exists retry_attempt integer not null default 0;
alter table agent_runs add column if not exists brand_name text;
alter table agent_runs add column if not exists workspace_name text;
alter table agent_runs add column if not exists campaign_name text;
alter table agent_runs add column if not exists inputs jsonb;
alter table agent_runs add column if not exists prompt_template text;
alter table agent_runs add column if not exists knowledge_sources jsonb;
alter table agent_runs add column if not exists output_snapshot text;
alter table agent_runs add column if not exists output_status text;

create table if not exists run_events (
  id uuid primary key,
  run_id uuid not null references agent_runs(id),
  event_type text not null,
  actor_type text,
  actor_id text,
  actor_name text,
  previous_state text,
  new_state text,
  reason text,
  payload_ref text,
  correlation_id text,
  created_at timestamptz not null default now()
);

create table if not exists policy_results (
  id uuid primary key,
  run_id uuid not null references agent_runs(id),
  policy_id uuid not null,
  policy_version text,
  outcome text not null,
  severity text not null,
  failed_rule text,
  failed_category text,
  platform_impact text,
  source_policy text,
  affected_output_ref text,
  remediation_required boolean not null default false,
  created_at timestamptz not null default now()
);

alter table policy_results add column if not exists failed_category text;
alter table policy_results add column if not exists platform_impact text;
alter table policy_results add column if not exists source_policy text;

create table if not exists queue_items (
  id uuid primary key,
  workspace_id uuid not null,
  run_id uuid references agent_runs(id),
  queue_type text not null,
  priority integer not null default 3,
  assignee_id uuid,
  assignee_name text,
  team_id uuid,
  due_at timestamptz,
  status text not null default 'PENDING',
  claimed_by uuid,
  claimed_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists incidents (
  id uuid primary key,
  workspace_id uuid not null,
  run_id uuid references agent_runs(id),
  severity text not null,
  category text not null,
  owner_id uuid,
  owner_name text,
  status text not null default 'open',
  created_by uuid,
  created_by_name text,
  created_at timestamptz not null default now(),
  due_at timestamptz,
  root_cause text,
  remediation text,
  closed_by uuid,
  closed_at timestamptz
);

create table if not exists evidence_bundles (
  id uuid primary key,
  workspace_id uuid not null,
  run_id uuid not null references agent_runs(id),
  status text not null default 'pending',
  hash text,
  locked_at timestamptz,
  exported_by uuid,
  exported_at timestamptz,
  export_reason text,
  storage_ref text,
  created_at timestamptz not null default now()
);

create table if not exists runtime_control_actions (
  id uuid primary key,
  run_id uuid not null references agent_runs(id),
  action_type text not null,
  requested_by uuid,
  approved_by uuid,
  reason text not null,
  impact_scope text,
  result text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_runs_workspace_state on agent_runs(workspace_id, status, severity, created_at desc);
create index if not exists idx_agent_runs_retry_linkage on agent_runs(original_run_id) where original_run_id is not null;
create index if not exists idx_run_events_run_time on run_events(run_id, created_at);
create index if not exists idx_policy_results_run on policy_results(run_id, outcome, severity);
create index if not exists idx_queue_items_workspace_status on queue_items(workspace_id, status, queue_type, due_at);
create index if not exists idx_incidents_workspace_status on incidents(workspace_id, status, severity, due_at);
create index if not exists idx_evidence_bundles_run on evidence_bundles(run_id, status);
create index if not exists idx_runtime_control_actions_run on runtime_control_actions(run_id, created_at desc);
create index if not exists idx_agent_runs_workspace_brand_env on agent_runs(workspace_id, brand_id, environment, created_at desc);

create or replace function operations_transition_run(
  p_run_id uuid,
  p_new_status text,
  p_reason text,
  p_actor_id text,
  p_actor_name text,
  p_action_type text,
  p_impact_scope text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_run agent_runs%rowtype;
  v_allowed text[];
  v_event_id uuid := gen_random_uuid();
  v_action_id uuid := gen_random_uuid();
  v_now timestamptz := now();
  v_actor_uuid uuid;
begin
  select * into v_run from agent_runs where id = p_run_id for update;
  if not found then
    raise exception 'Run not found' using errcode = 'P0002';
  end if;

  v_allowed := case v_run.status
    when 'SCHEDULED' then array['PAUSED','STOPPED','CANCELLED']
    when 'QUEUED' then array['RUNNING','PAUSED','STOPPED','CANCELLED','POLICY_BLOCKED']
    when 'RUNNING' then array['PAUSED','STOPPED','COMPLETED','FAILED','POLICY_BLOCKED','QUARANTINED']
    when 'WAITING_HUMAN_REVIEW' then array['PAUSED','STOPPED','POLICY_BLOCKED','QUARANTINED']
    when 'PAUSED' then array['RUNNING','STOPPED','QUARANTINED']
    when 'POLICY_BLOCKED' then array['QUARANTINED','STOPPED']
    when 'FAILED' then array['QUEUED']
    else array[]::text[]
  end;

  if not (p_new_status = any(v_allowed)) then
    raise exception 'Cannot transition run from % to %', v_run.status, p_new_status using errcode = 'P0001';
  end if;

  if p_actor_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_actor_uuid := p_actor_id::uuid;
  end if;

  update agent_runs
  set status = p_new_status,
      previous_status = v_run.status,
      started_at = case when p_new_status = 'RUNNING' then v_now else started_at end,
      completed_at = case when p_new_status in ('COMPLETED','FAILED','STOPPED','CANCELLED') then v_now else completed_at end,
      last_event_at = v_now,
      updated_at = v_now
  where id = p_run_id;

  insert into run_events (
    id, run_id, event_type, actor_type, actor_id, actor_name,
    previous_state, new_state, reason, created_at
  ) values (
    v_event_id, p_run_id, 'state.' || lower(p_new_status), 'user', p_actor_id, p_actor_name,
    v_run.status, p_new_status, p_reason, v_now
  );

  insert into runtime_control_actions (
    id, run_id, action_type, requested_by, reason, impact_scope, result, created_at
  ) values (
    v_action_id, p_run_id, p_action_type, v_actor_uuid, p_reason, p_impact_scope, 'completed', v_now
  );

  return jsonb_build_object(
    'previous_status', v_run.status,
    'new_status', p_new_status,
    'event_id', v_event_id,
    'runtime_action_id', v_action_id,
    'workspace_id', v_run.workspace_id
  );
end;
$$;
