import { supabaseAdmin } from '../shared/supabase';

export type OperationsScopeFilters = {
  environment?: string;
  brand_id?: string;
  brand_name?: string;
};

// Real DB enum values (lowercase):
//   queue_items.status : open | claimed | assigned | on_hold | resolved | cancelled | escalated
//   incidents.status   : open | investigating | in_remediation | resolved | closed
//   policy_outcome      : pass | warning | blocked | pending_review | not_applicable
const QUEUE_CLOSED = '(resolved,cancelled)';        // queue items no longer in backlog
const INCIDENT_CLOSED = '(resolved,closed)';        // incidents no longer open

function applyRunScope(query: any, workspaceId: string, filters: OperationsScopeFilters = {}) {
  let scoped = query.eq('workspace_id', workspaceId);
  if (filters.environment) scoped = scoped.eq('environment', filters.environment);
  if (filters.brand_id) scoped = scoped.eq('brand_id', filters.brand_id);
  if (filters.brand_name) scoped = scoped.ilike('brand_name', filters.brand_name);
  return scoped;
}

// All run ids in scope (always resolved — needed to scope child tables such as
// runtime_control_actions which have no workspace_id column of their own).
async function getAllWorkspaceRunIds(workspaceId: string, filters: OperationsScopeFilters = {}): Promise<string[]> {
  const { data, error } = await applyRunScope(
    supabaseAdmin.from('agent_runs').select('id'),
    workspaceId,
    filters,
  );
  if (error) throw error;
  return (data || []).map((run: { id: string }) => run.id);
}

function applyQueueIncidentScope(query: any, workspaceId: string, runIds: string[] | null) {
  let scoped = query.eq('workspace_id', workspaceId);
  if (runIds) scoped = runIds.length > 0 ? scoped.in('run_id', runIds) : scoped.eq('run_id', '00000000-0000-0000-0000-000000000000');
  return scoped;
}

export async function getOperationsStats(workspaceId: string, filters: OperationsScopeFilters = {}) {
  const hasFilters = Boolean(filters.environment || filters.brand_id || filters.brand_name);
  const runIds = await getAllWorkspaceRunIds(workspaceId, filters);
  const scopedRunIds = hasFilters ? runIds : null;
  const nowIso = new Date().toISOString();

  const [
    activeRuns, queueDepth, failedRuns, policyBlockedRuns, totalRuns,
    pendingQueues, openIncidents, slaBreaches, escalations, quarantinedRuns,
  ] = await Promise.all([
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'RUNNING'),
    // Queue backlog = every queue item that is not yet resolved/cancelled.
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).not('status', 'in', QUEUE_CLOSED),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'FAILED'),
    // Policy blocked = currently blocked OR evaluated as blocked.
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).or('status.eq.POLICY_BLOCKED,policy_result.eq.blocked'),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters),
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).not('status', 'in', QUEUE_CLOSED),
    applyQueueIncidentScope(supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).not('status', 'in', INCIDENT_CLOSED),
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).not('status', 'in', QUEUE_CLOSED).lt('due_at', nowIso),
    // Escalations are runtime control actions, scoped via run ids.
    runIds.length
      ? supabaseAdmin.from('runtime_control_actions').select('id', { count: 'exact', head: true }).eq('action_type', 'escalate').in('run_id', runIds)
      : Promise.resolve({ count: 0 }),
    applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters).eq('status', 'QUARANTINED'),
  ]);

  const total = totalRuns.count || 0;
  const failed = failedRuns.count || 0;
  const policyBlocked = policyBlockedRuns.count || 0;
  const quarantined = quarantinedRuns.count || 0;

  // Operations health = share of ALL operations NOT in a problem state
  // (failed / policy-blocked / quarantined), as a real percentage across the
  // current scope. Replaces the previous static agent trust average.
  const problemRuns = failed + policyBlocked + quarantined;
  const operationsHealthScore =
    total > 0 ? Math.max(0, Math.round(((total - problemRuns) / total) * 100)) : 100;

  const denom = total || 1;
  return {
    active_runs: activeRuns.count || 0,
    queue_depth: queueDepth.count || 0,
    queued_tasks: queueDepth.count || 0,
    pending_queues: pendingQueues.count || 0,
    failure_rate: Math.round((failed / denom) * 100),
    failed_runs: failed,
    total_runs: total,
    policy_block_rate: Math.round((policyBlocked / denom) * 100),
    policy_blocked_runs: policyBlocked,
    policy_blocks: policyBlocked,
    quarantined_runs: quarantined,
    open_incidents: openIncidents.count || 0,
    escalations: escalations.count || 0,
    sla_breaches: slaBreaches.count || 0,
    // Operations-derived health score across all runs in scope. avg_trust_score
    // is kept as an alias for backward compatibility with existing clients.
    operations_health_score: operationsHealthScore,
    avg_trust_score: operationsHealthScore,
  };
}

