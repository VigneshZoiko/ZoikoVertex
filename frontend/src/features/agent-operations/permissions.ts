import type { AgentRun, RuntimeAction } from "./types";

const ACTION_ROLES: Record<RuntimeAction, string[]> = {
  pause: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  resume: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  stop: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  retry: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  quarantine: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"],
  escalate: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  emergency_pause: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  restricted_mode: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  export_evidence: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "COMPLIANCE_REVIEWER", "AUDITOR", "SECURITY_ADMIN"],
};

const STATUS_ACTIONS: Record<string, RuntimeAction[]> = {
  SCHEDULED: ["pause", "stop", "escalate"],
  QUEUED: ["pause", "stop", "escalate", "emergency_pause"],
  RUNNING: ["pause", "stop", "quarantine", "escalate", "emergency_pause", "restricted_mode"],
  WAITING_HUMAN_REVIEW: ["pause", "stop", "quarantine", "escalate", "restricted_mode"],
  POLICY_BLOCKED: ["quarantine", "escalate"],
  FAILED: ["retry", "escalate"],
  PAUSED: ["resume", "stop", "quarantine", "escalate"],
  STOPPED: ["escalate"],
  COMPLETED: ["export_evidence"],
  QUARANTINED: ["escalate", "export_evidence"],
};

export function canRunAction(role: string | null, isSuperAdmin: boolean, run: AgentRun | null, action: RuntimeAction) {
  if (!run) return { allowed: false, reason: "Select a run first." };
  const normalized = String(role || "").toUpperCase();
  const roleAllowed = isSuperAdmin || ACTION_ROLES[action].includes(normalized);
  if (!roleAllowed) {
    return { allowed: false, reason: "Your role cannot perform this runtime control." };
  }
  const statusAllowed = STATUS_ACTIONS[run.status]?.includes(action) ?? false;
  if (!statusAllowed) {
    return { allowed: false, reason: `${action.replace(/_/g, " ")} is not available while the run is ${run.status}.` };
  }
  if (action === "retry" && run.policy_result === "failed") {
    return { allowed: false, reason: "Policy-blocked work cannot be retried until remediation is recorded." };
  }
  return { allowed: true, reason: "" };
}

export function getPrimaryNextAction(run: AgentRun): RuntimeAction | "open" {
  if (run.status === "FAILED") return "retry";
  if (run.status === "POLICY_BLOCKED") return "escalate";
  if (run.status === "RUNNING") return run.severity === "critical" ? "pause" : "open";
  if (run.status === "PAUSED") return "resume";
  if (run.status === "WAITING_HUMAN_REVIEW") return "escalate";
  if (run.status === "COMPLETED") return "export_evidence";
  return "open";
}
