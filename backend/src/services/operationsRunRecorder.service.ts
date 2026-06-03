/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
//  Operations Run Recorder
// ----------------------------------------------------------------------------
//  Bridges the workflow-engine execution lifecycle into the Agent Operations
//  `agent_runs` table so live executions appear on the Operations page.
//
//  Design guarantees:
//   • NON-BLOCKING: every function swallows its own errors and never throws,
//     so a recording failure can never break a real workflow execution.
//   • IDEMPOTENT per workflow instance: the ops run is linked to the workflow
//     instance via agent_runs.task_id = instanceId, so repeated executeInstance
//     calls (resume passes) update the same row instead of creating duplicates.
//   • SCHEMA-SAFE: only valid enum values are written (run_status / severity_level
//     / evidence_status / policy_outcome / actor_type) and agent_id is left NULL
//     (workflow runs are not agent-scoped; see migration relaxing that column).
// ============================================================================
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../shared/logger';
import { internalEventBus } from '../shared/internalEventBus';
import { isUuid } from './operationsRun.service';
import { runPolicyCheck } from './operationsPolicy.service';

// Workflow instance status -> agent_runs run_status enum.
const STATUS_MAP: Record<string, string> = {
  completed: 'COMPLETED',
  failed: 'FAILED',
  waiting_approval: 'WAITING_HUMAN_REVIEW',
  waiting_review: 'WAITING_HUMAN_REVIEW',
  blocked: 'POLICY_BLOCKED',
  cancelled: 'CANCELLED',
  running: 'RUNNING',
};

async function lookupRunByInstance(instanceId: string) {
  const { data } = await supabaseAdmin
    .from('agent_runs')
    .select('id, status, workspace_id')
    .eq('task_id', instanceId)
    .maybeSingle();
  return data as { id: string; status: string; workspace_id: string } | null;
}

/**
 * Record (or refresh) an operations run when a workflow execution starts.
 * Safe to call on every executeInstance pass.
 */
export async function recordWorkflowRunStart(p: {
  instanceId: string;
  workspaceId: string | null;
  workflowId: string;
  versionId: string;
  ownerId: string | null;
  triggerSource: string | null;
}): Promise<void> {
  try {
    // Cannot create a workspace-scoped run without a workspace.
    if (!p.workspaceId) return;

    const nowIso = new Date().toISOString();
    const existing = await lookupRunByInstance(p.instanceId);
    if (existing?.id) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'RUNNING',
          previous_status: existing.status ?? null,
          started_at: nowIso,
          last_event_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', existing.id);
      return;
    }

    // Best-effort display name from the workflow template.
    let workflowName: string | null = null;
    const { data: tmpl } = await supabaseAdmin
      .from('workflow_templates')
      .select('name')
      .eq('id', p.workflowId)
      .maybeSingle();
    workflowName = (tmpl as any)?.name ?? null;

    const runId = uuidv4();
    const { error } = await supabaseAdmin.from('agent_runs').insert({
      id: runId,
      workspace_id: p.workspaceId,
      tenant_id: p.workspaceId, // tenant boundary == workspace here (matches seed convention)
      agent_id: null, // workflow-level run (agent_id NOT NULL relaxed by migration)
      environment: 'production',
      workflow_id: p.workflowId,
      workflow_version: p.versionId,
      workflow_name: workflowName,
      task_id: p.instanceId, // links this ops run to the workflow instance (idempotency key)
      task_name: workflowName ? `Workflow: ${workflowName}` : 'Workflow run',
      task_objective: workflowName ?? 'Workflow execution',
      agent_name: workflowName ?? 'Workflow run',
      agent_type: 'workflow',
      status: 'RUNNING',
      severity: 'normal',
      owner_id: isUuid(p.ownerId) ? p.ownerId : null,
      priority: 3,
      policy_result: 'pending_review',
      evidence_status: 'capturing',
      retry_count: 0,
      max_retries: 3,
      trigger_source: p.triggerSource ?? 'workflow',
      started_at: nowIso,
      last_event_at: nowIso,
    });
    if (error) {
      logger.warn({ err: error, instanceId: p.instanceId }, 'ops run insert failed (non-blocking)');
      return;
    }

    await supabaseAdmin.from('run_events').insert({
      id: uuidv4(),
      run_id: runId,
      event_type: 'run.started',
      actor_type: 'system',
      actor_id: null,
      actor_name: 'Workflow Engine',
      new_state: 'RUNNING',
      reason: 'Workflow execution started',
    });

    internalEventBus.emit('operations.event', {
      type: 'run.started',
      run_id: runId,
      workspace_id: p.workspaceId,
      new_state: 'RUNNING',
      created_at: nowIso,
    });
  } catch (err) {
    logger.warn({ err }, 'recordWorkflowRunStart failed (non-blocking)');
  }
}