export async function getAnalyticsMetrics(workspaceId: string, filters: OperationsScopeFilters = {}) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const hasFilters = Boolean(filters.environment || filters.brand_id || filters.brand_name);
  const runIds = await getAllWorkspaceRunIds(workspaceId, filters);
  const scopedRunIds = hasFilters ? runIds : null;

  const runScope = () => applyRunScope(supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }), workspaceId, filters);
  const incidentScope = () => applyQueueIncidentScope(supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds);
  const evidenceScope = () => applyQueueIncidentScope(supabaseAdmin.from('evidence_bundles').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds);
  // Policy-blocked filter shared across periods.
  const policyBlockedScope = () => runScope().or('status.eq.POLICY_BLOCKED,policy_result.eq.blocked');

  const results = await Promise.all([
    runScope().eq('status', 'RUNNING'),                                                   // 0 activeRuns
    runScope().eq('status', 'RUNNING').gte('created_at', last24h),                         // 1 activeRuns24h
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).not('status', 'in', QUEUE_CLOSED), // 2 queueDepth
    runScope().gte('created_at', last24h),                                                 // 3 runs24
    runScope().gte('created_at', last7d),                                                  // 4 runs7d
    runScope().gte('created_at', last30d),                                                 // 5 runs30d
    runScope().eq('status', 'FAILED').gte('created_at', last24h),                          // 6 failed24
    runScope().eq('status', 'FAILED').gte('created_at', last7d),                           // 7 failed7d
    runScope().eq('status', 'FAILED').gte('created_at', last30d),                          // 8 failed30d
    policyBlockedScope().gte('created_at', last24h),                                       // 9 policyBlocked24
    policyBlockedScope().gte('created_at', last7d),                                        // 10 policyBlocked7d
    policyBlockedScope().gte('created_at', last30d),                                       // 11 policyBlocked30d
    incidentScope().gte('created_at', last24h),                                            // 12 incidents24
    incidentScope().gte('created_at', last7d),                                             // 13 incidents7d
    incidentScope().gte('created_at', last30d),                                            // 14 incidents30d
    incidentScope().eq('status', 'resolved').gte('created_at', last24h),                   // 15 incidentsResolved24
    incidentScope().eq('status', 'resolved').gte('created_at', last7d),                    // 16 incidentsResolved7d
    incidentScope().eq('status', 'resolved'),                                              // 17 incidentsResolvedAll
    // Retry attempts (linked retries) + their successes, per period.
    runScope().not('original_run_id', 'is', null).gte('created_at', last24h),              // 18 retryAttempts24
    runScope().not('original_run_id', 'is', null).eq('status', 'COMPLETED').gte('created_at', last24h), // 19 retrySuccess24
    runScope().not('original_run_id', 'is', null).gte('created_at', last7d),               // 20 retryAttempts7d
    runScope().not('original_run_id', 'is', null).eq('status', 'COMPLETED').gte('created_at', last7d),  // 21 retrySuccess7d
    runScope().not('original_run_id', 'is', null).gte('created_at', last30d),              // 22 retryAttempts30d
    runScope().not('original_run_id', 'is', null).eq('status', 'COMPLETED').gte('created_at', last30d), // 23 retrySuccess30d
    // Queue SLA breach (unresolved + past due).
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).not('status', 'in', QUEUE_CLOSED).lt('due_at', now.toISOString()), // 24 slaBreached
    applyQueueIncidentScope(supabaseAdmin.from('queue_items').select('id', { count: 'exact', head: true }), workspaceId, scopedRunIds).not('due_at', 'is', null), // 25 slaTotal (items with a due time)
    evidenceScope(),                                                                       // 26 evidenceBundles
    evidenceScope().in('status', ['captured', 'export_ready', 'locked']),                  // 27 evidenceComplete
  ]);

  const c = results.map((r: any) => r.count || 0);
  const [
    activeRuns, activeRuns24h, queueDepth,
    runs24, runs7d, runs30d,
    failed24, failed7d, failed30d,
    policyBlocked24, policyBlocked7d, policyBlocked30d,
    incidents24, incidents7d, incidents30d,
    incidentsResolved24, incidentsResolved7d, incidentsResolvedAll,
    retryAttempts24, retrySuccess24, retryAttempts7d, retrySuccess7d, retryAttempts30d, retrySuccess30d,
    slaBreached, slaTotal,
    evidenceBundles, evidenceComplete,
  ] = c;

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

  return {
    active_runs: { value: activeRuns, unit: 'count', period: 'current', trend: activeRuns24h > activeRuns * 0.5 ? 'up' : 'down' },
    queue_depth: { value: queueDepth, unit: 'items', period: 'current', trend: queueDepth > 10 ? 'up' : 'stable' },
    throughput: { '24h': runs24, '7d': runs7d, '30d': runs30d },
    failure_rate: {
      '24h': pct(failed24, runs24),
      '7d': pct(failed7d, runs7d),
      '30d': pct(failed30d, runs30d),
    },
    retry_success_rate: {
      '24h': pct(retrySuccess24, retryAttempts24),
      '7d': pct(retrySuccess7d, retryAttempts7d),
      '30d': pct(retrySuccess30d, retryAttempts30d),
    },
    policy_block_rate: {
      '24h': pct(policyBlocked24, runs24),
      '7d': pct(policyBlocked7d, runs7d),
      '30d': pct(policyBlocked30d, runs30d),
    },
    incidents: {
      '24h': { created: incidents24, resolved: incidentsResolved24 },
      '7d': { created: incidents7d, resolved: incidentsResolved7d },
      '30d': { created: incidents30d, resolved: incidentsResolvedAll },
    },
    sla_breach_rate: pct(slaBreached, slaTotal),
    evidence_completeness: pct(evidenceComplete, evidenceBundles),
  };
}
