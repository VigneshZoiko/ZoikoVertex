import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { logAuditEvent } from './evidenceController';

// ---------------------------------------------------------------------------
// Idempotency Tracking Map
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
// In-Memory Fallback Queue & Details
// ---------------------------------------------------------------------------
const fallbackReviews: any[] = [
  {
    id: 'REV-0000-001',
    workspace_id: '00000000-0000-0000-0000-000000000000',
    priority: 'Critical',
    sla_due_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins (breach imminent)
    item_type: 'Regulated Claim',
    brand: 'Zoiko Finance',
    trigger_summary: 'Detected specific guaranteed return rate (100% ROI) in generated financial claim.',
    agent_id: 'AGT-FIN-02',
    autonomy_band: 'High Autonomy',
    owner: 'Unassigned',
    decision_state: 'hold_for_review',
    author_id: 'USR-888', // Ensure conflict check
    
    // Canvas & Evidence details
    content_preview: 'Our new product guarantees 100% ROI within the first month! Risk-free investment.',
    risk_factors: ['Financial Promises', 'Regulatory Sensitivity'],
    jurisdictions: ['US-FINRA', 'EU-ESMA'],
    policy_match: 'RUL-FIN-091',
    ai_recommendation: 'block',
    provenance: ['PROMPT-V4', 'AGENT-CTX-992'],
    evidence_hash: 'sha256-a9f8b2c4e6d7...',
    first_approver_id: null
  },
  {
    id: 'REV-0000-002',
    workspace_id: '00000000-0000-0000-0000-000000000000',
    priority: 'High',
    sla_due_at: new Date(Date.now() + 120 * 60 * 1000).toISOString(), // 2 hours
    item_type: 'Crisis Response',
    brand: 'Zoiko Corporate',
    trigger_summary: 'Agent attempted to publish autonomous PR statement regarding recent server outage.',
    agent_id: 'AGT-PR-01',
    autonomy_band: 'Supervised',
    owner: 'USR-042',
    decision_state: 'Awaiting Second Approval',
    author_id: 'AGT-PR-01',
    
    content_preview: 'We apologize for the downtime. Systems were affected by an external DDoS attack...',
    risk_factors: ['Brand Reputation', 'Legal Admissibility'],
    jurisdictions: ['Global'],
    policy_match: 'RUL-BRAND-112',
    ai_recommendation: 'require_approval',
    provenance: ['EVENT-LOG-X', 'PR-DB-SYNC'],
    evidence_hash: 'sha256-b8471da91...',
    first_approver_id: 'USR-042'
  },
  {
    id: 'REV-0000-003',
    workspace_id: '00000000-0000-0000-0000-000000000000',
    priority: 'Medium',
    sla_due_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // breached 5 mins ago
    item_type: 'Campaign Image',
    brand: 'Zoiko Social',
    trigger_summary: 'Generated image contains visual elements resembling competitor logos.',
    agent_id: 'AGT-DESIGN-04',
    autonomy_band: 'Full Autonomy',
    owner: 'Unassigned',
    decision_state: 'hold_for_review',
    author_id: 'AGT-DESIGN-04',
    
    content_preview: '[IMAGE PREVIEW: Group of people using phones with subtle competitor branding visible]',
    risk_factors: ['Copyright Infringement', 'Brand Dilution'],
    jurisdictions: ['US', 'UK'],
    policy_match: 'RUL-IP-003',
    ai_recommendation: 'quarantine',
    provenance: ['PROMPT-IMG-22', 'GEN-4211'],
    evidence_hash: 'sha256-ccc28da...',
    first_approver_id: null
  }
];

// ---------------------------------------------------------------------------
// Role Helpers
// ---------------------------------------------------------------------------
/*
async function getUserRoles(userId: string, workspaceId: string): Promise<string[]> {
  if (!workspaceId) return ['ADMIN'];
  try {
    const { data } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);
    
    if (data && data.length > 0) {
      return data.map(r => r.role);
    }
    return ['ADMIN']; // fallback mock
  } catch {
    return ['ADMIN']; // fallback mock
  }
}
*/


// ---------------------------------------------------------------------------
// Review Controller Methods
// ---------------------------------------------------------------------------

/**
 * GET /api/safety/reviews
 * Fetch priority sorted queue.
 */
export const getReviewQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    
    const items = fallbackReviews.filter(r => r.workspace_id === workspaceId);
    
    // Sort logic: Critical first, then by SLA (earliest first)
    items.sort((a, b) => {
      if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
      if (b.priority === 'Critical' && a.priority !== 'Critical') return 1;
      return new Date(a.sla_due_at).getTime() - new Date(b.sla_due_at).getTime();
    });

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/safety/reviews/:id
 * Fetch detailed context for the 3-panel workspace (Evidence Drawer data)
 */
