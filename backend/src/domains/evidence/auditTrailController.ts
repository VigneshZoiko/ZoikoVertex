import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import {
  listAuditEvents,
  getAuditEvent,
  getAuditStats,
  getRelatedEvents,
  verifyChainIntegrity,
  createExportJob,
  listExportJobs,
  preserveEvents,
  sealExpiredRecords,
  applyFieldAccess,
  createAuditEvent,
  getEventDiff,
  getCorrelationTimeline,
  getEventClusters,
  UserRole,
} from '../../services/auditTrail.service';
import { createCase as createForensicCase } from '../../services/forensicHub.service';
import { logger } from '../../shared/logger';

async function logAuditAccess(params: {
  workspace_id: string;
  userId: string;
  eventId: string;
  action: string;
  reason?: string;
}) {
  try {
    await createAuditEvent({
      workspace_id: params.workspace_id,
      event_category: 'system_security',
      event_type: 'audit.access',
      event_title: 'Audit Access',
      event_summary: `${params.action} on event ${params.eventId}`,
      actor: { actor_id: params.userId, actor_type: 'human_user' },
      object: { object_type: 'audit_event', object_id: params.eventId },
      change: { change_reason: params.reason || 'viewed' },
      risk_level: 'low',
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'STANDARD',
      correlation: {},
    });
  } catch (err) {
    logger.warn({ error: String(err) }, 'Audit access logging failed (not blocking main response)');
  }
}

async function getUserRole(userId: string, workspaceId: string): Promise<UserRole> {
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const roles = member?.role ? [member.role] : [];
  if (roles.some(r => r === 'SUPERADMIN' || r === 'WORKSPACE_OWNER')) return 'ADMIN';
  if (roles.some(r => r === 'SECURITY_ADMIN' || r === 'SECURITY')) return 'SECURITY';
  if (roles.some(r => r === 'COMPLIANCE_REVIEWER' || r === 'COMPLIANCE')) return 'COMPLIANCE';
  if (roles.some(r => r === 'LEGAL')) return 'LEGAL';
  if (roles.some(r => r === 'EXECUTIVE_VIEWER')) return 'EXEC_VIEWER';
  if (roles.some(r => r === 'EXTERNAL_AUDITOR' || r === 'AUDITOR')) return 'EXTERNAL_AUDITOR';
  if (roles.some(r => r === 'PUBLISHER')) return 'PUBLISHER';
  if (roles.some(r => r === 'CAMPAIGN_MANAGER')) return 'CAMPAIGN_MANAGER';
  if (roles.some(r => r === 'MEMBER' || r === 'VIEWER')) return 'VIEWER';
  return 'EXTERNAL_AUDITOR';
}

// ─── GET /api/audit-events ──────────────────────────────────────────────────

