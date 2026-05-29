import { supabaseAdmin } from '../shared/supabase';

export type OperationsScopeFilters = {
  environment?: string;
  brand_id?: string;
  brand_name?: string;
};

function applyRunScope(query: any, workspaceId: string, filters: OperationsScopeFilters = {}) {
  let scoped = query.eq('workspace_id', workspaceId);
  if (filters.environment) scoped = scoped.eq('environment', filters.environment);
  if (filters.brand_id) scoped = scoped.eq('brand_id', filters.brand_id);
  if (filters.brand_name) scoped = scoped.ilike('brand_name', filters.brand_name);
  return scoped;
}

async function getScopedRunIds(workspaceId: string, filters: OperationsScopeFilters = {}) {
  if (!filters.environment && !filters.brand_id && !filters.brand_name) return null;
  const { data, error } = await applyRunScope(
    supabaseAdmin.from('agent_runs').select('id'),
    workspaceId,
    filters,
  );
  if (error) throw error;
  return (data || []).map((run) => run.id);
}

function applyQueueIncidentScope(query: any, workspaceId: string, runIds: string[] | null) {
  let scoped = query.eq('workspace_id', workspaceId);
  if (runIds) scoped = runIds.length > 0 ? scoped.in('run_id', runIds) : scoped.eq('run_id', '00000000-0000-0000-0000-000000000000');
  return scoped;
}

export async function getOperationsStats(workspaceId: string, filters: OperationsScopeFilters = {}) {
  const scopedRunIds = await getScopedRunIds(workspaceId, filters);
  const [activeRuns, queueDepth, failedRuns, policyBlockedRuns, totalRuns, pendingQueues, openIncidents, escalations, slaBreaches, agents] = await Promise.all([
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'RUNNING'),
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).eq('status', 'PENDING'),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'FAILED'),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).in('policy_result', ['failed', 'mixed', 'BLOCKED', 'WARNING']),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters),
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).neq('status', 'RESOLVED'),
    applyQueueIncidentScope(supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).neq('status', 'resolved'),
    applyQueueIncidentScope(supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).in('status', ['open', 'escalated']),
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).neq('status', 'RESOLVED').lt('due_at', new Date().toISOString()),
    supabaseAdmin.from('agents').select('trust_score').eq('workspace_id', workspaceId),
  ]);

  const trustScores = (agents.data || [])
    .map((agent) => Number(agent.trust_score ?? 0))
    .filter((score) => Number.isFinite(score));
  const avgTrustScore =
    trustScores.length > 0
      ? Math.round((trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length) * 100)
      : 0;
  const total = totalRuns.count || 1;
  return {
    active_runs: activeRuns.count || 0,
    queue_depth: queueDepth.count || 0,
    queued_tasks: queueDepth.count || 0,
    pending_queues: pendingQueues.count || 0,
    failure_rate: Math.round(((failedRuns.count || 0) / total) * 100),
    failed_runs: failedRuns.count || 0,
    total_runs: totalRuns.count || 0,
    policy_block_rate: Math.round(((policyBlockedRuns.count || 0) / total) * 100),
    policy_blocked_runs: policyBlockedRuns.count || 0,
    policy_blocks: policyBlockedRuns.count || 0,
    open_incidents: openIncidents.count || 0,
    escalations: escalations.count || 0,
    sla_breaches: slaBreaches.count || 0,
    avg_trust_score: avgTrustScore,
  };
}

export async function getAnalyticsMetrics(workspaceId: string, filters: OperationsScopeFilters = {}) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const scopedRunIds = await getScopedRunIds(workspaceId, filters);
  const policyBlocked = ['failed', 'mixed', 'BLOCKED', 'WARNING'];
  const results = await Promise.all([
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'RUNNING'),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'RUNNING').gte('created_at', last24h),
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).eq('status', 'PENDING'),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).gte('created_at', last24h),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).gte('created_at', last7d),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).gte('created_at', last30d),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'FAILED').gte('created_at', last24h),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'FAILED').gte('created_at', last7d),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'FAILED').gte('created_at', last30d),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).in('policy_result', policyBlocked).gte('created_at', last24h),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).in('policy_result', policyBlocked).gte('created_at', last7d),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).in('policy_result', policyBlocked).gte('created_at', last30d),
    applyQueueIncidentScope(supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).gte('created_at', last24h),
    applyQueueIncidentScope(supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).gte('created_at', last7d),
    applyQueueIncidentScope(supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).gte('created_at', last30d),
    applyQueueIncidentScope(supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).eq('status', 'RESOLVED'),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).not('completed_at', 'is', null).gt('completed_at', 'due_at'),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).not('completed_at', 'is', null),
    applyQueueIncidentScope(supabaseAdmin.from('evidence_bundles').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds),
    applyQueueIncidentScope(supabaseAdmin.from('evidence_bundles').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).not('locked_at', 'is', null),
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
