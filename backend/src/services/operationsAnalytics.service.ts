import { supabaseAdmin } from '../shared/supabase';

function ratio(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function fraction(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

export async function getOperationsStats(workspaceId: string) {
  const [
    activeRuns,
    queuedRuns,
    failedRuns,
    policyBlockedRuns,
    totalRuns,
    openIncidents,
    escalatedRuns,
    restrictedRuns,
    slaBreachedRuns,
    trustRows,
  ] = await Promise.all([
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'RUNNING'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'QUEUED'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'FAILED'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'POLICY_BLOCKED'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'OPEN'),
    supabaseAdmin.from('runtime_control_actions').select('id', { count: 'exact', head: true }).eq('action_type', 'escalate'),
    supabaseAdmin.from('run_events').select('id', { count: 'exact', head: true }).eq('event_type', 'policy.blocked'),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).not('due_at', 'is', null).lt('due_at', new Date().toISOString()).in('status', ['QUEUED', 'RUNNING', 'WAITING_HUMAN_REVIEW', 'PAUSED', 'FAILED', 'POLICY_BLOCKED']),
    supabaseAdmin.from('agents').select('trust_score').eq('workspace_id', workspaceId),
  ]);

  const trustScoreRows = trustRows.data || [];
  const avgTrustScore = trustScoreRows.length
    ? Math.round(
        trustScoreRows.reduce((sum, row) => sum + Number((row as { trust_score?: number }).trust_score || 0), 0) /
          trustScoreRows.length,
      )
    : 0;

  return {
    active_runs: activeRuns.count || 0,
    queued_tasks: queuedRuns.count || 0,
    failed_runs: failedRuns.count || 0,
    open_incidents: openIncidents.count || 0,
    policy_blocks: policyBlockedRuns.count || 0,
    escalations: escalatedRuns.count || 0,
    restricted_operations: restrictedRuns.count || 0,
    sla_breaches: slaBreachedRuns.count || 0,
    avg_trust_score: avgTrustScore,
    total_runs: totalRuns.count || 0,
  };
}

export async function getAnalyticsMetrics(workspaceId: string) {
  const now = new Date();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    allRuns,
    failedRuns,
    policyBlockedRuns,
    reviewQueueRows,
    retryRequestedEvents,
    retryRecoveredRuns,
    escalatedEvents,
    dueRuns,
    breachedRuns,
    evidenceBundles,
    lockedEvidenceBundles,
    openQueues,
    resolvedQueues,
    incidents,
    resolvedIncidents,
  ] = await Promise.all([
    supabaseAdmin.from('agent_runs').select('id, created_at', { count: 'exact' }).eq('workspace_id', workspaceId).gte('created_at', last30d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'FAILED').gte('created_at', last30d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'POLICY_BLOCKED').gte('created_at', last30d),
    supabaseAdmin.from('queue_items').select('created_at, resolved_at, queue_type').eq('workspace_id', workspaceId),
    supabaseAdmin.from('run_events').select('id', { count: 'exact', head: true }).eq('event_type', 'run.retry_requested').gte('created_at', last30d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'COMPLETED').gt('retry_count', 0).gte('created_at', last30d),
    supabaseAdmin.from('runtime_control_actions').select('id', { count: 'exact', head: true }).eq('action_type', 'escalate').gte('created_at', last30d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).not('due_at', 'is', null).gte('created_at', last30d),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).not('due_at', 'is', null).lt('due_at', new Date().toISOString()).in('status', ['QUEUED', 'RUNNING', 'WAITING_HUMAN_REVIEW', 'PAUSED', 'FAILED', 'POLICY_BLOCKED']),
    supabaseAdmin.from('evidence_bundles').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabaseAdmin.from('evidence_bundles').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'LOCKED'),
    supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('status', 'RESOLVED'),
    supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'RESOLVED'),
    supabaseAdmin.from('incidents').select('created_at, closed_at').eq('workspace_id', workspaceId).gte('created_at', last30d),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'RESOLVED').gte('created_at', last30d),
  ]);

  const runRows = allRuns.data || [];
  const queueRows = reviewQueueRows.data || [];
  const incidentRows = incidents.data || [];
  const totalRuns = allRuns.count || runRows.length || 0;

  const reviewDurations = queueRows
    .filter((row) => ['APPROVAL', 'HUMAN_REVIEW', 'REVIEW', 'INCIDENT'].includes(String((row as { queue_type?: string }).queue_type || '').toUpperCase()))
    .filter((row) => (row as { resolved_at?: string | null }).resolved_at)
    .map((row) => {
      const createdAt = new Date((row as { created_at: string }).created_at).getTime();
      const resolvedAt = new Date((row as { resolved_at: string }).resolved_at).getTime();
      return Math.max(0, resolvedAt - createdAt) / 60000;
    });

  const incidentClosureDurations = incidentRows
    .filter((row) => (row as { closed_at?: string | null }).closed_at)
    .map((row) => {
      const createdAt = new Date((row as { created_at: string }).created_at).getTime();
      const closedAt = new Date((row as { closed_at: string }).closed_at).getTime();
      return Math.max(0, closedAt - createdAt) / 3600000;
    });

  const runsPerDay = Number((totalRuns / 30).toFixed(1));
  const failureRatePct = ratio(failedRuns.count || 0, totalRuns);
  const retrySuccessPct = ratio(retryRecoveredRuns.count || 0, retryRequestedEvents.count || 0);
  const policyBlockPct = ratio(policyBlockedRuns.count || 0, totalRuns);
  const reworkPct = ratio(retryRequestedEvents.count || 0, totalRuns);
  const slaBreachPct = ratio(breachedRuns.count || 0, dueRuns.count || 0);
  const evidenceCompletenessPct = ratio(lockedEvidenceBundles.count || 0, evidenceBundles.count || 0);

  return {
    throughput: totalRuns,
    backlog: openQueues.count || 0,
    failure_rate: fraction(failedRuns.count || 0, totalRuns),
    retry_success_rate: fraction(retryRecoveredRuns.count || 0, retryRequestedEvents.count || 0),
    policy_block_rate: fraction(policyBlockedRuns.count || 0, totalRuns),
    approval_time: reviewDurations.length
      ? Number((reviewDurations.reduce((sum, duration) => sum + duration, 0) / reviewDurations.length).toFixed(1))
      : 0,
    productivity: runsPerDay,
    rework_rate: reworkPct,
    escalation_trends: escalatedEvents.count || 0,
    sla_breach_rate: fraction(breachedRuns.count || 0, dueRuns.count || 0),
    evidence_completeness: evidenceCompletenessPct,
    avg_review_time_minutes: reviewDurations.length
      ? Number((reviewDurations.reduce((sum, duration) => sum + duration, 0) / reviewDurations.length).toFixed(1))
      : 0,
    incident_closure_time_hours: incidentClosureDurations.length
      ? Number((incidentClosureDurations.reduce((sum, duration) => sum + duration, 0) / incidentClosureDurations.length).toFixed(1))
      : 0,
    queue_depth: openQueues.count || 0,
    resolved_queue_items: resolvedQueues.count || 0,
    resolved_incidents: resolvedIncidents.count || 0,
    failure_rate_pct: failureRatePct,
    retry_success_rate_pct: retrySuccessPct,
    policy_block_rate_pct: policyBlockPct,
    sla_breach_rate_pct: slaBreachPct,
    evidence_completeness_pct: evidenceCompletenessPct,
    throughput_per_day: runsPerDay,
  };
}
