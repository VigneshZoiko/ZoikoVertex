 
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { internalEventBus } from '../shared/internalEventBus';
import { isUuid } from '../shared/validation';

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
  // Extended fields
  channel?: string;
  brand_name?: string;
  campaign_name?: string;
  workspace_name?: string;
  current_step?: string;
  trigger_source?: string;
  next_action?: string;
  error_code?: string;
  retry_attempt?: number;
  original_run_id?: string;
  inputs?: Record<string, unknown>;
  knowledge_sources?: Array<{ name: string; version: string; freshness: string; confidence: number }>;
  prompt_template?: string;
  prompt_version?: string;
  output_snapshot?: string;
  output_status?: string;
  // Who published this run: the AGENT (auto-published after passing all checks)
  // or the human who approved it from the Approval Console. Resolved by
  // enrichRunsWithPostedBy. Null for runs that were never posted (blocked/pending).
  posted_by?: string | null;
  posted_by_type?: 'agent' | 'manual' | null;
}

// Statuses on the source publish_intent that mean the post actually went out.
const POSTED_INTENT_STATUSES = new Set(['APPROVED', 'PUBLISHED', 'SCHEDULED']);

/**
 * Resolve a "Posted By" attribution for each run from its source publish_intent
 * (agent_runs.task_id === publish_intents.id):
 *   • a human review action (reviewed_at / reviewer_feedback present) → the
 *     reviewer's name, type 'manual'
 *   • otherwise, if the intent reached a posted state → the owning agent's name,
 *     type 'agent' (auto-published after passing every agent + prompt check)
 *   • not posted yet (blocked/pending/failed) → left null
 * Best-effort and batched; never throws (a lookup failure just leaves it null).
 */
async function enrichRunsWithPostedBy(runs: any[], workspaceId: string): Promise<any[]> {
  if (!runs || runs.length === 0) return runs;
  const taskIds = Array.from(new Set(runs.map((r) => r.task_id).filter((x) => isUuid(x))));
  if (taskIds.length === 0) return runs;

  const intentById = new Map<string, any>();
  try {
    const { data } = await supabaseAdmin
      .from('publish_intents')
      .select('id, status, agent_id, reviewer_id')
      .eq('workspace_id', workspaceId)
      .in('id', taskIds as string[]);
    for (const it of data || []) intentById.set(it.id, it);
  } catch { /* some task_ids aren't publish_intents — fine */ }
  // Manual-review markers live on later-migration columns; select separately so a
  // missing column doesn't drop the agent_id/reviewer_id resolved above.
  try {
    const { data } = await supabaseAdmin
      .from('publish_intents')
      .select('id, reviewed_at, reviewer_feedback')
      .eq('workspace_id', workspaceId)
      .in('id', taskIds as string[]);
    for (const r of data || []) { const e = intentById.get(r.id); if (e) Object.assign(e, r); }
  } catch { /* columns not present in this env */ }

  const intents = Array.from(intentById.values());
  const agentIds = Array.from(new Set(intents.map((i) => i.agent_id).filter((x) => isUuid(x))));
  const reviewerIds = Array.from(new Set(intents.map((i) => i.reviewer_id).filter((x) => isUuid(x))));

  const agentNameById = new Map<string, string>();
  if (agentIds.length > 0) {
    try {
      const { data } = await supabaseAdmin.from('agents').select('id, name').eq('workspace_id', workspaceId).in('id', agentIds as string[]);
      for (const a of data || []) agentNameById.set(a.id, a.name);
    } catch { /* ignore */ }
  }
  const userNameById = new Map<string, string>();
  if (reviewerIds.length > 0) {
    try {
      const { data } = await supabaseAdmin.from('users').select('id, full_name, email').in('id', reviewerIds as string[]);
      for (const u of data || []) userNameById.set(u.id, u.full_name || u.email || u.id);
    } catch { /* ignore */ }
  }

  return runs.map((run) => {
    const intent = isUuid(run.task_id) ? intentById.get(run.task_id) : undefined;
    if (!intent) return run;
    const manual = !!(intent.reviewed_at || intent.reviewer_feedback);
    if (manual) {
      const name = intent.reviewer_id ? userNameById.get(intent.reviewer_id) : undefined;
      return { ...run, posted_by: name || 'Reviewer', posted_by_type: 'manual' as const };
    }
    if (POSTED_INTENT_STATUSES.has(String(intent.status || '').toUpperCase())) {
      const name = intent.agent_id ? agentNameById.get(intent.agent_id) : undefined;
      return { ...run, posted_by: name || run.agent_name || 'Agent', posted_by_type: 'agent' as const };
    }
    return run;
  });
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
  STOPPED: ['RUNNING', 'QUEUED'],
  QUARANTINED: ['INVESTIGATING', 'RESTORED'],
  INVESTIGATING: ['QUARANTINED', 'RESTORED'],
  RESTORED: ['RUNNING', 'COMPLETED'],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ponytail: isUuid extracted to shared/validation.ts

// Sanitize free-text search before it is interpolated into a PostgREST or()
// filter. Commas/parentheses/asterisks/dots are filter meta-characters that can
// break out of the expression, so they are stripped to whitespace.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()*%\\]/g, ' ').trim();
}

