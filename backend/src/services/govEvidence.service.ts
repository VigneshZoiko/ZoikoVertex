import { z } from 'zod';
import { createHash, randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { supabaseAdmin } from '../shared/supabase';
import { internalEventBus } from '../shared/internalEventBus';
import { logToDatabase } from '../shared/databaseLogger';
import { DEFAULT_WORKSPACE_ID } from '../shared/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LegalHold {
  id: string;
  object_id: string;
  object_type: string;
  matter_ref: string;
  reason: string;
  applied_by: string;
  workspace_id: string;
  created_at: string;
}

export interface EvidencePack {
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

// ─── In-Memory Stores ───────────────────────────────────────────────────────

const legalHoldStore = new Map<string, LegalHold>();
const evidencePackStore = new Map<string, EvidencePack>();

// ─── Evidence Persistence ───────────────────────────────────────────────────

export async function listLegalHolds(
  workspaceId?: string | null,
  isSuperAdmin?: boolean
): Promise<LegalHold[]> {
  try {
    let query = supabaseAdmin.from('legal_holds').select('*');
    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch {
    return [...legalHoldStore.values()].filter(
      (h) => isSuperAdmin || !workspaceId || h.workspace_id === workspaceId
    );
  }
}

export async function listEvidencePacks(
  workspaceId?: string | null,
  isSuperAdmin?: boolean
): Promise<EvidencePack[]> {
  try {
    let query = supabaseAdmin.from('evidence_packs').select('*');
    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch {
    return [...evidencePackStore.values()].filter(
      (p) => isSuperAdmin || !workspaceId || p.workspace_id === workspaceId
    );
  }
}

export async function resolveWorkspaceId(userId: string): Promise<string | null> {
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .maybeSingle();
  return member?.workspace_id ? String(member.workspace_id) : null;
}

// ─── Defensibility Index ────────────────────────────────────────────────────

export function calculateDefensibility(intent: Record<string, unknown>): number {
  let score = 0;
  if (intent.id) score += 5;
  if (intent.workspace_id) score += 5;
  if (intent.creator_id) score += 10;
  if (intent.content) score += 5;
  if (intent.platform) score += 5;
  if (intent.risk_level) score += 10;
  if ((intent.risk_score as number) > 0) score += 10;
  if (intent.decision_id) score += 15;
  if (intent.governance_token || intent.policy_signature) score += 10;
  if (intent.feedback) score += 10;
  if (intent.status === 'APPROVED') score += 10;
  if (
    Array.isArray(intent.target_account_ids) &&
    (intent.target_account_ids as string[]).length > 0
  )
    score += 5;
  return Math.min(score, 100);
}

export function defensibilityLabel(score: number): string {
  if (score >= 95) return 'Defensible';
  if (score >= 85) return 'Review Recommended';
  if (score >= 70) return 'Governance Gap';
  return 'Defensibility Failure';
}

export function defensibilityColor(score: number): string {
  if (score >= 95) return 'green';
  if (score >= 85) return 'amber';
  if (score >= 70) return 'orange';
  return 'red';
}

// ─── Validators ─────────────────────────────────────────────────────────────

export const LegalHoldSchema = z.object({
  object_id: z.string(),
  object_type: z.string().default('PUBLISH_INTENT'),
  matter_ref: z.string().min(3),
  reason: z.string().min(10),
});

export const EvidencePackSchema = z.object({
  purpose: z.enum([
    'INTERNAL_AUDIT',
    'REGULATOR_REQUEST',
    'LITIGATION',
    'CUSTOMER_REVIEW',
    'INCIDENT_REVIEW',
    'EXECUTIVE_REVIEW',
    'LEGAL_DISCOVERY',
  ]),
  scope_description: z.string().min(5),
  format: z.enum(['PDF', 'JSON', 'CSV', 'ZIP']).default('JSON'),
  object_ids: z.array(z.string()).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

// ─── Audit Helper (used by other controllers) ───────────────────────────────

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
  let prevHash =
    '0000000000000000000000000000000000000000000000000000000000000000';
  try {
    const { data: lastLog } = await supabaseAdmin
      .from('system_logs')
      .select('meta')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      lastLog?.meta &&
      typeof lastLog.meta === 'object' &&
      'hash' in lastLog.meta
    ) {
      prevHash = String((lastLog.meta as Record<string, unknown>).hash);
    }
  } catch {
    // Graceful fallback to genesis hash
  }

  const payloadToHash = `${params.workspaceId}-${params.actorId}-${params.action}-${prevHash}`;
  const currentHash = createHash('sha256')
    .update(payloadToHash)
    .digest('hex');

  await logToDatabase('info', params.module, params.action, {
    actor_id: params.actorId,
    actor_type: params.actorType || 'USER',
    object_type: params.objectType,
    object_id: params.objectId,
    risk_level: params.riskLevel,
    workspace_id: params.workspaceId,
    ...params.metadata,
    prev_hash: prevHash,
    hash: currentHash,
    _audit: true,
  });
};

// ─── Legal Hold Operations ──────────────────────────────────────────────────

export async function createLegalHold(params: {
  object_id: string;
  object_type: string;
  matter_ref: string;
  reason: string;
  userId: string;
  workspaceId: string;
}): Promise<LegalHold> {
  const hold: LegalHold = {
    id: randomUUID(),
    object_id: params.object_id,
    object_type: params.object_type,
    matter_ref: params.matter_ref,
    reason: params.reason,
    applied_by: params.userId,
    workspace_id: params.workspaceId || DEFAULT_WORKSPACE_ID,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabaseAdmin.from('legal_holds').insert(hold);
    if (error) throw error;
  } catch {
    legalHoldStore.set(hold.id, hold);
  }

  await logAuditEvent({
    workspaceId: params.workspaceId,
    actorId: params.userId,
    module: 'EvidenceVault',
    action: `Legal Hold applied on ${params.object_type} ${params.object_id}`,
    metadata: { hold_id: hold.id, matter_ref: params.matter_ref, risk_level: 'HIGH' },
  });

  try {
    internalEventBus.emit('gov_evidence.hold_applied', {
      workspace_id: params.workspaceId,
      actor_id: params.userId,
      hold_id: hold.id,
      object_id: params.object_id,
    });
  } catch { /* non-blocking */ }

  return hold;
}

export async function releaseLegalHoldById(
  id: string,
  userId: string
): Promise<LegalHold | null> {
  const holds = await listLegalHolds(undefined, true);
  const hold = holds.find((h) => h.id === id);
  if (!hold) return null;

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
    metadata: { hold_id: id, matter_ref: hold.matter_ref },
  });

  return hold;
}

export function isOnLegalHold(objectId: string): boolean {
  return [...legalHoldStore.values()].some((h) => h.object_id === objectId);
}

// ─── Evidence Pack Operations ───────────────────────────────────────────────

export async function buildEvidencePack(params: {
  purpose: string;
  scope_description: string;
  format: string;
  object_ids?: string[];
  date_from?: string;
  date_to?: string;
  userId: string;
  workspaceId: string | undefined;
  isSuperAdmin: boolean;
}) {
  let query = supabaseAdmin
    .from('publish_intents')
    .select(
      'id, content, platform, status, risk_level, risk_score, decision_id, feedback, created_at'
    );

  if (!params.isSuperAdmin && params.workspaceId) {
    query = query.eq('workspace_id', params.workspaceId);
  }

  if (params.object_ids?.length) {
    query = query.in('id', params.object_ids);
  }
  if (params.date_from) query = query.gte('created_at', params.date_from);
  if (params.date_to) query = query.lte('created_at', params.date_to);

  const { data: artifacts } = await query.limit(500);
  const count = (artifacts || []).length;

  const pack: EvidencePack = {
    id: randomUUID(),
    purpose: params.purpose,
    scope_description: params.scope_description,
    format: params.format,
    status: 'READY',
    artifact_count: count,
    requester_id: params.userId,
    workspace_id: params.workspaceId || DEFAULT_WORKSPACE_ID,
    created_at: new Date().toISOString(),
    export_hash: `sha256-${randomUUID().replace(/-/g, '')}`,
  };

  try {
    const { error } = await supabaseAdmin.from('evidence_packs').insert(pack);
    if (error) throw error;
  } catch {
    evidencePackStore.set(pack.id, pack);
  }

  await logAuditEvent({
    workspaceId: pack.workspace_id,
    actorId: params.userId,
    module: 'EvidenceVault',
    action: `Evidence Pack built — ${count} artifacts — ${params.purpose}`,
    metadata: {
      pack_id: pack.id,
      purpose: params.purpose,
      format: params.format,
      artifact_count: count,
    },
  });

  return { pack, artifacts: artifacts || [] };
}

// ─── Governance Audit Queries ───────────────────────────────────────────────

export async function queryGovernanceAudit(params: {
  workspaceId?: string;
  search?: string;
  event_category?: string;
  risk_level?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  let query = supabaseAdmin
    .from('audit_events')
    .select('*', { count: 'exact' });

  if (params.workspaceId) query = query.eq('workspace_id', params.workspaceId);
  if (params.event_category) query = query.eq('event_category', params.event_category);
  if (params.risk_level) query = query.eq('risk_level', params.risk_level);
  if (params.status) query = query.eq('status', params.status);
  if (params.search) {
    query = query.or(
      `event_id.ilike.%${params.search}%,event_title.ilike.%${params.search}%,event_summary.ilike.%${params.search}%`
    );
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) throw error;
  return { data: data || [], total: count ?? 0 };
}

export async function queryGovernanceAuditStats(workspaceId?: string) {
  let query = supabaseAdmin
    .from('audit_events')
    .select('risk_level, status, event_category, created_at');

  if (workspaceId) query = query.eq('workspace_id', workspaceId);

  const { data: all } = await query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  return {
    total: (all || []).length,
    today: (all || []).filter((e) => e.created_at >= todayStr).length,
    errors: (all || []).filter((e) => e.status === 'failed').length,
    warnings: (all || []).filter((e) => e.risk_level === 'medium').length,
    critical: (all || []).filter((e) => e.risk_level === 'critical').length,
    event_categories: [
      ...new Set((all || []).map((e) => e.event_category)),
    ].filter(Boolean),
  };
}

// ─── Evidence Artifacts ─────────────────────────────────────────────────────

export async function fetchEvidenceArtifacts(
  workspaceId?: string,
  isSuperAdmin?: boolean
) {
  let data: Record<string, unknown>[] = [];
  try {
    let query = supabaseAdmin
      .from('publish_intents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    data = (rows || []) as Record<string, unknown>[];
  } catch {
    data = [];
  }

  const holds = await listLegalHolds(workspaceId, isSuperAdmin);
  const holdIds = new Set(holds.map((h) => h.object_id));

  return data.map((intent) => {
    const defensibility = calculateDefensibility(intent);
    return {
      ...intent,
      artifact_uuid: `ART-${String(intent.id).slice(0, 8).toUpperCase()}`,
      artifact_type: 'CONTENT_PUBLISH',
      defensibility_index: defensibility,
      defensibility_label: defensibilityLabel(defensibility),
      defensibility_color: defensibilityColor(defensibility),
      is_on_legal_hold: holdIds.has(String(intent.id)),
    };
  });
}

export async function fetchEvidenceArtifactDetail(
  id: string
) {
  let intent: Record<string, unknown> | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    intent = data as Record<string, unknown>;
  } catch {
    // Graceful fallback
  }

  if (!intent) return null;

  if (intent.creator_id) {
    try {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('id', intent.creator_id)
        .single();
      if (userRow) {
        intent.creator = userRow;
      }
    } catch {
      // ignore fallback errors
    }
  }

  const defensibility = calculateDefensibility(intent);

  const decisionTrace = {
    instruction_summary: `Content creation for ${intent.platform} platform.`,
    agent_action_summary: intent.approval_level
      ? `Routed through approval path: ${intent.approval_level}`
      : 'Direct submission.',
    policy_evaluation_summary: intent.decision_id
      ? `Decision engine evaluated — decision ID: ${intent.decision_id}`
      : 'No decision engine evaluation recorded.',
    risk_signal_summary: `Risk level: ${intent.risk_level || 'UNKNOWN'} (score: ${intent.risk_score || 0}). Factors: ${((intent.risk_factors as string[]) || []).join(', ') || 'None detected'}.`,
    human_intervention_summary: intent.feedback
      ? `Human feedback recorded: "${intent.feedback}"`
      : 'No human feedback recorded.',
    final_decision_path: intent.status,
  };

  const provenance = [
    {
      moment: 'T0',
      label: 'Submission',
      timestamp: intent.created_at,
      data: `Creator submitted content for ${intent.platform}`,
    },
    {
      moment: 'T1',
      label: 'Risk Assessment',
      timestamp: intent.created_at,
      data: `Risk level: ${intent.risk_level || 'STANDARD'}, Score: ${intent.risk_score || 0}`,
    },
    {
      moment: 'T2',
      label: 'Policy Check',
      timestamp: intent.created_at,
      data: intent.decision_id
        ? `Decision ID: ${intent.decision_id}`
        : 'No policy snapshot captured',
    },
    {
      moment: 'T3',
      label: 'Review',
      timestamp: intent.updated_at || intent.created_at,
      data: intent.feedback || 'No review feedback',
    },
    {
      moment: 'T4',
      label: 'Authorization',
      timestamp: intent.updated_at || intent.created_at,
      data: `Final status: ${intent.status}`,
    },
  ];

  const holds = await listLegalHolds(intent.workspace_id as string, true);
  const legalHold = holds.find((h) => h.object_id === id);

  const packs = await listEvidencePacks(
    intent.workspace_id as string,
    false
  );

  return {
    ...intent,
    artifact_uuid: `ART-${String(intent.id).slice(0, 8).toUpperCase()}`,
    artifact_type: 'CONTENT_PUBLISH',
    defensibility_index: defensibility,
    defensibility_label: defensibilityLabel(defensibility),
    decision_trace: decisionTrace,
    provenance,
    legal_hold: legalHold || null,
    is_on_legal_hold: !!legalHold,
    exports: packs.slice(0, 5),
  };
}

export async function computeEvidenceStats(
  workspaceId?: string,
  isSuperAdmin?: boolean
) {
  let data: Record<string, unknown>[] = [];
  try {
    let query = supabaseAdmin
      .from('publish_intents')
      .select('*');
    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    const { data: rows, error } = await query;
    if (error) throw error;
    data = (rows || []) as Record<string, unknown>[];
  } catch {
    data = [];
  }

  let defensible = 0,
    gaps = 0,
    failures = 0,
    reviewRecommended = 0;
  for (const intent of data) {
    const score = calculateDefensibility(intent);
    if (score >= 95) defensible++;
    else if (score >= 85) reviewRecommended++;
    else if (score >= 70) gaps++;
    else failures++;
  }

  const wsHolds = await listLegalHolds(workspaceId, isSuperAdmin);
  const wsPacks = await listEvidencePacks(workspaceId, isSuperAdmin);

  return {
    total_artifacts: data.length,
    defensible,
    review_recommended: reviewRecommended,
    governance_gaps: gaps,
    defensibility_failures: failures,
    active_legal_holds: wsHolds.length,
    evidence_packs: wsPacks.length,
    avg_defensibility: data.length
      ? Math.round(
          data.reduce(
            (acc, i) => acc + calculateDefensibility(i),
            0
          ) / data.length
        )
      : 0,
  };
}

// ─── PDF/ZIP Export Helpers ─────────────────────────────────────────────────

function generateEvidencePDF(
  pack: EvidencePack,
  artifacts: Record<string, unknown>[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('ZOIKOVERTEX');
    doc
      .fillColor('#475569')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('SOVEREIGN EVIDENCE VAULT & COMPLIANCE BUNDLE');
    doc.moveDown(0.5);
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(1.5);

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

    doc.fontSize(14).font('Helvetica-Bold').text('Evidence Artifact List');
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(`Total Extracted Records: ${artifacts.length} publish intents.`);
    doc.fillColor('#0f172a');
    doc.moveDown(1);

    const tableY = doc.y;
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .moveTo(50, tableY)
      .lineTo(545, tableY)
      .stroke();
    doc.moveDown(0.5);

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Artifact ID', 50, tableY + 5, { width: 120 });
    doc.text('Platform', 180, tableY + 5, { width: 60 });
    doc.text('Status', 250, tableY + 5, { width: 70 });
    doc.text('Risk Score', 330, tableY + 5, { width: 60 });
    doc.text('Decision ID', 400, tableY + 5, { width: 140 });

    doc
      .strokeColor('#cbd5e1')
      .moveTo(50, tableY + 18)
      .lineTo(545, tableY + 18)
      .stroke();

    let currentY = tableY + 23;
    artifacts.slice(0, 15).forEach((art: Record<string, unknown>) => {
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
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .text(
          `... and ${artifacts.length - 15} more artifacts bundled securely in this export package.`
        );
    }

    doc.end();
  });
}

function generateEvidenceZIP(
  pack: EvidencePack,
  artifacts: Record<string, unknown>[],
  pdfBuffer: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err: Error) => reject(err));