export async function getEvents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const userRole = await getUserRole(userId, workspaceId);

    const {
      limit,
      cursor,
      date_from,
      date_to,
      event_category,
      event_type,
      actor_id,
      object_id,
      risk_level,
      status,
      retention_class,
      search,
    } = req.query as Record<string, string | undefined>;

    const result = await listAuditEvents({
      workspace_id: workspaceId,
      limit: limit ? parseInt(limit) : 50,
      cursor,
      date_from,
      date_to,
      event_category,
      event_type,
      actor_id,
      object_id,
      risk_level,
      status,
      retention_class,
      search,
    });

    const filteredEvents = result.events.map(e => {
      const actor = e.actor as Record<string, unknown>;
      const isSelf = actor?.actor_id === userId;
      return applyFieldAccess(e as unknown as Record<string, unknown>, userRole, userId, isSelf) as unknown as typeof e;
    });

    res.json({ success: true, data: { ...result, events: filteredEvents } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/audit-events/stats ────────────────────────────────────────────

export async function getEventsStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const stats = await getAuditStats(workspaceId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/audit-events/:id ──────────────────────────────────────────────

export async function getEventDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const userRole = await getUserRole(userId, workspaceId);

    const event = await getAuditEvent(req.params.id as string, workspaceId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // 423 Locked for sealed records accessed by non-admin
    if (event.sealed_at && userRole !== 'ADMIN' && userRole !== 'SECURITY' && userRole !== 'COMPLIANCE' && userRole !== 'LEGAL') {
      return res.status(423).json({
        error: 'Record is sealed',
        detail: 'This record has been sealed by retention policy and is locked from view. Contact your administrator.',
        sealed_at: event.sealed_at,
        sealed_by: event.sealed_by,
      });
    }

    const actor = event.actor as Record<string, unknown>;
    const isSelf = actor?.actor_id === userId;
    const filtered = applyFieldAccess(event as unknown as Record<string, unknown>, userRole, userId, isSelf);

    if (userRole !== 'ADMIN') {
      logAuditAccess({ workspace_id: workspaceId, userId, eventId: event.id, action: 'detail_view' });
    }

    res.json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/audit-events/:id/related ──────────────────────────────────────

export async function getEventRelated(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const userRole = await getUserRole(userId, workspaceId);

    const result = await getRelatedEvents(req.params.id as string, workspaceId);
    const filteredRelated = result.related.map(e => {
      const actor = e.actor as Record<string, unknown>;
      const isSelf = actor?.actor_id === userId;
      return applyFieldAccess(e as unknown as Record<string, unknown>, userRole, userId, isSelf) as unknown as typeof e;
    });

    res.json({ success: true, data: { related: filteredRelated } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/audit-events/chain/verify ─────────────────────────────────────

export async function verifyChain(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const { start_block, end_block } = req.query as Record<string, string | undefined>;
    const result = await verifyChainIntegrity(
      workspaceId,
      start_block ? parseInt(start_block) : undefined,
      end_block ? parseInt(end_block) : undefined,
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/audit-events/export ──────────────────────────────────────────

export async function createExport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'User and workspace required' });

    const { reason, format, date_from, date_to, event_category, risk_level, status, retention_class, actor_id } = req.body;

    if (!reason) return res.status(400).json({ error: 'Reason is required for export' });
    if (!format || !['csv', 'json', 'pdf'].includes(format)) {
      return res.status(400).json({ error: 'Format must be csv, json, or pdf' });
    }

    const job = await createExportJob({
      workspace_id: workspaceId,
      requested_by: userId,
      reason,
      format,
      date_from,
      date_to,
      event_category,
      risk_level,
      status,
      retention_class,
      actor_id,
    });

    res.status(202).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/audit-events/exports ──────────────────────────────────────────

export async function listExports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const exports = await listExportJobs(workspaceId);
    res.json({ success: true, data: exports });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/audit-events/preserve ────────────────────────────────────────

export async function preserve(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'User and workspace required' });

    const { event_ids, reason, retention_class } = req.body;

    if (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0) {
      return res.status(400).json({ error: 'event_ids array required' });
    }
    if (!reason) return res.status(400).json({ error: 'Reason required for preservation' });
    if (!retention_class || !['STANDARD', 'EXTENDED', 'REGULATED', 'LEGAL_HOLD'].includes(retention_class)) {
      return res.status(400).json({ error: 'Valid retention_class required' });
    }

    const result = await preserveEvents({
      workspace_id: workspaceId,
      event_ids,
      reason,
      retention_class,
      requested_by: userId,
      actor: { actor_id: userId, actor_type: 'human_user' },
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/audit-events/seal-expired (admin only) ──────────────────────

export async function sealExpired(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await sealExpiredRecords();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/audit-events (Event Ingestion — Sec 11) ─────────────────────

export async function createEvent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'Workspace ID and user required' });

    const body = req.body;
    const errors: Record<string, string> = {};

    if (!body.event_type) errors.event_type = 'event_type is required';
    if (!body.event_category) errors.event_category = 'event_category is required';
    if (!body.actor?.actor_id) errors['actor.actor_id'] = 'actor.actor_id is required';
    if (!body.actor?.actor_type) errors['actor.actor_type'] = 'actor.actor_type is required';
    if (!body.object?.object_type) errors['object.object_type'] = 'object.object_type is required';
    if (!body.object?.object_id) errors['object.object_id'] = 'object.object_id is required';
    if (body.actor?.actor_type && !['human_user', 'ai_agent', 'service_account', 'system', 'api_key'].includes(body.actor.actor_type)) {
      errors['actor.actor_type'] = 'Invalid actor_type';
    }
    if (body.event_category && !['user_identity', 'content_lifecycle', 'ai_agent', 'approval', 'policy_governance', 'platform_integration', 'evidence_legal', 'system_security'].includes(body.event_category)) {
      errors.event_category = 'Invalid event_category';
    }
    if (body.risk_level && !['low', 'medium', 'high', 'critical'].includes(body.risk_level)) {
      errors.risk_level = 'Invalid risk_level';
    }
    if (body.status && !['success', 'failed', 'blocked', 'pending', 'overridden', 'preserved', 'sealed'].includes(body.status)) {
      errors.status = 'Invalid status';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', field_errors: errors });
    }

    const event = await createAuditEvent({
      workspace_id: workspaceId,
      org_id: body.org_id,
      tenant_id: body.tenant_id,
      chain_id: body.chain_id,
      data_residency: body.data_residency,
      event_category: body.event_category,
      event_type: body.event_type,
      event_title: body.event_title,
      event_summary: body.event_summary,
      timestamp_utc: body.timestamp_utc,
      actor: body.actor,
      object: body.object,
      related_objects: body.related_objects,
      correlation: body.correlation,
      authority: body.authority,
      change: body.change,
      ai_context: body.ai_context,
      risk_level: body.risk_level || 'low',
      status: body.status || 'success',
      evidence_state: body.evidence_state || 'not_preserved',
      retention_class: body.retention_class || 'STANDARD',
      idempotency_key: body.idempotency_key,
    });

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/audit-events/create-investigation ───────────────────────────

export async function createInvestigation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'User and workspace required' });

    const { event_ids, title, severity, assignee, reason } = req.body;

    if (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0) {
      return res.status(400).json({ error: 'event_ids array required' });
    }
    if (!title) return res.status(400).json({ error: 'Title required' });
    if (!severity || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
      return res.status(400).json({ error: 'Valid severity required' });
    }
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const forensicCase = await createForensicCase({
      workspace_id: workspaceId,
      case_type: 'investigation',
      title,
      summary: reason,
      severity: severity.toLowerCase(),
      source: 'audit_trail',
      source_event_ids: event_ids,
      owner_user_id: assignee || userId,
      actor_id: userId,
    });

    await createAuditEvent({
      workspace_id: workspaceId,
      event_category: 'evidence_legal',
      event_type: 'forensic.investigation_created',
      event_title: `Investigation Created: ${title}`,
      event_summary: `Forensic investigation case ${forensicCase.case_id} created from ${event_ids.length} audit event(s)`,
      actor: { actor_id: userId, actor_type: 'human_user' },
      object: { object_type: 'forensic_case', object_id: forensicCase.case_id },
      correlation: { workflow_run_id: event_ids.join(',') },
      risk_level: severity === 'CRITICAL' ? 'critical' : severity === 'HIGH' ? 'high' : 'medium',
      status: 'success',
      retention_class: 'EXTENDED',
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Investigation created and linked to Forensic Hub',
        case_id: forensicCase.case_id,
        case_url: `/evidence/forensic-hub/cases/${forensicCase.id}`,
        event_ids,
        title,
        severity,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/audit-events/:id/diff?compare=:otherId ────────────────────

export async function getEventDiffHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const eventId = req.params.id as string;
    const compareId = req.query.compare as string;
    if (!compareId) return res.status(400).json({ error: 'compare query param (event ID) required' });

    const result = await getEventDiff(eventId, compareId, workspaceId);
    if (!result) return res.status(404).json({ error: 'One or both events not found' });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/audit-events/correlations/:key/:value/timeline ────────────

export async function getCorrelationTimelineHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const key = req.params.key as string;
    const value = req.params.value as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;

    const result = await getCorrelationTimeline(workspaceId, key, value, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/audit-events/:id/clusters ─────────────────────────────────

export async function getEventClustersHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const eventId = req.params.id as string;

    const result = await getEventClusters(eventId, workspaceId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
