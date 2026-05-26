/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';
import * as templateService from '../../services/workflowTemplate.service';
import * as versionService from '../../services/workflowVersion.service';
import * as runtimeService from '../../services/workflowRuntime.service';
import * as approvalService from '../../services/workflowApproval.service';
import * as simulationService from '../../services/workflowSimulation.service';
import * as analyticsService from '../../services/workflowAnalytics.service';
import * as evidenceService from '../../services/workflowEvidence.service';
import * as dependencyService from '../../services/workflowDependency.service';
import * as builderService from '../../services/workflowBuilder.service';
import { getParam, getQueryNumber, getQueryValue } from '../../shared/request';
import { executeInstance } from '../../modules/workflow-engine/executor';

function normalizeWorkflowGraph(steps: any[], edges: any[]) {
  const columnWidth = 170;
  const startX = 120;
  const centerY = 210;

  return {
    nodes: (steps || []).map((step: any, index: number) => ({
      id: step.id,
      type: step.step_type || 'action',
      label: step.name || step.step_type || `Step ${index + 1}`,
      x: startX + index * columnWidth,
      y: centerY,
    })),
    edges: (edges || []).map((edge: any) => ({
      id: edge.id,
      source: edge.from_step_id,
      target: edge.to_step_id,
      label: edge.branch_label || edge.condition || undefined,
    })),
  };
}

// ─── helper: extract a human-readable message from any thrown value ───────────
function extractErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  const e = err as any;
  // Supabase / Postgres error shapes
  if (e?.message) return e.message;
  if (e?.details) return e.details;
  if (e?.hint)    return e.hint;
  return String(err);
}

export const listWorkflows = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const status     = getQueryValue(req, 'status');
    const risk_level = getQueryValue(req, 'risk_level');
    const type       = getQueryValue(req, 'type');
    const owner_id   = getQueryValue(req, 'owner_id');
    const search     = getQueryValue(req, 'search');
    const limit      = getQueryNumber(req, 'limit', 50);
    const offset     = getQueryNumber(req, 'offset', 0);
    const result = await templateService.listTemplates({
      workspace_id: workspaceId,
      status,
      risk_level,
      type,
      owner_id,
      search,
      limit,
      offset,
    });
    res.json({ success: true, data: result.templates, total: result.total });
  } catch (err) {
    logger.error({ err }, 'Failed to list workflows');
    next(err);
  }
};

export const getWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const template = await templateService.getTemplate(id);
    res.json({ success: true, data: template });
  } catch (err) {
    logger.error({ err }, 'Failed to get workflow');
    next(err);
  }
};

export const createWorkflow = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId      = req.user?.id;
    const userName    = req.user?.email || 'Unknown';

    if (!workspaceId) {
      return res.status(403).json({ success: false, error: 'Workspace not found' });
    }

    const { name, description, risk_level, brand_ids, platforms, type } = req.body;

    // ── FIX: validate required fields and return 400 instead of letting
    //    Supabase throw a not-null / check-constraint error that surfaces as 500.
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Workflow name is required and must be at least 3 characters.',
      });
    }

    const result = await templateService.createTemplate({
      workspace_id: workspaceId,
      name:         name.trim(),
      description:  description?.trim() || undefined,
      risk_level:   risk_level || 'medium',
      owner_id:     userId || 'system',
      owner_name:   userName,
      brand_ids:    Array.isArray(brand_ids) ? brand_ids : [],
      platforms:    Array.isArray(platforms) ? platforms : [],
      type:         type || 'governed',
    });

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to create workflow');
    // ── FIX: return a structured 500 with the real message instead of
    //    letting the generic error handler emit an opaque 500 body.
    res.status(500).json({ success: false, error: extractErrorMessage(err) });
  }
};

export const updateWorkflow = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { name, description, risk_level, owner_id, owner_name, brand_ids, platforms } = req.body;
    const result = await templateService.updateTemplate(id, { name, description, risk_level, owner_id, owner_name, brand_ids, platforms });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to update workflow');
    const statusCode = (err as any)?.statusCode || 500;
    res.status(statusCode).json({ success: false, error: extractErrorMessage(err) });
  }
};

export const duplicateWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { name } = req.body;
    const result = await templateService.duplicateTemplate(id, name);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to duplicate workflow');
    next(err);
  }
};

