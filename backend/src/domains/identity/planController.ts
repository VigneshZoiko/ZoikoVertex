import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';

const VALID_PLANS = ['FREE', 'STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE'];

export const changePlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace context' });

    const { plan_type } = req.body;
    if (!plan_type || !VALID_PLANS.includes((plan_type as string).toUpperCase())) {
      return res.status(400).json({
        error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}`,
      });
    }

    const plan = (plan_type as string).toUpperCase();

    // Update workspaces.plan_type (read by auth middleware for every request)
    const { error: wsErr } = await supabaseAdmin
      .from('workspaces')
      .update({ plan_type: plan, updated_at: new Date().toISOString() })
      .eq('id', workspaceId);

    if (wsErr) throw wsErr;

    // Also mirror to organizations.plan_type (read by user context endpoint)
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('org_id')
      .eq('id', workspaceId)
      .single();

    if (ws?.org_id) {
      await supabaseAdmin
        .from('organizations')
        .update({ plan_type: plan, updated_at: new Date().toISOString() })
        .eq('id', ws.org_id);
    }

    res.json({
      success: true,
      data: { plan_type: plan },
      message: `Plan updated to ${plan}`,
    });
  } catch (err) { next(err); }
};
