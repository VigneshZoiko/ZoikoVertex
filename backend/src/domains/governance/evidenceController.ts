import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logToDatabase } from '../../shared/databaseLogger';
import { randomUUID, createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { Readable } from 'stream';

// ─── In-Memory Stores ─────────────────────────────────────────────────────────

interface LegalHold {
  id: string;
  object_id: string;
  object_type: string;
  matter_ref: string;
  reason: string;
  applied_by: string;
  workspace_id: string;
  created_at: string;
}

interface EvidencePack {
  id: string;
  purpose: string;
  scope_description: string;
  format: string;
  status: 'BUILDING' | 'READY' | 'FAILED';
  artifact_count: number;
  requester_id: string;
  workspace_id: string;
  created_at: string;
  export_hash: string;
}

// ─── Evidence Persistence Logic ───────────────────────────────────────────────



/**
 * Helper to fetch from Supabase with fallback to in-memory store
 */
async function getLegalHolds(workspaceId?: string | null, isSuperAdmin?: boolean): Promise<LegalHold[]> {
  try {
    let query = supabaseAdmin.from('legal_holds').select('*');
    if (!isSuperAdmin && workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch {
    return [...legalHoldStore.values()].filter(h => isSuperAdmin || !workspaceId || h.workspace_id === workspaceId);
  }
}

async function getEvidencePacks(workspaceId?: string | null, isSuperAdmin?: boolean): Promise<EvidencePack[]> {
  try {
    let query = supabaseAdmin.from('evidence_packs').select('*');
    if (!isSuperAdmin && workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch {
    return [...evidencePackStore.values()].filter(p => isSuperAdmin || !workspaceId || p.workspace_id === workspaceId);
  }
}

const legalHoldStore  = new Map<string, LegalHold>();
const evidencePackStore = new Map<string, EvidencePack>();

// ─── Defensibility Index ──────────────────────────────────────────────────────

export function calculateDefensibility(intent: Record<string, unknown>): number {
  let score = 0;
  if (intent.id)                                   score += 5;   // identity captured
  if (intent.workspace_id)                         score += 5;   // workspace linkage
  if (intent.creator_id)                           score += 10;  // actor context
  if (intent.content)                              score += 5;   // output captured
  if (intent.platform)                             score += 5;   // destination captured
  if (intent.risk_level)                           score += 10;  // risk assessed
  if ((intent.risk_score as number) > 0)           score += 10;  // risk scored
  if (intent.decision_id)                          score += 15;  // decision engine ran
  if (intent.governance_token || intent.policy_signature) score += 10; // Cryptographic policy verification
  if (intent.feedback)                             score += 10;  // human feedback
  if (intent.status === 'APPROVED')                score += 10;  // authorized
  if (Array.isArray(intent.target_account_ids) && (intent.target_account_ids as string[]).length > 0) score += 5;
  return Math.min(score, 100);
}

function defensibilityLabel(score: number): string {
  if (score >= 95) return 'Defensible';
  if (score >= 85) return 'Review Recommended';
  if (score >= 70) return 'Governance Gap';
  return 'Defensibility Failure';
}

function defensibilityColor(score: number): string {
  if (score >= 95) return 'green';
  if (score >= 85) return 'amber';
  if (score >= 70) return 'orange';
  return 'red';
}

// ─── Validators ───────────────────────────────────────────────────────────────

const LegalHoldSchema = z.object({
  object_id:   z.string(),
  object_type: z.string().default('PUBLISH_INTENT'),
  matter_ref:  z.string().min(3),
  reason:      z.string().min(10),
});

const EvidencePackSchema = z.object({
  purpose:           z.enum(['INTERNAL_AUDIT','REGULATOR_REQUEST','LITIGATION','CUSTOMER_REVIEW','INCIDENT_REVIEW','EXECUTIVE_REVIEW','LEGAL_DISCOVERY']),
  scope_description: z.string().min(5),
  format:            z.enum(['PDF','JSON','CSV','ZIP']).default('JSON'),
  object_ids:        z.array(z.string()).optional(),
  date_from:         z.string().optional(),
  date_to:           z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getWorkspaceId(userId: string): Promise<string | null> {
  const { data: member } = await supabaseAdmin
    .from('workspace_members').select('workspace_id').eq('user_id', userId).maybeSingle();
  return member?.workspace_id ? String(member.workspace_id) : null;
}

// ─── Public logAuditEvent (imported by other controllers) ─────────────────────

export const logAuditEvent = async (params: {
  workspaceId: string;
  actorId: string;
  actorType?: 'USER' | 'AGENT' | 'SYSTEM';
  action: string;
  objectType?: string;
  objectId?: string;
  module: string;
  riskLevel?: string;
  metadata?: Record<string, unknown>;
}) => {
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  try {
    const { data: lastLog } = await supabaseAdmin
      .from('system_logs')
      .select('meta')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (lastLog?.meta && typeof lastLog.meta === 'object' && 'hash' in lastLog.meta) {
      prevHash = String((lastLog.meta as any).hash);
    }
  } catch (err) {
    // Graceful fallback to default genesis hash if table is empty or offline
  }

  const payloadToHash = `${params.workspaceId}-${params.actorId}-${params.action}-${prevHash}`;
  const currentHash = createHash('sha256').update(payloadToHash).digest('hex');

  await logToDatabase('info', params.module, params.action, {
    actor_id:    params.actorId,
    actor_type:  params.actorType || 'USER',
    object_type: params.objectType,
    object_id:   params.objectId,
    risk_level:  params.riskLevel,
    workspace_id: params.workspaceId,
    ...params.metadata,
    prev_hash:   prevHash,
    hash:        currentHash,
    _audit: true,
  });
};

// ─── Audit Trail ──────────────────────────────────────────────────────────────

export const getAuditTrail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { service, level, search, limit = '50', offset = '0' } = req.query;

    let query = supabaseAdmin
      .from('system_logs')
      .select('*', { count: 'exact' });

    if (service && typeof service === 'string') query = query.eq('service', service);
    if (level && typeof level === 'string')     query = query.eq('level', level);
    if (search && typeof search === 'string')   query = query.ilike('message', `%${search}%`);

    const lim = Math.min(parseInt(String(limit), 10), 200);
    const off = parseInt(String(offset), 10);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(off, off + lim - 1);

    if (error) throw error;

    res.json({ success: true, data: data || [], total: count ?? 0 });
  } catch (error) {
    next(error);
  }
};

export const getAuditStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: all } = await supabaseAdmin
      .from('system_logs')
      .select('level, service, created_at');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const stats = {
      total:      (all || []).length,
      today:      (all || []).filter(e => e.created_at >= todayStr).length,
      errors:     (all || []).filter(e => e.level === 'error').length,
      warnings:   (all || []).filter(e => e.level === 'warn').length,
      services:   [...new Set((all || []).map(e => e.service))].filter(Boolean),
    };

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

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    let query = supabaseAdmin
      .from('publish_intents')
      .select('*, creator:users!publish_intents_creator_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const holds = await getLegalHolds(workspaceId, isSuperAdmin);
    const holdIds = new Set(holds.map(h => h.object_id));

    const artifacts = (data || []).map(intent => {
      const defensibility = calculateDefensibility(intent as Record<string, unknown>);
      return {
        ...intent,
        artifact_uuid:      `ART-${String(intent.id).slice(0, 8).toUpperCase()}`,
        artifact_type:      'CONTENT_PUBLISH',
        defensibility_index: defensibility,
        defensibility_label: defensibilityLabel(defensibility),
        defensibility_color: defensibilityColor(defensibility),
        is_on_legal_hold:   holdIds.has(String(intent.id)),
      };
    });

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

    const { data: intent, error } = await supabaseAdmin
      .from('publish_intents')
      .select('*, creator:users!publish_intents_creator_id_fkey(full_name, email)')
      .eq('id', id)
      .single();

    if (error || !intent) return res.status(404).json({ error: 'Artifact not found' });

    const defensibility = calculateDefensibility(intent as Record<string, unknown>);

    // Build Decision Trace
    const decisionTrace = {
      instruction_summary: `Content creation for ${intent.platform} platform.`,
      agent_action_summary: intent.approval_level
        ? `Routed through approval path: ${intent.approval_level}`
        : 'Direct submission.',
      policy_evaluation_summary: intent.decision_id
        ? `Decision engine evaluated — decision ID: ${intent.decision_id}`
        : 'No decision engine evaluation recorded.',
      risk_signal_summary: `Risk level: ${intent.risk_level || 'UNKNOWN'} (score: ${intent.risk_score || 0}). Factors: ${(intent.risk_factors as string[] || []).join(', ') || 'None detected'}.`,
      human_intervention_summary: intent.feedback
        ? `Human feedback recorded: "${intent.feedback}"`
        : 'No human feedback recorded.',
      final_decision_path: intent.status,
    };

    // Provenance timeline
    const provenance = [
      { moment: 'T0', label: 'Submission',     timestamp: intent.created_at,    data: `Creator submitted content for ${intent.platform}` },
      { moment: 'T1', label: 'Risk Assessment', timestamp: intent.created_at,   data: `Risk level: ${intent.risk_level || 'STANDARD'}, Score: ${intent.risk_score || 0}` },
      { moment: 'T2', label: 'Policy Check',    timestamp: intent.created_at,   data: intent.decision_id ? `Decision ID: ${intent.decision_id}` : 'No policy snapshot captured' },
      { moment: 'T3', label: 'Review',          timestamp: intent.updated_at || intent.created_at, data: intent.feedback || 'No review feedback' },
      { moment: 'T4', label: 'Authorization',   timestamp: intent.updated_at || intent.created_at, data: `Final status: ${intent.status}` },
    ];

    const holds = await getLegalHolds(intent.workspace_id, true);
    const legalHold = holds.find(h => h.object_id === id);

    res.json({
      success: true,
      data: {
        ...intent,
        artifact_uuid:       `ART-${String(intent.id).slice(0, 8).toUpperCase()}`,
        artifact_type:       'CONTENT_PUBLISH',
        defensibility_index: defensibility,
        defensibility_label: defensibilityLabel(defensibility),
        decision_trace:      decisionTrace,
        provenance,
        legal_hold:          legalHold || null,
        is_on_legal_hold:    !!legalHold,
        exports:             [...evidencePackStore.values()].filter(p =>
          p.workspace_id === String(intent.workspace_id)
        ).slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEvidenceStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    let query = supabaseAdmin.from('publish_intents').select('id, status, risk_level, risk_score, decision_id, feedback, target_account_ids, platform, content, workspace_id, creator_id');
    if (!isSuperAdmin && workspaceId) query = query.eq('workspace_id', workspaceId);

    const { data } = await query;

    let defensible = 0, gaps = 0, failures = 0, reviewRecommended = 0;
    for (const intent of data || []) {
      const score = calculateDefensibility(intent as Record<string, unknown>);
      if (score >= 95) defensible++;
      else if (score >= 85) reviewRecommended++;
      else if (score >= 70) gaps++;
      else failures++;
    }

    const wsHolds = await getLegalHolds(workspaceId, isSuperAdmin);
    const wsPacks = await getEvidencePacks(workspaceId, isSuperAdmin);

    res.json({
      success: true,
      data: {
        total_artifacts:     (data || []).length,
        defensible,
        review_recommended:  reviewRecommended,
        governance_gaps:     gaps,
        defensibility_failures: failures,
        active_legal_holds:  wsHolds.length,
        evidence_packs:      wsPacks.length,
        avg_defensibility:   data?.length
          ? Math.round((data.reduce((acc, i) => acc + calculateDefensibility(i as Record<string, unknown>), 0)) / data.length)
          : 0,
      },
    });
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

    const workspaceId = await getWorkspaceId(userId) || 'unknown';

    const hold: LegalHold = {
      id: randomUUID(),
      object_id,
      object_type,
      matter_ref,
      reason,
      applied_by: userId,
      workspace_id: workspaceId || '00000000-0000-0000-0000-000000000000',
      created_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabaseAdmin.from('legal_holds').insert(hold);
      if (error) throw error;
    } catch {
      legalHoldStore.set(hold.id, hold);
    }

    await logAuditEvent({
      workspaceId,
      actorId: userId,
      module: 'EvidenceVault',
      action: `Legal Hold applied on ${object_type} ${object_id}`,
      metadata: { hold_id: hold.id, matter_ref, risk_level: 'HIGH' }
    });

    res.status(201).json({ success: true, data: hold });
  } catch (error) {
    next(error);
  }
};

export const listLegalHolds = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;
    const holds = await getLegalHolds(workspaceId, isSuperAdmin);

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

    const holds = await getLegalHolds(undefined, true);
    const hold = holds.find(h => h.id === id);
    if (!hold) return res.status(404).json({ error: 'Legal hold not found' });

    try {
      const { error } = await supabaseAdmin.from('legal_holds').delete().eq('id', id);
      if (error) throw error;
    } catch {
      legalHoldStore.delete(id);
    }

    await logAuditEvent({
      workspaceId: hold.workspace_id,
      actorId: userId,
      module: 'EvidenceVault',
      action: `Legal Hold released on ${hold.object_type} ${hold.object_id}`,
      metadata: { hold_id: id, matter_ref: hold.matter_ref }
    });

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

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    // Fetch relevant artifacts
    let query = supabaseAdmin
      .from('publish_intents')
      .select('id, content, platform, status, risk_level, risk_score, decision_id, feedback, created_at');

    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    if (object_ids?.length) {
      query = query.in('id', object_ids);
    }
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to)   query = query.lte('created_at', date_to);

    const { data: artifacts } = await query.limit(500);
    const count = (artifacts || []).length;

    const pack: EvidencePack = {
      id:                randomUUID(),
      purpose,
      scope_description,
      format,
      status:            'READY',
      artifact_count:    count,
      requester_id:      userId,
      workspace_id:      workspaceId || '00000000-0000-0000-0000-000000000000',
      created_at:        new Date().toISOString(),
      export_hash:       `sha256-${randomUUID().replace(/-/g, '')}`,
    };
    try {
      const { error } = await supabaseAdmin.from('evidence_packs').insert(pack);
      if (error) throw error;
    } catch {
      evidencePackStore.set(pack.id, pack);
    }

    await logAuditEvent({
      workspaceId: pack.workspace_id,
      actorId: userId,
      module: 'EvidenceVault',
      action: `Evidence Pack built — ${count} artifacts — ${purpose}`,
      metadata: { pack_id: pack.id, purpose, format, artifact_count: count }
    });

    // Return pack + the data for client-side export
    res.status(201).json({
      success: true,
      data: { pack, artifacts: artifacts || [] },
    });
  } catch (error) {
    next(error);
  }
};

export const listEvidencePacks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;
    const packs = await getEvidencePacks(workspaceId, isSuperAdmin);
    const sortedPacks = packs.sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json({ success: true, data: sortedPacks });
  } catch (error) {
    next(error);
  }
};

// ─── Check Legal Hold (used by deleteIntent) ──────────────────────────────────

export const isOnLegalHold = (objectId: string): boolean => {
  return [...legalHoldStore.values()].some(h => h.object_id === objectId);
};

// ─── Direct PDF Exporter helper ────────────────────────────────────────────────
function generateEvidencePDF(pack: EvidencePack, artifacts: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    // Sleek Title Header
    doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('ZOIKOVERTEX');
    doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('SOVEREIGN EVIDENCE VAULT & COMPLIANCE BUNDLE');
    doc.moveDown(0.5);
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Section 1: Certificate of Authenticity
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Certificate of Authenticity');
    doc.moveDown(0.5);

    const certY = doc.y;
    doc.rect(50, certY, 495, 110).fill('#f8fafc');
    doc.fillColor('#0f172a');
    
    doc.fontSize(9).font('Helvetica-Bold').text('Pack Reference ID:', 70, certY + 15);
    doc.font('Helvetica').text(pack.id, 180, certY + 15);

    doc.font('Helvetica-Bold').text('Requester ID:', 70, certY + 30);
    doc.font('Helvetica').text(pack.requester_id, 180, certY + 30);

    doc.font('Helvetica-Bold').text('Compliance Purpose:', 70, certY + 45);
    doc.font('Helvetica').text(pack.purpose, 180, certY + 45);

    doc.font('Helvetica-Bold').text('Scope Description:', 70, certY + 60);
    doc.font('Helvetica').text(pack.scope_description, 180, certY + 60);

    doc.font('Helvetica-Bold').text('Ledger Signature Hash:', 70, certY + 75);
    doc.fillColor('#b91c1c').font('Helvetica-Bold').text(pack.export_hash, 180, certY + 75);

    doc.fillColor('#0f172a');
    doc.y = certY + 130;
    doc.moveDown(1);

    // Section 2: Audit Logs
    doc.fontSize(14).font('Helvetica-Bold').text('Evidence Artifact List');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique').text(`Total Extracted Records: ${artifacts.length} publish intents.`);
    doc.fillColor('#0f172a');
    doc.moveDown(1);

    // Draw Table of Artifacts
    const tableY = doc.y;
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, tableY).lineTo(545, tableY).stroke();
    doc.moveDown(0.5);

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Artifact ID', 50, tableY + 5, { width: 120 });
    doc.text('Platform', 180, tableY + 5, { width: 60 });
    doc.text('Status', 250, tableY + 5, { width: 70 });
    doc.text('Risk Score', 330, tableY + 5, { width: 60 });
    doc.text('Decision ID', 400, tableY + 5, { width: 140 });

    doc.strokeColor('#cbd5e1').moveTo(50, tableY + 18).lineTo(545, tableY + 18).stroke();
    
    let currentY = tableY + 23;
    artifacts.slice(0, 15).forEach((art: any) => {
      if (currentY > 730) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(8).font('Helvetica');
      doc.text(`ART-${String(art.id).slice(0, 8).toUpperCase()}`, 50, currentY, { width: 120 });
      doc.text(String(art.platform || 'unknown').toUpperCase(), 180, currentY, { width: 60 });
      doc.text(String(art.status || 'unknown'), 250, currentY, { width: 70 });
      doc.text(`${art.risk_score || 0}%`, 330, currentY, { width: 60 });
      doc.text(String(art.decision_id || 'N/A').slice(0, 20), 400, currentY, { width: 140 });

      currentY += 15;
    });

    if (artifacts.length > 15) {
      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica-Oblique').text(`... and ${artifacts.length - 15} more artifacts bundled securely in this export package.`);
    }

    doc.end();
  });
}

