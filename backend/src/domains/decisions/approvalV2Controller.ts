import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../shared/authMiddleware';
import * as approvalService from '../../services/approval.service';
import { DEFAULT_TENANT_ID } from '../../shared/constants';

function getTenantId(req: AuthRequest): string {
  return req.user?.workspace_id || DEFAULT_TENANT_ID;
}

function getUserId(req: AuthRequest): string {
  return req.user?.id || '';
}

function getRole(req: AuthRequest): string {
  return ((req.user?.role as string) || 'REVIEWER').toUpperCase();
}

function isSuperAdmin(req: AuthRequest): boolean {
  return req.user?.is_superadmin || false;
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

const CreateItemSchema = z.object({
  source_module: z.string().min(1),
  source_entity_id: z.string().uuid(),
  item_type: z.enum(['SOCIAL_POST', 'INBOX_REPLY', 'CAMPAIGN_ASSET', 'AGENT_ACTION', 'WORKFLOW_OUTPUT', 'VALIDATION_OVERRIDE', 'EXCEPTION_OUTCOME', 'RESTRICTED_OPERATION', 'COMPLIANCE_SENSITIVE_ITEM', 'PUBLISHING_ACTION']),
  title: z.string().min(1),
  content_snapshot: z.string().optional(),
  approval_rule_id: z.string().uuid().optional(),
  required_approval_level: z.number().int().min(1).optional(),
  assigned_approver_id: z.string().uuid().optional(),
  risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  due_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes', 'conditional_approval', 'escalate', 'cancel']),
  reason: z.string().optional(),
  note: z.string().optional(),
  condition_text: z.string().optional(),
  condition_owner: z.string().uuid().optional(),
  condition_due_at: z.string().optional(),
  target_role: z.string().optional(),
});

const AssignSchema = z.object({
  approver_id: z.string().uuid(),
});

const CommentSchema = z.object({
  body: z.string().min(1),
  visibility: z.enum(['internal_only', 'public']).optional(),
});

const EvidenceSchema = z.object({
  evidence_type: z.string().min(1),
  evidence_reference: z.string().min(1),
  source_module: z.string().min(1),
});

export const createApprovalItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = CreateItemSchema.parse(req.body);
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const item = await approvalService.createApprovalItem({
      tenant_id: tenantId,
      workspace_id: tenantId,
      ...input,
      submitted_by: userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
};

export const listApprovalItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const role = getRole(req);

    const statusRaw = queryStr(req, 'status');
    const statusFilter = statusRaw ? statusRaw.split(',') : undefined;

    const result = await approvalService.listApprovalItems({
      tenant_id: tenantId,
      status: statusFilter,
      item_type: queryStr(req, 'item_type'),
      source_module: queryStr(req, 'source_module'),
      assigned_to: queryStr(req, 'assigned_to'),
      submitted_by: queryStr(req, 'submitted_by'),
      risk_level: queryStr(req, 'risk_level'),
      search: queryStr(req, 'search'),
      overdue: req.query.overdue === 'true',
      limit: queryNum(req, 'limit') || 50,
      offset: queryNum(req, 'offset') || 0,
    });
    res.json({ success: true, data: result.items, total: result.total, role });
  } catch (error) { next(error); }
};

export const getApprovalItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const item = await approvalService.getApprovalItem(id, getTenantId(req));
    if (!item) return res.status(404).json({ error: 'Approval item not found' });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