export const deleteWorkflow = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    await templateService.deleteDraftTemplate(id);
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (err) {
    logger.error({ err }, 'Failed to delete workflow');
    const statusCode = (err as any)?.statusCode || 500;
    res.status(statusCode).json({ success: false, error: extractErrorMessage(err) });
  }
};

export const listVersions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const versions = await versionService.listVersions(id);
    res.json({ success: true, data: versions });
  } catch (err) {
    logger.error({ err }, 'Failed to list versions');
    next(err);
  }
};

export const createDraftVersion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { change_summary, change_reason } = req.body;
    const userId = req.user?.id || 'system';
    const result = await versionService.createDraftVersion(id, change_summary, change_reason, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to create draft version');
    next(err);
  }
};

export const submitForApproval = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const versionId = getParam(req, 'versionId');
    const result = await versionService.submitForApproval(versionId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to submit for approval');
    const statusCode = (err as any)?.statusCode || 500;
    res.status(statusCode).json({ success: false, error: extractErrorMessage(err) });
  }
};

export const approveVersion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versionId = getParam(req, 'versionId');
    const userId = req.user?.id || 'system';
    const result = await versionService.approveVersion(versionId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to approve version');
    next(err);
  }
};

export const rejectVersion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versionId = getParam(req, 'versionId');
    const { reason } = req.body;
    const result = await versionService.rejectVersion(versionId, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to reject version');
    next(err);
  }
};

export const activateVersion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versionId = getParam(req, 'versionId');
    const userId = req.user?.id || 'system';
    const result = await versionService.activateVersion(versionId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to activate version');
    next(err);
  }
};

export const rollbackVersion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const { target_version_id, reason } = req.body;
    const userId = req.user?.id || 'system';
    const result = await versionService.rollbackVersion(id, target_version_id, reason, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to rollback version');
    next(err);
  }
};

export const pauseWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const result = await versionService.pauseVersion(id);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to pause workflow');
    next(err);
  }
};

export const retireWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const result = await versionService.retireVersion(id);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to retire workflow');
    next(err);
  }
};

export const getWorkflowGraphGeneral = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: versions, error: verErr } = await (await import('../../shared/supabase')).supabaseAdmin
      .from('workflow_versions')
      .select('id, workflow_id')
      .order('created_at', { ascending: false })
      .limit(1);
    if (verErr) {
      if ((verErr as any).code === '42P01') return res.json({ success: true, data: { nodes: [], edges: [] } });
      throw verErr;
    }
    if (!versions || versions.length === 0) {
      return res.json({ success: true, data: { nodes: [], edges: [] } });
    }
    const latestVersionId = versions[0].id;
    const [stepsResult, edgesResult] = await Promise.all([
      (await import('../../shared/supabase')).supabaseAdmin.from('workflow_steps').select('*').eq('version_id', latestVersionId).order('sequence', { ascending: true }),
      (await import('../../shared/supabase')).supabaseAdmin.from('workflow_edges').select('*').eq('version_id', latestVersionId),
    ]);
    if (stepsResult.error) throw stepsResult.error;
    if (edgesResult.error) throw edgesResult.error;
    res.json({ success: true, data: normalizeWorkflowGraph(stepsResult.data || [], edgesResult.data || []) });
  } catch (err) {
    const _logger = (await import('../../shared/logger')).logger;
    _logger.error({ err }, 'Failed to get general workflow graph');
    next(err);
  }
};

export const getWorkflowGraph = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versionId = getParam(req, 'versionId');
    const [stepsResult, edgesResult] = await Promise.all([
      import('../../shared/supabase').then((m) => m.supabaseAdmin.from('workflow_steps').select('*').eq('version_id', versionId).order('sequence', { ascending: true })),
      import('../../shared/supabase').then((m) => m.supabaseAdmin.from('workflow_edges').select('*').eq('version_id', versionId)),
    ]);
    if (stepsResult.error) throw stepsResult.error;
    if (edgesResult.error) throw edgesResult.error;
    res.json({ success: true, data: normalizeWorkflowGraph(stepsResult.data || [], edgesResult.data || []) });
  } catch (err) {
    logger.error({ err }, 'Failed to get workflow graph');
    next(err);
  }
};

export const validateReadiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versionId = getParam(req, 'versionId');
    const result = await builderService.validateWorkflowReadiness(versionId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to validate readiness');
    next(err);
  }
};

