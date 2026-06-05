import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import * as forensicService from '../../services/forensicHub.service';
import { buildAuthContext } from '../../shared/serviceAuth';

const DEFAULT_WORKSPACE_ID = 'WRK-001';

function getTenantId(req: AuthRequest): string {
  const tenantId = (req.user as any)?.tenant_id;
  return tenantId && tenantId !== 'default' ? tenantId : (req.user?.workspace_id || DEFAULT_WORKSPACE_ID);
}

// ─── GET /api/forensic/cases ──────────────────────────────────────────────────

export async function listCases(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { case_type, severity, status, owner_user_id, source, date_from, date_to, search, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await forensicService.listCases({
      workspace_id: req.user?.workspace_id || undefined,
      case_type, severity, status, owner_user_id, source,
      date_from, date_to, search,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, data: result.cases, total: result.total });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/forensic/cases ─────────────────────────────────────────────────

export async function createCase(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { case_type, title, summary, severity, source, source_event_ids, owner_user_id, sla_due_at } = req.body;
    if (!case_type || !title) {
      return res.status(400).json({ success: false, error: 'case_type and title are required' });
    }
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.createCase({
      workspace_id: req.user!.workspace_id || DEFAULT_WORKSPACE_ID,
      case_type, title, summary, severity, source, source_event_ids,
      owner_user_id, sla_due_at, actor_id: req.user!.id,
      tenant_id: getTenantId(req),
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Phase 3: GET /api/forensic/cases/:caseId/graph ───────────────────────────

export async function getEntityGraph(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicService.getEntityGraph(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/forensic/cases/stats ─────────────────────────────────────────────

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stats = await forensicService.getForensicStats(req.user?.workspace_id || undefined);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/forensic/cases/:caseId ──────────────────────────────────────────

export async function getCase(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = caseId.includes('-')
      ? await forensicService.getCaseByCaseId(caseId)
      : await forensicService.getCase(caseId);
    if (!result) return res.status(404).json({ success: false, error: 'Case not found' });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/forensic/cases/:caseId ────────────────────────────────────────

export async function updateCase(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { title, summary, severity, status, owner_user_id, sla_due_at, retention_class, closure, reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required for all case updates' });

    const auth = buildAuthContext(req.user!);
    const result = await forensicService.updateCase(caseId, {
      title, summary, severity, status, owner_user_id, sla_due_at, retention_class, closure,
      actor_id: req.user!.id, reason,
    }, auth);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('Invalid status transition')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/assign ──────────────────────────────────

export async function assignCase(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { user_id, role_in_case, reason } = req.body;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id is required' });

    const auth = buildAuthContext(req.user!);
    const participant = await forensicService.addParticipant(caseId, user_id, role_in_case || 'investigator', req.user!.id, reason, auth);
    res.status(201).json({ success: true, data: participant });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/evidence ────────────────────────────────

export async function addEvidence(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { source_type, source_id, relevance, hash, chain_block_number, added_reason, metadata } = req.body;
    if (!source_type || !source_id || !added_reason) {
      return res.status(400).json({ success: false, error: 'source_type, source_id, and added_reason are required' });
    }
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.addEvidence({
      case_id: caseId, source_type, source_id, relevance, hash, chain_block_number,
      added_by: req.user!.id, added_reason, metadata,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/forensic/cases/:caseId/evidence ─────────────────────────────────

export async function listEvidence(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicService.listEvidence(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/evidence/:evidenceId/pin ────────────────

export async function pinEvidence(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const evidenceId = req.params.evidenceId as string;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const auth = buildAuthContext(req.user!);
    await forensicService.pinEvidence(evidenceId, reason, req.user!.id, auth);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/notes ───────────────────────────────────

export async function addNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { note_class, content } = req.body;
    if (!content) return res.status(400).json({ success: false, error: 'content is required' });
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.addNote({
      case_id: caseId, note_class: note_class || 'internal_investigation', content, author_id: req.user!.id,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/forensic/cases/:caseId/notes ────────────────────────────────────

export async function listNotes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const role = req.user?.role || '';
    const result = await forensicService.listNotes(caseId, role ? [role] : []);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/tasks ───────────────────────────────────

export async function addTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { title, description, owner_id, due_at, evidence_link } = req.body;
    if (!title || !owner_id) return res.status(400).json({ success: false, error: 'title and owner_id are required' });
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.addTask({ case_id: caseId, title, description, owner_id, due_at, evidence_link }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/forensic/cases/:caseId/tasks/:taskId ──────────────────────────

export async function updateTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId as string;
    const { status, completion_proof } = req.body;
    const auth = buildAuthContext(req.user!);
    await forensicService.updateTask(taskId, { status, completion_proof }, auth);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/forensic/cases/:caseId/tasks ────────────────────────────────────

export async function listTasks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicService.listTasks(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/forensic/cases/:caseId/actions ──────────────────────────────────

export async function listActions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicService.listActions(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/forensic/cases/:caseId/timeline (Phase 2 enhanced) ────────────

export async function getTimeline(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicService.getEnhancedTimeline(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/close ───────────────────────────────────

export async function closeCase(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { outcome, rationale, findings, approval } = req.body;
    if (!outcome || !rationale) {
      return res.status(400).json({ success: false, error: 'outcome and rationale are required' });
    }
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.closeCase(caseId, { outcome, rationale, findings, approval, actor_id: req.user!.id }, auth);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('Cannot close')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/reopen ──────────────────────────────────

export async function reopenCase(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.reopenCase(caseId, reason, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('Cannot reopen')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── Phase 2: POST /api/forensic/cases/:caseId/preserve ─────────────────────

export async function preserveToVault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { evidence_ids, retention_class, preservation_reason } = req.body;
    if (!evidence_ids || !evidence_ids.length || !preservation_reason) {
      return res.status(400).json({ success: false, error: 'evidence_ids and preservation_reason are required' });
    }
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.preserveToVault({
      case_id: caseId, evidence_ids, retention_class: retention_class || 'standard',
      preservation_reason, actor_id: req.user!.id, workspace_id: req.user!.workspace_id || DEFAULT_WORKSPACE_ID,
    }, auth);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('No unpreserved evidence')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── Phase 2: POST /api/forensic/cases/:caseId/legal-hold ───────────────────

export async function applyLegalHold(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { reason, scope } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.applyLegalHold(caseId, reason, req.user!.id, scope, auth);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Phase 2: POST /api/forensic/cases/:caseId/legal-hold/release ───────────

export async function releaseLegalHold(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.releaseLegalHold(caseId, reason, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('not under legal hold')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── Phase 2: GET /api/forensic/cases/sla-report ────────────────────────────

export async function getSlaReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await forensicService.getSlaReport(req.user?.workspace_id || undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Phase 3: POST /api/forensic/cases/:caseId/exports ────────────────────────

export async function createExport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const { package_type, format, redaction_profile, reason, scope, delivery_method } = req.body;
    if (!package_type || !reason) {
      return res.status(400).json({ success: false, error: 'package_type and reason are required' });
    }
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.createExport({
      case_id: caseId, package_type, format: format || 'json',
      redaction_profile: redaction_profile || 'standard',
      reason, actor_id: req.user!.id, scope, delivery_method,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('not supported') || error.message?.includes('Unknown package')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── GET /api/forensic/cases/:caseId/exports ──────────────────────────────────

export async function listExports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicService.listExports(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/exports/:exportId/approve ──────────────

export async function approveExport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const exportId = req.params.exportId as string;
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.approveExport(exportId, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('Cannot approve')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/exports/:exportId/reject ───────────────

export async function rejectExport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const exportId = req.params.exportId as string;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.rejectExport(exportId, reason, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('Cannot reject')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── POST /api/forensic/cases/:caseId/exports/:exportId/generate ─────────────

export async function generateExport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const exportId = req.params.exportId as string;
    const auth = buildAuthContext(req.user!);
    const result = await forensicService.generateExportPackage(exportId, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message?.includes('Cannot generate')) {
      return res.status(422).json({ success: false, error: error.message });
    }
    next(error);
  }
}

// ─── Phase 3: POST /api/forensic/cases/:caseId/evidence/:evidenceId/privilege ─

export async function markEvidencePrivileged(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const evidenceId = req.params.evidenceId as string;
    const auth = buildAuthContext(req.user!);
    await forensicService.markEvidencePrivileged(evidenceId, req.user!.id, auth);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ─── Phase 3: POST /api/forensic/cases/:caseId/evidence/:evidenceId/unpin ────

export async function unpinEvidence(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const evidenceId = req.params.evidenceId as string;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const auth = buildAuthContext(req.user!);
    await forensicService.unpinEvidence(evidenceId, reason, req.user!.id, auth);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
