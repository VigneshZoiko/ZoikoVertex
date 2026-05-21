import { Response, NextFunction } from 'express';
import { logger } from '../../shared/logger';
import { logToDatabase } from '../../shared/databaseLogger';
import { AuthRequest } from '../../shared/authMiddleware';
import * as runService from '../../services/operationsRun.service';
import * as queueService from '../../services/operationsQueue.service';
import * as policyService from '../../services/operationsPolicy.service';
import * as analyticsService from '../../services/operationsAnalytics.service';
import * as incidentService from '../../services/operationsIncident.service';
import * as evidenceService from '../../services/operationsEvidence.service';
import * as runtimeControlService from '../../services/operationsRuntimeControl.service';
import { getParam, getQueryNumber, getQueryValue } from '../../shared/request';

const STATUS_MAP: Record<string, { label: string; color: string; severity: string }> = {
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-400', severity: 'normal' },
  QUEUED: { label: 'Queued', color: 'text-amber-400', severity: 'attention' },
  RUNNING: { label: 'Running', color: 'text-emerald-400', severity: 'normal' },
  WAITING_HUMAN_REVIEW: { label: 'Waiting Review', color: 'text-purple-400', severity: 'warning' },
  POLICY_BLOCKED: { label: 'Policy Blocked', color: 'text-rose-400', severity: 'critical' },
  FAILED: { label: 'Failed', color: 'text-red-400', severity: 'critical' },
  PAUSED: { label: 'Paused', color: 'text-orange-400', severity: 'warning' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-400', severity: 'normal' },
  QUARANTINED: { label: 'Quarantined', color: 'text-rose-400', severity: 'critical' },
};

function withStatusMeta(run: any) {
  return { ...run, status_config: STATUS_MAP[run.status] || { label: run.status, color: 'text-gray-400', severity: 'normal' } };
}

export const listAgentRuns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const status = getQueryValue(req, 'status');
    const agent_id = getQueryValue(req, 'agent_id');
    const environment = getQueryValue(req, 'environment');
    const severity = getQueryValue(req, 'severity');
    const search = getQueryValue(req, 'search');
    const limit = getQueryNumber(req, 'limit', 50);
    const offset = getQueryNumber(req, 'offset', 0);
    const result = await runService.listAgentRuns({
      workspace_id: workspaceId,
      status,
      agent_id,
      environment,
      severity,
      search,
      limit,
      offset,
    });
    res.json({ runs: result.runs.map(withStatusMeta), total: result.total, limit, offset });
  } catch (err) {
    logger.error({ err }, 'Failed to list agent runs');
    next(err);
  }
};

export const getAgentRun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const workspaceId = req.user?.workspace_id;
    const run = await runService.getAgentRun(id);
    if (!run) return res.status(404).json({ error: 'Agent run not found' });
    const [policyResults, timeline, evidenceBundles] = await Promise.all([
      policyService.getPolicyResultsForRun(id).catch(() => []),
      runService.getRunTimeline(id).catch(() => []),
      workspaceId
        ? evidenceService.listEvidenceBundles({ workspace_id: workspaceId, run_id: id, limit: 1, offset: 0 }).catch(() => ({ bundles: [] as any[] }))
        : Promise.resolve({ bundles: [] as any[] }),
    ]);

    const approvalChain = timeline
      .filter((event: any) => String(event.event_type || '').includes('approval') || String(event.event_type || '').includes('review'))
      .map((event: any) => ({
        actor: event.actor_name || event.actor_id || 'Unknown',
        action: event.event_type,
        timestamp: event.created_at,
        reason: event.reason || undefined,
      }));

    res.json({
      run: withStatusMeta(run),
      prompt_version: run.agent_version || undefined,
      knowledge_sources: [],
      policy_results: policyResults,
      output_snapshot: undefined,
      approval_chain: approvalChain,
      evidence_bundle: evidenceBundles.bundles?.[0] || undefined,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get agent run');
    next(err);
  }
};

export const getRunTimeline = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const events = await runService.getRunTimeline(id);
    res.json({ events });
  } catch (err) {
    logger.error({ err }, 'Failed to get run timeline');
    next(err);
  }
};

export const pauseRun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await runService.pauseRun(id, reason || 'Manual pause', userId, userName);
    await runtimeControlService.recordRuntimeControlAction({
      run_id: id, action_type: 'pause', requested_by: userId, reason: reason || 'Manual pause', result: 'completed',
    });
    await logToDatabase('info', 'Operations', `Agent run ${id} paused by ${userName}`, { runId: id, reason });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to pause run');
    next(err);
  }
};

