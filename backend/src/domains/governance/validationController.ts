import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import * as validationService from '../../services/validationDesk.service';
import { DEFAULT_TENANT_ID } from '../../shared/constants';

function getParamId(req: AuthRequest): string {
  const v = req.params.id;
  return Array.isArray(v) ? v[0] : v;
}

function getParam(req: AuthRequest, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

// ─── Items ───────────────────────────────────────────────────────────────

export const createValidationItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body as {
      source_module: string;
      source_entity_id: string;
      item_type: string;
      title: string;
      campaign_id?: string;
      platform?: string;
      content_snapshot?: Record<string, unknown>;
      risk_level?: string;
      due_at?: string;
    };

    if (!body.source_module || !body.source_entity_id || !body.item_type || !body.title) {
      return res.status(400).json({ error: 'source_module, source_entity_id, item_type, and title are required' });
    }

    const item = await validationService.createValidationItem({
      tenant_id,
      workspace_id: tenant_id,
      source_module: body.source_module,
      source_entity_id: body.source_entity_id,
      item_type: body.item_type as any,
      title: body.title,
      campaign_id: body.campaign_id,
      platform: body.platform,
      content_snapshot: body.content_snapshot,
      submitted_by: userId,
      risk_level: body.risk_level as any,
      due_at: body.due_at,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const listValidationItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const result = await validationService.listValidationItems({
      tenant_id,
      validation_status: req.query.validation_status as string,
      assigned_validator: req.query.assigned_validator as string,
      risk_level: req.query.risk_level as string,
      item_type: req.query.item_type as string,
      source_module: req.query.source_module as string,
      campaign_id: req.query.campaign_id as string,
      highest_severity: req.query.highest_severity as string,
      search: req.query.search as string,
      override_only: req.query.override_only === 'true',
      blocked_only: req.query.blocked_only === 'true',
      revalidation_needed: req.query.revalidation_needed === 'true',
      manual_check_required: req.query.manual_check_required === 'true',
      overdue_only: req.query.overdue_only === 'true',
      sort_by: req.query.sort_by as string,
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const getValidationItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await validationService.getValidationItem(getParamId(req));
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const assignValidator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    await validationService.assignValidator(getParamId(req), req.body.validator_id, performed_by, tenant_id);
    res.json({ success: true, message: 'Validator assigned' });
  } catch (error) {
    next(error);
  }
};

// ─── Validation Runs ─────────────────────────────────────────────────────

export const runValidation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const itemId = getParamId(req);

    await validationService.updateValidationStatus(itemId, 'IN_VALIDATION', performed_by, tenant_id);

    const run = await validationService.createValidationRun({
      validation_item_id: itemId,
      rule_set_id: req.body.rule_set_id,
      rule_set_version: req.body.rule_set_version,
      run_by: performed_by,
    });

    const results = await validationService.completeValidationRun(run.id as string, {
      rule_results: req.body.rule_results || [],
      source_grounding: req.body.source_grounding,
    });

    await validationService.updateValidationStatus(itemId, results.failed_count > 0 ? 'FAILED' : results.warning_count > 0 ? 'WARNING' : 'PASSED', performed_by, tenant_id);

    res.json({ success: true, data: { run, results } });
  } catch (error) {
    next(error);
  }
};

export const revalidateItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const itemId = getParamId(req);

    await validationService.updateValidationStatus(itemId, 'PENDING_VALIDATION', performed_by, tenant_id);

    const run = await validationService.createValidationRun({
      validation_item_id: itemId,
      rule_set_version: req.body.rule_set_version,
      run_by: performed_by,
    });

    const results = await validationService.completeValidationRun(run.id as string, {
      rule_results: req.body.rule_results || [],
      source_grounding: req.body.source_grounding,
    });

    await validationService.updateValidationStatus(itemId, results.failed_count > 0 ? 'FAILED' : results.warning_count > 0 ? 'WARNING' : 'PASSED', performed_by, tenant_id);

    res.json({ success: true, data: { run, results } });
  } catch (error) {
    next(error);
  }
};

export const getValidationRunResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const results = await validationService.getValidationRunResults(getParam(req, 'runId'));
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// ─── Actions ─────────────────────────────────────────────────────────────

export const requestRevision = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const { revision_instruction } = req.body;
    if (!revision_instruction) return res.status(400).json({ success: false, message: 'Revision instruction required' });

    await validationService.updateValidationStatus(getParamId(req), 'NEEDS_REVISION', performed_by, tenant_id);
    res.json({ success: true, message: 'Revision requested' });
  } catch (error) {
    next(error);
  }
};

