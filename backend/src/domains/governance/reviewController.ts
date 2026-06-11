import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { internalEventBus } from '../../shared/internalEventBus';
import { logAuditEvent } from './evidenceController';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Idempotency Tracking (in-memory per-process; good enough for single instance)
// ---------------------------------------------------------------------------
const idempotencyStore: Record<string, boolean> = {};

// ---------------------------------------------------------------------------
// Canonical Outcome Codes
// ---------------------------------------------------------------------------
export type CanonicalOutcome =
  | 'allow'
  | 'allow_with_warning'
  | 'require_approval'
  | 'hold_for_review'
  | 'block'
  | 'quarantine'
  | 'restricted_mode_route'
  | 'emergency_pause_recommendation';

// ---------------------------------------------------------------------------
// Map a publish_intent row to the ReviewItem shape expected by the frontend
// ---------------------------------------------------------------------------
function intentToReviewItem(intent: any) {
  const slaDueAt = new Date(
    new Date(intent.created_at).getTime() + 24 * 60 * 60 * 1000
  ).toISOString(); // 24-hour SLA window

  const riskLevel = (intent.risk_level || 'LOW').toUpperCase();
  const riskScore = typeof intent.risk_score === 'number' ? intent.risk_score : 0;

  const priorityMap: Record<string, string> = {
    LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
  };

  const recommendationMap: Record<string, string> = {
    LOW: 'allow',
    MEDIUM: 'hold_for_review',
    HIGH: 'block',
    CRITICAL: 'block',
  };

  const riskFactors: string[] = intent.risk_factors || [];
  const policyMatch = riskFactors.length > 0
    ? riskFactors.slice(0, 3).join(', ')
    : `Risk Level ${riskLevel}${riskScore > 0 ? ` (${riskScore}/100)` : ''}`;

  return {
    id: intent.id,
    workspace_id: intent.workspace_id,
    priority: priorityMap[riskLevel] || 'Medium',
    sla_due_at: slaDueAt,
    item_type: 'Social Post',
    brand: (intent.platform || 'social').toUpperCase(),
    trigger_summary: `Risk ${riskLevel} · ${intent.platform || 'Social'} post submitted for review`,
    agent_id: 'HUMAN',
    autonomy_band: 'Supervised',
    owner: intent.reviewer_id || 'Unassigned',
    decision_state: intent.status === 'PENDING_REVIEW' ? 'hold_for_review' : intent.status,
    author_id: intent.creator_id,
    content_preview: intent.content || '(no caption)',
    risk_factors: riskFactors,
    jurisdictions: [],
    policy_match: policyMatch,
    ai_recommendation: recommendationMap[riskLevel] || 'hold_for_review',
    provenance: [intent.platform || 'social'],
    evidence_hash: `sha256-${intent.id.substring(0, 8)}`,
    first_approver_id: intent.first_approver_id || null,
    media_urls: intent.media_urls || [],
  };
}

// ---------------------------------------------------------------------------
// In-App Notification Helper
// ---------------------------------------------------------------------------
async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  link?: string
) {
  try {
    await supabaseAdmin.from('notifications').insert({
      id: randomUUID(),
      user_id: userId,
      title,
      body,
      type,
      link: link || null,
      read: false,
      created_at: new Date().toISOString(),
    });
  } catch {
    // notification failure must not block the review decision
  }
}

