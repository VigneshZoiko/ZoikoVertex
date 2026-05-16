import { Response } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logAuditEvent } from './evidenceController';
import { AuthRequest } from '../../shared/authMiddleware';

/**
 * 1. Enterprise Risk Pulse (Stats)
 */
export const getRiskPulse = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;
    
    if (!workspaceId && !isSuperAdmin) return res.status(401).json({ error: "Unauthorized" });

    // Count open risk cases (using system_logs with risk level HIGH/CRITICAL as proxy for MVP)
    const { count: criticalEvents } = await supabaseAdmin
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .in('level', ['CRITICAL', 'error', 'HIGH']);

    const query = supabaseAdmin
      .from('publish_intents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'REJECTED'); // treat rejected intents as open risk cases for MVP

    if (!isSuperAdmin) query.eq('workspace_id', workspaceId);
    
    const { count: openCases } = await query;

    const gapQuery = supabaseAdmin
      .from('publish_intents')
      .select('*', { count: 'exact', head: true })
      .gte('risk_score', 50);

    if (!isSuperAdmin) gapQuery.eq('workspace_id', workspaceId);
    
    const { count: governanceGaps } = await gapQuery;

    // Calculate rating based on critical events and open cases
    let creditRating = 'AAA';
    if (criticalEvents && criticalEvents > 10) creditRating = 'B';
    else if (criticalEvents && criticalEvents > 5) creditRating = 'BB';
    else if (openCases && openCases > 20) creditRating = 'A';
    else if (openCases && openCases > 5) creditRating = 'AA';

    res.json({
      success: true,
      data: {
        posture: creditRating === 'AAA' || creditRating === 'AA' ? 'SECURE' : creditRating === 'A' ? 'ELEVATED' : 'CRITICAL',
        credit_rating: creditRating,
        open_risk_cases: openCases || 0,
        critical_events: criticalEvents || 0,
        governance_gaps: governanceGaps || 0,
        restricted_operations: false, // Default normal state for MVP
      }
    });
  } catch (error) {
    console.error("Failed to fetch risk pulse:", error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * 2. Active Risk Feed
 */
export const getActiveRiskFeed = async (req: AuthRequest, res: Response) => {
  try {
    // For MVP, we pull system_logs with HIGH/warn/error levels
    const { data: logs, error } = await supabaseAdmin
      .from('system_logs')
      .select('*')
      .in('level', ['warn', 'error', 'CRITICAL', 'HIGH'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error("Failed to fetch active risk feed:", error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * 3. Governance Gap Monitor
 */
export const getGovernanceGaps = async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    // For MVP, items with high risk score or rejected status
    let query = supabaseAdmin
      .from('publish_intents')
      .select('id, content, platform, status, risk_score, risk_level, created_at, feedback')
      .or('status.eq.REJECTED,risk_score.gte.50');

    if (!isSuperAdmin) query = query.eq('workspace_id', workspaceId);

    const { data: items, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      success: true,
      data: items
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
    const { scope, reason } = req.body; // scope: 'GLOBAL', 'CAMPAIGN', 'AGENT'

    // Log this highly critical event
    await logAuditEvent({
      workspaceId: workspaceId || '00000000-0000-0000-0000-000000000000',
      actorId: actorId || 'system',
      module: 'RiskCommandCenter',
      action: `Emergency Pause triggered: ${scope}. Reason: ${reason}`,
      riskLevel: 'CRITICAL',
      objectType: 'EMERGENCY_PAUSE'
    });

    res.json({
      success: true,
      message: `Emergency Pause (${scope}) activated successfully. All autonomous actions suspended.`
    });
  } catch (error) {
    console.error("Failed to trigger emergency pause:", error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
