/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';

/**
 * Get aggregated resource usage for a workspace
 */
export const getResourceUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'workspaceId is required' });
    }

    // 1. Get recent usage logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('resource_usage')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (logsError) throw logsError;

    const aggregated = logs?.reduce((acc: any, log: any) => {
      const type = log.resource_type;
      if (!acc[type]) acc[type] = { quantity: 0, cost: 0, unit: log.unit };
      acc[type].quantity += parseFloat(log.quantity);
      acc[type].cost += parseFloat(log.cost_usd);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        recent_logs: logs,
        summary: aggregated
      }
    });
  } catch (error) {
    next(error);
  }
};
