import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const getCalendarEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.json({ success: true, data: [] });

    const [scheduledRes, intentsRes] = await Promise.allSettled([
      supabaseAdmin
        .from('scheduled_posts')
        .select('id, content, platform, scheduled_time, status, media_url, created_at')
        .eq('workspace_id', workspaceId)
        .order('scheduled_time', { ascending: false })
        .limit(300),

      supabaseAdmin
        .from('publish_intents')
        .select('id, content, platform, status, media_url, created_at, scheduled_for, campaign_id, project_id')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(300),
    ]);

    const scheduledPosts =
      scheduledRes.status === 'fulfilled' && !scheduledRes.value.error
        ? (scheduledRes.value.data || []).map((p: any) => ({
            id: p.id,
            content: p.content,
            platform: p.platform,
            calendarDate: p.scheduled_time,
            status: p.status,
            media_url: p.media_url,
            created_at: p.created_at,
            source: 'scheduled',
            scheduled_time: p.scheduled_time,
          }))
        : [];

    const intentPosts =
      intentsRes.status === 'fulfilled' && !intentsRes.value.error
        ? (intentsRes.value.data || []).map((p: any) => ({
            id: p.id,
            content: p.content,
            platform: p.platform,
            calendarDate: p.scheduled_for ?? p.created_at,
            status: p.status,
            media_url: p.media_url,
            created_at: p.created_at,
            scheduled_for: p.scheduled_for ?? null,
            source: 'intent',
            campaign_id: p.campaign_id,
            project_id: p.project_id,
          }))
        : [];

    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    res.json({ success: true, data: [...scheduledPosts, ...intentPosts] });
  } catch (error) {
    next(error);
  }
};
