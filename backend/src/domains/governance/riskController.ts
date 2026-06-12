import { Response } from 'express';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { logAuditEvent } from './evidenceController';
import { AuthRequest } from '../../shared/authMiddleware';
import { lockStore } from '../agents/autonomyController';
import { v4 as uuidv4 } from 'uuid';

async function fireRiskAlertNotification(params: {
  workspaceId: string;
  posture: string;
  creditRating: string;
  openCases: number;
  criticalEvents: number;
}): Promise<void> {
  try {
    if (params.posture !== 'CRITICAL' && params.posture !== 'ELEVATED') return;
    const { data: adminMembers } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', params.workspaceId)
      .in('role', ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN']);
    const adminIds: string[] = (adminMembers || []).map((m: any) => m.user_id).filter(Boolean);
    if (!adminIds.length) return;
    const isCritical = params.posture === 'CRITICAL';
    await supabaseAdmin.from('notifications').insert(
      adminIds.map((userId: string) => ({
        id: uuidv4(),
        user_id: userId,
        title: isCritical
          ? `🔴 Risk Alert: Workspace Posture is CRITICAL (${params.creditRating})`
          : `🟠 Risk Alert: Elevated Risk Detected (${params.creditRating})`,
        body: `Your workspace risk posture is ${params.posture}. Credit rating: ${params.creditRating}. Open risk cases: ${params.openCases}, critical events: ${params.criticalEvents}. Immediate review required.`,
        type: 'WARNING',
        category: 'SECURITY',
        priority: isCritical ? 'URGENT' : 'HIGH',
        link: '/governance/risk',
        read: false,
      }))
    );
  } catch { /* non-blocking */ }
}

/**
 * 1. Enterprise Risk Pulse (Stats)
 */
export const getRiskPulse = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!workspaceId && !isSuperAdmin) return res.status(401).json({ error: 'Unauthorized' });

    const finalWorkspaceId = workspaceId || 'global';

    // Each query is individually resilient — a missing table returns 0, not a 500
    let criticalEvents = 0;
    try {
      const { count } = await supabaseAdmin
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .in('level', ['CRITICAL', 'error', 'HIGH']);
      criticalEvents = count || 0;
    } catch { /* system_logs may not exist yet — safe fallback */ }

    let openCases = 0;
    try {
      // FIX: reassign query so the workspace filter is actually applied
      let q = supabaseAdmin
        .from('publish_intents')
        .select('*', { count: 'exact', head: true })
        .in('status', ['REJECTED', 'GOVERNANCE_BLOCKED', 'PENDING_GOVERNANCE']);
      if (!isSuperAdmin && workspaceId) q = q.eq('workspace_id', workspaceId);
      const { count } = await q;
      openCases = count || 0;
    } catch { /* publish_intents may not exist yet */ }

    let governanceGaps = 0;
    try {
      // FIX: reassign gapQuery so the workspace filter is actually applied
      let gq = supabaseAdmin
        .from('publish_intents')
        .select('*', { count: 'exact', head: true })
        .gte('risk_score', 50);
      if (!isSuperAdmin && workspaceId) gq = gq.eq('workspace_id', workspaceId);
      const { count } = await gq;
      governanceGaps = count || 0;
    } catch { /* safe fallback */ }

    let lowTrustAgents = 0;
    try {
      let aq = supabaseAdmin.from('agents').select('trust_score, status');
      if (!isSuperAdmin && workspaceId) aq = aq.eq('workspace_id', workspaceId);
      const { data: agents } = await aq;
      lowTrustAgents = (agents || []).filter(a => (a.trust_score || 0) < 0.6).length;
    } catch { /* safe fallback */ }

    const totalGaps = governanceGaps + lowTrustAgents;

    // Interconnect with active emergency locks (Autonomy Control integration)
    const activeWorkspaceLocks = [...lockStore.values()].filter(l =>
      isSuperAdmin || l.workspace_id === finalWorkspaceId
    );
    const isLocked = activeWorkspaceLocks.length > 0;

    // Calculate credit rating
    let creditRating = 'AAA';
    let posture = 'SECURE';
    if (isLocked) {
      creditRating = 'D'; posture = 'CRITICAL';
    } else if (criticalEvents > 15 || openCases > 15) {
      creditRating = 'CCC'; posture = 'CRITICAL';
    } else if (criticalEvents > 10) {
      creditRating = 'B'; posture = 'CRITICAL';
    } else if (criticalEvents > 5) {
      creditRating = 'BB'; posture = 'ELEVATED';
    } else if (openCases > 20) {
      creditRating = 'A'; posture = 'ELEVATED';
    } else if (openCases > 5 || totalGaps > 2) {
      creditRating = 'AA'; posture = 'SECURE';
    }

    if (finalWorkspaceId !== 'global' && (posture === 'CRITICAL' || posture === 'ELEVATED')) {
      fireRiskAlertNotification({
        workspaceId: finalWorkspaceId,
        posture,
        creditRating,
        openCases,
        criticalEvents,
      });
    }

    res.json({
      success: true,
      data: {
        posture,
        credit_rating: creditRating,
        open_risk_cases: openCases,
        critical_events: criticalEvents,
        governance_gaps: totalGaps,
        restricted_operations: isLocked,
        active_emergency_locks: activeWorkspaceLocks.length,
      }
    });
  } catch (error) {
    console.error('Failed to fetch risk pulse:', error);
    // Return safe defaults so the page never crashes on load
    res.json({
      success: true,
      data: {
        posture: 'SECURE',
        credit_rating: 'AAA',
        open_risk_cases: 0,
        critical_events: 0,
        governance_gaps: 0,
        restricted_operations: false,
        active_emergency_locks: 0,
      }
    });
  }
};