export const getReviewDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';

    const item = fallbackReviews.find(r => r.id === id && r.workspace_id === workspaceId);
    if (!item) {
      return res.status(404).json({ error: 'Review item not found.' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/safety/reviews/:id/decision
 * Dual-control decision engine.
 */
export const submitReviewDecision = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    
    const { decision, rationale, idempotency_key } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!decision || !rationale) return res.status(400).json({ error: 'Decision and rationale are mandatory fields.' });
    
    // Validate Exact Outcome string (if the decision is an explicit outcome)
    // Note: decision from UI could be "Approve", "Reject", "Request Changes", "Escalate".
    // We map UI actions to canonical outcomes based on logic below.

    // 1. Idempotency Check
    if (idempotency_key) {
      if (idempotencyStore[idempotency_key]) {
        return res.status(409).json({ error: 'Duplicate submission detected. Decision already processed.', canonical_outcome: 'block' });
      }
      idempotencyStore[idempotency_key] = true;
    }

    // Lookup item
    const itemIndex = fallbackReviews.findIndex(r => r.id === id && r.workspace_id === workspaceId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Review item not found.' });
    }
    
    const item = fallbackReviews[itemIndex];

    // 2. Conflict of Interest Check
    if (item.author_id === userId) {
      return res.status(403).json({ 
        error: 'Conflict of Interest violation. You cannot approve an item where you are the author.', 
        canonical_outcome: 'block' 
      });
    }

    // 3. Dual-Control Logic Matrix
    // Critical Risk OR Regulated Claims require specific dual sign-off (First Approver != Second Approver).
    const requiresDualControl = item.priority === 'Critical' || item.item_type === 'Regulated Claim' || item.item_type === 'Crisis Response';
    
    let finalCanonicalOutcome: CanonicalOutcome = 'hold_for_review';
    let nextState = item.decision_state;

    // Map user "Approve" action
    if (decision === 'Approve') {
      if (requiresDualControl) {
        if (!item.first_approver_id) {
          // First key turned
          nextState = 'Awaiting Second Approval';
          item.first_approver_id = userId;
          finalCanonicalOutcome = 'require_approval'; // Still requires approval from downstream perspective
        } else {
          // Second key turned (must be a different user, handled by Conflict of Interest typically, but check anyway)
          if (item.first_approver_id === userId) {
            return res.status(403).json({ error: 'Dual-Control violation. A single user cannot provide both approvals for this risk tier.', canonical_outcome: 'block' });
          }
          nextState = 'Approved';
          finalCanonicalOutcome = 'allow'; // or 'allow_with_warning' if conditions apply
        }
      } else {
        nextState = 'Approved';
        finalCanonicalOutcome = 'allow';
      }
    } else if (decision === 'Reject') {
      nextState = 'Rejected';
      finalCanonicalOutcome = 'block';
    } else if (decision === 'Request Changes') {
      nextState = 'Changes Requested';
      finalCanonicalOutcome = 'hold_for_review';
    } else if (decision === 'Escalate') {
      nextState = 'Escalated';
      item.sla_due_at = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // recalculate SLA +1h
      finalCanonicalOutcome = 'require_approval';
    } else if (decision === 'Quarantine') {
      nextState = 'Quarantined';
      finalCanonicalOutcome = 'quarantine';
    } else if (decision === 'Pause Agent') {
      nextState = 'Agent Paused';
      finalCanonicalOutcome = 'emergency_pause_recommendation';
    }

    // Update in-memory
    item.decision_state = nextState;
    item.owner = userId; // Claim ownership if not already

    // 4. Immutable Audit Event Emission
    await logAuditEvent({
      workspaceId,
      actorId: userId,
      actorType: 'USER',
      action: `REVIEW_DECISION_${decision.toUpperCase().replace(' ', '_')}`,
      objectType: 'REVIEW_ITEM',
      module: 'SafetyLayer',
      riskLevel: item.priority.toUpperCase(),
      metadata: { 
        review_id: item.id,
        rationale,
        canonical_outcome: finalCanonicalOutcome,
        evidence_hash: item.evidence_hash,
        downstream_state: nextState
      }
    });

    res.json({ 
      success: true, 
      data: {
        item_id: item.id,
        new_state: nextState,
        canonical_outcome: finalCanonicalOutcome,
        downstream_action: finalCanonicalOutcome === 'allow' ? 'release_requested' : finalCanonicalOutcome === 'block' ? 'block_confirmed' : 'pending'
      }
    });

  } catch (error) {
    next(error);
  }
};
