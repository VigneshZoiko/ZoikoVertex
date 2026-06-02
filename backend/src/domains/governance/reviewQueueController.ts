import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { createAuditEvent } from '../../services/auditTrail.service';
import * as reviewQueueService from '../../services/reviewQueue.service';
import { DEFAULT_TENANT_ID } from '../../shared/constants';

async function getTenantId(req: AuthRequest): Promise<string> {
  return req.user?.workspace_id || DEFAULT_TENANT_ID;
}

export async function createItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body as {
      workspace_id: string;
      item_type: string;
      source_module: string;
      source_entity_id: string;
      title: string;
      content_snapshot?: Record<string, unknown>;
      platform?: string;
      campaign_id?: string;
      priority?: string;
      risk_level?: string;
      risk_category?: string;
      due_at?: string;
    };

    const item = await reviewQueueService.createReviewItem({
      tenant_id: tenantId,
      workspace_id: body.workspace_id || tenantId,
      item_type: body.item_type as any,
      source_module: body.source_module,
      source_entity_id: body.source_entity_id,
      title: body.title,
      content_snapshot: body.content_snapshot,
      platform: body.platform,
      campaign_id: body.campaign_id,
      submitted_by: userId,
      priority: body.priority as any,
      risk_level: body.risk_level as any,
      risk_category: body.risk_category,
      due_at: body.due_at,
    });

    await logReviewAuditEvent({
      workspaceId: tenantId, userId, itemId: item.id,       action: 'review.item.submitted',
      summary: `Review item "${item.title}" created`, itemType: item.item_type, riskLevel: item.risk_level,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function listItems(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const q = req.query as Record<string, string>;

    const result = await reviewQueueService.listReviewItems({
      tenant_id: tenantId,
      status: q.status ? q.status.split(',') : undefined,
      assigned_to: q.assigned_to || undefined,
      risk_level: q.risk_level || undefined,
      priority: q.priority || undefined,
      item_type: q.item_type || undefined,
      source_module: q.source_module || undefined,
      search: q.search || undefined,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = req.params as { id: string };
    const item = await reviewQueueService.getReviewItem(params.id, tenantId);
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    const decisions = await reviewQueueService.listReviewDecisions(item.id);
    const notes = await reviewQueueService.listReviewNotes(item.id);
    const auditLog = await reviewQueueService.listReviewAuditLog(item.id);

    const userRole = (req.user as any)?.role || 'REVIEWER';
    const eligibility = reviewQueueService.calculateEligibility(item, String(userRole).toUpperCase());

    res.json({
      success: true,
      data: {
        item,
        decisions,
        notes,
        auditLog,
        eligibility,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function takeAction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = req.params as { id: string };
    const id = params.id;
    const { action, reason, note } = req.body;

    const item = await reviewQueueService.getReviewItem(id, tenantId);
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    const userRole = String((req.user as any)?.role || 'REVIEWER').toUpperCase();
    const eligibility = reviewQueueService.calculateEligibility(item, userRole);

    if (eligibility === 'BLOCKED') {
      return res.status(423).json({ error: 'Action blocked: item is in blocked state' });
    }

    if (action === 'approve') {
      if (eligibility === 'ELEVATED_APPROVAL_REQUIRED') {
        return res.status(403).json({ error: 'Elevated approval required for critical risk items' });
      }
      if (eligibility === 'REVISION_REQUIRED') {
        return res.status(400).json({ error: 'Revision required before approval' });
      }
      if (eligibility === 'ESCALATION_REQUIRED') {
        return res.status(400).json({ error: 'Item must be escalated before approval' });
      }

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'APPROVED', userId,
      });
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'APPROVED', reason, note, decided_by: userId,
      });

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.approved',
        summary: `Review item "${item.title}" approved`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      return res.json({ success: true, data: updated });
    }

    if (action === 'reject') {
      if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'REJECTED', feedback: note, userId,
      });
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'REJECTED', reason, note, decided_by: userId,
      });

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.rejected',
        summary: `Review item "${item.title}" rejected: ${reason}`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      return res.json({ success: true, data: updated });
    }

    if (action === 'request_revision') {
      if (!note) return res.status(400).json({ error: 'Revision instructions are required' });

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'AWAITING_REVISION', feedback: note, userId,
      });
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'REVISION_REQUESTED', reason, note, decided_by: userId,
      });

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.revision_requested',
        summary: `Revision requested for "${item.title}"`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      return res.json({ success: true, data: updated });
    }

    if (action === 'escalate') {
      if (!reason) return res.status(400).json({ error: 'Escalation reason is required' });

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'ESCALATED', feedback: note, userId,
      });
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'ESCALATED', reason, note, decided_by: userId,
      });

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.escalated',
        summary: `Review item "${item.title}" escalated: ${reason}`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      return res.json({ success: true, data: updated });
    }

    if (action === 'override') {
      if (eligibility === 'OVERRIDE_PROHIBITED') {
        return res.status(403).json({ error: 'Override not allowed for this item' });
      }

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'APPROVED', feedback: note, userId,
      });
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'OVERRIDE_APPLIED', reason, note, decided_by: userId,
      });
      await reviewQueueService.recordOverride({
        review_item_id: id, override_reason: reason || 'Override applied',
        risk_acknowledgement: note, overridden_by: userId,
      });

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.override',
        summary: `Override applied to "${item.title}": ${reason}`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      return res.json({ success: true, data: updated });
    }

    if (action === 'assign') {
      const body = req.body as { assigned_to?: string; team?: string; due_at?: string };
      if (!body.assigned_to) return res.status(400).json({ error: 'Assignee required' });

      const updated = await reviewQueueService.assignReviewItem({
        id, tenant_id: tenantId, assigned_to: body.assigned_to, assigned_by: userId,
        team: body.team, due_at: body.due_at, note,
      });

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.assigned',
        summary: `Review item "${item.title}" assigned`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      return res.json({ success: true, data: updated });
    }

    if (action === 'release') {
      if (item.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Only approved items can be released' });
      }

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'RELEASED', userId,
      });
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'APPROVED', reason: 'Released to production', decided_by: userId,
      });

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.released',
        summary: `Review item "${item.title}" released`, itemType: item.item_type, riskLevel: item.risk_level,
      });

      return res.json({ success: true, data: updated });
    }

    if (action === 'add_note') {
      if (!note) return res.status(400).json({ error: 'Note text required' });

      const result = await reviewQueueService.addReviewNote({
        review_item_id: id, note_body: note, created_by: userId,
      });

      return res.json({ success: true, data: result });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    next(error);
  }
}

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await reviewQueueService.getReviewStats(tenantId, userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function getEligibility(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = req.params as { id: string };
    const item = await reviewQueueService.getReviewItem(params.id, tenantId);
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    const userRole = String((req.user as any)?.role || 'REVIEWER').toUpperCase();
    const eligibility = reviewQueueService.calculateEligibility(item, userRole);

    res.json({ success: true, data: { eligibility, item_id: item.id } });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLog(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = req.params as { id: string };
    const item = await reviewQueueService.getReviewItem(params.id, tenantId);
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    const log = await reviewQueueService.listReviewAuditLog(item.id);
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
}

export async function getReviewValidation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const params = req.params as { id: string };
    res.json({ success: true, data: [] });
  } catch (error) { next(error); }
}

