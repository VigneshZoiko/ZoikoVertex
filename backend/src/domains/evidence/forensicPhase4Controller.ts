import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { buildAuthContext } from '../../shared/serviceAuth';
import * as forensicAi from '../../services/forensicAi.service';

const DEFAULT_WORKSPACE_ID = 'WRK-001';

// ─── AI: Generate Case Summary ────────────────────────────────────────────────

export async function generateAiSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = buildAuthContext(req.user!);
    const caseId = req.params.caseId as string;
    const result = await forensicAi.generateCaseSummary(caseId, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── AI: Approve/Reject Summary ───────────────────────────────────────────────

export async function approveAiSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = buildAuthContext(req.user!);
    const summaryId = req.params.summaryId as string;
    const result = await forensicAi.approveAiSummary(summaryId, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function rejectAiSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = buildAuthContext(req.user!);
    const summaryId = req.params.summaryId as string;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' });
    const result = await forensicAi.rejectAiSummary(summaryId, reason, auth);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── AI: List Summaries ────────────────────────────────────────────────────────

export async function listAiSummaries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicAi.listAiSummaries(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── AI: Timeline Explanation ──────────────────────────────────────────────────

export async function generateTimelineExplanation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = buildAuthContext(req.user!);
    const caseId = req.params.caseId as string;
    const result = await forensicAi.generateTimelineExplanation(caseId, req.user!.id, auth);
    res.json({ success: true, data: { explanation: result } });
  } catch (error) {
    next(error);
  }
}

// ─── AI: Anomaly Detection ─────────────────────────────────────────────────────

export async function detectAnomalies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = buildAuthContext(req.user!);
    const caseId = req.params.caseId as string;
    const result = await forensicAi.detectAnomalies(caseId, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listAnomalies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicAi.listAnomalies(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── AI: Recommendations ───────────────────────────────────────────────────────

export async function generateRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = buildAuthContext(req.user!);
    const caseId = req.params.caseId as string;
    const result = await forensicAi.generateRecommendations(caseId, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── SIEM: Route Case Event ────────────────────────────────────────────────────

export async function routeToSiem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = buildAuthContext(req.user!);
    const caseId = req.params.caseId as string;
    const { event_type } = req.body;
    if (!event_type) return res.status(400).json({ success: false, error: 'event_type is required' });
    const result = await forensicAi.routeToSiem(caseId, event_type, req.user!.id, auth);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getSiemHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.caseId as string;
    const result = await forensicAi.getSiemRoutingHistory(caseId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── External Auditor ─────────────────────────────────────────────────────────

export async function createAuditorSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = buildAuthContext(req.user!);
    const { case_id, export_id, auditor_id } = req.body;
    if (!case_id || !export_id || !auditor_id) {
      return res.status(400).json({ success: false, error: 'case_id, export_id, and auditor_id are required' });
    }
    const result = await forensicAi.createAuditorSession({
      case_id, export_id, auditor_id,
      workspace_id: req.user!.workspace_id || DEFAULT_WORKSPACE_ID,
    }, auth);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ─── Export Narrative ─────────────────────────────────────────────────────────

export async function getExportNarrative(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const exportId = req.params.exportId as string;
    const result = await forensicAi.getExportNarrative(exportId);
    res.json({ success: true, data: { narrative: result } });
  } catch (error) {
    next(error);
  }
}
