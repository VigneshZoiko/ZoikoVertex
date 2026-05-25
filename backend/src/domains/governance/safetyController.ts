import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logAuditEvent } from './evidenceController';
import { lockStore } from '../agents/autonomyController';

// Global flag to simulate Safety API degradation
let isSafetyApiDegraded = false;

/**
 * Helper to determine user role in workspace.
 */
async function getUserRole(userId: string, workspaceId: string): Promise<string> {
  if (!workspaceId) return 'CREATOR';
  try {
    const { data, error } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error || !data) return 'CREATOR';
    return data.role;
  } catch {
    return 'CREATOR';
  }
}

/**
 * 1. GET /api/safety/overview
 * Returns SafetyOverviewDTO for current tenant/workspace.
 */
export const getSafetyOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const targetWorkspaceId = workspaceId || '00000000-0000-0000-0000-000000000000';

    // Get user role
    const userRole = isSuperAdmin ? 'ADMIN' : await getUserRole(userId, targetWorkspaceId);

    // Fetch intents count for holds/queues
    let criticalHoldsCount = 0;
    let highRiskQueueCount = 0;
    let approvalRequiredCount = 0;
    let quarantinedCount = 0;

    let breachedSla = 0;
    let atRiskSla = 0;
    let onTrackSla = 0;

    let recentDecisions: any[] = [];

    try {
      // Query intents
      let query = supabaseAdmin.from('publish_intents').select('*');
      if (!isSuperAdmin) {
        query = query.eq('workspace_id', targetWorkspaceId);
      }
      const { data: intents } = await query.order('created_at', { ascending: false });

      if (intents && intents.length > 0) {
        recentDecisions = intents.slice(0, 10);

        intents.forEach((intent) => {
          const status = intent.status || '';
          const riskLevel = intent.risk_level || 'LOW';

          // Critical holds: blocked or pending governance review
          if (status === 'GOVERNANCE_BLOCKED' || status === 'PENDING_GOVERNANCE') {
            criticalHoldsCount++;
          }

          // High risk queue
          if (riskLevel === 'HIGH' && status.startsWith('PENDING_')) {
            highRiskQueueCount++;
          }

          // Approval required
          if (status.startsWith('PENDING_')) {
            approvalRequiredCount++;
          }

          // Quarantined
          if (status === 'GOVERNANCE_BLOCKED') {
            quarantinedCount++;
          }

          // SLA Calculations (based on created_at age)
          if (status.startsWith('PENDING_') || status === 'GOVERNANCE_BLOCKED') {
            const ageMs = Date.now() - new Date(intent.created_at).getTime();
            const ageHours = ageMs / (1000 * 60 * 60);

            if (ageHours >= 24) {
              breachedSla++;
            } else if (ageHours >= 12) {
              atRiskSla++;
            } else {
              onTrackSla++;
            }
          }
        });
      }
    } catch (err) {
      console.error('[Safety Overview] Error fetching intents metrics:', err);
    }

    // Determine Active Safety Mode
    const activeWorkspaceLocks = [...lockStore.values()].filter(l =>
      isSuperAdmin || l.workspace_id === targetWorkspaceId
    );
    let activeMode = 'normal';
    if (activeWorkspaceLocks.some(l => l.level === 'L4' || l.level === 'L3')) {
      activeMode = 'emergency_pause';
    } else if (activeWorkspaceLocks.some(l => l.level === 'L2')) {
      activeMode = 'restricted_operations';
    } else if (activeWorkspaceLocks.some(l => l.level === 'L1')) {
      activeMode = 'elevated_watch';
    }

    // Calculate Agent Safety Health
    let agentSafetyHealth = 'healthy';
    try {
      let agentQuery = supabaseAdmin.from('agents').select('trust_score, status');
      if (!isSuperAdmin) {
        agentQuery = agentQuery.eq('workspace_id', targetWorkspaceId);
      }
      const { data: agents } = await agentQuery;
      if (agents && agents.length > 0) {
        const suspended = agents.filter(a => a.status === 'SUSPENDED').length;
        const lowTrust = agents.filter(a => (a.trust_score || 0) < 0.6).length;
        const total = agents.length;

        if (suspended === total || lowTrust > total / 2) {
          agentSafetyHealth = 'critical';
        } else if (suspended > 0 || lowTrust > 0) {
          agentSafetyHealth = 'watch';
        }
      }
    } catch {}

    // Calculate Posture Score (out of 100)
    let postureScore = 95; // base
    postureScore -= (criticalHoldsCount * 2);
    postureScore -= (breachedSla * 5);
    if (activeMode === 'emergency_pause') postureScore -= 20;
    if (activeMode === 'restricted_operations') postureScore -= 10;
    postureScore = Math.max(0, Math.min(100, postureScore));

    let postureStatus = 'healthy';
    if (postureScore < 60) postureStatus = 'critical';
    else if (postureScore < 80) postureStatus = 'degraded';
    else if (postureScore < 90) postureStatus = 'watch';

    // Apply Content Redaction for Non-Authorized Roles
    const authorizedRoles = ['ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'SAFETY_OPERATOR'];
    const canSeeContent = isSuperAdmin || authorizedRoles.includes(userRole);

    const redactedDecisions = recentDecisions.map(d => ({
      decision_id: d.id,
      content: canSeeContent ? d.content : '[REDACTED - INSUFFICIENT PERMISSIONS]',
      platform: d.platform,
      status: d.status,
      risk_level: d.risk_level,
      risk_score: d.risk_score || 0,
      created_at: d.created_at,
    }));

    // Simulated Top Rule Hits
    const topRuleHits = [
      { rule_name: 'Brand claim risk', severity: 'HIGH', count: 14, trend: 'up', impacted_scope: 'Global' },
      { rule_name: 'Regulated language', severity: 'CRITICAL', count: 8, trend: 'stable', impacted_scope: 'Financials' },
      { rule_name: 'Channel restriction', severity: 'MEDIUM', count: 22, trend: 'down', scope: 'Twitter/X', impacted_scope: 'Twitter/X' },
      { rule_name: 'Agent authority mismatch', severity: 'HIGH', count: 5, trend: 'up', impacted_scope: 'Autonomy' }
    ];

    // Component health definitions
    const componentHealth = [
      { name: 'Safety Layer Overview', health: 'healthy', backlog: 0, owner: 'Governance Admin' },
      { name: 'Risk Intake & Classification Engine', health: 'healthy', backlog: criticalHoldsCount, owner: 'Compliance Officer' },
      { name: 'Guardrail Rules Engine', health: 'healthy', backlog: 2, owner: 'Governance Admin' },
      { name: 'Action Decision Gate', health: 'healthy', backlog: approvalRequiredCount, owner: 'Safety Operator' },
      { name: 'Safety Command Center', health: 'healthy', backlog: quarantinedCount, owner: 'Safety Operator' },
      { name: 'Emergency Pause & Restricted Operations Mode', health: 'healthy', backlog: activeWorkspaceLocks.length, owner: 'Security Officer' },
      { name: 'Agent Behavior Safety Monitor', health: 'healthy', backlog: 3, owner: 'Agent Architect' },
      { name: 'Escalation & Human Accountability Workflows', health: 'healthy', backlog: breachedSla, owner: 'Compliance Officer' },
      { name: 'Safety Evidence Writer', health: 'healthy', backlog: 0, owner: 'Legal Counsel' },
      { name: 'Safety Settings & Policy Administration', health: 'healthy', backlog: 0, owner: 'Governance Admin' }
    ];

    // Safety API Degraded Check
    const apiStatus = isSafetyApiDegraded ? 'degraded' : 'healthy';
    const evidenceChainHealth = isSafetyApiDegraded ? 'degraded' : 'verified';

    res.json({
      success: true,
      data: {
        tenant_id: 'TEN-001',
        workspace_id: targetWorkspaceId,
        evaluated_at: new Date().toISOString(),
        active_mode: activeMode,
        posture_score: postureScore,
        posture_status: postureStatus,
        critical_holds_count: criticalHoldsCount,
        high_risk_queue_count: highRiskQueueCount,
        approval_required_count: approvalRequiredCount,
        quarantined_count: quarantinedCount,
        agent_safety_health: agentSafetyHealth,
        sla_exposure: {
          breached: breachedSla,
          at_risk: atRiskSla,
          on_track: onTrackSla,
        },
        top_rule_hits: topRuleHits,
        component_health: componentHealth,
        recent_material_decisions: redactedDecisions,
        evidence_chain_health: evidenceChainHealth,
        api_status: apiStatus,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/safety/components
 * Returns component registry and health.
 */
export const getSafetyComponents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const components = [

      { id: '01', name: 'Safety Layer Overview', description: 'Master overview screen, control-plane doctrine, component registry, build boundaries.', health: 'healthy', owner: 'Governance Admin', backlog: 0 },
      { id: '02', name: 'Risk Intake & Classification Engine', description: 'How events, actions, agent proposals, human overrides, and publishing attempts become safety-reviewed objects.', health: 'healthy', owner: 'Compliance Officer', backlog: 3 },
      { id: '03', name: 'Guardrail Rules Engine', description: 'Policy, brand, legal, compliance, channel, and agent guardrails with deterministic enforcement.', health: 'healthy', owner: 'Governance Admin', backlog: 1 },
      { id: '04', name: 'Action Decision Gate', description: 'Allow, warn, require approval, block, quarantine, or escalate every material action.', health: 'healthy', owner: 'Safety Operator', backlog: 0 },
      { id: '05', name: 'Safety Command Center', description: 'Live safety queue for operators, reviewers, compliance owners, and executive visibility.', health: 'healthy', owner: 'Safety Operator', backlog: 4 },
      { id: '06', name: 'Emergency Pause & Restricted Operations Mode', description: 'Tenant, workspace, brand, campaign, channel, agent, and workflow-level containment controls.', health: 'healthy', owner: 'Security Officer', backlog: 0 },
      { id: '07', name: 'Agent Behavior Safety Monitor', description: 'Runtime monitoring for agent drift, low confidence, repeated refusal, unsafe tool use, and authority mismatch.', health: 'healthy', owner: 'Agent Architect', backlog: 2 },
      { id: '08', name: 'Escalation & Human Accountability Workflows', description: 'SLA-based escalation, reviewer assignment, duty owner, executive escalation, and closure control.', health: 'healthy', owner: 'Compliance Officer', backlog: 1 },
      { id: '09', name: 'Safety Evidence Writer', description: 'Safety decisions written into Audit Trail, Evidence Layer integration, and evidence preservation triggers.', health: 'healthy', owner: 'Legal Counsel', backlog: 0 },
      { id: '10', name: 'Safety Settings & Policy Administration', description: 'Admin configuration, thresholds, defaults, role permissions, and tenant-level safety posture.', health: 'healthy', owner: 'Governance Admin', backlog: 0 }
    ];

    res.json({ success: true, data: components });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/safety/queue/summary
 * Returns counts by risk, outcome, SLA, owner, and status.
 */
export const getSafetyQueueSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Static queue summary data contract

    const summary = {
      by_criticality: { critical: 2, high: 5, medium: 10, low: 15 },
      by_outcome: { allow: 150, allow_with_warning: 45, require_approval: 12, hold_for_review: 6, block: 8, quarantine: 3 },
      by_sla: { breached: 1, at_risk: 3, on_track: 28 },
      by_owner: { 'Compliance Officer': 4, 'Safety Operator': 8, 'Unassigned': 2 }
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/safety/recent-decisions
 * Returns recent material decisions list.
 */
export const getSafetyRecentDecisions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch user role
    const userRole = isSuperAdmin ? 'ADMIN' : await getUserRole(userId, workspaceId);
    const authorizedRoles = ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'COMPLIANCE_REVIEWER', 'SAFETY_OPERATOR'];
    const canSeeContent = isSuperAdmin || authorizedRoles.includes(userRole);

    let query = supabaseAdmin
      .from('publish_intents')
      .select('id, content, platform, status, risk_level, risk_score, created_at');

    if (!isSuperAdmin) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: decisions, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const redacted = (decisions || []).map(d => ({
      ...d,
      content: canSeeContent ? d.content : '[REDACTED - INSUFFICIENT PERMISSIONS]'
    }));

    res.json({ success: true, data: redacted });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. POST /api/safety/actions/review-critical-queue
 * Initiates review session and emits audit event.
 */
export const reviewCriticalQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Emit audit event
    await logAuditEvent({
      workspaceId,
      actorId: userId,
      actorType: 'USER',
      action: 'CRITICAL_QUEUE_REVIEW_SESSION_STARTED',
      objectType: 'SAFETY_QUEUE',
      module: 'SafetyLayer',
      riskLevel: 'HIGH',
      metadata: { initiated_by: userId, timestamp: new Date().toISOString() }
    });

    res.json({ success: true, message: 'Review session initiated. Action logged to audit trail.' });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. POST /api/safety/actions/request-emergency-pause
 * Submits emergency pause request or confirmation.
 */
export const requestEmergencyPause = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const isSuperAdmin = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Validate role permissions
    const userRole = isSuperAdmin ? 'ADMIN' : await getUserRole(userId, workspaceId);
    const privilegedRoles = ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN'];

    if (!isSuperAdmin && !privilegedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to request emergency pause.' });
    }

    const { reason, mfa_code, scope, state } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Reason text must be at least 10 characters long.' });
    }

    // Mock MFA step-up validation
    if (!mfa_code || mfa_code !== '123456') {
      return res.status(400).json({ error: 'Invalid MFA verification code. Emergency pause rejected.' });
    }

    // Emit audit event
    await logAuditEvent({
      workspaceId,
      actorId: userId,
      actorType: 'USER',
      action: state === 'active' ? 'EMERGENCY_PAUSE_ACTIVATED' : 'EMERGENCY_PAUSE_DEACTIVATED',
      objectType: 'EMERGENCY_PAUSE',
      module: 'SafetyLayer',
      riskLevel: 'CRITICAL',
      metadata: { reason, scope: scope || 'WORKSPACE', mfa_verified: true }
    });

    res.json({
      success: true,
      message: `Emergency pause ${state === 'active' ? 'activated' : 'deactivated'} successfully. Operations suspended.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. POST /api/safety/actions/toggle-degraded
 * Simulates Safety API degradation status.
 */
export const toggleDegradedState = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { degraded } = req.body;
    isSafetyApiDegraded = !!degraded;
    
    res.json({
      success: true,
      message: `Safety API degraded mode set to ${isSafetyApiDegraded}`
    });
  } catch (error) {
    next(error);
  }
};