export async function getReviewPolicyFlags(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const params = req.params as { id: string };
    res.json({ success: true, data: [] });
  } catch (error) { next(error); }
}

export async function getReviewNotesHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const params = req.params as { id: string };
    const notes = await reviewQueueService.listReviewNotes(params.id);
    res.json({ success: true, data: notes });
  } catch (error) { next(error); }
}

export async function getReviewRevisionHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const params = req.params as { id: string };
    const decisions = await reviewQueueService.listReviewDecisions(params.id);
    res.json({ success: true, data: decisions });
  } catch (error) { next(error); }
}

export async function assignReviewItemHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const params = req.params as { id: string };
    const result = await reviewQueueService.assignReviewItem({ id: params.id, assigned_to: userId, assigned_by: userId, tenant_id: tenantId });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function addReviewNoteHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const params = req.params as { id: string };
    const result = await reviewQueueService.addReviewNote({ review_item_id: params.id, note_body: req.body.note_body, created_by: userId });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function bulkReviewAction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const action = req.params.action;
    const { item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'item_ids array is required' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const results = [];
    for (const id of item_ids) {
      try {
        const result = await reviewQueueService.recordDecision({ review_item_id: id, decision_type: action as any, decided_by: userId, reason: req.body.reason || 'Bulk action' });
        results.push({ id, success: true, data: result });
      } catch (e: any) {
        results.push({ id, success: false, error: e.message });
      }
    }
    res.json({ success: true, data: results });
  } catch (error) { next(error); }
}

async function logReviewAuditEvent(params: {
  workspaceId: string;
  userId: string;
  itemId: string;
  action: string;
  summary: string;
  itemType: string;
  riskLevel: string;
}) {
  try {
    await createAuditEvent({
      workspace_id: params.workspaceId,
      tenant_id: params.workspaceId,
      event_category: 'evidence_legal',
      event_type: params.action as any,
      event_title: params.summary,
      event_summary: params.summary,
      actor: { actor_id: params.userId, actor_type: 'human_user' },
      object: { object_type: 'review_item', object_id: params.itemId },
      authority: { permission_used: 'queue:view' },
      risk_level: (params.riskLevel || 'low').toLowerCase() as any,
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'REGULATED',
    });
  } catch {
    // Silent fail for audit logging
  }
}
