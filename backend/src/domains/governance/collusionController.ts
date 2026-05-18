import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

/**
 * Collusion Heuristics Engine: Audits approval behaviors and insider risk metrics
 */
export const getCollusionMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    if (!isSuperAdmin && !workspaceId) {
      return res.status(403).json({ error: 'Workspace context missing' });
    }

    // Fetch intents and historical audit trails
    let query = supabaseAdmin
      .from('publish_intents')
      .select('id, agent_id, status, risk_score, created_at, updated_at, metadata');

    if (!isSuperAdmin && workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: intents, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Default heuristics values if data is fresh
    let rubberStampCount = 0;
    let segregationViolations = 0;
    let warningOverrides = 0;
    let monopolizedApprovals = 0;

    const incidentList: any[] = [];

    if (intents && intents.length > 0) {
      intents.forEach((intent) => {
        const metadata = intent.metadata || {};
        const creationTime = new Date(intent.created_at).getTime();
        const actionTime = new Date(intent.updated_at || intent.created_at).getTime();
        const durationSeconds = (actionTime - creationTime) / 1000;

        // Heuristic 1: Rubber-Stamping (Approval compression < 5s)
        if (intent.status === 'APPROVED' && durationSeconds > 0 && durationSeconds < 5) {
          rubberStampCount++;
          incidentList.push({
            id: intent.id,
            type: 'Approval Compression (Rubber-Stamping)',
            severity: 'HIGH',
            details: `Approved in only ${durationSeconds.toFixed(1)}s, indicating negligent review of asset.`,
            timestamp: intent.updated_at,
          });
        }

        // Heuristic 2: Segregation of Duties Violation
        const creatorId = metadata.creator_id || metadata.uploader_id;
        const approverId = metadata.approver_id;
        if (creatorId && approverId && creatorId === approverId) {
          segregationViolations++;
          incidentList.push({
            id: intent.id,
            type: 'Segregation of Duties Violation',
            severity: 'CRITICAL',
            details: 'Same human actor created and approved this high-risk agent output.',
            timestamp: intent.updated_at,
          });
        }

        // Heuristic 3: Warnings Overridden with Zero Remediation
        if (intent.status === 'APPROVED' && intent.risk_score > 60 && !metadata.remediation_applied) {
          warningOverrides++;
          incidentList.push({
            id: intent.id,
            type: 'Un-remediated Warning Override',
            severity: 'MEDIUM',
            details: `High-risk score (${intent.risk_score}%) approved without applying required policy remediation or edits.`,
            timestamp: intent.updated_at,
          });
        }
      });
    }

    // Heuristics calculation
    const totalCount = intents?.length || 0;
    const collusionIndex = Math.min(
      100,
      Math.round(
        (rubberStampCount * 25) + 
        (segregationViolations * 35) + 
        (warningOverrides * 20)
      )
    );

    res.json({
      success: true,
      data: {
        collusion_index: collusionIndex, // Risk Index: 0 (perfect) to 100 (extreme threat)
        rubber_stamps: rubberStampCount,
        segregation_violations: segregationViolations,
        warning_overrides: warningOverrides,
        monopolized_approvals: monopolizedApprovals,
        incidents: incidentList.slice(0, 10), // return top 10 incidents
      }
    });
  } catch (error) {
    next(error);
  }
};
