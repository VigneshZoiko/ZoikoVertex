import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import * as rulesService from '../../services/approvalRules.service';
import { DEFAULT_TENANT_ID } from '../../shared/constants';

function getTenantId(req: AuthRequest): string {
  return req.user?.workspace_id || DEFAULT_TENANT_ID;
}

function getUserId(req: AuthRequest): string {
  return req.user?.id || DEFAULT_TENANT_ID;
}

export const listRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const statusStr = req.query.rule_status as string;
    const result = await rulesService.listRules({
      tenant_id: getTenantId(req),
      status: statusStr ? statusStr.split(',') : undefined,
      risk_classification: req.query.risk_classification as string,
      search: req.query.search as string,
      limit: parseInt(req.query.limit as string) || undefined,
      offset: parseInt(req.query.offset as string) || undefined,
    });
    res.json({ success: true, data: result.rules, total: result.total });
  } catch (error) { next(error); }
};

export const createRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = getTenantId(req);
    const rule = await rulesService.createRule({
      tenant_id,
      workspace_id: tenant_id,
      rule_name: req.body.rule_name,
      rule_description: req.body.rule_description || '',
      rule_owner_id: req.body.rule_owner_id || getUserId(req),
      rule_priority: req.body.rule_priority || 1000,
      risk_classification: req.body.risk_classification || 'LOW',
      tags: req.body.tags || [],
      created_by: getUserId(req),
    });
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const getRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const rule = await rulesService.getRule(id, getTenantId(req));
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const [scopes, path, versions] = await Promise.all([
      rulesService.getRuleScope(id).catch(() => null),
      rulesService.getRulePath(id).catch(() => null),
      rulesService.getRuleVersions(id).catch(() => null),
    ]);
    const details = await rulesService.getRuleDetails(id).catch(() => null);
    res.json({ success: true, data: { ...rule, scopes, path, versions, ...(details || {}) } });
  } catch (error) { next(error); }
};

export const updateRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await rulesService.updateRule({
      id: req.params.id as string,
      tenant_id: getTenantId(req),
      updated_by: getUserId(req),
      ...req.body,
    });
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const submitRuleForReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await rulesService.submitRuleForReview(req.params.id as string, getTenantId(req), getUserId(req));
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const publishRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { publish_note } = req.body;
    const rule = await rulesService.publishRule(req.params.id as string, getTenantId(req), getUserId(req), publish_note);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const deactivateRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await rulesService.deactivateRule(req.params.id as string, getTenantId(req), getUserId(req));
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const reactivateRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await rulesService.reactivateRule(req.params.id as string, getTenantId(req), getUserId(req));
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const archiveRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await rulesService.archiveRule(req.params.id as string, getTenantId(req), getUserId(req));
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const cloneRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await rulesService.cloneRule(req.params.id as string, getTenantId(req), getTenantId(req), getUserId(req));
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const getRuleScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = await rulesService.getRuleScope(req.params.id as string);
    res.json({ success: true, data: scope });
  } catch (error) { next(error); }
};

export const upsertRuleScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = await rulesService.upsertRuleScope({
      approval_rule_id: req.params.id as string,
      tenant_id: getTenantId(req),
      workspace_id: getTenantId(req),
      ...req.body,
    });
    res.json({ success: true, data: scope });
  } catch (error) { next(error); }
};

export const getRulePath = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const path = await rulesService.getRulePath(req.params.id as string);
    res.json({ success: true, data: path });
  } catch (error) { next(error); }
};

export const upsertRulePath = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const path = await rulesService.upsertRulePath({ ...req.body, approval_rule_id: req.params.id as string });
    res.json({ success: true, data: path });
  } catch (error) { next(error); }
};

export const getRuleVersions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versions = await rulesService.getRuleVersions(req.params.id as string);
    res.json({ success: true, data: versions });
  } catch (error) { next(error); }
};

export const getRuleAuditLog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await rulesService.getRuleAuditLog(req.params.id as string);
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
};

export const getRuleConflicts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conflicts = await rulesService.getRuleConflicts(req.params.id as string);
    res.json({ success: true, data: conflicts });
  } catch (error) { next(error); }
};

export const detectRuleConflicts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await rulesService.detectRuleConflicts(req.params.id as string, getTenantId(req));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const resolveRuleConflict = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await rulesService.resolveConflict(req.params.conflictId as string, getUserId(req));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const runRuleSimulation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await rulesService.runSimulation({
      approval_rule_id: req.params.id as string,
      simulated_by: getUserId(req),
      simulation_input: req.body,
    });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getRuleStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await rulesService.getRuleStats(getTenantId(req));
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
};

export const getRuleDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const details = await rulesService.getRuleDetails(req.params.id as string);
    res.json({ success: true, data: details });
  } catch (error) { next(error); }
};

export const getRuleStagesHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const path = await rulesService.getRulePath(req.params.id as string);
    if (!path) return res.json({ success: true, data: [] });
    const stages = await rulesService.getRuleStages((path as { id: string }).id);
    res.json({ success: true, data: stages });
  } catch (error) { next(error); }
};

export const getRuleEscalationsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const escalations = await rulesService.getRuleEscalations(req.params.id as string);
    res.json({ success: true, data: escalations });
  } catch (error) { next(error); }
};

export const markRuleReadyToPublish = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await rulesService.markRuleReadyToPublish(req.params.id as string, getTenantId(req), getUserId(req));
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const markRuleInvalid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await rulesService.markRuleInvalid(req.params.id as string, getTenantId(req), getUserId(req), req.body.reason || 'Marked invalid by user');
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};