export async function listAgentRuns(params: {
  workspace_id: string;
  status?: string;
  agent_id?: string;
  environment?: string;
  brand_id?: string;
  brand_name?: string;
  severity?: string;
  policy_result?: string;
  priority?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
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
    .is('archived_at', null)
    .order(sortBy, { ascending })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.status) query = query.eq('status', params.status);
  if (params.agent_id) query = query.eq('agent_id', params.agent_id);
  if (params.environment) query = query.eq('environment', params.environment);
  if (params.brand_id) query = query.eq('brand_id', params.brand_id);
  if (params.brand_name) query = query.ilike('brand_name', params.brand_name);
  if (params.severity) query = query.eq('severity', params.severity);
  if (params.policy_result) query = query.eq('policy_result', params.policy_result);
  if (params.priority) query = query.eq('priority', parseInt(params.priority, 10));
  if (params.date_from) query = query.gte('created_at', params.date_from);
  if (params.date_to) query = query.lte('created_at', params.date_to);
  if (params.search) {
    const safe = sanitizeSearchTerm(params.search);
    if (safe) {
      query = query.or(`task_objective.ilike.%${safe}%,agent_name.ilike.%${safe}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;
  const enriched = await enrichRunsWithPostedBy(data || [], params.workspace_id);

  // For publisher-type runs, task_id IS the publish_intent.id — use it directly.
  // For workflow-execution runs, task_id is the workflow_instance.id. Look up
  // those instances and extract post_id from their trigger_source JSON so both
  // Operations and Workflows pages show the same canonical publish_intent.id for
  // the same post.
  const workflowTaskIds = Array.from(
    new Set(
      enriched
        .filter((r: any) => r.agent_type !== 'publisher' && isUuid(r.task_id))
        .map((r: any) => r.task_id as string),
    ),
  );
  const postIdByInstanceId = new Map<string, string>();
  if (workflowTaskIds.length > 0) {
    try {
      const { data: instances } = await supabaseAdmin
        .from('workflow_instances')
        .select('id, trigger_source')
        .in('id', workflowTaskIds)
        .not('trigger_source', 'is', null);
      for (const inst of instances || []) {
        if (typeof inst.trigger_source !== 'string') continue;
        try {
          const meta = JSON.parse(inst.trigger_source);
          if (meta?.src === 'publish_hub' && meta.post_id) {
            postIdByInstanceId.set(inst.id, meta.post_id);
          }
        } catch { /* not our JSON */ }
      }
    } catch { /* non-blocking */ }
  }

  // Back-fill owner_name for runs where it was never stored (owner_id present but
  // owner_name null). Batch-look up display names from the users table.
  const missingNameIds = Array.from(
    new Set(
      enriched
        .filter((r: any) => !r.owner_name && isUuid(r.owner_id))
        .map((r: any) => r.owner_id as string),
    ),
  );
  const ownerNameById = new Map<string, string>();
  if (missingNameIds.length > 0) {
    try {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .in('id', missingNameIds);
      for (const u of users || []) {
        ownerNameById.set(u.id, u.full_name || u.email || u.id);
      }
    } catch { /* non-blocking */ }
  }

  const runs = enriched.map((run: any) => ({
    ...run,
    owner_name: run.owner_name || ownerNameById.get(run.owner_id) || null,
    post_id:
      run.post_id ||
      (run.agent_type === 'publisher' ? run.task_id : null) ||
      postIdByInstanceId.get(run.task_id) ||
      null,
  }));
  return { runs, total: count || 0 };
}

export async function getAgentRun(runId: string) {
  // Validate the id shape before hitting the DB so a malformed id returns a
  // clean 400 rather than a Postgres cast error, and a non-existent id returns
  // 404 (maybeSingle => null) rather than a 500 from .single() throwing.
  if (!isUuid(runId)) {
    throw Object.assign(new Error('Invalid run id'), { statusCode: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw Object.assign(new Error('Agent run not found'), { statusCode: 404 });
  }
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

  // Our canonical transition map is authoritative for what is allowed. Reject
  // truly-invalid transitions up front so a stale/missing DB function can never
  // change acceptance behavior.
  if (!isValidTransition(run.status, newStatus)) {
    throw Object.assign(
      new Error(`Cannot transition run from ${run.status} to ${newStatus}`),
      { statusCode: 409 }
    );
  }

  const nowIso = new Date().toISOString();
  const actorUuid = isUuid(actorId) ? actorId : null;
  let eventId: string;
  let actionId: string;

  // Prefer the atomic SQL transition (single transaction: state change +
  // immutable event + control-action record). If the function is unavailable
  // or its built-in transition guard is stricter than ours, fall back to the
  // portable multi-statement path so behavior never regresses.
  try {
    const { data, error } = await supabaseAdmin.rpc('operations_transition_run', {
      p_run_id: runId,
      p_new_status: newStatus,
      p_reason: reason,
      p_actor_id: actorId,
      p_actor_name: actorName,
      p_action_type: actionType,
      p_impact_scope: impactScope ?? null,
    });
    if (error) throw error;
    eventId = (data as any)?.event_id;
    actionId = (data as any)?.runtime_action_id;
  } catch {
    const fallback = await transitionRunStateFallback(
      runId, run.status, newStatus, reason, actorUuid, actorName, actionType, impactScope, nowIso,
    );
    eventId = fallback.eventId;
    actionId = fallback.actionId;
  }

  internalEventBus.emit('operations.event', {
    type: `run.${newStatus.toLowerCase()}`,
    run_id: runId,
    workspace_id: run.workspace_id,
    previous_state: run.status,
    new_state: newStatus,
    event_id: eventId,
    runtime_action_id: actionId,
    created_at: nowIso,
  });

  return { previous_status: run.status, new_status: newStatus, event_id: eventId, run };
}

// Portable (non-RPC) transition: update status (recording previous_status),
// then append the immutable event and the runtime-control-action record.
async function transitionRunStateFallback(
  runId: string,
  previousStatus: string,
  newStatus: string,
  reason: string,
  actorUuid: string | null,
  actorName: string,
  actionType: string,
  impactScope: string | undefined,
  nowIso: string,
) {
  const update: Record<string, unknown> = {
    status: newStatus,
    previous_status: previousStatus,
    last_event_at: nowIso,
  };
  if (newStatus === 'RUNNING') update.started_at = nowIso;
  if (['COMPLETED', 'FAILED', 'STOPPED', 'CANCELLED'].includes(newStatus)) {
    update.completed_at = nowIso;
  }

  const { error: updateError } = await supabaseAdmin
    .from('agent_runs')
    .update(update)
    .eq('id', runId);
  if (updateError) throw updateError;

  const eventId = uuidv4();
  const { error: eventError } = await supabaseAdmin.from('run_events').insert({
    id: eventId,
    run_id: runId,
    event_type: `state.${newStatus.toLowerCase()}`,
    actor_type: 'user',
    actor_id: actorUuid,
    actor_name: actorName,
    previous_state: previousStatus,
    new_state: newStatus,
    reason,
  });
  // Surface audit-write failures rather than silently leaving a state change
  // with no event (best-effort consistency without a transaction).
  if (eventError) throw eventError;

  const actionId = uuidv4();
  await supabaseAdmin.from('runtime_control_actions').insert({
    id: actionId,
    run_id: runId,
    action_type: actionType,
    requested_by: actorUuid,
    reason,
    impact_scope: impactScope || null,
    result: 'completed',
  });

  return { eventId, actionId };
}

export async function pauseRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'PAUSED', reason, actorId, actorName, 'pause', impactScope);
}

export async function resumeRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'RUNNING', reason, actorId, actorName, 'resume', impactScope);
}

// Re-start a STOPPED run (transition back to RUNNING).
export async function startRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'RUNNING', reason, actorId, actorName, 'start', impactScope);
}

// Archive (soft-delete) a run. Governance requirement (spec §10): operational
// history, timeline, approval chain, and evidence must never be destroyed by a
// UI action. The run is hidden from default lists via archived_at but all
// records — run_events, runtime_control_actions, policy_results, evidence — are
// preserved permanently and remain retrievable by id. The archive is itself
// recorded as an immutable run_event for the audit trail.
export async function deleteRun(
  runId: string,
  actorId?: string,
  actorName?: string,
  reason?: string,
) {
  const run = await getAgentRun(runId); // validates id + 404
  const nowIso = new Date().toISOString();
  const archiveReason = reason && reason.trim() ? reason.trim() : 'Archived via operations console';
  const actorUuid = isUuid(actorId) ? actorId! : null;

  const { error } = await supabaseAdmin
    .from('agent_runs')
    .update({
      archived_at: nowIso,
      archived_by: actorUuid,
      archive_reason: archiveReason,
    })
    .eq('id', runId);
  if (error) throw error;

  // Append-only audit record of the archive action (does not mutate history).
  const eventId = uuidv4();
  await supabaseAdmin.from('run_events').insert({
    id: eventId,
    run_id: runId,
    event_type: 'run.archived',
    actor_type: 'user',
    actor_id: actorUuid,
    actor_name: actorName || 'Unknown',
    previous_state: run.status,
    new_state: run.status,
    reason: archiveReason,
  });
  await supabaseAdmin.from('runtime_control_actions').insert({
    id: uuidv4(),
    run_id: runId,
    action_type: 'archive',
    requested_by: actorUuid,
    reason: archiveReason,
    impact_scope: 'selected_run',
    result: 'completed',
  });

  internalEventBus.emit('operations.event', {
    type: 'run.archived',
    run_id: runId,
    workspace_id: run.workspace_id,
    event_id: eventId,
    created_at: nowIso,
  });

  // `deleted` is preserved in the response for backward compatibility with the
  // existing client contract; the run is archived, not destroyed.
  return { deleted: true, archived: true, run_id: runId, archived_at: nowIso };
}

export async function stopRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'STOPPED', reason, actorId, actorName, 'stop', impactScope);
}

export async function quarantineRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'QUARANTINED', reason, actorId, actorName, 'quarantine', impactScope);
}

export async function holdRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'PAUSED', reason, actorId, actorName, 'hold', impactScope);
}

export async function releaseHoldRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  return transitionRunState(runId, 'RUNNING', reason, actorId, actorName, 'release_hold', impactScope);
}

export async function emergencyPauseRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  const run = await getAgentRun(runId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (run.status !== 'RUNNING' && run.status !== 'QUEUED') {
    throw Object.assign(new Error('Only RUNNING or QUEUED runs can be emergency paused'), { statusCode: 409 });
  }
  return transitionRunState(runId, 'PAUSED', `[EMERGENCY] ${reason}`, actorId, actorName, 'emergency_pause', impactScope);
}

export async function restrictedModeRun(runId: string, reason: string, actorId: string, actorName: string, impactScope?: string) {
  const run = await getAgentRun(runId);
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  if (!['RUNNING', 'QUEUED', 'WAITING_HUMAN_REVIEW'].includes(run.status)) {
    throw Object.assign(new Error('Only active or review-pending runs can enter restricted mode'), { statusCode: 409 });
  }
  return transitionRunState(runId, 'POLICY_BLOCKED', `[RESTRICTED_MODE] ${reason}`, actorId, actorName, 'restricted_mode', impactScope);
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
  // Note: the retried run is created in QUEUED (not auto-published), so the
  // duplicate-delivery guard is enforced downstream at publish time rather than
  // by keyword-matching the operator's free-text reason here. A reason is still
  // required (controller-level requireReason) and the original evidence is kept.

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
      agent_version: run.agent_version,
      workflow_id: run.workflow_id,
      workflow_version: run.workflow_version,
      task_id: run.task_id,
      task_name: (run as any).task_name,
      task_objective: run.task_objective,
      channel: run.channel,
      status: 'QUEUED',
      severity: run.severity,
      owner_id: run.owner_id,
      owner_name: run.owner_name,
      priority: run.priority,
      evidence_status: 'capturing',
      metadata: (run as any).metadata ?? null,
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
