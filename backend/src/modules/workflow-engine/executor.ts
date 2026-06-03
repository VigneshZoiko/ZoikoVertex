// ============================================================
// Workflow Step Executor
//
// Public API:
//   executeInstance(instanceId)
//     → Walk steps in sequence order, dispatch each to its
//       handler, persist step_runs, transition instance state.
//       Returns ExecutionResult on completion / pause / failure.
//
// Resumability:
//   When a step returns status="waiting" (approval_gate /
//   human_review), the instance is left in status='waiting_*'
//   and execution stops. A later call to executeInstance() will
//   re-run all not-yet-completed steps; the approval_gate
//   handler is idempotent and short-circuits if a decision
//   exists.
// ============================================================

import { supabaseAdmin } from "../../shared/supabase";
import { logger } from "../../shared/logger";
import { dispatch } from "./handlers";
import {
  recordWorkflowRunStart,
  recordWorkflowRunFinish,
} from "../../services/operationsRunRecorder.service";
import type {
  ContextBag,
  ExecutionContext,
  ExecutionResult,
  StepResult,
  WorkflowInstanceStatus,
  WorkflowStep,
} from "./types";

interface InstanceRow {
  id: string;
  workflow_id: string;
  version_id: string;
  status: WorkflowInstanceStatus | string;
  trigger_source: string | null;
  started_by: string | null;
  // ↓ workspace_id is on workflow_templates, not workflow_instances;
  //    resolved during the load below.
}

// ------------------------------------------------------------
// Load helpers
// ------------------------------------------------------------
async function loadInstance(instanceId: string): Promise<{
  instance: InstanceRow;
  workspaceId: string | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from("workflow_instances")
    .select(
      "id, workflow_id, version_id, status, trigger_source, started_by, workflow_templates!inner(workspace_id)",
    )
    .eq("id", instanceId)
    .maybeSingle();
  if (error || !data) return null;
  // Supabase nests the joined row; flatten.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const wsId =
    (data as any).workflow_templates?.workspace_id ??
    (data as any).workspace_id ??
    null;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const { workflow_templates: _omit, ...rest } = data as Record<string, unknown>;
  void _omit;
  return { instance: rest as unknown as InstanceRow, workspaceId: wsId };
}

async function loadSteps(versionId: string): Promise<WorkflowStep[]> {
  const { data, error } = await supabaseAdmin
    .from("workflow_steps")
    .select("*")
    .eq("version_id", versionId)
    .order("sequence", { ascending: true });
  if (error) throw error;
  return (data || []) as WorkflowStep[];
}

async function loadCompletedStepIds(instanceId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from("step_runs")
    .select("step_id, status")
    .eq("instance_id", instanceId)
    .in("status", ["completed", "skipped"]);
  return new Set((data || []).map((r) => r.step_id));
}

