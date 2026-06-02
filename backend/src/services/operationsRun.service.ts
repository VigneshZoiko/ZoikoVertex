/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface AgentRun {
  id: string;
  tenant_id: string;
  workspace_id: string;
  brand_id: string;
  environment: string;
  agent_id: string;
  agent_name: string;
  agent_type: string;
  agent_version: string;
  workflow_id: string;
  workflow_name: string;
  workflow_version: string;
  task_id: string;
  task_objective: string;
  status: string;
  severity: string;
  owner_id: string;
  owner_name: string;
  priority: number;
  previous_status: string;
  policy_result: string;
  evidence_status: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  due_at: string;
  last_event_at: string;
  retry_count?: number;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['QUEUED', 'PAUSED', 'FAILED', 'QUARANTINED'],
  QUEUED: ['RUNNING', 'PAUSED', 'WAITING_HUMAN_REVIEW', 'POLICY_BLOCKED', 'FAILED', 'QUARANTINED'],
  RUNNING: ['WAITING_HUMAN_REVIEW', 'POLICY_BLOCKED', 'FAILED', 'PAUSED', 'COMPLETED', 'QUARANTINED'],
  WAITING_HUMAN_REVIEW: ['RUNNING', 'PAUSED', 'POLICY_BLOCKED', 'FAILED', 'COMPLETED', 'QUARANTINED'],
  POLICY_BLOCKED: ['PAUSED', 'QUEUED', 'FAILED', 'QUARANTINED'],
  FAILED: ['QUEUED', 'QUARANTINED'],
  PAUSED: ['QUEUED', 'RUNNING', 'FAILED', 'QUARANTINED'],
  COMPLETED: ['QUARANTINED'],
  QUARANTINED: ['PAUSED', 'FAILED', 'COMPLETED'],
  STOPPED: [],
  CANCELLED: [],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

async function getRunScoped(runId: string, workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as AgentRun | null;
}

async function insertRunEvent(params: {
  run_id: string;
  event_type: string;
  actor_id: string;
  actor_name: string;
  previous_state: string | null;
  new_state: string | null;
  reason: string;
  payload_ref?: string | null;
  correlation_id?: string | null;
}) {
  const eventId = uuidv4();
  const { error } = await supabaseAdmin.from('run_events').insert({
    id: eventId,
    run_id: params.run_id,
    event_type: params.event_type,
    actor_type: 'user',
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    previous_state: params.previous_state,
    new_state: params.new_state,
    reason: params.reason,
    payload_ref: params.payload_ref || null,
    correlation_id: params.correlation_id || null,
  });

  if (error) throw error;
  return eventId;
}

async function transitionRunState(params: {
  workspace_id: string;
  run_id: string;
  new_status: string;
  reason: string;
  actor_id: string;
  actor_name: string;
  event_type?: string;
  force?: boolean;
  extra_updates?: Record<string, any>;
}) {
  const run = await getRunScoped(params.run_id, params.workspace_id);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });

  if (!params.force && !isValidTransition(run.status, params.new_status)) {
    throw Object.assign(
      new Error(`Cannot transition run from ${run.status} to ${params.new_status}`),
      { statusCode: 409 },
    );
  }

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    status: params.new_status,
    previous_status: run.status,
    last_event_at: now,
    updated_at: now,
    ...params.extra_updates,
  };

  if (params.new_status === 'RUNNING' && !run.started_at) updateData.started_at = now;
  if (['COMPLETED', 'FAILED', 'STOPPED', 'CANCELLED'].includes(params.new_status)) {
    updateData.completed_at = now;
  }

  const { error: updateError } = await supabaseAdmin
    .from('agent_runs')
    .update(updateData)
    .eq('id', params.run_id)
    .eq('workspace_id', params.workspace_id);
  if (updateError) throw updateError;

  const eventId = await insertRunEvent({
    run_id: params.run_id,
    event_type: params.event_type || `state.${params.new_status.toLowerCase()}`,
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    previous_state: run.status,
    new_state: params.new_status,
    reason: params.reason,
    correlation_id: run.workflow_id,
  });

  return {
    previous_status: run.status,
    new_status: params.new_status,
    event_id: eventId,
    run,
  };
}

