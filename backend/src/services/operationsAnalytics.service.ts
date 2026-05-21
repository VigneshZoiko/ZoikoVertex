import { supabaseAdmin } from '../shared/supabase';

export async function getOperationsStats(workspaceId: string) {
  const [activeRuns, queueDepth, failedRuns, policyBlockedRuns, totalRuns, pendingQueues] = await Promise.all([
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'RUNNING'),
    supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'PENDING'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'FAILED'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).in('policy_result', ['failed', 'mixed']),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('status', 'RESOLVED'),
  ]);

  const total = totalRuns.count || 1;
  return {
    active_runs: activeRuns.count || 0,
    queue_depth: queueDepth.count || 0,
    pending_queues: pendingQueues.count || 0,
    failure_rate: Math.round(((failedRuns.count || 0) / total) * 100),
    failed_runs: failedRuns.count || 0,
    total_runs: totalRuns.count || 0,
    policy_block_rate: Math.round(((policyBlockedRuns.count || 0) / total) * 100),
    policy_blocked_runs: policyBlockedRuns.count || 0,
  };
}

export async function getAnalyticsMetrics(workspaceId: string) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const results = await Promise.all([
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'RUNNING'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'RUNNING').gte('created_at', last24h),
    supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'PENDING'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', last24h),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', last7d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', last30d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'FAILED').gte('created_at', last24h),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'FAILED').gte('created_at', last7d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'FAILED').gte('created_at', last30d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).in('policy_result', ['failed', 'mixed']).gte('created_at', last24h),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).in('policy_result', ['failed', 'mixed']).gte('created_at', last7d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).in('policy_result', ['failed', 'mixed']).gte('created_at', last30d),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', last24h),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', last7d),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', last30d),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'RESOLVED'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).not('completed_at', 'is', null).gt('completed_at', 'due_at'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).not('completed_at', 'is', null),
    supabaseAdmin.from('evidence_bundles').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabaseAdmin.from('evidence_bundles').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).not('locked_at', 'is', null),
  ]);

  const [
    activeRuns, activeRuns24h, queueDepth,
    runs24, runs7d, runs30d,
    failed24, failed7d, failed30d,
    policyBlocked24, policyBlocked7d, policyBlocked30d,
    incidents24, incidents7d, incidents30d,
    resolvedIncidents, slaBreached, slaTotal,
    evidenceBundles, lockedBundles,
  ] = results.map((r) => r.count || 0);

  const runs24hCount = runs24;
  const runs7dCount = runs7d;
  const runs30dCount = runs30d;

  return {
    active_runs: { value: activeRuns, unit: 'count', period: 'current', trend: activeRuns24h > activeRuns * 0.5 ? 'up' : 'down' },
    queue_depth: { value: queueDepth, unit: 'items', period: 'current', trend: queueDepth > 10 ? 'up' : 'stable' },
    throughput: {
      '24h': runs24hCount,
      '7d': runs7dCount,
      '30d': runs30dCount,
    },
    failure_rate: {
      '24h': runs24hCount > 0 ? Math.round((failed24 / runs24hCount) * 100) : 0,
      '7d': runs7dCount > 0 ? Math.round((failed7d / runs7dCount) * 100) : 0,
      '30d': runs30dCount > 0 ? Math.round((failed30d / runs30dCount) * 100) : 0,
    },
    retry_success_rate: {
      '24h': 0,
      '7d': 0,
      '30d': 0,
    },
    policy_block_rate: {
      '24h': runs24hCount > 0 ? Math.round((policyBlocked24 / runs24hCount) * 100) : 0,
      '7d': runs7dCount > 0 ? Math.round((policyBlocked7d / runs7dCount) * 100) : 0,
      '30d': runs30dCount > 0 ? Math.round((policyBlocked30d / runs30dCount) * 100) : 0,
    },
    incidents: {
      '24h': { created: incidents24, resolved: 0 },
      '7d': { created: incidents7d, resolved: 0 },
      '30d': { created: incidents30d, resolved: resolvedIncidents },
    },
    sla_breach_rate: slaTotal > 0 ? Math.round((slaBreached / slaTotal) * 100) : 0,
    evidence_completeness: evidenceBundles > 0 ? Math.round((lockedBundles / evidenceBundles) * 100) : 0,
  };
}