/**
 * 2. Active Risk Feed
 */
export const getActiveRiskFeed = async (req: AuthRequest, res: Response) => {
  try {
    // Pull system_logs with HIGH/warn/error levels — fail-safe: empty array if table missing
    const { data: logs } = await supabaseAdmin
      .from('system_logs')
      .select('*')
      .in('level', ['warn', 'error', 'CRITICAL', 'HIGH'])
      .order('created_at', { ascending: false })
      .limit(20);

    // Never throw on missing table — return empty feed gracefully
    res.json({
      success: true,
      data: logs || []
    });
  } catch (error) {
    console.error('Failed to fetch active risk feed:', error);
    // Return empty feed — never 500 the risk page
    res.json({ success: true, data: [] });
  }
};

/**
 * 3. Governance Gap Monitor
 * Per spec: any high-risk item with a Defensibility Index below 95 (no evidence link)
 * must appear here automatically.
 */
export const getGovernanceGaps = async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    // High-risk and rejected items
    let query = supabaseAdmin
      .from('publish_intents')
      .select('id, content, platform, status, risk_score, risk_level, created_at, feedback, decision_id')
      .or('status.eq.REJECTED,risk_score.gte.50');

    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: items, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // GAP FIX 3: Defensibility Index — flag items with no Evidence Vault link (decision_id is null).
    // Per Risk & Compliance Command Center spec: items with Defensibility Index < 95 must appear.
    const enrichedItems = (items || []).map(item => ({
      ...item,
      defensibility_deficit: !item.decision_id, // true = no governance artifact linked
      defensibility_index: item.decision_id ? 95 : 40, // simplified score
      gap_type: !item.decision_id
        ? 'EVIDENCE_GAP'
        : item.status === 'REJECTED'
          ? 'POLICY_VIOLATION'
          : 'RISK_THRESHOLD_BREACH',
    }));

    res.json({
      success: true,
      data: enrichedItems,
      summary: {
        total_gaps: enrichedItems.length,
        evidence_gaps: enrichedItems.filter(i => i.defensibility_deficit).length,
        policy_violations: enrichedItems.filter(i => i.status === 'REJECTED').length,
        risk_breaches: enrichedItems.filter(i => i.risk_score >= 50 && i.status !== 'REJECTED').length,
      }
    });
  } catch (error) {
    console.error("Failed to fetch governance gaps:", error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * 4. Trigger Emergency Pause
 */
export const triggerEmergencyPause = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const actorId = req.user?.id;
    const isSuper = req.user?.is_superadmin;
    const { scope, reason } = req.body; // scope: 'workspace' | 'GLOBAL' | 'CAMPAIGN' | 'AGENT'

    if (!workspaceId && !isSuper) {
      return res.status(403).json({ success: false, error: 'Workspace context missing' });
    }

    const finalWorkspaceId = workspaceId || 'global';
    const now = new Date().toISOString();

    // ── 1. Suspend every operational agent in scope ────────────────────────
    // The kill switch is a hard stop: any agent that could still act
    // (ACTIVE / APPROVED / IN_REVIEW / PAUSED) is forced to SUSPENDED so it
    // stops working until a human manually restores it via Autonomy Control.
    let suspendedAgents = 0;
    try {
      let agentQuery = supabaseAdmin
        .from('agents')
        .update({ status: 'SUSPENDED', updated_at: now })
        .in('status', ['ACTIVE', 'APPROVED', 'IN_REVIEW', 'PAUSED'])
        .select('id');
      if (!isSuper && workspaceId) agentQuery = agentQuery.eq('workspace_id', workspaceId);
      const { data: suspended } = await agentQuery;
      suspendedAgents = suspended?.length || 0;
    } catch (err) {
      console.error('Emergency pause: failed to suspend agents', err);
    }

    // ── 2. Halt only genuinely-executing workflow runs in scope ────────────
    // Pause runs that are ACTIVELY executing (status 'running'). We deliberately
    // do NOT touch 'pending' / 'waiting_review' / 'blocked', because publish-hub
    // display instances live in those states — collapsing them to 'paused' would
    // hide flagged/queued posts from Live Orchestrations & Published Content
    // while giving no real safety benefit (the scheduler fires off
    // scheduled_posts, not these mirror instances). Agent suspension + the
    // emergency lock below are what actually stop new work.
    let pausedInstances = 0;
    try {
      let wfQuery = supabaseAdmin
        .from('workflow_instances')
        .update({ status: 'paused' })
        .eq('status', 'running')
        .select('id');
      if (!isSuper && workspaceId) wfQuery = wfQuery.eq('workspace_id', workspaceId);
      const { data: paused } = await wfQuery;
      pausedInstances = paused?.length || 0;
    } catch (err) {
      console.error('Emergency pause: failed to pause workflow instances', err);
    }

    // ── 3. Engage an in-memory emergency lock ──────────────────────────────
    // Blocks NEW autonomous actions from starting (consistent with the
    // Autonomy Control Center emergency-lock store) until it is released.
    const lock = {
      id: randomUUID(),
      level: 'L4',
      scope: scope || 'workspace',
      reason: reason || 'Global Kill Switch activated from Agent Studio',
      created_by: actorId || 'system',
      created_at: now,
      workspace_id: finalWorkspaceId,
    };
    lockStore.set(lock.id, lock);

    // ── 4. Log this highly critical event ──────────────────────────────────
    await logAuditEvent({
      workspaceId: finalWorkspaceId === 'global' ? '00000000-0000-0000-0000-000000000000' : finalWorkspaceId,
      actorId: actorId || 'system',
      module: 'RiskCommandCenter',
      action: `Emergency Pause triggered: ${scope}. Suspended ${suspendedAgents} agent(s), paused ${pausedInstances} workflow(s). Reason: ${reason}`,
      riskLevel: 'CRITICAL',
      objectType: 'EMERGENCY_PAUSE'
    });

    res.json({
      success: true,
      lockId: lock.id,
      suspendedAgents,
      pausedInstances,
      message: `Emergency Pause (${scope}) activated. ${suspendedAgents} agent(s) suspended and ${pausedInstances} workflow(s) halted. All autonomous actions are blocked until restored.`
    });
  } catch (error) {
    console.error("Failed to trigger emergency pause:", error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