export const getActiveOrchestrations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const result = await runtimeService.listInstances({
      workspace_id: workspaceId,
      status: getQueryValue(req, 'status'),
      limit: getQueryNumber(req, 'limit', 50),
      offset: getQueryNumber(req, 'offset', 0),
    });
    res.json({ success: true, data: result.instances });
  } catch (err) {
    logger.error({ err }, 'Failed to get active orchestrations');
    next(err);
  }
};

export const getWorkflowStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const m  = await analyticsService.getWorkflowAnalytics(workspaceId);
    const cs = await analyticsService.getControlStripData(workspaceId);
    res.json({
      success: true,
      data: {
        completionRate:       m.completion_rate,
        avgHandoffDelay:      '—',
        escalationRate:       0,
        activeOrchestrations: m.active_runs,
        blockedRunRate:       m.blocked_run_rate,
        slaBreachRate:        m.sla_breach_rate,
        policyFailureRate:    m.failure_rate,
        evidenceComplete:     m.evidence_completeness,
        avgApprovalTime:      '—',
        overrideRate:         0,
        activeWorkflows:      cs.activeWorkflows,
        pendingApprovals:     cs.pendingApprovals + m.pending_approvals,
        blockedRuns:          cs.blockedRuns,
        failedRuns:           cs.failedRuns,
        slaBreach:            cs.slaBreach,
        staleDependencies:    cs.staleDependencies,
        criticalRiskItems:    cs.criticalRiskItems,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get workflow stats');
    next(err);
  }
};

export const getWorkflowAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const metrics = await analyticsService.getWorkflowAnalytics(workspaceId);
    res.json({ success: true, data: metrics });
  } catch (err) {
    logger.error({ err }, 'Failed to get analytics');
    next(err);
  }
};

export const getControlStrip = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const data = await analyticsService.getControlStripData(workspaceId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err }, 'Failed to get control strip data');
    next(err);
  }
};

export const getEscalationPaths = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const { data: incidents, error } = await import('../../shared/supabase').then((m) =>
      m.supabaseAdmin.from('incidents').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(10)
    );
    if (error) {
      if ((error as any).code === '42P01') return res.json({ success: true, data: [] });
      throw error;
    }
    res.json({ success: true, data: incidents || [] });
  } catch (err) {
    logger.error({ err }, 'Failed to get escalation paths');
    next(err);
  }
};

export const startWorkflowInstance = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { workflow_id, version_id, trigger_type, trigger_source, priority } = req.body;

    // ── FIX: guard required fields so missing IDs don't crash the service layer.
    if (!workflow_id) {
      return res.status(400).json({ success: false, error: 'workflow_id is required' });
    }

    const userId = req.user?.id || 'system';
    const result = await runtimeService.startInstance(workflow_id, version_id, userId, trigger_type, trigger_source, priority);

    // ── NEW: kick off the executor synchronously. The executor will
    //    pause on approval gates / blocks and return; subsequent calls
    //    via /execute resume from the next pending step. We swallow
    //    executor errors here so startInstance always returns the row
    //    that was created — operations page will surface the failure
    //    via the step_runs and instance.status.
    const triggerInput = req.body?.trigger_input;
    const newInstanceId = (result as { id?: string }).id;
    if (newInstanceId) {
      try {
        const execResult = await executeInstance(newInstanceId, triggerInput);
        res.json({ success: true, data: result, execution: execResult });
        return;
      } catch (execErr) {
        logger.error({ execErr, instanceId: newInstanceId }, 'Executor invocation failed after startInstance');
        res.json({ success: true, data: result, executionError: extractErrorMessage(execErr) });
        return;
      }
    }
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to start workflow instance');
    res.status(500).json({ success: false, error: extractErrorMessage(err) });
  }
};

// ── NEW: resume / re-run an instance (e.g. after an approval was given).
//    Idempotent — handlers know how to skip steps that already completed.
export const executeWorkflowInstance = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const instanceId = getParam(req, 'instanceId');
    if (!instanceId) {
      return res.status(400).json({ success: false, error: 'instanceId is required' });
    }
    const triggerInput = req.body?.trigger_input;
    const result = await executeInstance(instanceId, triggerInput);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to execute workflow instance');
    res.status(500).json({ success: false, error: extractErrorMessage(err) });
  }
};