export const takeApprovalAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const { action, reason, note, condition_text, condition_owner, condition_due_at, target_role } = ActionSchema.parse(req.body);
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const role = getRole(req);
    const isSuper = isSuperAdmin(req);

    const item = await approvalService.getApprovalItem(id, tenantId);
    if (!item) return res.status(404).json({ error: 'Approval item not found' });

    const eligibility = approvalService.calculateEligibility(item, userId, role, isSuper);
    if (eligibility !== 'APPROVAL_ELIGIBLE' && action !== 'cancel') {
      return res.status(403).json({ error: `Action not allowed: ${eligibility}` });
    }

    let result;
    switch (action) {
      case 'approve':
        result = await approvalService.approveItem(id, tenantId, userId, reason, note);
        break;
      case 'reject':
        if (!reason) return res.status(400).json({ error: 'Rejection requires a reason' });
        result = await approvalService.rejectItem(id, tenantId, userId, reason, note);
        break;
      case 'request_changes':
        if (!reason) return res.status(400).json({ error: 'Change request requires an instruction' });
        result = await approvalService.requestChanges(id, tenantId, userId, reason, condition_owner, condition_due_at, note);
        break;
      case 'conditional_approval':
        if (!condition_text || !condition_owner || !condition_due_at) {
          return res.status(400).json({ error: 'Conditional approval requires condition_text, condition_owner, and condition_due_at' });
        }
        result = await approvalService.approveWithConditions(id, tenantId, userId, condition_text, condition_owner, condition_due_at, note);
        break;
      case 'escalate':
        if (!target_role || !reason) return res.status(400).json({ error: 'Escalation requires target_role and reason' });
        result = await approvalService.escalateItem(id, tenantId, userId, target_role, reason, note);
        break;
      case 'cancel':
        result = await approvalService.cancelApproval(id, tenantId, userId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const assignApprover = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const { approver_id } = AssignSchema.parse(req.body);
    const result = await approvalService.assignApprover(id, getTenantId(req), getUserId(req), approver_id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const reassignApprover = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const { approver_id } = AssignSchema.parse(req.body);
    const result = await approvalService.reassignApprover(id, getTenantId(req), getUserId(req), approver_id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getApprovalStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await approvalService.getApprovalStats(getTenantId(req));
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
};

export const getApprovalEligibility = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const item = await approvalService.getApprovalItem(id, getTenantId(req));
    if (!item) return res.status(404).json({ error: 'Approval item not found' });
    const eligibility = approvalService.calculateEligibility(item, getUserId(req), getRole(req), isSuperAdmin(req));
    res.json({ success: true, data: { eligibility, status: item.approval_status } });
  } catch (error) { next(error); }
};

export const getApprovalPath = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const result = await approvalService.getApprovalPath(id);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const createApprovalPathHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const { path_type, total_stages, required_roles, required_users, quorum_required, fallback_approver, escalation_target, sla_due_at } = req.body;
    if (!path_type || !total_stages) {
      return res.status(400).json({ success: false, error: 'path_type and total_stages are required' });
    }
    const path = await approvalService.createApprovalPath(id, {
      path_type, total_stages, required_roles, required_users, quorum_required, fallback_approver, escalation_target, sla_due_at,
    });
    res.status(201).json({ success: true, data: path });
  } catch (error) { next(error); }
};

export const getApprovalDecisions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const decisions = await approvalService.getApprovalDecisions(id);
    res.json({ success: true, data: decisions });
  } catch (error) { next(error); }
};

export const getApprovalComments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const comments = await approvalService.getApprovalComments(id);
    res.json({ success: true, data: comments });
  } catch (error) { next(error); }
};

export const addApprovalComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const { body, visibility } = CommentSchema.parse(req.body);
    const comment = await approvalService.addApprovalComment(id, getUserId(req), body, visibility);
    res.status(201).json({ success: true, data: comment });
  } catch (error) { next(error); }
};

export const getApprovalEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const evidence = await approvalService.getApprovalEvidence(id);
    res.json({ success: true, data: evidence });
  } catch (error) { next(error); }
};

export const addApprovalEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const input = EvidenceSchema.parse(req.body);
    const evidence = await approvalService.addApprovalEvidence(id, input);
    res.status(201).json({ success: true, data: evidence });
  } catch (error) { next(error); }
};

export const getApprovalAuditTrail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const auditLog = await approvalService.getApprovalAuditTrail(id);
    res.json({ success: true, data: auditLog });
  } catch (error) { next(error); }
};

export const exportApprovalRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = paramStr(req, 'id');
    const record = await approvalService.exportApprovalRecord(id, getTenantId(req));
    if (!record) return res.status(404).json({ error: 'Approval item not found' });
    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};

export const retryCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const callbackId = paramStr(req, 'callbackId');
    await approvalService.retryCallback(callbackId);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const bulkApprovalAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const action = paramStr(req, 'action');
    const { ids, reason, note, condition_text, condition_owner, condition_due_at, target_role } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const role = getRole(req);
    const isSuper = isSuperAdmin(req);

    const results = [];
    for (const id of ids) {
      try {
        const item = await approvalService.getApprovalItem(id, tenantId);
        if (!item) { results.push({ id, success: false, error: 'Item not found' }); continue; }
        const eligibility = approvalService.calculateEligibility(item, userId, role, isSuper);
        if (eligibility !== 'APPROVAL_ELIGIBLE' && action !== 'cancel') {
          results.push({ id, success: false, error: `Action not allowed: ${eligibility}` }); continue;
        }
        let result;
        switch (action) {
          case 'approve': result = await approvalService.approveItem(id, tenantId, userId, reason, note); break;
          case 'reject': result = await approvalService.rejectItem(id, tenantId, userId, reason || 'Bulk rejection', note); break;
          case 'request_changes': result = await approvalService.requestChanges(id, tenantId, userId, reason || 'Bulk changes requested', condition_owner, condition_due_at, note); break;
          case 'conditional_approval': result = await approvalService.approveWithConditions(id, tenantId, userId, condition_text, condition_owner, condition_due_at, note); break;
          case 'escalate': result = await approvalService.escalateItem(id, tenantId, userId, target_role, reason, note); break;
          case 'cancel': result = await approvalService.cancelApproval(id, tenantId, userId); break;
          default: results.push({ id, success: false, error: 'Invalid action' }); continue;
        }
        results.push({ id, success: true, data: result });
      } catch (e: any) {
        results.push({ id, success: false, error: e.message });
      }
    }
    res.json({ success: true, data: results });
  } catch (error) { next(error); }
};
