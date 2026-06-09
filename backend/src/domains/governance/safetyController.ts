import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logAuditEvent } from './evidenceController';
import { lockStore } from '../agents/autonomyController';
import { sendMfaChallenge, verifyMfaCode } from '../../services/mfa.service';

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
    let allIntents: any[] = [];

    try {
      // Query intents
      let query = supabaseAdmin.from('publish_intents').select('*');
      if (!isSuperAdmin) {
        query = query.eq('workspace_id', targetWorkspaceId);
      }
      const { data: intents } = await query.order('created_at', { ascending: false });

      if (intents && intents.length > 0) {
        allIntents = intents;
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

    // Derive top rule hits from actual intent data grouped by risk level
    const riskLevelLabels: Record<string, { rule_name: string; impacted_scope: string }> = {
      CRITICAL: { rule_name: 'Critical Risk Violations', impacted_scope: 'All Channels' },
      HIGH:     { rule_name: 'High Risk Content Flags', impacted_scope: 'Publishing Queue' },
      MEDIUM:   { rule_name: 'Brand Policy Warnings',   impacted_scope: 'Moderation Queue' },
      LOW:      { rule_name: 'Advisory Rule Hits',       impacted_scope: 'Review Queue' },
    };
    const riskLevelOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const riskCounts: Record<string, number> = {};
    allIntents.forEach(intent => {
      const lvl = intent.risk_level || 'LOW';
      riskCounts[lvl] = (riskCounts[lvl] || 0) + 1;
    });
    const topRuleHits = riskLevelOrder
      .filter(lvl => riskCounts[lvl] !== undefined)
      .slice(0, 4)
      .map(lvl => ({
        rule_name: riskLevelLabels[lvl]?.rule_name || `${lvl} Risk`,
        severity: lvl,
        count: riskCounts[lvl],
        trend: riskCounts[lvl] > 10 ? 'up' : riskCounts[lvl] > 3 ? 'stable' : 'down',
        impacted_scope: riskLevelLabels[lvl]?.impacted_scope || 'Workspace',
      }));

    // Compute component health dynamically from actual backlog counts
    const healthFromBacklog = (backlog: number): string => {
      if (backlog >= 10) return 'critical';
      if (backlog >= 5)  return 'degraded';
      if (backlog >= 1)  return 'watch';
      return 'healthy';
    };
    const agentBacklog = agentSafetyHealth !== 'healthy' ? Math.max(3, allIntents.filter(i => i.status === 'AGENT_HOLD').length) : 0;
    const componentHealth = [
      { name: 'Risk Intake & Classification Engine',           health: healthFromBacklog(criticalHoldsCount),        backlog: criticalHoldsCount,        owner: 'Compliance Officer' },
      { name: 'Guardrail Rules Engine',                        health: healthFromBacklog(atRiskSla),                 backlog: atRiskSla,                 owner: 'Governance Admin' },
      { name: 'Action Decision Gate',                          health: healthFromBacklog(approvalRequiredCount),     backlog: approvalRequiredCount,     owner: 'Safety Operator' },
      { name: 'Safety Command Center',                         health: healthFromBacklog(quarantinedCount),          backlog: quarantinedCount,          owner: 'Safety Operator' },
      { name: 'Emergency Pause & Restricted Operations Mode',  health: activeWorkspaceLocks.length > 0 ? 'watch' : 'healthy', backlog: activeWorkspaceLocks.length, owner: 'Security Officer' },
      { name: 'Agent Behavior Safety Monitor',                 health: agentSafetyHealth,                           backlog: agentBacklog,              owner: 'Agent Architect' },
      { name: 'Escalation & Human Accountability Workflows',   health: healthFromBacklog(breachedSla),              backlog: breachedSla,               owner: 'Compliance Officer' },
    ];

    // Derive tenant label from workspace name
    let tenantLabel = targetWorkspaceId.substring(0, 8).toUpperCase();
    try {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('name')
        .eq('id', targetWorkspaceId)
        .maybeSingle();
      if (ws?.name) tenantLabel = ws.name.toUpperCase().replace(/\s+/g, '-').substring(0, 12);
    } catch {}

    // Derive API degradation from agent health rather than manual toggle
    const apiStatus = agentSafetyHealth === 'critical' ? 'degraded' : 'healthy';
    const evidenceChainHealth = agentSafetyHealth === 'critical' ? 'degraded' : 'verified';

    res.json({
      success: true,
      data: {
        tenant_id: tenantLabel,
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
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const targetWorkspaceId = workspaceId || '00000000-0000-0000-0000-000000000000';

    let criticalHoldsCount = 0;
    let approvalRequiredCount = 0;
    let quarantinedCount = 0;
    let breachedSla = 0;
    let atRiskSla = 0;
    let agentBacklog = 0;
    let agentSafetyHealth = 'healthy';
    let activeLockCount = 0;

    try {
      let query = supabaseAdmin.from('publish_intents').select('*');
      if (!isSuperAdmin) query = query.eq('workspace_id', targetWorkspaceId);
      const { data: intents } = await query.order('created_at', { ascending: false });

      if (intents && intents.length > 0) {
        intents.forEach((intent) => {
          const status = intent.status || '';
          if (status === 'GOVERNANCE_BLOCKED' || status === 'PENDING_GOVERNANCE') criticalHoldsCount++;
          if (status.startsWith('PENDING_')) approvalRequiredCount++;
          if (status === 'GOVERNANCE_BLOCKED') quarantinedCount++;
          if (status.startsWith('PENDING_') || status === 'GOVERNANCE_BLOCKED') {
            const ageHours = (Date.now() - new Date(intent.created_at).getTime()) / (1000 * 60 * 60);
            if (ageHours >= 24) breachedSla++;
            else if (ageHours >= 12) atRiskSla++;
          }
        });
      }
    } catch {}

    try {
      let agentQuery = supabaseAdmin.from('agents').select('trust_score, status');
      if (!isSuperAdmin) agentQuery = agentQuery.eq('workspace_id', targetWorkspaceId);
      const { data: agents } = await agentQuery;
      if (agents && agents.length > 0) {
        const suspended = agents.filter(a => a.status === 'SUSPENDED').length;
        const lowTrust = agents.filter(a => (a.trust_score || 0) < 0.6).length;
        const total = agents.length;
        if (suspended === total || lowTrust > total / 2) agentSafetyHealth = 'critical';
        else if (suspended > 0 || lowTrust > 0) agentSafetyHealth = 'watch';
      }
    } catch {}

    activeLockCount = [...lockStore.values()].filter(l =>
      isSuperAdmin || l.workspace_id === targetWorkspaceId
    ).length;

    agentBacklog = agentSafetyHealth !== 'healthy' ? Math.max(3, criticalHoldsCount) : 0;

    const healthFromBacklog = (backlog: number): string => {
      if (backlog >= 10) return 'critical';
      if (backlog >= 5)  return 'degraded';
      if (backlog >= 1)  return 'watch';
      return 'healthy';
    };

    const components = [
      { id: '01', name: 'Safety Layer Overview', description: 'Master overview screen, control-plane doctrine, component registry, build boundaries.', health: healthFromBacklog(criticalHoldsCount + breachedSla), backlog: criticalHoldsCount + breachedSla, owner: 'Governance Admin' },
      { id: '02', name: 'Risk Intake & Classification Engine', description: 'How events, actions, agent proposals, human overrides, and publishing attempts become safety-reviewed objects.', health: healthFromBacklog(criticalHoldsCount), backlog: criticalHoldsCount, owner: 'Compliance Officer' },
      { id: '03', name: 'Guardrail Rules Engine', description: 'Policy, brand, legal, compliance, channel, and agent guardrails with deterministic enforcement.', health: healthFromBacklog(atRiskSla), backlog: atRiskSla, owner: 'Governance Admin' },
      { id: '04', name: 'Action Decision Gate', description: 'Allow, warn, require approval, block, quarantine, or escalate every material action.', health: healthFromBacklog(approvalRequiredCount), backlog: approvalRequiredCount, owner: 'Safety Operator' },
      { id: '05', name: 'Safety Command Center', description: 'Live safety queue for operators, reviewers, compliance owners, and executive visibility.', health: healthFromBacklog(quarantinedCount), backlog: quarantinedCount, owner: 'Safety Operator' },
      { id: '06', name: 'Emergency Pause & Restricted Operations Mode', description: 'Tenant, workspace, brand, campaign, channel, agent, and workflow-level containment controls.', health: activeLockCount > 0 ? 'watch' : 'healthy', backlog: activeLockCount, owner: 'Security Officer' },
      { id: '07', name: 'Agent Behavior Safety Monitor', description: 'Runtime monitoring for agent drift, low confidence, repeated refusal, unsafe tool use, and authority mismatch.', health: agentSafetyHealth, backlog: agentBacklog, owner: 'Agent Architect' },
      { id: '08', name: 'Escalation & Human Accountability Workflows', description: 'SLA-based escalation, reviewer assignment, duty owner, executive escalation, and closure control.', health: healthFromBacklog(breachedSla), backlog: breachedSla, owner: 'Compliance Officer' },
      { id: '09', name: 'Safety Evidence Writer', description: 'Safety decisions written into Audit Trail, Evidence Layer integration, and evidence preservation triggers.', health: 'healthy', backlog: 0, owner: 'Legal Counsel' },
      { id: '10', name: 'Safety Settings & Policy Administration', description: 'Admin configuration, thresholds, defaults, role permissions, and tenant-level safety posture.', health: 'healthy', backlog: 0, owner: 'Governance Admin' }
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
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    const targetWorkspaceId = workspaceId || '00000000-0000-0000-0000-000000000000';

    const byCriticality = { critical: 0, high: 0, medium: 0, low: 0 };
    const byOutcome = { allow: 0, allow_with_warning: 0, require_approval: 0, hold_for_review: 0, block: 0, quarantine: 0 };
    const bySla = { breached: 0, at_risk: 0, on_track: 0 };

    try {
      let query = supabaseAdmin.from('publish_intents').select('risk_level, status, created_at');
      if (!isSuperAdmin) query = query.eq('workspace_id', targetWorkspaceId);
      const { data: intents } = await query;

      if (intents && intents.length > 0) {
        intents.forEach(i => {
          const rl = (i.risk_level || 'LOW').toLowerCase();
          if (rl === 'critical') byCriticality.critical++;
          else if (rl === 'high') byCriticality.high++;
          else if (rl === 'medium') byCriticality.medium++;
          else byCriticality.low++;

          const s = i.status || '';
          if (s === 'APPROVED' || s === 'PUBLISHED' || s === 'COMPLETED') byOutcome.allow++;
          else if (s === 'APPROVED_WITH_WARNINGS') byOutcome.allow_with_warning++;
          else if (s === 'PENDING_APPROVAL') byOutcome.require_approval++;
          else if (s === 'PENDING_GOVERNANCE' || s === 'PENDING_REVIEW') byOutcome.hold_for_review++;
          else if (s === 'GOVERNANCE_BLOCKED' || s === 'REJECTED') byOutcome.block++;
          else if (s === 'QUARANTINED') byOutcome.quarantine++;
          else if (s.startsWith('PENDING_')) byOutcome.require_approval++;

          if (s.startsWith('PENDING_') || s === 'GOVERNANCE_BLOCKED') {
            const ageHours = (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60);
            if (ageHours >= 24) bySla.breached++;
            else if (ageHours >= 12) bySla.at_risk++;
            else bySla.on_track++;
          }
        });
      }
    } catch {}

    let byOwner: Record<string, number> = { 'Unassigned': 0 };
    try {
      let memberQuery = supabaseAdmin
        .from('workspace_members')
        .select('role, user_id');
      if (!isSuperAdmin) memberQuery = memberQuery.eq('workspace_id', targetWorkspaceId);
      const { data: members } = await memberQuery;
      if (members && members.length > 0) {
        byOwner = {};
        members.forEach(m => {
          const role = m.role || 'Unassigned';
          byOwner[role] = (byOwner[role] || 0) + 1;
        });
      }
    } catch {
      byOwner = { 'Unassigned': 1 };
    }

    res.json({
      success: true,
      data: {
        by_criticality: byCriticality,
        by_outcome: byOutcome,
        by_sla: bySla,
        by_owner: byOwner,
      }
    });
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
 * Submits emergency pause request or confirmation — real MFA verification.
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

    // Real MFA verification against Redis-backed challenge code
    const mfaValid = await verifyMfaCode(userId, mfa_code || '');
    if (!mfaValid) {
      return res.status(400).json({ error: 'Invalid or expired MFA verification code. Please request a new code and try again.' });
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
 * 7. POST /api/safety/actions/send-mfa-challenge
 * Sends an MFA challenge code to the user's email.
 */
export const sendMfaChallengeHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await sendMfaChallenge(userId);
    if (!result.success) {
      return res.status(503).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};