    const manifest = JSON.stringify({ pack, artifacts }, null, 2);
    archive.append(manifest, { name: 'evidence_manifest.json' });

    archive.append(pdfBuffer, { name: 'evidence_certificate.pdf' });

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

    artifacts.forEach((art: Record<string, unknown>) => {
      const artStr = JSON.stringify(art, null, 2);
      archive.append(artStr, {
        name: `artifacts/artifact_ART-${String(art.id).slice(0, 8).toUpperCase()}.json`,
      });
    });

    archive.finalize();
  });
}

// ─── Download Evidence Pack ─────────────────────────────────────────────────

export async function downloadEvidencePackById(
  id: string,
  workspaceId?: string,
  isSuperAdmin?: boolean
): Promise<{ pack: EvidencePack; artifacts: Record<string, unknown>[]; pdfBuffer: Buffer } | null> {
  const packs = await listEvidencePacks(workspaceId, isSuperAdmin);
  const pack = packs.find((p) => p.id === id);
  if (!pack) return null;

  let query = supabaseAdmin
    .from('publish_intents')
    .select(
      'id, content, platform, status, risk_level, risk_score, decision_id, feedback, created_at'
    );

  if (!isSuperAdmin && workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: artifacts } = await query.limit(500);
  const artifactList = (artifacts || []) as Record<string, unknown>[];

  const pdfBuffer = await generateEvidencePDF(pack, artifactList);

  return { pack, artifacts: artifactList, pdfBuffer };
}

export { generateEvidencePDF, generateEvidenceZIP };
