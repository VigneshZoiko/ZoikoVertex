 
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
  status?: string | null;
}): Promise<void> {
  try {
    if (!intent.workspace_id || !intent.id) return;

    const channel = (intent.platform || '').toLowerCase() || null;
    const caption = intent.content ?? '';
    const nowIso = new Date().toISOString();
    // A post awaiting a human decision should read "Waiting Review", not
    // "Running". Terminal/approved routing is applied later via
    // syncAgentRunFromIntent (auto-publish loop + Approval Console decision).
    const intentStatusKey = String(intent.status || '').toUpperCase();
    const initialRunStatus =
      !intentStatusKey || intentStatusKey.startsWith('PENDING') ? 'WAITING_HUMAN_REVIEW' : 'RUNNING';

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
        status: initialRunStatus,
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
        new_state: initialRunStatus,
        reason: 'Post submitted for policy checks',
      });

      internalEventBus.emit('operations.event', {
        type: 'run.started',
        run_id: runId,
        workspace_id: intent.workspace_id,
        new_state: initialRunStatus,
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
 * Bridge a workflow policy_check verdict onto its Operations run.
 *
 * The workflow engine's policy_check step previously wrote the moderation
 * verdict only to `agent_safety_policy_results` (keyed by agent/instance id),
 * which Agent Operations does not read. As a result a post flagged during a
 * workflow always showed policy result "Pass". This bridges the verdict into
 * the two places Operations DOES read:
 *   1. the `policy_results` table (keyed by run_id) — the run-detail Policy tab,
 *   2. the `agent_runs.policy_result` column — the Operations list badge.
 *
 * NON-BLOCKING and IDEMPOTENT-friendly: never throws, so a recording failure
 * cannot break workflow execution.
 */
export async function recordWorkflowPolicyOutcome(p: {
  instanceId: string;
  verdict: 'safe' | 'review' | 'block';
  overallRisk: number;
  blockedTerms?: string[];
  evidenceId?: string;
  platform?: string | null;
}): Promise<void> {
  try {
    const run = await lookupRunByInstance(p.instanceId);
    if (!run?.id) return;

    // verdict → operations policy vocabulary (policy_outcome enum).
    const outcome: 'pass' | 'warning' | 'blocked' =
      p.verdict === 'block' ? 'blocked' : p.verdict === 'review' ? 'warning' : 'pass';
    // policy_results.severity (severity_level enum).
    const severity: 'normal' | 'attention' | 'warning' | 'critical' | 'blocked' =
      outcome === 'blocked' ? 'blocked' : outcome === 'warning' ? 'attention' : 'normal';

    const isPass = outcome === 'pass';
    const terms = (p.blockedTerms || []).filter(Boolean);
    const riskPct = Math.round((Number.isFinite(p.overallRisk) ? p.overallRisk : 0) * 100);
    const failedRule = isPass
      ? null
      : `Safety moderation ${p.verdict} (risk ${riskPct}%)${terms.length ? `: ${terms.slice(0, 8).join(', ')}` : ''}`;
    const nowIso = new Date().toISOString();

    // 1) policy_results row (run_id keyed) — feeds the run-detail Policy panel.
    await supabaseAdmin.from('policy_results').insert({
      id: uuidv4(),
      run_id: run.id,
      policy_id: null,
      policy_version: 'safety-moderation-1.0',
      outcome,
      severity,
      failed_rule: failedRule,
      check_category: isPass ? null : 'content_safety',
      affected_output_ref: p.evidenceId || null,
      remediation_required: !isPass,
      remediation_path: isPass ? null : 'Review the flagged content and resolve before publishing.',
      platform: p.platform || null,
      notes: 'safety-moderation',
    });

    // 2) agent_runs.policy_result — feeds the Operations list badge. A block
    //    also transitions the run to POLICY_BLOCKED (the executor halts it too).
    const update: Record<string, unknown> = {
      policy_result: outcome,
      last_event_at: nowIso,
      updated_at: nowIso,
    };
    if (outcome === 'blocked') {
      update.status = 'POLICY_BLOCKED';
      update.previous_status = run.status ?? null;
    }
    await supabaseAdmin.from('agent_runs').update(update).eq('id', run.id);

    internalEventBus.emit('operations.event', {
      type: 'run.policy_evaluated',
      run_id: run.id,
      workspace_id: run.workspace_id,
      policy_result: outcome,
      created_at: nowIso,
    });
  } catch (err) {
    logger.warn({ err }, 'recordWorkflowPolicyOutcome failed (non-blocking)');
  }
}

// publish_intents.status -> agent_runs fields. This is what makes an Approval
// Console decision (POST /governance/intents/:id/review-action) and the submit
// auto-publish/block routing show up on the Operations run, which is linked via
// agent_runs.task_id = publish_intent.id. Without it the run stayed on its
// creation-time state and always read "Pass".
const INTENT_STATUS_TO_RUN: Record<
  string,
  { status: string; policy_result?: string; output_status?: string }
> = {
  APPROVED:           { status: 'COMPLETED',           policy_result: 'pass',    output_status: 'posted' },
  PUBLISHED:          { status: 'COMPLETED',           policy_result: 'pass',    output_status: 'posted' },
  GOVERNANCE_BLOCKED: { status: 'POLICY_BLOCKED',      policy_result: 'blocked' },
  REJECTED:           { status: 'FAILED',              policy_result: 'blocked' },
  RETURNED:           { status: 'WAITING_HUMAN_REVIEW' },
  PENDING_REVIEW:     { status: 'WAITING_HUMAN_REVIEW' },
};

/**
 * Mirror a publish_intent's lifecycle status onto its Operations run.
 *
 * Called from the Approval Console decision handler and the submit-time
 * auto-publish/block routing so the Operations run STATUS (and policy badge)
 * reflect the human decision: approve → Completed/posted, reject → Failed,
 * high-risk/governance block → Policy Blocked, return/pending → Waiting Review.
 *
 * `note` (optional) is a short human-readable reason (e.g. the block reason)
 * surfaced on the run as next_action — the Operations Evidence column renders
 * it so an operator can see WHY a run was blocked/failed at a glance.
 *
 * NON-BLOCKING: never throws — a recording failure cannot break publishing.
 */
export async function syncAgentRunFromIntent(intentId: string, intentStatus: string, note?: string): Promise<void> {
  try {
    const key = String(intentStatus || '').toUpperCase();
    let mapping = INTENT_STATUS_TO_RUN[key];
    // Any other PENDING_* governance status means the post still awaits a human.
    if (!mapping && key.startsWith('PENDING_')) mapping = { status: 'WAITING_HUMAN_REVIEW' };
    if (!mapping) return;

    const run = await lookupRunByInstance(intentId); // agent_runs.task_id = intentId
    if (!run?.id || run.status === mapping.status) return;

    const nowIso = new Date().toISOString();
    const update: Record<string, unknown> = {
      status: mapping.status,
      previous_status: run.status ?? null,
      last_event_at: nowIso,
      updated_at: nowIso,
    };
    if (mapping.policy_result) update.policy_result = mapping.policy_result;
    if (mapping.output_status) update.output_status = mapping.output_status;
    if (note && note.trim()) update.next_action = note.trim().slice(0, 280);
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(mapping.status)) update.completed_at = nowIso;

    await supabaseAdmin.from('agent_runs').update(update).eq('id', run.id);

    await supabaseAdmin.from('run_events').insert({
      id: uuidv4(),
      run_id: run.id,
      event_type: `state.${mapping.status.toLowerCase()}`,
      actor_type: 'system',
      actor_id: null,
      actor_name: 'Approval Console',
      previous_state: run.status ?? null,
      new_state: mapping.status,
      reason: `Publish intent ${key.toLowerCase().replace(/_/g, ' ')}`,
    });

    internalEventBus.emit('operations.event', {
      type: `run.${mapping.status.toLowerCase()}`,
      run_id: run.id,
      workspace_id: run.workspace_id,
      previous_state: run.status,
      new_state: mapping.status,
      created_at: nowIso,
    });
  } catch (err) {
    logger.warn({ err, intentId }, 'syncAgentRunFromIntent failed (non-blocking)');
  }
}

/**
 * Mirror the publish-hub agent check (runAgentChecks) verdict onto the post's
 * Operations run. This is the authoritative content verdict the Live Workflow
 * Runs table uses; without this, a post the workflow shows as Blocked/flagged
 * still read "Running / Pass" in Agent Operations.
 *
 *   block  → Policy Blocked + policy_result blocked
 *   review → Waiting Review + policy_result warning
 *   safe   → left untouched (the post follows its normal approval lifecycle)
 *
 * The block/flag REASON is stored on agent_runs.next_action (surfaced in the
 * Operations Evidence column) and as a policy_results row (run-detail Policy
 * tab). NON-BLOCKING: never throws.
 */
export async function syncAgentRunFromCheck(
  intentId: string,
  check: { verdict?: string; risk?: number; reason?: string } | null | undefined,
): Promise<void> {
  try {
    if (!intentId || !check) return;
    const verdict = String(check.verdict || 'safe').toLowerCase();
    if (verdict !== 'block' && verdict !== 'review') return; // safe → no override

    const run = await lookupRunByInstance(intentId); // agent_runs.task_id = intentId
    if (!run?.id) return;

    const blocked = verdict === 'block';
    const status = blocked ? 'POLICY_BLOCKED' : 'WAITING_HUMAN_REVIEW';
    const policyResult = blocked ? 'blocked' : 'warning';
    const reason = String(check.reason || (blocked ? 'Blocked by safety/governance policy' : 'Flagged for human review')).slice(0, 280);
    const nowIso = new Date().toISOString();

    await supabaseAdmin
      .from('agent_runs')
      .update({
        status,
        previous_status: run.status ?? null,
        policy_result: policyResult,
        next_action: reason,
        last_event_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', run.id);

    await supabaseAdmin.from('policy_results').insert({
      id: uuidv4(),
      run_id: run.id,
      policy_id: null,
      policy_version: 'publish-agent-check-1.0',
      outcome: policyResult,
      severity: blocked ? 'blocked' : 'attention',
      failed_rule: reason,
      check_category: 'content_safety',
      affected_output_ref: null,
      remediation_required: true,
      remediation_path: 'Review the flagged content and resolve before publishing.',
      platform: null,
      notes: typeof check.risk === 'number' ? `agent-check risk ${check.risk}` : 'publish-agent-check',
    });

    internalEventBus.emit('operations.event', {
      type: `run.${status.toLowerCase()}`,
      run_id: run.id,
      workspace_id: run.workspace_id,
      previous_state: run.status,
      new_state: status,
      policy_result: policyResult,
      created_at: nowIso,
    });
  } catch (err) {
    logger.warn({ err, intentId }, 'syncAgentRunFromCheck failed (non-blocking)');
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
