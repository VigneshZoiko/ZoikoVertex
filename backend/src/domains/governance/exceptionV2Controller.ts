import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../shared/authMiddleware';
import * as exceptionService from '../../services/exception.service';

function getTenantId(req: AuthRequest): string {
  return (req.user?.workspace_id as string) || '00000000-0000-0000-0000-000000000000';
}

function getUserId(req: AuthRequest): string {
  return (req.user?.id as string) || getTenantId(req);
}

function paramStr(req: { params: Record<string, any> }, name: string): string {
  const v = req.params[name];
  return typeof v === 'string' ? v : String(v || '');
}

function queryStr(req: { query: Record<string, any> }, name: string): string | undefined {
  const v = req.query[name];
  if (v === undefined || v === null) return undefined;
  return typeof v === 'string' ? v : String(v);
}

function queryNum(req: { query: Record<string, any> }, name: string): number | undefined {
  const v = queryStr(req, name);
  return v ? parseInt(v, 10) || undefined : undefined;
}

const CreateExceptionSchema = z.object({
  exception_title: z.string().min(1),
  exception_category: z.enum(['VALIDATION_BLOCK', 'APPROVAL_BLOCK', 'RULE_CONFLICT', 'CALLBACK_FAILURE', 'INTEGRATION_FAILURE', 'POLICY_BREACH', 'EVIDENCE_GAP', 'QUALITY_FAILURE', 'SENSITIVE_ENGAGEMENT', 'AGENT_SAFETY', 'RESTRICTED_OPERATION', 'SLA_BREACH', 'MANUAL_OVERRIDE_REQUEST', 'UNKNOWN']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  source_module: z.string().min(1),
  source_entity_type: z.string().optional(),
  source_entity_id: z.string().uuid().optional(),
  source_owner_id: z.string().uuid().optional(),
  exception_owner_id: z.string().uuid().optional(),
  due_at: z.string().optional(),
  current_blocker: z.string().optional(),
  workflow_impact: z.string().optional(),
  recommended_route: z.string().optional(),
  required_authority: z.number().int().min(1).optional(),
  restricted_mode: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const BlockerSchema = z.object({
  blocker_type: z.string().min(1),
  blocker_description: z.string().min(1),
  blocker_severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  triggered_by: z.string().uuid().optional(),
  related_rule_id: z.string().uuid().optional(),
  related_validation_id: z.string().uuid().optional(),
  related_approval_id: z.string().uuid().optional(),
  related_callback_id: z.string().uuid().optional(),
  required_action: z.string().optional(),
  required_owner_id: z.string().uuid().optional(),
});

const RemediationSchema = z.object({
  remediation_action: z.string().min(1),
  remediation_owner_id: z.string().uuid().optional(),
  due_at: z.string().optional(),
  target_destination: z.string().optional(),
  required_validation: z.boolean().optional(),
  required_approval: z.boolean().optional(),
  required_evidence: z.string().optional(),
  notes: z.string().optional(),
});

const EscalateSchema = z.object({
  reason: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  target_role: z.string().optional(),
  target_user_id: z.string().uuid().optional(),
  note: z.string().optional(),
});

const OverrideRequestSchema = z.object({
  override_reason: z.string().min(1),
  requested_outcome: z.string().min(1),
  risk_acknowledgement: z.string().optional(),
  evidence_attached: z.array(z.string()).optional(),
  expires_at: z.string().optional(),
});

const OverrideDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'DENIED']),
  note: z.string().optional(),
});

const ResolveSchema = z.object({
  outcome: z.string().min(1),
  summary: z.string().optional(),
  root_cause: z.string().optional(),
  corrective_action: z.string().optional(),
  preventive_action: z.string().optional(),
  final_destination: z.string().optional(),
  evidence_attached: z.array(z.string()).optional(),
  post_resolution_audit_required: z.boolean().optional(),
});

const EvidenceSchema = z.object({
  evidence_type: z.string().min(1),
  evidence_reference: z.string().min(1),
  source_module: z.string().min(1),
});

export const createException = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = CreateExceptionSchema.parse(req.body);
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const ec = await exceptionService.createExceptionCase({
      tenant_id: tenantId, workspace_id: tenantId,
      created_by: userId, ...input,
    });
    res.status(201).json({ success: true, data: ec });
  } catch (error) { next(error); }
};

