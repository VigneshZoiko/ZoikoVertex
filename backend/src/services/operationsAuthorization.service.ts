import { AuthRequest } from "../shared/authMiddleware";

export type OperationsAction =
  | "view"
  | "manage_queue"
  | "pause"
  | "resume"
  | "stop"
  | "retry"
  | "quarantine"
  | "escalate"
  | "emergency_pause"
  | "restricted_mode"
  | "export_evidence"
  | "create_incident"
  | "run_policy_check";

type Actor = NonNullable<AuthRequest["user"]>;

export type OperationsActionGate = {
  action: OperationsAction;
  allowed: boolean;
  reason?: string;
};

const ACTION_ROLES: Record<OperationsAction, string[]> = {
  view: [
    "ADMIN",
    "WORKSPACE_OWNER",
    "SUPERADMIN",
    "AGENT_OPERATOR",
    "GOVERNANCE_ADMIN",
    "CAMPAIGN_MANAGER",
    "REVIEWER",
    "VALIDATOR",
    "APPROVER",
    "BRAND_REVIEWER",
    "COMPLIANCE_REVIEWER",
    "AUDITOR",
    "ANALYST",
    "MODEL_SUPERVISOR",
    "SECURITY_ADMIN",
    "VIEWER",
  ],
  manage_queue: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  pause: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  resume: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  stop: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  retry: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  quarantine: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"],
  escalate: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  emergency_pause: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  restricted_mode: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  export_evidence: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "COMPLIANCE_REVIEWER", "AUDITOR", "SECURITY_ADMIN"],
  create_incident: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  run_policy_check: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"],
};

export function assertOperationsPermission(
  user: Actor | undefined,
  action: OperationsAction,
) {
  if (!user) {
    throw Object.assign(new Error("Authenticated user context is required"), {
      statusCode: 401,
      code: "AUTH_CONTEXT_REQUIRED",
    });
  }

  const role = String(user.role || "").toUpperCase();
  const allowed = Boolean(user.is_superadmin) || ACTION_ROLES[action].includes(role);
  if (!allowed) {
    throw Object.assign(
      new Error(`Permission denied: ${action.replace(/_/g, " ")} is not allowed for your role`),
      { statusCode: 403, code: "OPERATIONS_PERMISSION_DENIED" },
    );
  }
}

export function canPerformOperationsAction(
  user: Actor | undefined,
  action: OperationsAction,
): OperationsActionGate {
  try {
    assertOperationsPermission(user, action);
    return { action, allowed: true };
  } catch (err) {
    return {
      action,
      allowed: false,
      reason: err instanceof Error ? err.message : "Action is not allowed",
    };
  }
}

export function assertWorkspaceScope(user: Actor | undefined, workspaceId?: string | null) {
  if (!user) {
    throw Object.assign(new Error("Authenticated user context is required"), {
      statusCode: 401,
      code: "AUTH_CONTEXT_REQUIRED",
    });
  }
  if (user.is_superadmin) return;
  if (!workspaceId || !user.workspace_id || workspaceId !== user.workspace_id) {
    throw Object.assign(new Error("Run is outside the current workspace scope"), {
      statusCode: 403,
      code: "OPERATIONS_SCOPE_DENIED",
    });
  }
}

export function requireReason(reason: unknown, action: OperationsAction): string {
  const value = typeof reason === "string" ? reason.trim() : "";
  if (value.length < 8) {
    throw Object.assign(
      new Error(`A reason of at least 8 characters is required to ${action.replace(/_/g, " ")}`),
      { statusCode: 400, code: "OPERATIONS_REASON_REQUIRED" },
    );
  }
  return value;
}

export function getRuntimeActionGates(
  user: Actor | undefined,
  status: string,
): OperationsActionGate[] {
  const normalizedStatus = String(status || "").toUpperCase();
  const stateAllowedActions: Partial<Record<OperationsAction, string[]>> = {
    pause: ["SCHEDULED", "QUEUED", "RUNNING", "WAITING_HUMAN_REVIEW"],
    resume: ["PAUSED"],
    stop: ["SCHEDULED", "QUEUED", "RUNNING", "PAUSED"],
    retry: ["FAILED"],
    quarantine: ["RUNNING", "POLICY_BLOCKED", "WAITING_HUMAN_REVIEW"],
    escalate: ["FAILED", "POLICY_BLOCKED", "QUARANTINED", "WAITING_HUMAN_REVIEW", "PAUSED", "RUNNING", "QUEUED"],
    emergency_pause: ["RUNNING", "QUEUED"],
    restricted_mode: ["RUNNING", "QUEUED", "WAITING_HUMAN_REVIEW"],
    export_evidence: ["COMPLETED", "FAILED", "POLICY_BLOCKED", "QUARANTINED", "STOPPED", "PAUSED", "RUNNING", "QUEUED", "SCHEDULED"],
  };

  return Object.entries(stateAllowedActions).map(([action, allowedStates]) => {
    const typedAction = action as OperationsAction;
    const permissionGate = canPerformOperationsAction(user, typedAction);
    if (!permissionGate.allowed) return permissionGate;
    if (!allowedStates.includes(normalizedStatus)) {
      return {
        action: typedAction,
        allowed: false,
        reason: `${typedAction.replace(/_/g, " ")} is not valid while run is ${normalizedStatus || "UNKNOWN"}`,
      };
    }
    return { action: typedAction, allowed: true };
  });
}
