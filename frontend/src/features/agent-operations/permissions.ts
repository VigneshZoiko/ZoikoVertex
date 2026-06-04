import type { ActionGate, AgentRun, RuntimeAction } from "./types";

// Fallback role matrix — only used when server action_gates are unavailable.
const FALLBACK_ACTION_ROLES: Record<RuntimeAction, string[]> = {
  pause: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  resume: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  stop: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  retry: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  quarantine: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"],
  escalate: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  emergency_pause: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  restricted_mode: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  export_evidence: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "COMPLIANCE_REVIEWER", "AUDITOR", "SECURITY_ADMIN"],
  hold: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  release_hold: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
};

const FALLBACK_STATUS_ACTIONS: Record<string, RuntimeAction[]> = {
  SCHEDULED: ["pause", "stop", "escalate", "hold"],
  QUEUED: ["pause", "stop", "escalate", "emergency_pause", "hold"],
  RUNNING: ["pause", "stop", "quarantine", "escalate", "emergency_pause", "restricted_mode", "hold"],
  WAITING_HUMAN_REVIEW: ["pause", "stop", "quarantine", "escalate", "restricted_mode", "hold"],
  POLICY_BLOCKED: ["quarantine", "escalate"],
  FAILED: ["retry", "escalate"],
  PAUSED: ["resume", "stop", "quarantine", "escalate", "release_hold"],
  STOPPED: ["escalate"],
  COMPLETED: ["export_evidence"],
  QUARANTINED: ["escalate", "export_evidence"],
};

/** Resolve a gate for a single action from server action_gates or fallback. */
function resolveGate(
  run: AgentRun,
  action: RuntimeAction,
  role: string | null,
  isSuperAdmin: boolean,
): { allowed: boolean; reason: string } {
  // Prefer server-computed action_gates (authoritative).
  if (run.action_gates && run.action_gates.length > 0) {
    const gate = run.action_gates.find((g: ActionGate) => g.action === action);
    if (gate) return { allowed: gate.allowed, reason: gate.reason };
  }

  // Fallback: use local role/status matrix when server gates unavailable.
  const normalized = String(role || "").toUpperCase();
  const roleAllowed = isSuperAdmin || (FALLBACK_ACTION_ROLES[action]?.includes(normalized) ?? false);
  if (!roleAllowed) {
    return { allowed: false, reason: "Your role cannot perform this runtime control." };
  }
  const statusAllowed = (FALLBACK_STATUS_ACTIONS[run.status] as readonly RuntimeAction[])?.includes(action) ?? false;
  if (!statusAllowed) {
    return { allowed: false, reason: `${action.replace(/_/g, " ")} is not available while the run is ${run.status}.` };
  }
  if (action === "retry" && run.policy_result === "failed") {
    return { allowed: false, reason: "Policy-blocked work cannot be retried until remediation is recorded." };
  }
  return { allowed: true, reason: "" };
}

export function canRunAction(role: string | null, isSuperAdmin: boolean, run: AgentRun | null, action: RuntimeAction) {
  if (!run) return { allowed: false, reason: "Select a run first." };
  return resolveGate(run, action, role, isSuperAdmin);
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