export const listExceptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const statusRaw = queryStr(req, 'status');
    const result = await exceptionService.listExceptionCases({
      tenant_id: tenantId,
      status: statusRaw ? statusRaw.split(',') : undefined,
      severity: queryStr(req, 'severity'),
      category: queryStr(req, 'category'),
      source_module: queryStr(req, 'source_module'),
      owner_id: queryStr(req, 'owner_id'),
      search: queryStr(req, 'search'),
      overdue: req.query.overdue === 'true',
      restricted_mode: req.query.restricted_mode === 'true',
      limit: queryNum(req, 'limit') || 50,
      offset: queryNum(req, 'offset') || 0,
    });
    res.json({ success: true, data: result.cases, total: result.total });
  } catch (error) { next(error); }
};

export const getException = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const ec = await exceptionService.getExceptionCase(id, getTenantId(req));
    if (!ec) return res.status(404).json({ error: 'Exception case not found' });
    res.json({ success: true, data: ec });
  } catch (error) { next(error); }
};

export const updateException = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const updates = req.body;
    const ec = await exceptionService.updateExceptionCase(id, getTenantId(req), updates);
    res.json({ success: true, data: ec });
  } catch (error) { next(error); }
};

export const getExceptionStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await exceptionService.getExceptionStats(getTenantId(req));
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
};

export const assignOwner = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const { owner_id } = z.object({ owner_id: z.string().uuid() }).parse(req.body);
    const ec = await exceptionService.assignOwner(id, getTenantId(req), getUserId(req), owner_id);
    res.json({ success: true, data: ec });
  } catch (error) { next(error); }
};

export const updateSeverity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const { severity } = z.object({ severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) }).parse(req.body);
    const ec = await exceptionService.updateSeverity(id, getTenantId(req), getUserId(req), severity);
    res.json({ success: true, data: ec });
  } catch (error) { next(error); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const { status } = z.object({ status: z.string().min(1) }).parse(req.body);
    const ec = await exceptionService.updateStatus(id, getTenantId(req), getUserId(req), status as any);
    res.json({ success: true, data: ec });
  } catch (error) { next(error); }
};

export const addBlocker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const input = BlockerSchema.parse(req.body);
    const result = await exceptionService.addBlocker(id, input);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getBlockers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const blockers = await exceptionService.getBlockers(id);
    res.json({ success: true, data: blockers });
  } catch (error) { next(error); }
};

export const addRemediation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const input = RemediationSchema.parse(req.body);
    const result = await exceptionService.addRemediation(id, input);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const completeRemediation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const remediationId = paramStr(req, 'remediationId');
    await exceptionService.completeRemediation(remediationId);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const getRemediations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const remediations = await exceptionService.getRemediations(id);
    res.json({ success: true, data: remediations });
  } catch (error) { next(error); }
};

export const escalateException = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const input = EscalateSchema.parse(req.body);
    await exceptionService.escalateCase(id, getTenantId(req), getUserId(req), input);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const requestOverride = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const input = OverrideRequestSchema.parse(req.body);
    const result = await exceptionService.requestOverride(id, {
      ...input, requested_by: getUserId(req),
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const decideOverride = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const overrideId = paramStr(req, 'overrideId');
    const { decision, note } = OverrideDecisionSchema.parse(req.body);
    await exceptionService.decideOverride(overrideId, decision, getUserId(req), note);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const addEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const input = EvidenceSchema.parse(req.body);
    const result = await exceptionService.addEvidence(id, {
      ...input, created_by: getUserId(req),
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const evidence = await exceptionService.getEvidence(id);
    res.json({ success: true, data: evidence });
  } catch (error) { next(error); }
};

export const resolveException = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const input = ResolveSchema.parse(req.body);
    await exceptionService.resolveCase(id, getTenantId(req), getUserId(req), input);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const sendToValidation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    await exceptionService.sendToValidation(id, getTenantId(req), getUserId(req));
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const sendToApprovals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    await exceptionService.sendToApprovals(id, getTenantId(req), getUserId(req));
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const sendToQualityAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    await exceptionService.sendToQualityAudit(id, getTenantId(req), getUserId(req));
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const getAuditTrail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const auditLog = await exceptionService.getAuditTrail(id);
    res.json({ success: true, data: auditLog });
  } catch (error) { next(error); }
};

export const exportExceptionRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const record = await exceptionService.exportExceptionRecord(id, getTenantId(req));
    if (!record) return res.status(404).json({ error: 'Exception case not found' });
    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};

export const closeExceptionCase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const ec = await exceptionService.updateStatus(id, getTenantId(req), getUserId(req), 'CLOSED');
    res.json({ success: true, data: ec });
  } catch (error) { next(error); }
};

export const archiveExceptionCase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const ec = await exceptionService.updateStatus(id, getTenantId(req), getUserId(req), 'ARCHIVED');
    res.json({ success: true, data: ec });
  } catch (error) { next(error); }
};