export async function listAgentRuns(params: {
  workspace_id: string;
  status?: string;
  agent_id?: string;
  brand?: string;
  environment?: string;
  severity?: string;
  priority?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit: number;
  offset: number;
}) {
  const sortBy = ['created_at', 'last_event_at', 'due_at', 'priority', 'status', 'severity'].includes(
    params.sort_by || '',
  )
    ? (params.sort_by as string)
    : 'last_event_at';
  const ascending = params.sort_order === 'asc';

  let query = supabaseAdmin
    .from('agent_runs')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order(sortBy, { ascending, nullsFirst: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.status) query = query.eq('status', params.status);
  if (params.agent_id) query = query.eq('agent_id', params.agent_id);
  if (params.brand) query = query.or(`brand_name.eq.${params.brand},brand_id.eq.${params.brand}`);
  if (params.environment) query = query.eq('environment', params.environment);
  if (params.severity) query = query.eq('severity', params.severity);
  if (params.priority) query = query.eq('priority', parseInt(params.priority, 10));
  if (params.search) {
    const safeSearch = params.search.replace(/,/g, ' ');
    query = query.or(
      `task_objective.ilike.%${safeSearch}%,agent_name.ilike.%${safeSearch}%,id.ilike.%${safeSearch}%,workflow_name.ilike.%${safeSearch}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { runs: data || [], total: count || 0 };
}

export async function getAgentRun(runId: string, workspaceId: string) {
  const data = await getRunScoped(runId, workspaceId);
  if (!data) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  return data;
}

export async function getRunTimeline(runId: string, workspaceId: string) {
  const run = await getRunScoped(runId, workspaceId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });

  const { data, error } = await supabaseAdmin
    .from('run_events')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function pauseRun(
  workspaceId: string,
  runId: string,
  reason: string,
  actorId: string,
  actorName: string,
) {
  return transitionRunState({
    workspace_id: workspaceId,
    run_id: runId,
    new_status: 'PAUSED',
    reason,
    actor_id: actorId,
    actor_name: actorName,
    event_type: 'run.paused',
  });
}

export async function resumeRun(
  workspaceId: string,
  runId: string,
  reason: string,
  actorId: string,
  actorName: string,
) {
  const run = await getRunScoped(runId, workspaceId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (run.status !== 'PAUSED') {
    throw Object.assign(new Error('Only paused runs can be resumed'), { statusCode: 409 });
  }

  const resumeTarget =
    run.previous_status && ['RUNNING', 'QUEUED', 'WAITING_HUMAN_REVIEW'].includes(run.previous_status)
      ? run.previous_status
      : 'QUEUED';

  return transitionRunState({
    workspace_id: workspaceId,
    run_id: runId,
    new_status: resumeTarget,
    reason,
    actor_id: actorId,
    actor_name: actorName,
    event_type: 'run.resumed',
  });
}

export async function stopRun(
  workspaceId: string,
  runId: string,
  reason: string,
  actorId: string,
  actorName: string,
) {
  return transitionRunState({
    workspace_id: workspaceId,
    run_id: runId,
    new_status: 'FAILED',
    reason,
    actor_id: actorId,
    actor_name: actorName,
    event_type: 'run.stopped',
    force: true,
    extra_updates: {
      error_code: 'MANUAL_STOP',
    },
  });
}

export async function quarantineRun(
  workspaceId: string,
  runId: string,
  reason: string,
  actorId: string,
  actorName: string,
) {
  return transitionRunState({
    workspace_id: workspaceId,
    run_id: runId,
    new_status: 'QUARANTINED',
    reason,
    actor_id: actorId,
    actor_name: actorName,
    event_type: 'output.quarantined',
    force: true,
    extra_updates: {
      evidence_status: 'LOCKED',
      severity: 'critical',
    },
  });
}

export async function emergencyPauseRun(
  workspaceId: string,
  runId: string,
  reason: string,
  actorId: string,
  actorName: string,
) {
  const run = await getRunScoped(runId, workspaceId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (!['RUNNING', 'QUEUED', 'SCHEDULED', 'WAITING_HUMAN_REVIEW'].includes(run.status)) {
    throw Object.assign(
      new Error('Only active or pending runs can be emergency paused'),
      { statusCode: 409 },
    );
  }

  return transitionRunState({
    workspace_id: workspaceId,
    run_id: runId,
    new_status: 'PAUSED',
    reason: `[EMERGENCY] ${reason}`,
    actor_id: actorId,
    actor_name: actorName,
    event_type: 'run.paused',
    extra_updates: {
      severity: 'critical',
    },
  });
}

export async function restrictedModeRun(
  workspaceId: string,
  runId: string,
  reason: string,
  actorId: string,
  actorName: string,
) {
  return transitionRunState({
    workspace_id: workspaceId,
    run_id: runId,
    new_status: 'POLICY_BLOCKED',
    reason: `[RESTRICTED_MODE] ${reason}`,
    actor_id: actorId,
    actor_name: actorName,
    event_type: 'policy.blocked',
    force: true,
    extra_updates: {
      severity: 'critical',
      policy_result: 'BLOCKED',
    },
  });
}

export async function retryRun(
  workspaceId: string,
  runId: string,
  reason: string,
  actorId: string,
  actorName: string,
) {
  const run = await getRunScoped(runId, workspaceId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (run.status !== 'FAILED') {
    throw Object.assign(new Error('Only failed runs can be retried'), { statusCode: 409 });
  }

  const retryCount = (run.retry_count || 0) + 1;
  if (retryCount > 5) {
    throw Object.assign(new Error('Retry limit reached for this run'), { statusCode: 409 });
  }

  const now = new Date().toISOString();
  const newRunId = uuidv4();

  const { error: insertError } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      id: newRunId,
      workspace_id: run.workspace_id,
      tenant_id: run.tenant_id,
      brand_id: run.brand_id,
      environment: run.environment,
      agent_id: run.agent_id,
      agent_name: run.agent_name,
      agent_type: run.agent_type,
      agent_version: run.agent_version,
      workflow_id: run.workflow_id,
      workflow_name: run.workflow_name,
      workflow_version: run.workflow_version,
      task_id: run.task_id,
      task_objective: run.task_objective,
      status: 'QUEUED',
      severity: run.severity,
      owner_id: run.owner_id,
      owner_name: run.owner_name,
      priority: run.priority,
      previous_status: run.status,
      policy_result: 'PENDING_REVIEW',
      evidence_status: 'PARTIAL',
      created_at: now,
      last_event_at: now,
      retry_count: retryCount,
    } as Record<string, any>);
  if (insertError) throw insertError;

  await supabaseAdmin
    .from('agent_runs')
    .update({
      last_event_at: now,
      updated_at: now,
      retry_count: retryCount,
    })
    .eq('id', run.id)
    .eq('workspace_id', workspaceId);

  const originalEventId = await insertRunEvent({
    run_id: run.id,
    event_type: 'run.retry_requested',
    actor_id: actorId,
    actor_name: actorName,
    previous_state: run.status,
    new_state: run.status,
    reason,
    payload_ref: newRunId,
    correlation_id: run.workflow_id,
  });

  const retryEventId = await insertRunEvent({
    run_id: newRunId,
    event_type: 'state.queued',
    actor_id: actorId,
    actor_name: actorName,
    previous_state: null,
    new_state: 'QUEUED',
    reason: `Retry of run ${runId}: ${reason}`,
    payload_ref: runId,
    correlation_id: run.workflow_id,
  });

  return {
    new_run_id: newRunId,
    original_run_id: runId,
    event_id: retryEventId,
    original_event_id: originalEventId,
  };
}
