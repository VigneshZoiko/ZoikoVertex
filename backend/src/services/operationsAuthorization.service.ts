import { Response, NextFunction } from "express";
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
  | "run_policy_check"
  | "start"
  | "delete_run";

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
    "AGENT_ARCHITECT",
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
  manage_queue: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  pause: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  resume: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  stop: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  retry: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  quarantine: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"],
  escalate: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  emergency_pause: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  restricted_mode: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "SECURITY_ADMIN"],
  export_evidence: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "COMPLIANCE_REVIEWER", "AUDITOR", "SECURITY_ADMIN"],
  create_incident: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER"],
  run_policy_check: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "GOVERNANCE_ADMIN", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"],
  start: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT", "AGENT_OPERATOR", "GOVERNANCE_ADMIN"],
  delete_run: ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "AGENT_ARCHITECT"],
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

// Route-level defense-in-depth guard for ALL /api/v1/operations/* routes.
// Every operations route still enforces its specific action in-handler; this
// middleware guarantees no operations route is reachable by a caller lacking
// even base "view" access, so a handler that ever forgets its assert is not
// silently exposed. "view" is the common denominator every operations role
// holds, so this adds a layer without narrowing existing access.
export function requireOperationsAccess(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    assertOperationsPermission(req.user, "view");
    next();
  } catch (err) {
    next(err);
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
    quarantine: ["RUNNING", "POLICY_BLOCKED", "WAITING_HUMAN_REVIEW", "PAUSED"],
    escalate: ["FAILED", "POLICY_BLOCKED", "QUARANTINED", "WAITING_HUMAN_REVIEW", "PAUSED", "RUNNING", "QUEUED"],
    start: ["STOPPED"],
    delete_run: ["STOPPED", "COMPLETED", "FAILED", "CANCELLED", "QUARANTINED"],
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