export const sendToReviewQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const item = await validationService.getValidationItem(getParamId(req));

    const eligibility = validationService.calculateEligibility({
      validation_status: item.validation_status,
      has_blocked_rules: item.blocked_rule_count > 0,
      has_unresolved_manual_checks: item.manual_check_count > 0,
      has_stale_validation: item.validation_status === 'REVALIDATION_NEEDED',
      has_override_eligible_rules: item.overrides && item.overrides.length > 0 || false,
    });

    if (!eligibility.send_to_review_queue_allowed) {
      return res.status(400).json({ success: false, message: `Cannot send to Review Queue: ${eligibility.state}` });
    }

    await validationService.updateValidationStatus(getParamId(req), 'COMPLETED', performed_by, tenant_id);
    res.json({ success: true, message: 'Sent to Review Queue' });
  } catch (error) {
    next(error);
  }
};

export const sendToApprovals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const item = await validationService.getValidationItem(getParamId(req));

    const eligibility = validationService.calculateEligibility({
      validation_status: item.validation_status,
      has_blocked_rules: item.blocked_rule_count > 0,
      has_unresolved_manual_checks: item.manual_check_count > 0,
      has_stale_validation: item.validation_status === 'REVALIDATION_NEEDED',
      has_override_eligible_rules: item.overrides && item.overrides.length > 0 || false,
    });

    if (!eligibility.send_to_approvals_allowed) {
      return res.status(400).json({ success: false, message: `Cannot send to Approvals: ${eligibility.state}` });
    }

    await validationService.updateValidationStatus(getParamId(req), 'COMPLETED', performed_by, tenant_id);
    res.json({ success: true, message: 'Sent to Approvals' });
  } catch (error) {
    next(error);
  }
};

export const escalateValidation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const { escalation_reason } = req.body;
    if (!escalation_reason) return res.status(400).json({ success: false, message: 'Escalation reason required' });

    await validationService.updateValidationStatus(getParamId(req), 'ESCALATION_REQUIRED', performed_by, tenant_id);
    res.json({ success: true, message: 'Validation escalated' });
  } catch (error) {
    next(error);
  }
};

export const applyOverride = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const { rule_result_id, override_reason, risk_acknowledgement, note } = req.body;

    if (!override_reason) return res.status(400).json({ success: false, message: 'Override reason required' });

    await validationService.applyOverride({
      validation_item_id: getParamId(req),
      rule_result_id,
      override_reason,
      risk_acknowledgement,
      note,
      overridden_by: performed_by,
      tenant_id,
    });
    res.json({ success: true, message: 'Override applied' });
  } catch (error) {
    next(error);
  }
};

export const blockItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const { block_reason } = req.body;
    if (!block_reason) return res.status(400).json({ success: false, message: 'Block reason required' });

    await validationService.updateValidationStatus(getParamId(req), 'BLOCKED', performed_by, tenant_id);
    res.json({ success: true, message: 'Item blocked' });
  } catch (error) {
    next(error);
  }
};

export const completeManualCheck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const { manual_check_result, note } = req.body;

    await validationService.completeManualCheck({
      validation_item_id: getParamId(req),
      rule_result_id: req.body.rule_result_id,
      assigned_validator: performed_by,
      manual_check_result: manual_check_result || 'PASSED',
      note,
      completed_by: performed_by,
      tenant_id,
    });
    res.json({ success: true, message: 'Manual check completed' });
  } catch (error) {
    next(error);
  }
};

// ─── Notes ───────────────────────────────────────────────────────────────

export const addValidatorNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const created_by = req.user?.id || '';
    const note = await validationService.addNote({
      validation_item_id: getParamId(req),
      note_body: req.body.note_body,
      parent_note_id: req.body.parent_note_id,
      created_by,
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// ─── Audit Log ───────────────────────────────────────────────────────────

export const getValidationAuditTrail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const log = await validationService.getAuditLog(getParamId(req));
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// ─── Stats & Eligibility ─────────────────────────────────────────────────

export const getValidationStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const stats = await validationService.getValidationStats(tenant_id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getValidationEligibility = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await validationService.getValidationItem(getParamId(req));
    const has_override_eligible_rules = (item as any).runs?.some((r: any) =>
      r.rule_results?.some((rr: any) => rr.override_eligible)
    ) || false;
    const eligibility = validationService.calculateEligibility({
      validation_status: item.validation_status,
      has_blocked_rules: item.blocked_rule_count > 0,
      has_unresolved_manual_checks: item.manual_check_count > 0,
      has_stale_validation: item.validation_status === 'REVALIDATION_NEEDED',
      has_override_eligible_rules,
    });
    res.json({ success: true, data: eligibility });
  } catch (error) {
    next(error);
  }
};

// ─── Callbacks ───────────────────────────────────────────────────────────

export const retryValidationCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const cb = await validationService.retryCallback(getParam(req, 'callbackId'), performed_by, tenant_id);
    res.json({ success: true, data: cb });
  } catch (error) {
    next(error);
  }
};

// ─── Export ──────────────────────────────────────────────────────────────

export const exportValidationRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await validationService.getValidationItem(getParamId(req));
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};