export const resumeRun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await runService.resumeRun(id, reason || 'Manual resume', userId, userName);
    await runtimeControlService.recordRuntimeControlAction({
      run_id: id, action_type: 'resume', requested_by: userId, reason: reason || 'Manual resume', result: 'completed',
    });
    await logToDatabase('info', 'Operations', `Agent run ${id} resumed by ${userName}`, { runId: id });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to resume run');
    next(err);
  }
};

export const stopRun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await runService.stopRun(id, reason || 'Manual stop', userId, userName);
    await runtimeControlService.recordRuntimeControlAction({
      run_id: id, action_type: 'stop', requested_by: userId, reason: reason || 'Manual stop', result: 'completed',
    });
    await logToDatabase('warn', 'Operations', `Agent run ${id} stopped by ${userName}`, { runId: id, reason });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to stop run');
    next(err);
  }
};

export const retryRun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await runService.retryRun(id, reason || 'Manual retry', userId, userName);
    await logToDatabase('info', 'Operations', `Agent run ${id} retry created as ${result.new_run_id}`, { originalRunId: id, newRunId: result.new_run_id });
    res.json({ success: true, ...result, message: 'Retry run created successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to retry run');
    next(err);
  }
};

export const quarantineRun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await runService.quarantineRun(id, reason || 'Safety concern', userId, userName);
    await runtimeControlService.recordRuntimeControlAction({
      run_id: id, action_type: 'quarantine', requested_by: userId, reason: reason || 'Safety concern', result: 'completed',
    });
    await logToDatabase('warn', 'Operations', `Agent run ${id} quarantined by ${userName}`, { runId: id, reason });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Failed to quarantine run');
    next(err);
  }
};

export const emergencyPause = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await runService.emergencyPauseRun(id, reason || 'Emergency pause', userId, userName);
    await runtimeControlService.recordRuntimeControlAction({
      run_id: id, action_type: 'emergency_pause', requested_by: userId, reason: `[EMERGENCY] ${reason || 'No reason provided'}`, result: 'completed',
    });
    await logToDatabase('warn', 'Operations', `[EMERGENCY PAUSE] Run ${id} paused by ${userName}`, { runId: id, reason });
    res.json({ success: true, ...result, message: 'Emergency pause applied' });
  } catch (err) {
    logger.error({ err }, 'Failed to emergency pause');
    next(err);
  }
};

export const escalateRun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const incidentId = req.body?.incident_id;
    await runtimeControlService.recordRuntimeControlAction({
      run_id: id, action_type: 'escalate', requested_by: userId, reason: reason || 'Escalated', result: 'completed',
    });
    await logToDatabase('warn', 'Operations', `Run ${id} escalated by ${userName}`, { runId: id, reason, incidentId });
    res.json({ success: true, message: 'Run escalated', data: { run_id: id, escalated_at: new Date().toISOString() } });
  } catch (err) {
    logger.error({ err }, 'Failed to escalate run');
    next(err);
  }
};

export const restrictedMode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await runService.restrictedModeRun(id, reason || 'Restricted mode activated', userId, userName);
    await runtimeControlService.recordRuntimeControlAction({
      run_id: id, action_type: 'restricted_mode', requested_by: userId, reason: reason || 'Restricted mode', result: 'completed',
    });
    await logToDatabase('warn', 'Operations', `Run ${id} entered restricted mode by ${userName}`, { runId: id, reason });
    res.json({ success: true, ...result, message: 'Restricted mode activated' });
  } catch (err) {
    logger.error({ err }, 'Failed to set restricted mode');
    next(err);
  }
};

export const listQueues = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const queue_type = getQueryValue(req, 'queue_type');
    const status = getQueryValue(req, 'status');
    const limit = getQueryNumber(req, 'limit', 50);
    const offset = getQueryNumber(req, 'offset', 0);
    const result = await queueService.listQueues({
      workspace_id: workspaceId,
      queue_type: queue_type || '',
      status: status || '',
      limit,
      offset,
    });
    res.json({ items: result.queues, total: result.total });
  } catch (err) {
    logger.error({ err }, 'Failed to list queue items');
    next(err);
  }
};

export const assignQueueItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { assignee_id, assignee_name } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await queueService.assignQueueItem(id, assignee_id || userId, assignee_name || userName);
    res.json({ success: true, ...result, message: 'Queue item assigned successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to assign queue item');
    next(err);
  }
};

