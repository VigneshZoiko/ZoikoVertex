import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

/**
 * Forensic Analysis: Agent Faithfulness, Trust Scores, and Compliance Drift
 */
export const getForensicSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    // Fetch historical publish intents to analyze performance
    let query = supabaseAdmin
      .from('publish_intents')
      .select('risk_score, status, platform, created_at');

    if (!isSuperAdmin && workspaceId) query = query.eq('workspace_id', workspaceId);

    const { data: intents, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const total = intents?.length || 0;
    if (total === 0) {
      return res.json({
        success: true,
        data: {
          trust_score: 100,
          faithfulness: 100,
          compliance_drift: 0,
          incident_rate: 0,
          performance_history: []
        }
      });
    }

    // Calculate Metrics
    const approved = intents.filter(i => i.status === 'APPROVED').length;
    const rejected = intents.filter(i => i.status === 'REJECTED').length;
    const avgRisk = intents.reduce((acc, i) => acc + (i.risk_score || 0), 0) / total;
    
    const trustScore = Math.max(0, 100 - (avgRisk * 0.5) - (rejected / total * 100));
    const faithfulness = (approved / total) * 100;
    const incidentRate = (rejected / total) * 100;

    // Performance History (Grouped by week - simple version for MVP)
    const history = intents.slice(0, 20).map(i => ({
      date: i.created_at,
      score: 100 - (i.risk_score || 0)
    }));

    res.json({
      success: true,
      data: {
        trust_score: Math.round(trustScore),
        faithfulness: Math.round(faithfulness),
        compliance_drift: Math.round(avgRisk),
        incident_rate: Math.round(incidentRate),
        performance_history: history
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Agent Faithfulness Trace
 */
export const getAgentPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { agentId } = req.params;
    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    let query = supabaseAdmin
      .from('publish_intents')
      .select('id, risk_score, status, platform, created_at, feedback')
      .eq('agent_id', agentId);

    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: intents, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ success: true, data: intents || [] });
  } catch (error) {
    next(error);
  }
};
