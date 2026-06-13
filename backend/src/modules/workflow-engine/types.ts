// ============================================================
// ZoikoVertex — Workflow Step Executor — Core Types
//
// The executor walks a workflow_instance's ordered steps and
// dispatches each to a handler. Handlers receive a Context and
// return a StepResult. The executor is responsible for:
//   - persisting step_run rows
//   - transitioning instance status
//   - threading shared state (`context.bag`) between steps
//   - short-circuiting on FAIL / BLOCK / PAUSE
// ============================================================

export type WorkflowStepType =
  | "trigger"
  | "agent_action"
  | "prompt_execution"
  | "knowledge_lookup"
  | "policy_check"
  | "human_review"
  | "approval_gate"
  | "schedule"
  | "moderate"
  | "escalate"
  | "evidence_capture"
  | "branch"
  | "delay"
  | "end";

export type StepRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "skipped"
  | "waiting";

export type WorkflowInstanceStatus =
  | "pending"
  | "queued"
  | "running"
  | "waiting_approval"
  | "waiting_review"
  | "paused"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled";

// ------------------------------------------------------------
// A workflow step row, normalized for the executor.
// ------------------------------------------------------------
export interface WorkflowStep {
  id: string;
  version_id: string;
  step_type: WorkflowStepType;
  name: string;
  description?: string | null;
  owner_role?: string | null;
  owner_user_id?: string | null;
  sequence: number;
  conditions?: Record<string, unknown> | null;
  input_schema?: Record<string, unknown> | null;
  output_schema?: Record<string, unknown> | null;
  required_policy_checks?: string[] | null;
  required_evidence?: boolean;
  sla_minutes?: number | null;
}

// ------------------------------------------------------------
// Execution context — passed to every handler. `bag` is the
// in-memory shared state for the run: the output of one step
// becomes available to subsequent steps. Persistence is the
// executor's responsibility, not the handler's.
// ------------------------------------------------------------
export interface ExecutionContext {
  instanceId: string;
  workflowId: string;
  versionId: string;
  workspaceId: string | null;
  initiatorId: string | null;
  bag: ContextBag;
  /** Resolved step row (provided by executor). */
  step: WorkflowStep;
}

export interface ContextBag {
  /** Original trigger payload / user inputs. */
  triggerInput?: unknown;
  /** Last agent-generated draft content. */
  lastDraft?: string;
  /** Last moderation verdict (from policy_check). */
  lastModeration?: {
    verdict: "safe" | "review" | "block";
    overallRisk: number;
    severity: string;
    evidenceId: string;
  };
  /** Knowledge chunks retrieved (concatenated text + citations). */
  retrievedKnowledge?: {
    text: string;
    citations: Array<{ source_id: string; chunk_id?: string }>;
  };
  /** Most recent prompt content rendered for the agent. */
  renderedPrompt?: string;
  /** Approval gate outcome (when present). */
  lastApproval?: {
    decision: "approved" | "rejected" | "changes_requested";
    approverId?: string;
    note?: string;
  };
  /** Publish step result (platform response). */
  lastPublish?: { platform: string; postId?: string; url?: string };
  /** Free-form metadata handlers can stash. */
  meta?: Record<string, unknown>;
}

// ------------------------------------------------------------
// What a handler returns. The executor inspects `status` to
// decide whether to advance, pause, or fail.
// ------------------------------------------------------------
export interface StepResult {
  status: StepRunStatus;
  /** Bag mutations the handler wants persisted into context. */
  bagPatch?: Partial<ContextBag>;
  /** Operational reason code (machine-readable). */
  reasonCode?: string;
  /** Human-readable detail (logged into step_runs.error_code/reason). */
  message?: string;
  /** Optional output reference (URL, evidence id, etc.). */
  outputRef?: string;
  /** Optional policy_result_id from a policy_check step. */
  policyResultId?: string;
  /** Optional evidence_ref from an evidence_capture step. */
  evidenceRef?: string;
}

// ------------------------------------------------------------
// Handler signature — every node type implements this.
// ------------------------------------------------------------
export type StepHandler = (ctx: ExecutionContext) => Promise<StepResult>;

// ------------------------------------------------------------
// Result of a full execution pass (one or more steps).
// ------------------------------------------------------------
export interface ExecutionResult {
  instanceId: string;
  finalStatus: WorkflowInstanceStatus;
  stepsRun: number;
  stepsCompleted: number;
  stepsFailed: number;
  stepsPaused: number;
  durationMs: number;
  /** When `finalStatus = waiting_*` the next step that's blocking. */
  pausedAt?: string;
}
