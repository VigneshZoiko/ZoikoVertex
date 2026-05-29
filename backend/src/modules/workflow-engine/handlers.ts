// ============================================================
// Step Handlers — one function per workflow_step_type.
//
// Handlers are PURE w.r.t. persistence: they read from ctx,
// return StepResult, and never write to step_runs directly.
// The executor owns all writes. This keeps the engine's I/O
// surface small and testable.
//
// Handlers MAY call out to:
//   - Supabase (read prompt body, knowledge chunks, agent row)
//   - Gemini (agent_action — content generation)
//   - safety/moderationService (policy_check)
// ============================================================

import { supabaseAdmin } from "../../shared/supabase";
import { moderate } from "../safety/moderationService";
import { logger } from "../../shared/logger";
import type {
  StepHandler,
  StepResult,
  ExecutionContext,
  WorkflowStepType,
} from "./types";

// ------------------------------------------------------------
// trigger — entrypoint of the workflow. Marks the run as started
// and forwards the trigger payload into the context bag.
// ------------------------------------------------------------
const triggerHandler: StepHandler = async (): Promise<StepResult> => ({
  status: "completed",
  message: "Workflow trigger acknowledged",
});

// ------------------------------------------------------------
// agent_action — generate content via the agent's bound prompt.
// Reads:
//   - step.conditions.agent_id  (required)
//   - step.conditions.prompt_body OR ctx.bag.renderedPrompt
//   - ctx.bag.triggerInput / ctx.bag.retrievedKnowledge
// Writes:
//   - ctx.bag.lastDraft
// ------------------------------------------------------------
const agentActionHandler: StepHandler = async (ctx): Promise<StepResult> => {
  const conditions = (ctx.step.conditions ?? {}) as Record<string, unknown>;
  const agentId = (conditions.agent_id as string) || undefined;

  if (!agentId) {
    return {
      status: "failed",
      reasonCode: "missing_agent_binding",
      message: "Agent action step has no agent_id in conditions",
    };
  }

  // Load the agent (status + mode determine whether we're allowed to run).
  const { data: agent, error } = await supabaseAdmin
    .from("agents")
    .select("id, name, status, mode, autonomy_level")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !agent) {
    return {
      status: "failed",
      reasonCode: "agent_not_found",
      message: `Agent ${agentId} not found`,
    };
  }
  if (agent.status && !["ACTIVE", "APPROVED", "active", "approved"].includes(agent.status)) {
    return {
      status: "blocked",
      reasonCode: "agent_not_deployable",
      message: `Agent is in ${agent.status} state and cannot run`,
    };
  }

  // For now the executor doesn't make a live Gemini call here — that's
  // delegated to whatever the bound prompt_execution step does. This
  // handler just records that the agent was assigned and forwards any
  // upstream draft (e.g. from a prior prompt_execution step) so the
  // pipeline can continue. Real generation happens in prompt_execution.
  const upstreamDraft =
    ctx.bag.renderedPrompt ||
    ctx.bag.lastDraft ||
    (typeof ctx.bag.triggerInput === "string" ? ctx.bag.triggerInput : "");

  return {
    status: "completed",
    bagPatch: {
      lastDraft: upstreamDraft,
      meta: { ...(ctx.bag.meta || {}), assigned_agent_id: agentId, agent_name: agent.name },
    },
    message: `Agent ${agent.name} assigned`,
  };
};

// ------------------------------------------------------------
// prompt_execution — load an approved prompt version, render
// variables, and generate output. We do NOT call Gemini here
// in v1 (cost + complexity); we render the prompt body with
// trigger inputs interpolated and stash it as `lastDraft`.
// Generation is bolted on later when the agent_runtime is wired.
// ------------------------------------------------------------
const promptExecutionHandler: StepHandler = async (ctx): Promise<StepResult> => {
  const conditions = (ctx.step.conditions ?? {}) as Record<string, unknown>;
  const versionId = (conditions.prompt_version_id as string) || undefined;

  if (!versionId) {
    return {
      status: "failed",
      reasonCode: "missing_prompt_binding",
      message: "prompt_execution step has no prompt_version_id in conditions",
    };
  }

  const { data: version, error } = await supabaseAdmin
    .from("prompt_versions")
    .select("id, body")
    .eq("id", versionId)
    .maybeSingle();
  if (error || !version) {
    return {
      status: "failed",
      reasonCode: "prompt_version_not_found",
      message: `Prompt version ${versionId} not found`,
    };
  }

  // Naive variable interpolation: replace {{key}} with values from the
  // trigger input if it's an object. Keeps v1 dependency-free.
  let rendered = version.body || "";
  const trigger = ctx.bag.triggerInput;
  if (trigger && typeof trigger === "object" && !Array.isArray(trigger)) {
    for (const [k, v] of Object.entries(trigger as Record<string, unknown>)) {
      rendered = rendered.replaceAll(`{{${k}}}`, String(v ?? ""));
    }
  }

  return {
    status: "completed",
    bagPatch: { renderedPrompt: rendered, lastDraft: rendered },
    message: "Prompt rendered",
  };
};

