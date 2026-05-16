import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const getIntegrationHealth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .single();

    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });

    const workspaceId = member.workspace_id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [accountsRes, postsRes, logsRes] = await Promise.all([
      supabaseAdmin
        .from('connected_accounts')
        .select('id, platform, account_name, account_handle, avatar_url, status, created_at')
        .eq('workspace_id', workspaceId)
        .order('platform'),

      supabaseAdmin
        .from('scheduled_posts')
        .select('id, platform, status, content, scheduled_time, published_time, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('system_logs')
        .select('level, service, message, payload, created_at')
        .eq('level', 'error')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const accounts = accountsRes.data || [];
    const posts = postsRes.data || [];
    const errorLogs = logsRes.data || [];

    // Fetch failed scheduler jobs for this workspace's posts
    const postIds = posts.map((p: any) => p.id);
    let failedJobs: any[] = [];
    if (postIds.length > 0) {
      const { data: jobs } = await supabaseAdmin
        .from('scheduler_jobs')
        .select('post_id, execution_status, retry_count, created_at')
        .in('post_id', postIds)
        .eq('execution_status', 'FAILED')
        .order('created_at', { ascending: false })
        .limit(10);

      failedJobs = (jobs || []).map((job: any) => ({
        ...job,
        post: posts.find((p: any) => p.id === job.post_id) || null,
      }));
    }

    const published = posts.filter((p: any) => p.status === 'PUBLISHED').length;
    const failed = posts.filter((p: any) => p.status === 'FAILED').length;
    const scheduled = posts.filter((p: any) => ['SCHEDULED', 'PUBLISHING'].includes(p.status)).length;
    const total = published + failed;
    const healthScore = total > 0 ? Math.round((published / total) * 100) : 100;

    const platformBreakdown: Record<string, { published: number; failed: number; scheduled: number }> = {};
    posts.forEach((post: any) => {
      if (!platformBreakdown[post.platform]) {
        platformBreakdown[post.platform] = { published: 0, failed: 0, scheduled: 0 };
      }
      if (post.status === 'PUBLISHED') platformBreakdown[post.platform].published++;
      else if (post.status === 'FAILED') platformBreakdown[post.platform].failed++;
      else platformBreakdown[post.platform].scheduled++;
    });

    res.json({
      success: true,
      data: {
        health_score: healthScore,
        accounts,
        stats: {
          total_accounts: accounts.length,
          published,
          failed,
          scheduled,
          period_days: 7,
        },
        platform_breakdown: platformBreakdown,
        failed_jobs: failedJobs,
        recent_errors: errorLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};
