   
  import { Response, NextFunction } from "express";
  import { logger } from "../../shared/logger";
  import { logToDatabase } from "../../shared/databaseLogger";
  import { internalEventBus } from "../../shared/internalEventBus";
  import { AuthRequest } from "../../shared/authMiddleware";
  import * as runService from "../../services/operationsRun.service";
  import * as queueService from "../../services/operationsQueue.service";
  import * as policyService from "../../services/operationsPolicy.service";
  import * as analyticsService from "../../services/operationsAnalytics.service";
  import * as incidentService from "../../services/operationsIncident.service";
  import * as evidenceService from "../../services/operationsEvidence.service";
  import * as runtimeControlService from "../../services/operationsRuntimeControl.service";
  import {
    assertOperationsPermission,
    assertWorkspaceScope,
    getRuntimeActionGates,
    requireReason,
  } from "../../services/operationsAuthorization.service";
  import { getParam, getQueryNumber, getQueryValue } from "../../shared/request";

  const STATUS_MAP: Record<
    string,
    { label: string; color: string; severity: string }
  > = {
    SCHEDULED: { label: "Scheduled", color: "text-blue-400", severity: "normal" },
    QUEUED: { label: "Queued", color: "text-amber-400", severity: "attention" },
    RUNNING: { label: "Running", color: "text-emerald-400", severity: "normal" },
    WAITING_HUMAN_REVIEW: {
      label: "Waiting Review",
      color: "text-purple-400",
      severity: "warning",
    },
    POLICY_BLOCKED: {
      label: "Policy Blocked",
      color: "text-rose-400",
      severity: "critical",
    },
    FAILED: { label: "Failed", color: "text-red-400", severity: "critical" },
    PAUSED: { label: "Paused", color: "text-orange-400", severity: "warning" },
    STOPPED: { label: "Stopped", color: "text-slate-400", severity: "warning" },
    COMPLETED: {
      label: "Completed",
      color: "text-emerald-400",
      severity: "normal",
    },
    QUARANTINED: {
      label: "Quarantined",
      color: "text-rose-400",
      severity: "critical",
    },
  };

  function withStatusMeta(run: any) {
    return {
      ...run,
      status_config: STATUS_MAP[run.status] || {
        label: run.status,
        color: "text-gray-400",
        severity: "normal",
      },
    };
  }

  function withRunControlMeta(req: AuthRequest, run: any) {
    const gates = getRuntimeActionGates(req.user, run.status);
    return {
      ...withStatusMeta(run),
      permitted_actions: gates.filter((gate) => gate.allowed).map((gate) => gate.action),
      action_gates: gates,
    };
  }

  function operationsScopeFilters(req: AuthRequest) {
    return {
      environment: getQueryValue(req, "environment"),
      brand_id: getQueryValue(req, "brand_id"),
      brand_name: getQueryValue(req, "brand"),
    };
  }

  export const listAgentRuns = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      const status = getQueryValue(req, "status");
      const agent_id = getQueryValue(req, "agent_id");
      const environment = getQueryValue(req, "environment");
      const brand_id = getQueryValue(req, "brand_id");
      const brand_name = getQueryValue(req, "brand");
      const severity = getQueryValue(req, "severity");
      const policy_result = getQueryValue(req, "policy_result");
      const search = getQueryValue(req, "search");
      const date_from = getQueryValue(req, "date_from");
      const date_to = getQueryValue(req, "date_to");
      const limit = getQueryNumber(req, "limit", 50);
      const offset = getQueryNumber(req, "offset", 0);
      const sort_by = getQueryValue(req, "sort_by");
      const sort_dir = getQueryValue(req, "sort_dir");
      const result = await runService.listAgentRuns({
        workspace_id: workspaceId,
        status,
        agent_id,
        environment,
        brand_id,
        brand_name,
        severity,
        policy_result,
        search,
        date_from,
        date_to,
        sort_by,
        sort_dir,
        limit,
        offset,
      });
      res.json({
        runs: result.runs.map((run) => withRunControlMeta(req, run)),
        total: result.total,
        limit,
        offset,
      });
    } catch (err) {
      logger.error({ err }, "Failed to list agent runs");
      next(err);
    }
  };

  export const getAgentRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const id = getParam(req, "id");
      const workspaceId = req.user?.workspace_id;
      const run = await runService.getAgentRun(id);
      if (!run) return res.status(404).json({ error: "Agent run not found" });
      assertWorkspaceScope(req.user, run.workspace_id);
      const [policyResults, timeline, evidenceBundles] = await Promise.all([
        policyService.getPolicyResultsForRun(id).catch(() => []),
        runService.getRunTimeline(id).catch(() => []),
        workspaceId
          ? evidenceService
              .listEvidenceBundles({
                workspace_id: workspaceId,
                run_id: id,
                limit: 1,
                offset: 0,
              })
              .catch(() => ({ bundles: [] as any[] }))
          : Promise.resolve({ bundles: [] as any[] }),
      ]);

      const approvalChain = timeline
        .filter(
          (event: any) =>
            String(event.event_type || "").includes("approval") ||
            String(event.event_type || "").includes("review"),
        )
        .map((event: any) => ({
          actor: event.actor_name || event.actor_id || "Unknown",
          action: event.event_type,
          timestamp: event.created_at,
          reason: event.reason || undefined,
        }));

      res.json({
        run: withRunControlMeta(req, run),
        prompt_version: run.agent_version || undefined,
        inputs: run.inputs || undefined,
        knowledge_sources: run.knowledge_sources || [],
        prompt_template: run.prompt_template || undefined,
        policy_results: policyResults,
        output_snapshot: run.output_snapshot || undefined,
        output_status: run.output_status || undefined,
        approval_chain: approvalChain,
        evidence_bundle: evidenceBundles.bundles?.[0] || undefined,
      });
    } catch (err) {
      logger.error({ err }, "Failed to get agent run");
      next(err);
    }
  };

  export const getRunTimeline = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const events = await runService.getRunTimeline(id);
      res.json({ events });
    } catch (err) {
      logger.error({ err }, "Failed to get run timeline");
      next(err);
    }
  };

  export const pauseRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "pause");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "pause");
      const impactScope = req.body?.impact_scope || "selected_run";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.pauseRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "info",
        "Operations",
        `Agent run ${id} paused by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error({ err }, "Failed to pause run");
      next(err);
    }
  };

  export const resumeRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "resume");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "resume");
      const impactScope = req.body?.impact_scope || "selected_run";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.resumeRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "info",
        "Operations",
        `Agent run ${id} resumed by ${userName}`,
        { runId: id },
      );
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error({ err }, "Failed to resume run");
      next(err);
    }
  };

  export const startRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "start");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "start");
      const impactScope = req.body?.impact_scope || "selected_run";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.startRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "info",
        "Operations",
        `Agent run ${id} started by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, ...result, message: "Run started" });
    } catch (err) {
      logger.error({ err }, "Failed to start run");
      next(err);
    }
  };

  export const deleteRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "delete_run");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = req.body?.reason || "Archived via operations console";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.deleteRun(id, userId, userName, reason);
      await logToDatabase(
        "warn",
        "Operations",
        `Agent run ${id} archived by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, ...result, message: "Run archived; history and evidence preserved" });
    } catch (err) {
      logger.error({ err }, "Failed to delete run");
      next(err);
    }
  };

  export const stopRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "stop");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "stop");
      const impactScope = req.body?.impact_scope || "selected_run";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.stopRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "warn",
        "Operations",
        `Agent run ${id} stopped by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error({ err }, "Failed to stop run");
      next(err);
    }
  };

  export const retryRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "retry");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "retry");
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.retryRun(
        id,
        reason,
        userId,
        userName,
      );
      await logToDatabase(
        "info",
        "Operations",
        `Agent run ${id} retry created as ${result.new_run_id}`,
        { originalRunId: id, newRunId: result.new_run_id },
      );
      res.json({
        success: true,
        ...result,
        message: "Retry run created successfully",
      });
    } catch (err) {
      logger.error({ err }, "Failed to retry run");
      next(err);
    }
  };

  export const quarantineRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "quarantine");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "quarantine");
      const impactScope = req.body?.impact_scope || "run_output";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.quarantineRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "warn",
        "Operations",
        `Agent run ${id} quarantined by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error({ err }, "Failed to quarantine run");
      next(err);
    }
  };

  export const emergencyPause = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "emergency_pause");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "emergency_pause");
      const impactScope = req.body?.impact_scope || "selected_run";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.emergencyPauseRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "warn",
        "Operations",
        `[EMERGENCY PAUSE] Run ${id} paused by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, ...result, message: "Emergency pause applied" });
    } catch (err) {
      logger.error({ err }, "Failed to emergency pause");
      next(err);
    }
  };

  export const escalateRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "escalate");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "escalate");
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const workspaceId = run.workspace_id;
      let incidentId: string | undefined = req.body?.incident_id;

      // Record the immutable control action.
      await runtimeControlService.recordRuntimeControlAction({
        run_id: id,
        action_type: "escalate",
        requested_by: userId,
        reason,
        result: "completed",
      });

      // Escalation must produce a tracked incident. If an existing incident was
      // supplied, move it to "investigating" and link this escalation; otherwise
      // create a new incident linked to the run so it surfaces in the queue.
      if (incidentId) {
        await incidentService.acknowledgeIncident(incidentId, userId, reason).catch(() => undefined);
      } else {
        const created = await incidentService.createIncident({
          workspace_id: workspaceId,
          run_id: id,
          severity: req.body?.severity || (run.severity === "critical" ? "critical" : "high"),
          category: req.body?.category || "other",
          owner_id: req.body?.owner_id || userId,
          owner_name: req.body?.owner_name || userName,
          created_by: userId,
          created_by_name: userName,
          due_at: req.body?.due_at,
          root_cause: reason,
        });
        incidentId = created.id;
      }

      const escalatedAt = new Date().toISOString();
      // Emit a realtime event so operator surfaces update without a refresh.
      internalEventBus.emit("operations.event", {
        type: "run.escalated",
        run_id: id,
        incident_id: incidentId,
        workspace_id: workspaceId,
        created_at: escalatedAt,
      });
      await logToDatabase(
        "warn",
        "Operations",
        `Run ${id} escalated by ${userName}`,
        { runId: id, reason, incidentId },
      );
      res.json({
        success: true,
        message: "Run escalated",
        data: { run_id: id, incident_id: incidentId, escalated_at: escalatedAt },
      });
    } catch (err) {
      logger.error({ err }, "Failed to escalate run");
      next(err);
    }
  };

  export const holdRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "hold");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "hold");
      const impactScope = req.body?.impact_scope || "selected_run";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.holdRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "info",
        "Operations",
        `Agent run ${id} held by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, ...result, message: "Run held" });
    } catch (err) {
      logger.error({ err }, "Failed to hold run");
      next(err);
    }
  };

  export const releaseHoldRun = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "release_hold");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "release_hold");
      const impactScope = req.body?.impact_scope || "selected_run";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.releaseHoldRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "info",
        "Operations",
        `Agent run ${id} released from hold by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, ...result, message: "Run released from hold" });
    } catch (err) {
      logger.error({ err }, "Failed to release hold on run");
      next(err);
    }
  };

  export const restrictedMode = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "restricted_mode");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "restricted_mode");
      const impactScope = req.body?.impact_scope || "selected_run";
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await runService.restrictedModeRun(
        id,
        reason,
        userId,
        userName,
        impactScope,
      );
      await logToDatabase(
        "warn",
        "Operations",
        `Run ${id} entered restricted mode by ${userName}`,
        { runId: id, reason },
      );
      res.json({
        success: true,
        ...result,
        message: "Restricted mode activated",
      });
    } catch (err) {
      logger.error({ err }, "Failed to set restricted mode");
      next(err);
    }
  };

  export const listQueues = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      const queue_type = getQueryValue(req, "queue_type");
      const status = getQueryValue(req, "status");
      const scope = operationsScopeFilters(req);
      const limit = getQueryNumber(req, "limit", 50);
      const offset = getQueryNumber(req, "offset", 0);
      const result = await queueService.listQueues({
        workspace_id: workspaceId,
        queue_type: queue_type || "",
        status: status || "",
        environment: scope.environment || undefined,
        brand_id: scope.brand_id || undefined,
        brand_name: scope.brand_name || undefined,
        limit,
        offset,
      });
      res.json({ items: result.queues, total: result.total });
    } catch (err) {
      logger.error({ err }, "Failed to list queue items");
      next(err);
    }
  };

  export const assignQueueItem = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "manage_queue");
      const id = getParam(req, "id");
      const { assignee_id, assignee_name } = req.body;
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const result = await queueService.assignQueueItem(
        id,
        assignee_id || userId,
        assignee_name || userName,
        req.user?.is_superadmin ? null : req.user?.workspace_id,
        userId,
      );
      internalEventBus.emit("operations.event", {
        type: "queue.assigned",
        queue_id: id,
        workspace_id: req.user?.workspace_id,
        assignee_id: assignee_id || userId,
        created_at: new Date().toISOString(),
      });
      res.json({
        success: true,
        ...result,
        message: "Queue item assigned successfully",
      });
    } catch (err) {
      logger.error({ err }, "Failed to assign queue item");
      next(err);
    }
  };

  export const resolveQueueItem = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "manage_queue");
      const id = getParam(req, "id");
      const result = await queueService.resolveQueueItem(
        id,
        req.user?.is_superadmin ? null : req.user?.workspace_id,
        req.user?.id,
        typeof req.body?.resolution_notes === "string" ? req.body.resolution_notes : undefined,
      );
      internalEventBus.emit("operations.event", {
        type: "queue.resolved",
        queue_id: id,
        workspace_id: req.user?.workspace_id,
        created_at: new Date().toISOString(),
      });
      res.json({
        success: true,
        ...result,
        message: "Queue item resolved successfully",
      });
    } catch (err) {
      logger.error({ err }, "Failed to resolve queue item");
      next(err);
    }
  };

  export const createIncident = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "create_incident");
      const {
        run_id,
        severity,
        category,
        owner_id,
        owner_name,
        root_cause,
        remediation,
        due_at,
      } = req.body;
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      if (run_id) {
        const linkedRun = await runService.getAgentRun(run_id);
        assertWorkspaceScope(req.user, linkedRun.workspace_id);
      }
      const result = await incidentService.createIncident({
        workspace_id: workspaceId,
        run_id,
        severity,
        category,
        owner_id: owner_id || userId,
        owner_name: owner_name || userName,
        created_by: userId,
        created_by_name: userName,
        due_at,
        root_cause,
        remediation,
      });
      internalEventBus.emit("operations.event", {
        type: "incident.created",
        incident_id: result.id,
        run_id,
        workspace_id: workspaceId,
        severity,
        created_at: new Date().toISOString(),
      });
      await logToDatabase(
        "warn",
        "Operations",
        `Incident ${result.id} created by ${userName}`,
        { incidentId: result.id, runId: run_id, severity, category },
      );
      res.json({
        success: true,
        incident: {
          id: result.id,
          severity,
          category,
          run_id,
          created_by: userId,
          created_by_name: userName,
        },
      });
    } catch (err) {
      logger.error({ err }, "Failed to create incident");
      next(err);
    }
  };

  export const listIncidents = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      const status = getQueryValue(req, "status");
      const severity = getQueryValue(req, "severity");
      const category = getQueryValue(req, "category");
      const scope = operationsScopeFilters(req);
      const limit = getQueryNumber(req, "limit", 50);
      const offset = getQueryNumber(req, "offset", 0);
      const result = await incidentService.listIncidents({
        workspace_id: workspaceId,
        status: status || "",
        severity: severity || "",
        category: category || "",
        environment: scope.environment || undefined,
        brand_id: scope.brand_id || undefined,
        brand_name: scope.brand_name || undefined,
        limit,
        offset,
      });
      res.json({ incidents: result.incidents, total: result.total });
    } catch (err) {
      logger.error({ err }, "Failed to list incidents");
      next(err);
    }
  };

  export const resolveIncident = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "create_incident");
      const id = getParam(req, "id");
      const { remediation } = req.body;
      const userId = req.user?.id || "system";
      if (!req.user?.is_superadmin) {
        const existing = await incidentService.getIncident(id);
        assertWorkspaceScope(req.user, existing.workspace_id);
      }
      const result = await incidentService.resolveIncident(
        id,
        userId,
        remediation,
      );
      res.json({ success: true, ...result, message: "Incident resolved" });
    } catch (err) {
      logger.error({ err }, "Failed to resolve incident");
      next(err);
    }
  };

  export const generatePostmortem = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "create_incident");
      const id = getParam(req, "id");
      if (!req.user?.is_superadmin) {
        const existing = await incidentService.getIncident(id);
        assertWorkspaceScope(req.user, existing.workspace_id);
      }
      const userId = req.user?.id || "system";
      const result = await incidentService.generatePostmortem(id, userId);
      await runtimeControlService.recordRuntimeControlAction({
        run_id: result.postmortem.summary.run_id || id,
        action_type: 'postmortem_generated',
        requested_by: userId,
        reason: `Postmortem generated for incident ${id}`,
        impact_scope: 'incident_postmortem',
        result: 'completed',
      });
      internalEventBus.emit("operations.event", {
        type: "incident.postmortem_generated",
        incident_id: id,
        workspace_id: req.user?.workspace_id,
        created_at: new Date().toISOString(),
      });
      res.json({ success: true, ...result, message: "Postmortem generated" });
    } catch (err) {
      logger.error({ err }, "Failed to generate postmortem");
      next(err);
    }
  };

  export const getPostmortem = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const id = getParam(req, "id");
      if (!req.user?.is_superadmin) {
        const existing = await incidentService.getIncident(id);
        assertWorkspaceScope(req.user, existing.workspace_id);
      }
      const postmortem = await incidentService.getPostmortem(id);
      if (!postmortem) {
        return res.json({ postmortem: null, message: "No postmortem has been generated for this incident yet" });
      }
      res.json({ success: true, postmortem });
    } catch (err) {
      logger.error({ err }, "Failed to get postmortem");
      next(err);
    }
  };

  export const getOperationsStats = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      const stats = await analyticsService.getOperationsStats(workspaceId, operationsScopeFilters(req));
      res.json(stats);
    } catch (err) {
      logger.error({ err }, "Failed to get operations stats");
      next(err);
    }
  };

  export const getAnalyticsMetrics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      const metrics = await analyticsService.getAnalyticsMetrics(workspaceId, operationsScopeFilters(req));
      res.json(metrics);
    } catch (err) {
      logger.error({ err }, "Failed to get analytics metrics");
      next(err);
    }
  };

  export const exportAnalyticsCSV = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      const reason = requireReason(req.body?.reason, "export_evidence");
      const userName = req.user?.email || "Unknown";
      const csv = await analyticsService.getAnalyticsCSV(workspaceId, operationsScopeFilters(req));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="operations-analytics-${new Date().toISOString().slice(0, 10)}.csv"`);
      await logToDatabase(
        "info",
        "Operations",
        `Analytics CSV exported by ${userName}`,
        { reason, format: "csv" },
      );
      res.send(csv);
    } catch (err) {
      logger.error({ err }, "Failed to export analytics CSV");
      next(err);
    }
  };

  export const getRunEvidence = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const bundleId = getParam(req, "bundleId");
      const evidence = await evidenceService.getRunEvidence(bundleId);
      assertWorkspaceScope(req.user, evidence.workspace_id);
      res.json({ evidence });
    } catch (err) {
      logger.error({ err }, "Failed to get run evidence");
      next(err);
    }
  };

  export const exportEvidence = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "export_evidence");
      const bundleId = getParam(req, "bundleId");
      const reason = requireReason(req.body?.reason, "export_evidence");
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      const evidence = await evidenceService.getRunEvidence(bundleId);
      assertWorkspaceScope(req.user, evidence.workspace_id);
      const result = await evidenceService.exportEvidence({
        bundleId,
        exportedBy: userId,
        exportReason: reason,
      });
      internalEventBus.emit("operations.event", {
        type: "evidence.exported",
        evidence_bundle_id: bundleId,
        run_id: evidence.run_id,
        workspace_id: evidence.workspace_id,
        created_at: new Date().toISOString(),
      });
      await logToDatabase(
        "info",
        "Operations",
        `Evidence bundle ${bundleId} exported by ${userName}`,
        { bundleId, reason },
      );
      res.json({
        success: true,
        ...result,
        message: "Evidence exported successfully",
      });
    } catch (err) {
      logger.error({ err }, "Failed to export evidence");
      next(err);
    }
  };

  export const exportOutputSnapshot = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "export_evidence");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const reason = requireReason(req.body?.reason, "export_evidence");
      const userId = req.user?.id || "system";
      const userName = req.user?.email || "Unknown";
      internalEventBus.emit("operations.event", {
        type: "output.exported",
        run_id: id,
        workspace_id: run.workspace_id,
        reason,
        exported_by: userId,
        created_at: new Date().toISOString(),
      });
      await logToDatabase(
        "info",
        "Operations",
        `Output snapshot for run ${id} exported by ${userName}`,
        { runId: id, reason },
      );
      res.json({ success: true, message: "Output snapshot export recorded" });
    } catch (err) {
      logger.error({ err }, "Failed to export output snapshot");
      next(err);
    }
  };

  export const runPolicyCheck = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "run_policy_check");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const userId = req.user?.id || "system";
      const result = await policyService.runPolicyCheck(id);
      await runtimeControlService.recordRuntimeControlAction({
        run_id: id,
        action_type: "policy_check",
        requested_by: userId,
        reason: "Policy check triggered",
        result: result.summary,
      });
      res.json(result);
    } catch (err) {
      logger.error({ err }, "Failed to run policy check");
      next(err);
    }
  };

  export const getPolicyResults = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const results = await policyService.getPolicyResultsForRun(id);
      res.json({ policy_results: results });
    } catch (err) {
      logger.error({ err }, "Failed to get policy results");
      next(err);
    }
  };

  export const getRuntimeControlLog = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const id = getParam(req, "id");
      const run = await runService.getAgentRun(id);
      assertWorkspaceScope(req.user, run.workspace_id);
      const actions = await runtimeControlService.getRuntimeControlActions(id);
      res.json({ runtime_actions: actions });
    } catch (err) {
      logger.error({ err }, "Failed to get runtime control log");
      next(err);
    }
  };

  export const createEvidenceBundle = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "manage_queue");
      const { run_id } = req.body;
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      if (run_id) {
        const run = await runService.getAgentRun(run_id);
        assertWorkspaceScope(req.user, run.workspace_id);
      }
      const result = await evidenceService.createEvidenceBundle({
        workspace_id: workspaceId,
        run_id,
      });
      res.json(result);
    } catch (err) {
      logger.error({ err }, "Failed to create evidence bundle");
      next(err);
    }
  };

  export const lockEvidenceBundle = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "export_evidence");
      const bundleId = getParam(req, "bundleId");
      const evidence = await evidenceService.getRunEvidence(bundleId);
      assertWorkspaceScope(req.user, evidence.workspace_id);
      const result = await evidenceService.lockEvidenceBundle(bundleId);
      res.json({ success: true, ...result, message: "Evidence bundle locked" });
    } catch (err) {
      logger.error({ err }, "Failed to lock evidence bundle");
      next(err);
    }
  };

  export const listEvidenceBundles = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId)
        return res.status(403).json({ error: "Workspace not found" });
      const run_id = getQueryValue(req, "run_id");
      const status = getQueryValue(req, "status");
      const limit = getQueryNumber(req, "limit", 50);
      const offset = getQueryNumber(req, "offset", 0);
      const result = await evidenceService.listEvidenceBundles({
        workspace_id: workspaceId,
        run_id: run_id || "",
        status: status || "",
        limit,
        offset,
      });
      res.json({ bundles: result.bundles, total: result.total });
    } catch (err) {
      logger.error({ err }, "Failed to list evidence bundles");
      next(err);
    }
  };

  export const subscribeOperationsEvents = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertOperationsPermission(req.user, "view");
      const workspaceId = req.user?.workspace_id;
      if (!workspaceId) {
        return res.status(403).json({ error: "Workspace not found" });
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.write(`event: connected\ndata: ${JSON.stringify({ workspace_id: workspaceId, connected_at: new Date().toISOString() })}\n\n`);

      const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
      }, 25000);

      const handler = (payload: unknown) => {
        const event = payload as { workspace_id?: string };
        if (req.user?.is_superadmin || event.workspace_id === workspaceId) {
          res.write(`event: operations\ndata: ${JSON.stringify(payload)}\n\n`);
        }
      };

      internalEventBus.on("operations.event", handler);
      req.on("close", () => {
        clearInterval(heartbeat);
        internalEventBus.off("operations.event", handler);
        res.end();
      });
    } catch (err) {
      next(err);
    }
  };
