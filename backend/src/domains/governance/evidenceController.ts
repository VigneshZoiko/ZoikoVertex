import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import {
  LegalHoldSchema,
  EvidencePackSchema,
  createLegalHold,
  releaseLegalHoldById,
  listLegalHolds as svcListLegalHolds,
  listEvidencePacks as svcListEvidencePacks,
  buildEvidencePack as svcBuildEvidencePack,
  downloadEvidencePackById,
  queryGovernanceAudit,
  queryGovernanceAuditStats,
  fetchEvidenceArtifacts,
  fetchEvidenceArtifactDetail,
  computeEvidenceStats,
  generateEvidenceZIP,
} from '../../services/govEvidence.service';

// Re-export logAuditEvent for backward compatibility with other controllers
export { logAuditEvent, calculateDefensibility, isOnLegalHold } from '../../services/govEvidence.service';

// ─── Audit Trail ──────────────────────────────────────────────────────────────

export const getAuditTrail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id ?? undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { search, limit = '50', offset = '0', event_category, risk_level, status } = req.query;
    const lim = Math.min(parseInt(String(limit), 10), 200);
    const off = parseInt(String(offset), 10);

    const result = await queryGovernanceAudit({
      workspaceId,
      search: search as string | undefined,
      event_category: event_category as string | undefined,
      risk_level: risk_level as string | undefined,
      status: status as string | undefined,
      limit: lim,
      offset: off,
    });

    res.json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const getAuditStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = req.user?.workspace_id ?? undefined;
    const stats = await queryGovernanceAuditStats(workspaceId);

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// ─── Evidence Artifacts ───────────────────────────────────────────────────────

export const getEvidenceArtifacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin ?? false;
    const workspaceId = req.user?.workspace_id ?? undefined;

    const artifacts = await fetchEvidenceArtifacts(workspaceId, isSuperAdmin);

    res.json({ success: true, data: artifacts });
  } catch (error) {
    next(error);
  }
};

export const getEvidenceArtifactDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const detail = await fetchEvidenceArtifactDetail(id);
    if (!detail) return res.status(404).json({ error: 'Artifact not found' });

    res.json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};

export const getEvidenceStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin ?? false;
    const workspaceId = req.user?.workspace_id ?? undefined;

    const stats = await computeEvidenceStats(workspaceId, isSuperAdmin);

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// ─── Legal Hold ───────────────────────────────────────────────────────────────

export const applyLegalHold = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { object_id, object_type, matter_ref, reason } = LegalHoldSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .maybeSingle();
    const workspaceId = member?.workspace_id ? String(member.workspace_id) : '';

    const hold = await createLegalHold({ object_id, object_type, matter_ref, reason, userId, workspaceId });

    res.status(201).json({ success: true, data: hold });
  } catch (error) {
    next(error);
  }
};

export const listLegalHolds = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin ?? false;
    const workspaceId = req.user?.workspace_id ?? undefined;
    const holds = await svcListLegalHolds(workspaceId, isSuperAdmin);

    res.json({ success: true, data: holds });
  } catch (error) {
    next(error);
  }
};

export const releaseLegalHold = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const hold = await releaseLegalHoldById(id, userId);
    if (!hold) return res.status(404).json({ error: 'Legal hold not found' });

    res.json({ success: true, message: 'Legal hold released' });
  } catch (error) {
    next(error);
  }
};

// ─── Evidence Pack ────────────────────────────────────────────────────────────

export const buildEvidencePack = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { purpose, scope_description, format, object_ids, date_from, date_to } = EvidencePackSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin ?? false;
    const workspaceId = req.user?.workspace_id ?? undefined;

    const { pack, artifacts } = await svcBuildEvidencePack({
      purpose,
      scope_description,
      format,
      object_ids,
      date_from,
      date_to,
      userId,
      workspaceId,
      isSuperAdmin,
    });

    res.status(201).json({
      success: true,
      data: { pack, artifacts },
    });
  } catch (error) {
    next(error);
  }
};

export const listEvidencePacks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin ?? false;
    const workspaceId = req.user?.workspace_id ?? undefined;
    const packs = await svcListEvidencePacks(workspaceId, isSuperAdmin);
    const sortedPacks = packs.sort((a, b) => b.created_at.localeCompare(a.created_at));

    res.json({ success: true, data: sortedPacks });
  } catch (error) {
    next(error);
  }
};

export const downloadEvidencePack = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin ?? false;
    const workspaceId = req.user?.workspace_id ?? undefined;

    const result = await downloadEvidencePackById(id, workspaceId, isSuperAdmin);
    if (!result) {
      res.status(404).json({ error: 'Evidence pack not found' });
      return;
    }

    const { pack, artifacts, pdfBuffer } = result;

    if (pack.format === 'PDF') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="evidence_pack_${pack.id.slice(0, 8)}.pdf"`);
      res.send(pdfBuffer);
    } else if (pack.format === 'ZIP') {
      const zipBuffer = await generateEvidenceZIP(pack, artifacts, pdfBuffer);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="evidence_pack_${pack.id.slice(0, 8)}.zip"`);
      res.send(zipBuffer);
    } else if (pack.format === 'CSV') {
      let csv = 'id,content,platform,status,risk_level,risk_score,decision_id,feedback,created_at\n';
      artifacts.forEach((art: Record<string, unknown>) => {
        csv += `"${art.id}","${(String(art.content || '')).replace(/"/g, '""')}","${art.platform || ''}","${art.status || ''}","${art.risk_level || ''}","${art.risk_score || 0}","${art.decision_id || ''}","${(String(art.feedback || '')).replace(/"/g, '""')}","${art.created_at}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="evidence_pack_${pack.id.slice(0, 8)}.csv"`);
      res.send(Buffer.from(csv));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="evidence_pack_${pack.id.slice(0, 8)}.json"`);
      res.send(JSON.stringify({ pack, artifacts }, null, 2));
    }
  } catch (error) {
    next(error);
  }
};