// ------------------------------------------------------------
// Persistence helpers
// ------------------------------------------------------------
async function recordStepRun(
  ctx: ExecutionContext,
  result: StepResult,
  startedAt: string,
): Promise<void> {
  try {
    await supabaseAdmin.from("step_runs").insert([
      {
        instance_id: ctx.instanceId,
        step_id: ctx.step.id,
        status: result.status,
        actor_type: "system",
        actor_id: ctx.initiatorId,
        error_code: result.status === "failed" ? result.reasonCode || "error" : null,
        reason_code: result.reasonCode || null,
        policy_result_id: result.policyResultId || null,
        evidence_ref: result.evidenceRef || null,
        output_ref: result.outputRef || null,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    logger.warn({ err, stepId: ctx.step.id }, "[workflow-engine] step_run persist failed");
  }
}

async function setInstanceStatus(
  instanceId: string,
  status: WorkflowInstanceStatus,
  patch: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabaseAdmin
      .from("workflow_instances")
      .update({ status, updated_at: new Date().toISOString(), ...patch })
      .eq("id", instanceId);
  } catch (err) {
    logger.warn({ err, instanceId, status }, "[workflow-engine] instance status update failed");
  }
}

// ------------------------------------------------------------
// Public — executeInstance
// ------------------------------------------------------------
export async function executeInstance(
  instanceId: string,
  triggerInput?: unknown,
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const loaded = await loadInstance(instanceId);
  if (!loaded) {
    return {
      instanceId,
      finalStatus: "failed",
      stepsRun: 0,
      stepsCompleted: 0,
      stepsFailed: 0,
      stepsPaused: 0,
      durationMs: Date.now() - startedAt,
    };
  }
  const { instance, workspaceId } = loaded;

  // Refuse to re-run terminal instances.
  const terminal: Set<string> = new Set(["completed", "failed", "cancelled"]);
  if (terminal.has(String(instance.status).toLowerCase())) {
    return {
      instanceId,
      finalStatus: instance.status as WorkflowInstanceStatus,
      stepsRun: 0,
      stepsCompleted: 0,
      stepsFailed: 0,
      stepsPaused: 0,
      durationMs: Date.now() - startedAt,
    };
  }

  const steps = await loadSteps(instance.version_id);
  if (steps.length === 0) {
    await setInstanceStatus(instanceId, "failed");
    return {
      instanceId,
      finalStatus: "failed",
      stepsRun: 0,
      stepsCompleted: 0,
      stepsFailed: 0,
      stepsPaused: 0,
      durationMs: Date.now() - startedAt,
    };
  }

  const alreadyDone = await loadCompletedStepIds(instanceId);

  // Mark instance running on first execution pass.
  await setInstanceStatus(instanceId, "running", {
    started_at: new Date().toISOString(),
    current_step_id: steps[0].id,
  });

  // Mirror this execution into Agent Operations (non-blocking, idempotent).
  await recordWorkflowRunStart({
    instanceId,
    workspaceId,
    workflowId: instance.workflow_id,
    versionId: instance.version_id,
    ownerId: instance.started_by,
    triggerSource: instance.trigger_source,
  });

  const bag: ContextBag = { triggerInput };
  let stepsRun = 0;
  let stepsCompleted = 0;
  let stepsFailed = 0;
  let stepsPaused = 0;
  let finalStatus: WorkflowInstanceStatus = "completed";
  let pausedAt: string | undefined;

  for (const step of steps) {
    if (alreadyDone.has(step.id)) continue;

    const ctx: ExecutionContext = {
      instanceId,
      workflowId: instance.workflow_id,
      versionId: instance.version_id,
      workspaceId,
      initiatorId: instance.started_by,
      bag,
      step,
    };
    const stepStartedAt = new Date().toISOString();
    stepsRun += 1;

    await setInstanceStatus(instanceId, "running", { current_step_id: step.id });

    let result: StepResult;
    try {
      result = await dispatch(ctx);
    } catch (err) {
      logger.error({ err, stepId: step.id }, "[workflow-engine] handler threw");
      result = {
        status: "failed",
        reasonCode: "handler_exception",
        message: err instanceof Error ? err.message : String(err),
      };
    }

    await recordStepRun(ctx, result, stepStartedAt);

    if (result.bagPatch) Object.assign(bag, result.bagPatch);

    if (result.status === "completed" || result.status === "skipped") {
      stepsCompleted += 1;
      continue;
    }
    if (result.status === "waiting") {
      stepsPaused += 1;
      finalStatus = step.step_type === "approval_gate" ? "waiting_approval" : "waiting_review";
      pausedAt = step.id;
      break;
    }
    if (result.status === "blocked") {
      stepsPaused += 1;
      finalStatus = "blocked";
      pausedAt = step.id;
      break;
    }
    // failed (default)
    stepsFailed += 1;
    finalStatus = "failed";
    pausedAt = step.id;
    break;
  }

  await setInstanceStatus(instanceId, finalStatus, {
    completed_at: finalStatus === "completed" ? new Date().toISOString() : null,
  });

  // Mirror the terminal/paused outcome into Agent Operations (non-blocking).
  await recordWorkflowRunFinish(instanceId, finalStatus);

  return {
    instanceId,
    finalStatus,
    stepsRun,
    stepsCompleted,
    stepsFailed,
    stepsPaused,
    durationMs: Date.now() - startedAt,
    pausedAt,
  };
}

// Re-export public types for ergonomic consumer imports.
export type {
  ExecutionResult,
  ExecutionContext,
  StepResult,
  WorkflowStep,
  WorkflowInstanceStatus,
  StepRunStatus,
} from "./types";