async function notifyWorkspaceAdmins(
  workspaceId: string,
  title: string,
  body: string,
  type: string,
  link?: string
) {
  try {
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('workspace_id', workspaceId)
      .in('role', ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN', 'SECURITY_ADMIN']);

    if (!admins) return;
    for (const admin of admins) {
      if (admin.id) {
        await createNotification(admin.id, title, body, type, link);
      }
    }
  } catch {
    // non-blocking
  }
}

// ---------------------------------------------------------------------------
// GET /api/safety/reviews
// Returns all PENDING_REVIEW intents for the caller's workspace
// ---------------------------------------------------------------------------
export const getReviewQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!workspaceId && !isSuperAdmin) {
      return res.status(403).json({ error: 'No workspace context' });
    }

    let query = supabaseAdmin
      .from('publish_intents')
      .select('*')
      .eq('status', 'PENDING_REVIEW')
      .order('created_at', { ascending: true });

    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = (data || []).map(intentToReviewItem);

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/safety/reviews/:id
// ---------------------------------------------------------------------------
export const getReviewDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    const query = supabaseAdmin
      .from('publish_intents')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await query;

    if (error || !data) {
      return res.status(404).json({ error: 'Review item not found.' });
    }

    if (!isSuperAdmin && workspaceId && data.workspace_id !== workspaceId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ success: true, data: intentToReviewItem(data) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/safety/reviews/:id/decision
// Reviewer decision: Approve / Reject / Request Changes / Escalate
// ---------------------------------------------------------------------------
export const submitReviewDecision = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    const { decision, rationale, idempotency_key } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!decision || !rationale || rationale.trim().length < 5) {
      return res.status(400).json({ error: 'Decision and rationale (min 5 chars) are required.' });
    }

    // Idempotency guard
    if (idempotency_key) {
      if (idempotencyStore[idempotency_key]) {
        return res.status(409).json({ error: 'Duplicate submission detected.' });
      }
      idempotencyStore[idempotency_key] = true;
    }

    // Load intent
    const { data: intent, error: fetchErr } = await supabaseAdmin
      .from('publish_intents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !intent) {
      return res.status(404).json({ error: 'Review item not found.' });
    }

    if (!isSuperAdmin && workspaceId && intent.workspace_id !== workspaceId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Conflict of interest: creator cannot review their own post
    if (intent.creator_id === userId && !isSuperAdmin) {
      return res.status(403).json({
        error: 'Conflict of Interest: you cannot review your own submission.',
        canonical_outcome: 'block',
      });
    }

    // Map decision → new status + canonical outcome
    let newStatus: string;
    let canonicalOutcome: CanonicalOutcome;
    let nextState: string;

    switch (decision) {
      case 'Approve':
        newStatus = 'APPROVED';
        canonicalOutcome = 'allow';
        nextState = 'Approved';
        break;
      case 'Reject':
        newStatus = 'REJECTED';
        canonicalOutcome = 'block';
        nextState = 'Rejected';
        break;
      case 'Request Changes':
        newStatus = 'RETURNED';
        canonicalOutcome = 'hold_for_review';
        nextState = 'Changes Requested';
        break;
      case 'Escalate':
        newStatus = 'PENDING_REVIEW'; // stays in queue for senior reviewer
        canonicalOutcome = 'require_approval';
        nextState = 'Escalated';
        break;
      case 'Quarantine':
        newStatus = 'REJECTED';
        canonicalOutcome = 'quarantine';
        nextState = 'Quarantined';
        break;
      default:
        return res.status(400).json({ error: `Unknown decision: ${decision}` });
    }

    // Persist status change
    const { error: updateErr } = await supabaseAdmin
      .from('publish_intents')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        reviewer_id: userId,
        reviewer_feedback: rationale,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // If approved, hand off to execution
    if (newStatus === 'APPROVED') {
      try {
        internalEventBus.emit('execution.requested', { intentId: id });
      } catch { /* non-blocking */ }
    }

    // Immutable audit trail
    try {
      await logAuditEvent({
        workspaceId: intent.workspace_id || workspaceId || '',
        actorId: userId,
        actorType: 'USER',
        action: `REVIEW_DECISION_${decision.toUpperCase().replace(/ /g, '_')}`,
        objectType: 'PUBLISH_INTENT',
        module: 'SafetyLayer',
        riskLevel: 'MEDIUM',
        metadata: {
          intent_id: id,
          rationale,
          canonical_outcome: canonicalOutcome,
          new_status: newStatus,
        },
      });
    } catch { /* audit failure must not block the decision */ }

    // ── Notifications ──────────────────────────────────────────────────────
    const contentPreview = (intent.content || '(no content)').slice(0, 120);
    const creatorLink = `/publish?revisionId=${id}`;
    const adminLink = '/review-queue';

    switch (decision) {
      case 'Approve':
        await createNotification(
          intent.creator_id,
          '✅ Content Approved',
          `Your content was approved: "${contentPreview}"`,
          'APPROVAL',
          creatorLink,
        );
        break;

      case 'Reject':
        await createNotification(
          intent.creator_id,
          '❌ Content Rejected',
          `Your content was rejected. Reason: ${rationale}`,
          'GOVERNANCE',
          creatorLink,
        );
        break;

      case 'Request Changes':
        await createNotification(
          intent.creator_id,
          '🔄 Changes Requested',
          `Changes requested for your content. Feedback: ${rationale}`,
          'GOVERNANCE',
          creatorLink,
        );
        break;

      case 'Escalate':
        // Notify creator
        await createNotification(
          intent.creator_id,
          '⏫ Content Escalated',
          `Your content has been escalated for senior review.`,
          'GOVERNANCE',
          creatorLink,
        );
        // Notify all workspace admins
        await notifyWorkspaceAdmins(
          intent.workspace_id || workspaceId || '',
          '⏫ Escalation Requires Attention',
          `Content "${contentPreview}" was escalated by a reviewer. Rationale: ${rationale}`,
          'GOVERNANCE',
          adminLink,
        );
        break;

      case 'Quarantine':
        // Notify creator
        await createNotification(
          intent.creator_id,
          '⚠️ Content Quarantined',
          `Your content was quarantined. Reason: ${rationale}`,
          'ERROR',
          creatorLink,
        );
        // Notify all workspace admins
        await notifyWorkspaceAdmins(
          intent.workspace_id || workspaceId || '',
          '🚨 Content Quarantined — Admin Action Required',
          `Content "${contentPreview}" was quarantined. Reviewer notes: ${rationale}`,
          'ERROR',
          adminLink,
        );
        break;
    }

    res.json({
      success: true,
      data: {
        item_id: id,
        new_state: nextState,
        canonical_outcome: canonicalOutcome,
        downstream_action:
          canonicalOutcome === 'allow'
            ? 'execution_requested'
            : canonicalOutcome === 'block' || canonicalOutcome === 'quarantine'
            ? 'block_confirmed'
            : 'pending',
      },
    });
  } catch (error) {
    next(error);
  }
};
