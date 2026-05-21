import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';

export const listExceptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const isSuper = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Fetch intents then filter in JS — avoids enum type errors for values like
    //    RESTRICTED that may not exist in the live risk_level enum yet.
    let query = supabaseAdmin
      .from('publish_intents')
      .select(`
        *,
        creator:users!publish_intents_creator_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (!isSuper) {
      if (!workspaceId) return res.status(403).json({ error: 'Workspace context missing' });
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: rawData, error } = await query;
    if (error) {
      if ((error as { code?: string }).code === '42P01') return res.status(200).json({ success: true, data: [] });
      throw error;
    }

    const data = (rawData || []).filter((item: { status: string; risk_level: string }) =>
      item.status === 'FAILED' || item.status === 'RETURNED' ||
      item.risk_level === 'HIGH' || item.risk_level === 'RESTRICTED'
    );

    // 2. Format exceptions into specific categories
    const categorized = data.map(item => {
      let type = 'Policy Warning';
      if (item.status === 'FAILED') type = 'Technical Failure';
      if (item.status === 'RETURNED') type = 'Reviewer Dispute';
      if (item.risk_level === 'RESTRICTED') type = 'Policy Conflict';

      return {
        ...item,
        exception_type: type,
        severity: item.risk_level === 'RESTRICTED' || item.status === 'FAILED' ? 'HIGH' : 'MEDIUM'
      };
    });

    res.status(200).json({ success: true, data: categorized });
  } catch (error) {
    next(error);
  }
};

export const resolveException = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { intentId, resolution, override = false } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Logic to mark exception as resolved or apply override
    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .update({ 
        status: override ? 'APPROVED' : 'PENDING_ADMIN',
        feedback: `Exception Resolved: ${resolution}`
      })
      .eq('id', intentId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`[Exceptions] Resolved exception for intent ${intentId} by user ${userId}`);
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
