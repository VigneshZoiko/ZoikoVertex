import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';

export async function getSidebarCounts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId) {
      return res.json({ success: true, data: { pending_count: 0, returned_count: 0 } });
    }

    const [intentsRes, reviewRes] = await Promise.allSettled([
      supabaseAdmin
        .from('publish_intents')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .like('status', 'PENDING_%'),
      supabaseAdmin
        .from('review_items')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('submitted_by', userId)
        .in('status', ['AWAITING_REVISION', 'RESUBMITTED']),
    ]);

    const pendingCount = intentsRes.status === 'fulfilled' ? (intentsRes.value.count || 0) : 0;
    const returnedCount = reviewRes.status === 'fulfilled' ? (reviewRes.value.count || 0) : 0;

    res.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=40');
    res.json({ success: true, data: { pending_count: pendingCount, returned_count: returnedCount } });
  } catch (err) {
    next(err);
  }
}