export const listInstances = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const workflow_id = getQueryValue(req, 'workflow_id');
    const status      = getQueryValue(req, 'status');
    const limit       = getQueryNumber(req, 'limit', 50);
    const offset      = getQueryNumber(req, 'offset', 0);
    const result = await runtimeService.listInstances({
      workspace_id: workspaceId,
      workflow_id,
      status,
      limit,
      offset,
    });
    res.json({ success: true, data: result.instances, total: result.total });
  } catch (err) {
    logger.error({ err }, 'Failed to list instances');
    next(err);
  }
};

export const getInstance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instanceId = getParam(req, 'instanceId');
    const instance = await runtimeService.getInstance(instanceId);
    res.json({ success: true, data: instance });
  } catch (err) {
    logger.error({ err }, 'Failed to get instance');
    next(err);
  }
};

export const transitionInstance = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const instanceId = getParam(req, 'instanceId');
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required for transition' });
    }

    const result = await runtimeService.transitionInstance(instanceId, status, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to transition instance');
    res.status(500).json({ success: false, error: extractErrorMessage(err) });
  }
};

export const getInstanceStepRuns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instanceId = getParam(req, 'instanceId');
    const stepRuns = await runtimeService.getStepRuns(instanceId);
    res.json({ success: true, data: stepRuns });
  } catch (err) {
    logger.error({ err }, 'Failed to get step runs');
    next(err);
  }
};

export const getApprovals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const required_role = getQueryValue(req, 'required_role');
    const limit         = getQueryNumber(req, 'limit', 50);
    const offset        = getQueryNumber(req, 'offset', 0);
    const result = await approvalService.listPendingApprovals({
      workspace_id: workspaceId,
      required_role: required_role || '',
      limit,
      offset,
    });
    res.json({ success: true, data: result.approvals, total: result.total });
  } catch (err) {
    logger.error({ err }, 'Failed to get approvals');
    next(err);
  }
};

export const recordApproval = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const approvalId = getParam(req, 'approvalId');
    const { decision, decision_reason, edited_output_ref, requested_changes } = req.body;

    if (!decision) {
      return res.status(400).json({ success: false, error: 'decision is required (approve | reject | request_changes)' });
    }

    const userId   = req.user?.id || 'system';
    const userName = req.user?.email || 'Unknown';
    const result = await approvalService.recordDecision({
      approvalId,
      approverId:       userId,
      approverName:     userName,
      decision,
      decisionReason:   decision_reason,
      editedOutputRef:  edited_output_ref,
      requestedChanges: requested_changes,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to record approval');
    res.status(500).json({ success: false, error: extractErrorMessage(err) });
  }
};

export const getApprovalStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const stats = await approvalService.getApprovalStats(workspaceId);
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error({ err }, 'Failed to get approval stats');
    next(err);
  }
};

export const runSimulation = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const versionId = getParam(req, 'versionId');
    const { scenario_name, sample_input_ref } = req.body;
    const userId = req.user?.id || 'system';
    const result = await simulationService.runSimulation({
      workflow_version_id: versionId,
      scenario_name,
      sample_input_ref,
      created_by: userId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to run simulation');
    res.status(500).json({ success: false, error: extractErrorMessage(err) });
  }
};

export const listSimulations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versionId = getParam(req, 'versionId');
    const simulations = await simulationService.listSimulations(versionId);
    res.json({ success: true, data: simulations });
  } catch (err) {
    logger.error({ err }, 'Failed to list simulations');
    next(err);
  }
};

export const getDependencies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req, 'id');
    const deps = await dependencyService.checkWorkflowDependencies(id);
    res.json({ success: true, data: deps });
  } catch (err) {
    logger.error({ err }, 'Failed to get dependencies');
    next(err);
  }
};

export const getWorkflowEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instanceId = getParam(req, 'instanceId');
    const bundle = await evidenceService.getWorkflowEvidence(instanceId);
    res.json({ success: true, data: bundle });
  } catch (err) {
    logger.error({ err }, 'Failed to get workflow evidence');
    next(err);
  }
};

export const createEvidence = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace not found' });
    const { instance_id } = req.body;

    if (!instance_id) {
      return res.status(400).json({ success: false, error: 'instance_id is required' });
    }

    const result = await evidenceService.createEvidenceBundle({ workspace_id: workspaceId, instance_id });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Failed to create evidence');
    res.status(500).json({ success: false, error: extractErrorMessage(err) });
  }
};