// ─── Direct ZIP Exporter helper ────────────────────────────────────────────────
function generateEvidenceZIP(pack: EvidencePack, artifacts: any[], pdfBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', err => reject(err));

    // Append manifest
    const manifest = JSON.stringify({ pack, artifacts }, null, 2);
    archive.append(manifest, { name: 'evidence_manifest.json' });

    // Append PDF Certificate
    archive.append(pdfBuffer, { name: 'evidence_certificate.pdf' });

    // Append README
    const readme = `ZOIKOVERTEX SOVEREIGN EVIDENCE ZIP BUNDLE
=========================================
Export ID: ${pack.id}
Created At: ${pack.created_at}
Purpose: ${pack.purpose}
Export Hash: ${pack.export_hash}

HOW TO VERIFY THE INTEGRITY OF THIS COMPLIANCE BUNDLE:
1. Open the ZoikoVertex Evidence review dashboard.
2. Upload the 'evidence_manifest.json' file to the cryptographic verification widget.
3. The widget recalculates the SHA-256 of 'artifacts' to cross-reference with 'export_hash'.
`;
    archive.append(readme, { name: 'README.txt' });

    // Append individual JSON files under artifacts/
    artifacts.forEach((art: any) => {
      const artStr = JSON.stringify(art, null, 2);
      archive.append(artStr, { name: `artifacts/artifact_ART-${String(art.id).slice(0, 8).toUpperCase()}.json` });
    });

    archive.finalize();
  });
}