// ------------------------------------------------------------
// knowledge_lookup — pull approved chunks/entries from the
// bound collection(s) for grounding. v1 returns the most-recent
// approved entries; semantic / vector retrieval is a follow-up.
// ------------------------------------------------------------
const knowledgeLookupHandler: StepHandler = async (ctx): Promise<StepResult> => {
  const conditions = (ctx.step.conditions ?? {}) as Record<string, unknown>;
  const collectionIds = Array.isArray(conditions.collection_ids)
    ? (conditions.collection_ids as string[])
    : [];

  if (collectionIds.length === 0) {
    return {
      status: "completed",
      reasonCode: "no_knowledge_required",
      message: "No collections bound; skipping retrieval",
    };
  }

  // Tolerant of either knowledge_entries (legacy) or knowledge_sources.
  let entries: Array<{ id: string; title?: string; content?: string }> = [];
  try {
    const { data } = await supabaseAdmin
      .from("knowledge_entries")
      .select("id, title, content")
      .in("kb_id", collectionIds)
      .order("created_at", { ascending: false })
      .limit(5);
    entries = (data || []) as typeof entries;
  } catch {
    // table missing — fall through with empty result
  }

  const text = entries
    .map((e) => `# ${e.title || "Untitled"}\n${(e.content || "").slice(0, 800)}`)
    .join("\n\n");

  return {
    status: "completed",
    bagPatch: {
      retrievedKnowledge: {
        text,
        citations: entries.map((e) => ({ source_id: e.id })),
      },
    },
    message: `Retrieved ${entries.length} knowledge entries`,
  };
};

// ------------------------------------------------------------
// policy_check — calls the production safety engine on the
// draft. This is the integration point for the moderation
// system. Verdict mapping:
//   - safe   → completed
//   - review → completed (downstream approval_gate will catch)
//   - block  → blocked   (executor halts the run)
// ------------------------------------------------------------
const policyCheckHandler: StepHandler = async (ctx): Promise<StepResult> => {
  const content = ctx.bag.lastDraft || "";
  if (!content) {
    return {
      status: "completed",
      reasonCode: "no_content_to_check",
      message: "No draft content present; policy check skipped",
    };
  }

  const verdict = await moderate({
    content,
    subjectId: ctx.instanceId,
    tenantId: ctx.workspaceId || undefined,
  });

  // Persist a policy_result row so Operations can render it. Best-effort;
  // ignore failures because the verdict itself is what governs flow.
  let policyResultId: string | undefined;
  try {
    const { data } = await supabaseAdmin
      .from("agent_safety_policy_results")
      .insert([
        {
          agent_id: ctx.instanceId, // operations queries by subject id
          severity: verdict.severity,
          pass_fail: verdict.verdict === "safe",
          blocked_terms: verdict.matches.map((m) => m.pattern),
          evidence_id: verdict.evidenceId,
        },
      ])
      .select("id")
      .maybeSingle();
    policyResultId = data?.id;
  } catch (err) {
    logger.warn({ err }, "[workflow-engine] policy_result persist failed");
  }

  const bagPatch = {
    lastModeration: {
      verdict: verdict.verdict,
      overallRisk: verdict.overallRisk,
      severity: verdict.severity,
      evidenceId: verdict.evidenceId,
    },
  };

  if (verdict.verdict === "block") {
    return {
      status: "blocked",
      reasonCode: "policy_block",
      message: `Policy check blocked: risk ${verdict.overallRisk}`,
      policyResultId,
      bagPatch,
    };
  }

  return {
    status: "completed",
    message: `Policy ${verdict.verdict} (risk ${verdict.overallRisk})`,
    policyResultId,
    bagPatch,
  };
};

// ------------------------------------------------------------
// human_review / approval_gate — create an approval_records row
// and pause the run. Resumption happens when the approval row
// is decided (via the existing /approvals endpoints).
// ------------------------------------------------------------
const approvalGateHandler: StepHandler = async (ctx): Promise<StepResult> => {
  // Check if there's already a decided approval for this (instance, step).
  // If yes, advance based on it. If no, create one and pause.
  const { data: existing } = await supabaseAdmin
    .from("approval_records")
    .select("id, decision, approver_id, decision_reason")
    .eq("instance_id", ctx.instanceId)
    .eq("step_id", ctx.step.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && existing.decision) {
    if (existing.decision === "approve" || existing.decision === "approved") {
      return {
        status: "completed",
        message: "Approval received",
        bagPatch: {
          lastApproval: {
            decision: "approved",
            approverId: existing.approver_id || undefined,
            note: existing.decision_reason || undefined,
          },
        },
      };
    }
    if (existing.decision === "reject" || existing.decision === "rejected") {
      return {
        status: "failed",
        reasonCode: "approval_rejected",
        message: existing.decision_reason || "Approval rejected",
      };
    }
    if (existing.decision === "request_changes") {
      return {
        status: "failed",
        reasonCode: "approval_changes_requested",
        message: existing.decision_reason || "Reviewer requested changes",
      };
    }
  }

  // No decision yet — create the request row and pause.
  try {
    await supabaseAdmin.from("approval_records").insert([
      {
        instance_id: ctx.instanceId,
        step_id: ctx.step.id,
        required_role: ctx.step.owner_role || null,
      },
    ]);
  } catch (err) {
    logger.warn({ err }, "[workflow-engine] approval_records insert failed");
  }

  return {
    status: "waiting",
    reasonCode: "awaiting_approval",
    message: `Awaiting approval${ctx.step.owner_role ? ` from ${ctx.step.owner_role}` : ""}`,
  };
};

