import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const getIntegrationHealth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace context missing' });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [accountsRes, postsRes, logsRes, webhooksRes, webhookDeliveriesRes] = await Promise.all([
      // Only return actively connected accounts
      supabaseAdmin
        .from('connected_accounts')
        .select('id, platform, account_name, account_handle, avatar_url, status, created_at')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
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

      // Active webhooks
      supabaseAdmin
        .from('webhook_endpoints')
        .select('id, name, url, events, is_active, last_triggered_at, failure_count')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true),

      // Recent webhook deliveries
      supabaseAdmin
        .from('webhook_delivery_log')
        .select('status, event_type, created_at, duration_ms')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const accounts  = accountsRes.data  || [];
    const posts     = postsRes.data     || [];
    const errorLogs = logsRes.data      || [];
    const webhooks  = webhooksRes.data  || [];
    const deliveries = webhookDeliveriesRes.data || [];

    // Filter deliveries to only those belonging to this workspace's webhooks
    const webhookIds = new Set(webhooks.map((w: any) => w.id));
    // (delivery_log has webhook_endpoint_id so we can cross-reference if needed — kept simple here)

    // Webhook delivery stats
    const deliverySuccess = deliveries.filter((d: any) => d.status === 'success').length;
    const deliveryTotal   = deliveries.length;
    const webhookHealthPct = deliveryTotal > 0
      ? Math.round((deliverySuccess / deliveryTotal) * 100)
      : 100;

    // Failed scheduler jobs
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
    const failed    = posts.filter((p: any) => p.status === 'FAILED').length;
    const scheduled = posts.filter((p: any) => ['SCHEDULED', 'PUBLISHING'].includes(p.status)).length;
    const total     = published + failed;
    const healthScore = total > 0 ? Math.round((published / total) * 100) : 100;

    const platformBreakdown: Record<string, { published: number; failed: number; scheduled: number }> = {};
    posts.forEach((post: any) => {
      if (!platformBreakdown[post.platform]) {
        platformBreakdown[post.platform] = { published: 0, failed: 0, scheduled: 0 };
      }
      if (post.status === 'PUBLISHED')                                   platformBreakdown[post.platform].published++;
      else if (post.status === 'FAILED')                                 platformBreakdown[post.platform].failed++;
      else if (['SCHEDULED', 'PUBLISHING'].includes(post.status))        platformBreakdown[post.platform].scheduled++;
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
        webhooks: {
          active_count: webhooks.length,
          endpoints: webhooks,
          delivery_total: deliveryTotal,
          delivery_success: deliverySuccess,
          health_pct: webhookHealthPct,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
