export type AgentRunStatus =
  | "SCHEDULED"
  | "QUEUED"
  | "RUNNING"
  | "WAITING_HUMAN_REVIEW"
  | "POLICY_BLOCKED"
  | "FAILED"
  | "PAUSED"
  | "STOPPED"
  | "COMPLETED"
  | "QUARANTINED";

export type Severity = "normal" | "attention" | "warning" | "critical" | "blocked";
export type PolicyOutcome = "passed" | "warning" | "failed" | "mixed" | "pending" | "not_applicable";
export type EvidenceStatus = "captured" | "partial" | "failed" | "locked" | "export_ready" | "pending";

export interface AgentRun {
  id: string;
  tenant_id?: string;
  workspace_id?: string;
  brand_id?: string;
  brand_name?: string;
  campaign_name?: string;
  environment: string;
  agent_id: string;
  agent_name: string;
  agent_type: string;
  agent_version?: string;
  workflow_id?: string;
  workflow_name?: string;
  workflow_version?: string;
  task_id?: string;
  task_objective: string;
  current_step?: string;
  channel?: string;
  trigger_source?: string;
  status: AgentRunStatus;
  severity: Severity | string;
  owner_id?: string;
  owner_name?: string;
  priority?: number;
  policy_result?: PolicyOutcome | string;
  evidence_status?: EvidenceStatus | string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  due_at?: string | null;
  last_event_at?: string | null;
  last_event?: string;
  status_config?: { label: string; color: string; severity: string };
  original_run_id?: string | null;
  retry_attempt?: number | null;
}

export interface RunEvent {
  id: string;
  run_id: string;
  event_type: string;
  actor_type?: string;
  actor_id?: string;
  actor_name?: string;
  previous_state?: string | null;
  new_state?: string | null;
  reason?: string | null;
  payload_ref?: string | null;
  created_at: string;
  correlation_id?: string | null;
}

export interface PolicyResult {
  id: string;
  run_id: string;
  policy_id: string;
  policy_version?: string | null;
  outcome: "PASS" | "FAIL" | "WARN" | "ESCALATE";
  severity: string;
  failed_rule?: string | null;
  affected_output_ref?: string | null;
  remediation_required?: boolean;
  created_at: string;
}

export interface QueueItem {
  id: string;
  run_id?: string;
  queue_type: string;
  priority: number;
  assignee_id?: string | null;
  assignee_name?: string | null;
  team_id?: string | null;
  due_at?: string | null;
  status: string;
  claimed_by?: string | null;
  claimed_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  run_id?: string | null;
  run_name?: string;
  severity: string;
  category: string;
  owner_id?: string | null;
  owner_name?: string | null;
  status: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  due_at?: string | null;
  root_cause?: string | null;
  remediation?: string | null;
}

export interface EvidenceBundle {
  id: string;
  run_id: string;
  status: string;
  hash?: string | null;
  locked_at?: string | null;
  exported_by?: string | null;
  exported_at?: string | null;
  export_reason?: string | null;
  storage_ref?: string | null;
  created_at?: string;
}

export interface RunDetailResponse {
  run: AgentRun;
  prompt_version?: string;
  knowledge_sources?: Array<Record<string, unknown>>;
  policy_results?: PolicyResult[];
  output_snapshot?: unknown;
  approval_chain?: Array<{ actor: string; action: string; timestamp: string; reason?: string }>;
  evidence_bundle?: EvidenceBundle;
}

export interface OperationsStats {
  active_runs: number;
  queue_depth: number;
  pending_queues: number;
  total_runs: number;
  failed_runs: number;
  failure_rate: number;
  policy_blocked_runs: number;
  policy_block_rate: number;
}

export interface OperationsAnalytics {
  active_runs?: { value: number; trend: string };
  queue_depth?: { value: number; trend: string };
  throughput?: Record<string, number>;
  failure_rate?: Record<string, number>;
  policy_block_rate?: Record<string, number>;
  sla_breach_rate?: number;
  evidence_completeness?: number;
}

export interface OperationsFilters {
  status: string;
  severity: string;
  environment: string;
  search: string;
}

export type RuntimeAction =
  | "pause"
  | "resume"
  | "stop"
  | "retry"
  | "quarantine"
  | "escalate"
  | "emergency_pause"
  | "restricted_mode"
  | "export_evidence";