const humanReviewHandler: StepHandler = approvalGateHandler;

// ------------------------------------------------------------
// publish — v1 stub: log + return a synthetic publish receipt.
// Real platform connectors plug in here later (LinkedIn, X, etc.).
// ------------------------------------------------------------
const publishHandler: StepHandler = async (ctx): Promise<StepResult> => {
  const conditions = (ctx.step.conditions ?? {}) as Record<string, unknown>;
  const platform = (conditions.platform as string) || "internal";
  const fakePostId = `${platform}-${Date.now()}`;
  logger.info(
    { instanceId: ctx.instanceId, platform, contentLen: (ctx.bag.lastDraft || "").length },
    "[workflow-engine] publish (stub) — connector not wired",
  );
  return {
    status: "completed",
    bagPatch: { lastPublish: { platform, postId: fakePostId } },
    outputRef: fakePostId,
    message: `Stub-published to ${platform}`,
  };
};

// ------------------------------------------------------------
// notify / escalate — v1 logs only. Real implementation hooks
// into notification service / incident creation later.
// ------------------------------------------------------------
const notifyHandler: StepHandler = async (ctx) => {
  logger.info({ instanceId: ctx.instanceId }, "[workflow-engine] notify (stub)");
  return { status: "completed", message: "Notification dispatched (stub)" };
};

const escalateHandler: StepHandler = async (ctx): Promise<StepResult> => {
  // Best-effort incident row insert — table may not exist on every tenant.
  try {
    await supabaseAdmin.from("incidents").insert([
      {
        run_id: ctx.instanceId,
        workspace_id: ctx.workspaceId || '',
        severity: ctx.bag.lastModeration?.severity || "medium",
        category: "workflow_escalation",
      },
    ]);
  } catch {
    // ignore
  }
  return { status: "completed", message: "Escalation recorded" };
};

// ------------------------------------------------------------
// evidence_capture — finalize evidence for the run. Writes
// an evidence_bundles row referencing all the artifacts.
// ------------------------------------------------------------
const evidenceCaptureHandler: StepHandler = async (ctx): Promise<StepResult> => {
  const evidenceRef = `evd-${ctx.instanceId.slice(0, 8)}-${Date.now()}`;
  try {
    const { data } = await supabaseAdmin
      .from("evidence_bundles")
      .insert([
        {
          run_id: ctx.instanceId,
          status: "locked",
          hash: evidenceRef, // v1 uses ref as placeholder hash; replace with sha256 of canonicalized payload
        },
      ])
      .select("id")
      .maybeSingle();
    return {
      status: "completed",
      evidenceRef: data?.id || evidenceRef,
      message: "Evidence bundle locked",
    };
  } catch (err) {
    logger.warn({ err }, "[workflow-engine] evidence_bundles insert failed");
    return {
      status: "completed",
      reasonCode: "evidence_persistence_failed",
      message: "Evidence ref generated but persistence failed",
      evidenceRef,
    };
  }
};

// ------------------------------------------------------------
// branch / delay / schedule / moderate / end — v1 minimal.
// ------------------------------------------------------------
const branchHandler: StepHandler = async () => ({ status: "completed", message: "Branch evaluated (default path)" });
const delayHandler: StepHandler = async () => ({ status: "completed", message: "Delay step (v1: pass-through)" });
const scheduleHandler: StepHandler = async () => ({ status: "completed", message: "Schedule step (v1: pass-through)" });
const moderateHandler: StepHandler = policyCheckHandler; // alias
const endHandler: StepHandler = async () => ({ status: "completed", message: "Workflow end" });

// ------------------------------------------------------------
// Dispatch table — keyed by workflow_step_type enum value.
// ------------------------------------------------------------
export const HANDLERS: Record<WorkflowStepType, StepHandler> = {
  trigger: triggerHandler,
  agent_action: agentActionHandler,
  prompt_execution: promptExecutionHandler,
  knowledge_lookup: knowledgeLookupHandler,
  policy_check: policyCheckHandler,
  human_review: humanReviewHandler,
  approval_gate: approvalGateHandler,
  schedule: scheduleHandler,
  publish: publishHandler,
  moderate: moderateHandler,
  notify: notifyHandler,
  escalate: escalateHandler,
  evidence_capture: evidenceCaptureHandler,
  branch: branchHandler,
  delay: delayHandler,
  end: endHandler,
};

export async function dispatch(ctx: ExecutionContext): Promise<StepResult> {
  const handler = HANDLERS[ctx.step.step_type];
  if (!handler) {
    return {
      status: "failed",
      reasonCode: "unknown_step_type",
      message: `No handler registered for step type "${ctx.step.step_type}"`,
    };
  }
  return handler(ctx);
}
