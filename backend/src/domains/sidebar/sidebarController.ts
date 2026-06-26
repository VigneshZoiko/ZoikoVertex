import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';

export async function getSidebarCounts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    const isAdmin = !!(req.user?.role && ['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'].includes(req.user.role.toUpperCase()));
    if (!workspaceId) {
      return res.json({ success: true, data: { pending_count: 0, returned_count: 0, draft_count: 0 } });
    }

    const [intentsRes, reviewRes, draftRes] = await Promise.allSettled([
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
      // Draft count — non-admin users only see their own
      (() => {
        let q = supabaseAdmin
          .from('publish_drafts')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('status', 'ACTIVE');
        if (!isAdmin) q = q.eq('creator_id', userId);
        return q;
      })(),
    ]);

    const pendingCount = intentsRes.status === 'fulfilled' ? (intentsRes.value.count || 0) : 0;
    const returnedCount = reviewRes.status === 'fulfilled' ? (reviewRes.value.count || 0) : 0;
    const draftCount = draftRes.status === 'fulfilled' ? (draftRes.value.count || 0) : 0;

    res.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=40');
    res.json({ success: true, data: { pending_count: pendingCount, returned_count: returnedCount, draft_count: draftCount } });
  } catch (err) {
    next(err);
  }
}
