/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { internalEventBus } from '../shared/internalEventBus';

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
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['PAUSED', 'STOPPED', 'CANCELLED'],
  QUEUED: ['RUNNING', 'PAUSED', 'STOPPED', 'CANCELLED', 'POLICY_BLOCKED'],
  RUNNING: ['PAUSED', 'STOPPED', 'COMPLETED', 'FAILED', 'POLICY_BLOCKED', 'QUARANTINED'],
  WAITING_HUMAN_REVIEW: ['PAUSED', 'STOPPED', 'POLICY_BLOCKED', 'QUARANTINED'],
  PAUSED: ['RUNNING', 'STOPPED', 'QUARANTINED'],
  POLICY_BLOCKED: ['QUARANTINED', 'STOPPED'],
  COMPLETED: [],
  FAILED: ['QUEUED'],
  CANCELLED: [],
  STOPPED: [],
  QUARANTINED: ['INVESTIGATING', 'RESTORED'],
  INVESTIGATING: ['QUARANTINED', 'RESTORED'],
  RESTORED: ['RUNNING', 'COMPLETED'],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export async function listAgentRuns(params: {
  workspace_id: string;
  status?: string;
  agent_id?: string;
  environment?: string;
  brand_id?: string;
  brand_name?: string;
  severity?: string;
  priority?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  limit: number;
  offset: number;
}) {
  const sortableColumns = new Set(['created_at', 'updated_at', 'last_event_at', 'due_at', 'priority', 'status', 'severity']);
  const sortBy = sortableColumns.has(params.sort_by || '') ? params.sort_by! : 'created_at';
  const ascending = String(params.sort_dir || '').toLowerCase() === 'asc';
  let query = supabaseAdmin
    .from('agent_runs')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order(sortBy, { ascending })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.status) query = query.eq('status', params.status);
  if (params.agent_id) query = query.eq('agent_id', params.agent_id);
  if (params.environment) query = query.eq('environment', params.environment);
  if (params.brand_id) query = query.eq('brand_id', params.brand_id);
  if (params.brand_name) query = query.ilike('brand_name', params.brand_name);
  if (params.severity) query = query.eq('severity', params.severity);
  if (params.priority) query = query.eq('priority', parseInt(params.priority, 10));
  if (params.search) {
    query = query.or(`task_objective.ilike.%${params.search}%,agent_name.ilike.%${params.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { runs: data || [], total: count || 0 };
}

export async function getAgentRun(runId: string) {
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single();
  if (error) throw error;
  return data as AgentRun;
}

export async function getRunTimeline(runId: string) {
  const { data, error } = await supabaseAdmin
    .from('run_events')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function transitionRunState(
  runId: string,
  newStatus: string,
  reason: string,
  actorId: string,
  actorName: string,
  actionType: string,
  impactScope?: string,
) {
  const run = await getAgentRun(runId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });

  if (!isValidTransition(run.status, newStatus)) {
    throw Object.assign(
      new Error(`Cannot transition run from ${run.status} to ${newStatus}`),
      { statusCode: 409 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc('operations_transition_run', {
    p_run_id: runId,
    p_new_status: newStatus,
    p_reason: reason,
    p_actor_id: actorId,
    p_actor_name: actorName,
    p_action_type: actionType,
    p_impact_scope: impactScope || null,
  });
  if (error) throw error;
  const result = (data || {}) as {
    previous_status?: string;
    new_status?: string;
    event_id?: string;
    runtime_action_id?: string;
    workspace_id?: string;
  };

  internalEventBus.emit('operations.event', {
    type: `run.${newStatus.toLowerCase()}`,
    run_id: runId,
    workspace_id: run.workspace_id,
    previous_state: result.previous_status || run.status,
    new_state: newStatus,
    event_id: result.event_id,
    runtime_action_id: result.runtime_action_id,
    created_at: new Date().toISOString(),
  });

  return { previous_status: result.previous_status || run.status, new_status: result.new_status || newStatus, event_id: result.event_id, run };
}

export async function pauseRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'PAUSED', reason, actorId, actorName, 'pause', impactScope);
}

export async function resumeRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'RUNNING', reason, actorId, actorName, 'resume', impactScope);
}

export async function stopRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'STOPPED', reason, actorId, actorName, 'stop', impactScope);
}

export async function quarantineRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'QUARANTINED', reason, actorId, actorName, 'quarantine', impactScope);
}

export async function emergencyPauseRun(runId: string, reason: string, actorId: string, actorName: string) {
  const run = await getAgentRun(runId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (run.status !== 'RUNNING' && run.status !== 'QUEUED') {
    throw Object.assign(new Error('Only RUNNING or QUEUED runs can be emergency paused'), { statusCode: 409 });
  }
  return transitionRunState(runId, 'PAUSED', `[EMERGENCY] ${reason}`, actorId, actorName, 'emergency_pause', 'selected_run');
}

export async function restrictedModeRun(runId: string, reason: string, actorId: string, actorName: string) {
  const run = await getAgentRun(runId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (!['RUNNING', 'QUEUED', 'WAITING_HUMAN_REVIEW'].includes(run.status)) {
    throw Object.assign(new Error('Only active or review-pending runs can enter restricted mode'), { statusCode: 409 });
  }
  return transitionRunState(runId, 'POLICY_BLOCKED', `[RESTRICTED_MODE] ${reason}`, actorId, actorName, 'restricted_mode', 'selected_run');
}

export async function retryRun(runId: string, reason: string, actorId: string, actorName: string) {
  const run = await getAgentRun(runId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (run.status !== 'FAILED') {
    throw Object.assign(new Error('Only FAILED runs can be retried'), { statusCode: 409 });
  }
  const retryAttempt = Number((run as any).retry_attempt || 0) + 1;
  if (retryAttempt > 3) {
    throw Object.assign(new Error('Retry limit reached for this run'), { statusCode: 409 });
  }
  const riskyDelivery = Boolean(run.channel) && String(run.channel).toLowerCase() !== 'internal';
  if (riskyDelivery && !/duplicate|delivery|publish|safe|idempotent/i.test(reason)) {
    throw Object.assign(
      new Error('Retry reason must acknowledge duplicate delivery risk for external channels'),
      { statusCode: 400 }
    );
  }

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
      previous_status: 'FAILED',
      evidence_status: 'pending',
      original_run_id: runId,
      retry_attempt: retryAttempt,
    });
  if (insertError) throw insertError;

  const eventId = uuidv4();
  await supabaseAdmin.from('run_events').insert({
    id: eventId,
    run_id: newRunId,
    event_type: 'state.queued',
    actor_type: 'user',
    actor_id: actorId,
    actor_name: actorName,
    previous_state: null,
    new_state: 'QUEUED',
    reason: `Retry of run ${runId}: ${reason}`,
    payload_ref: runId,
    correlation_id: run.workflow_id,
  });

  internalEventBus.emit('operations.event', {
    type: 'run.retry_requested',
    run_id: newRunId,
    original_run_id: runId,
    workspace_id: run.workspace_id,
    event_id: eventId,
    created_at: new Date().toISOString(),
  });

  return { new_run_id: newRunId, original_run_id: runId, event_id: eventId };
}