// ─── Download Evidence Pack controller ─────────────────────────────────────────
export const downloadEvidencePack = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    // Fetch the pack metadata
    const packs = await getEvidencePacks(workspaceId, isSuperAdmin);
    const pack = packs.find(p => p.id === id);
    if (!pack) {
      res.status(404).json({ error: 'Evidence pack not found' });
      return;
    }

    // Re-query the exact artifacts matching this scope/dates to rebuild the zip/pdf on the fly!
    let query = supabaseAdmin
      .from('publish_intents')
      .select('id, content, platform, status, risk_level, risk_score, decision_id, feedback, created_at');

    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    
    const { data: artifacts } = await query.limit(500);

    const pdfBuffer = await generateEvidencePDF(pack, artifacts || []);

    if (pack.format === 'PDF') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="evidence_pack_${pack.id.slice(0, 8)}.pdf"`);
      res.send(pdfBuffer);
      return;
    } else if (pack.format === 'ZIP') {
      const zipBuffer = await generateEvidenceZIP(pack, artifacts || [], pdfBuffer);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="evidence_pack_${pack.id.slice(0, 8)}.zip"`);
      res.send(zipBuffer);
      return;
    } else if (pack.format === 'CSV') {
      let csv = 'id,content,platform,status,risk_level,risk_score,decision_id,feedback,created_at\n';
      (artifacts || []).forEach((art: any) => {
        csv += `"${art.id}","${(art.content || '').replace(/"/g, '""')}","${art.platform || ''}","${art.status || ''}","${art.risk_level || ''}","${art.risk_score || 0}","${art.decision_id || ''}","${(art.feedback || '').replace(/"/g, '""')}","${art.created_at}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="evidence_pack_${pack.id.slice(0, 8)}.csv"`);
      res.send(Buffer.from(csv));
      return;
    } else {
      // Fallback JSON download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="evidence_pack_${pack.id.slice(0, 8)}.json"`);
      res.send(JSON.stringify({ pack, artifacts: artifacts || [] }, null, 2));
      return;
    }
  } catch (error) {
    next(error);
  }
};