export const createIncident = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { run_id, severity, category, owner_id, owner_name, root_cause, due_at } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
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
    });
    await logToDatabase('warn', 'Operations', `Incident ${result.id} created by ${userName}`, { incidentId: result.id, runId: run_id, severity, category });
    res.json({ success: true, incident: { id: result.id, severity, category, run_id, created_by: userId, created_by_name: userName } });
  } catch (err) {
    logger.error({ err }, 'Failed to create incident');
    next(err);
  }
};

export const listIncidents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const status = getQueryValue(req, 'status');
    const severity = getQueryValue(req, 'severity');
    const category = getQueryValue(req, 'category');
    const limit = getQueryNumber(req, 'limit', 50);
    const offset = getQueryNumber(req, 'offset', 0);
    const result = await incidentService.listIncidents({
      workspace_id: workspaceId,
      status: status || '',
      severity: severity || '',
      category: category || '',
      limit,
      offset,
    });
    res.json({ incidents: result.incidents, total: result.total });
  } catch (err) {
    logger.error({ err }, 'Failed to list incidents');
    next(err);
  }
};

export const resolveIncident = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { remediation } = req.body;
    const userId = req.user?.id || 'system';
    const result = await incidentService.resolveIncident(id, userId, remediation);
    res.json({ success: true, ...result, message: 'Incident resolved' });
  } catch (err) {
    logger.error({ err }, 'Failed to resolve incident');
    next(err);
  }
};

export const getOperationsStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const stats = await analyticsService.getOperationsStats(workspaceId);
    res.json(stats);
  } catch (err) {
    logger.error({ err }, 'Failed to get operations stats');
    next(err);
  }
};

export const getAnalyticsMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const metrics = await analyticsService.getAnalyticsMetrics(workspaceId);
    res.json(metrics);
  } catch (err) {
    logger.error({ err }, 'Failed to get analytics metrics');
    next(err);
  }
};

export const getRunEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bundleId = getParam(req, 'bundleId');
    const evidence = await evidenceService.getRunEvidence(bundleId);
    res.json({ evidence });
  } catch (err) {
    logger.error({ err }, 'Failed to get run evidence');
    next(err);
  }
};

export const exportEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bundleId = getParam(req, 'bundleId');
    const { reason } = req.body;
    const userId = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await evidenceService.exportEvidence({
      bundleId,
      exportedBy: userId,
      exportReason: reason || 'Manual export',
    });
    await logToDatabase('info', 'Operations', `Evidence bundle ${bundleId} exported by ${userName}`, { bundleId, reason });
    res.json({ success: true, ...result, message: 'Evidence exported successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to export evidence');
    next(err);
  }
};

export const runPolicyCheck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const userId = req.user?.id || 'system';
    const result = await policyService.runPolicyCheck(id);
    await runtimeControlService.recordRuntimeControlAction({
      run_id: id, action_type: 'policy_check', requested_by: userId, reason: 'Policy check triggered', result: result.summary,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to run policy check');
    next(err);
  }
};

export const getPolicyResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const results = await policyService.getPolicyResultsForRun(id);
    res.json({ policy_results: results });
  } catch (err) {
    logger.error({ err }, 'Failed to get policy results');
    next(err);
  }
};

export const getRuntimeControlLog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const actions = await runtimeControlService.getRuntimeControlActions(id);
    res.json({ runtime_actions: actions });
  } catch (err) {
    logger.error({ err }, 'Failed to get runtime control log');
    next(err);
  }
};

export const createEvidenceBundle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { run_id } = req.body;
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const result = await evidenceService.createEvidenceBundle({ workspace_id: workspaceId, run_id });
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to create evidence bundle');
    next(err);
  }
};

export const lockEvidenceBundle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bundleId = getParam(req, 'bundleId');
    const result = await evidenceService.lockEvidenceBundle(bundleId);
    res.json({ success: true, ...result, message: 'Evidence bundle locked' });
  } catch (err) {
    logger.error({ err }, 'Failed to lock evidence bundle');
    next(err);
  }
};

export const listEvidenceBundles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const run_id = getQueryValue(req, 'run_id');
    const status = getQueryValue(req, 'status');
    const limit = getQueryNumber(req, 'limit', 50);
    const offset = getQueryNumber(req, 'offset', 0);
    const result = await evidenceService.listEvidenceBundles({
      workspace_id: workspaceId,
      run_id: run_id || '',
      status: status || '',
      limit,
      offset,
    });
    res.json({ bundles: result.bundles, total: result.total });
  } catch (err) {
    logger.error({ err }, 'Failed to list evidence bundles');
    next(err);
  }
};