/**
 * Mirror a published post (publish_intent) into Agent Operations as an
 * `agent_run`, then run the operations policy engine against the post's
 * caption so the run lands on the Operations page with full policy results.
 *
 * Wired into governance/submit. NON-BLOCKING and IDEMPOTENT per intent
 * (agent_runs.task_id = publish_intent.id), so it can never break publishing
 * and re-submits update the same run.
 */
export async function recordPublishIntentRun(intent: {
  id: string;
  workspace_id: string | null;
  creator_id?: string | null;
  content?: string | null;
  platform?: string | null;
  media_urls?: string[] | null;
}): Promise<void> {
  try {
    if (!intent.workspace_id || !intent.id) return;

    const channel = (intent.platform || '').toLowerCase() || null;
    const caption = intent.content ?? '';
    const nowIso = new Date().toISOString();

    // Idempotency: reuse the run linked to this intent if it already exists.
    const existing = await lookupRunByInstance(intent.id);
    let runId = existing?.id;

    if (!runId) {
      runId = uuidv4();
      const { error } = await supabaseAdmin.from('agent_runs').insert({
        id: runId,
        workspace_id: intent.workspace_id,
        tenant_id: intent.workspace_id,
        agent_id: null,
        environment: 'production',
        task_id: intent.id, // links this ops run to the publish_intent (idempotency key)
        task_name: channel ? `Publish to ${channel}` : 'Publish post',
        task_objective: channel ? `Publish content to ${channel}` : 'Publish content',
        agent_name: 'Content Publisher',
        agent_type: 'publisher',
        channel,
        output_snapshot: caption, // the policy engine scans this field
        output_status: 'draft',
        status: 'RUNNING',
        severity: 'normal',
        owner_id: isUuid(intent.creator_id) ? intent.creator_id : null,
        priority: 3,
        policy_result: 'pending_review',
        evidence_status: 'capturing',
        retry_count: 0,
        max_retries: 3,
        trigger_source: 'publish',
        started_at: nowIso,
        last_event_at: nowIso,
      });
      if (error) {
        logger.warn({ err: error, intentId: intent.id }, 'ops run insert for publish intent failed (non-blocking)');
        return;
      }

      await supabaseAdmin.from('run_events').insert({
        id: uuidv4(),
        run_id: runId,
        event_type: 'run.started',
        actor_type: 'system',
        actor_id: null,
        actor_name: 'Publisher',
        new_state: 'RUNNING',
        reason: 'Post submitted for policy checks',
      });

      internalEventBus.emit('operations.event', {
        type: 'run.started',
        run_id: runId,
        workspace_id: intent.workspace_id,
        new_state: 'RUNNING',
        created_at: nowIso,
      });
    } else {
      // Refresh the caption snapshot so re-checks evaluate current content.
      await supabaseAdmin
        .from('agent_runs')
        .update({ output_snapshot: caption, channel, last_event_at: nowIso, updated_at: nowIso })
        .eq('id', runId);
    }

    // Run the policy engine. runPolicyCheck records policy_results and, on a
    // blocking hit, transitions the run to POLICY_BLOCKED. It can throw 503 if
    // the engine is disabled (fail-closed) — swallow so publishing is unaffected.
    try {
      await runPolicyCheck(runId);
    } catch (err) {
      logger.warn({ err, runId }, 'policy check for publish intent failed (non-blocking)');
    }
  } catch (err) {
    logger.warn({ err }, 'recordPublishIntentRun failed (non-blocking)');
  }
}

/**
 * Record the terminal/paused outcome of a workflow execution on its ops run.
 */
export async function recordWorkflowRunFinish(instanceId: string, finalStatus: string): Promise<void> {
  try {
    const status = STATUS_MAP[String(finalStatus).toLowerCase()] || 'COMPLETED';
    const run = await lookupRunByInstance(instanceId);
    if (!run?.id) return;

    const nowIso = new Date().toISOString();
    const isTerminal = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status);
    const update: Record<string, unknown> = {
      status,
      previous_status: run.status ?? null,
      completed_at: isTerminal ? nowIso : null,
      last_event_at: nowIso,
      updated_at: nowIso,
    };
    if (status === 'POLICY_BLOCKED') update.policy_result = 'blocked';

    await supabaseAdmin.from('agent_runs').update(update).eq('id', run.id);

    await supabaseAdmin.from('run_events').insert({
      id: uuidv4(),
      run_id: run.id,
      event_type: `state.${status.toLowerCase()}`,
      actor_type: 'system',
      actor_id: null,
      actor_name: 'Workflow Engine',
      previous_state: run.status ?? null,
      new_state: status,
      reason: `Workflow execution ${String(finalStatus).toLowerCase()}`,
    });

    internalEventBus.emit('operations.event', {
      type: `run.${status.toLowerCase()}`,
      run_id: run.id,
      workspace_id: run.workspace_id,
      previous_state: run.status,
      new_state: status,
      created_at: nowIso,
    });
  } catch (err) {
    logger.warn({ err }, 'recordWorkflowRunFinish failed (non-blocking)');
  }
}
