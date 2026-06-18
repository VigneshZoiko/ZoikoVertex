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
  // Exclude archived (soft-deleted) runs so the Operations indicators match the
  // runs list (which also filters archived_at IS NULL). Without this, archiving
  // runs empties the list but leaves the indicator counts showing stale totals.
  let scoped = query.eq('workspace_id', workspaceId).is('archived_at', null);
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
  // No runs in scope → 0 (so all indicators read 0 on a cleared/empty Operations
  // page) rather than a misleading 100%.
  const operationsHealthScore =
    total > 0 ? Math.max(0, Math.round(((total - problemRuns) / total) * 100)) : 0;

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
    // Human review time: fetch run_events for WAITING_HUMAN_REVIEW transitions in last 30d
    supabaseAdmin.from('run_events').select('run_id, created_at')
      .eq('event_type', 'state.waiting_human_review')
      .in('run_id', runIds).gte('created_at', last30d)
      .order('created_at', { ascending: true }),                                            // 28 humanReviewEntries (data)
    // Incident closure time: fetch closed incidents with their timestamps
    applyQueueIncidentScope(supabaseAdmin.from('incidents').select('created_at, closed_at'), workspaceId, scopedRunIds)
      .not('closed_at', 'is', null).gte('created_at', last30d),                             // 29 closedIncidents (data)
  ]);

  const c = results.slice(0, 28).map((r: any) => r.count || 0);
  const hrEntries = results[28] as { data?: Array<{ run_id: string; created_at: string }> } || { data: [] };
  const closedIncidentsData = results[29] as { data?: Array<{ created_at: string; closed_at: string }> } || { data: [] };
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

  // Compute human_review_time (average minutes spent in WAITING_HUMAN_REVIEW).
  // For each entry event, find the next transition out of that state for the same run.
  const hrRuns = (hrEntries.data || []).reduce((acc: Record<string, string[]>, ev: { run_id: string; created_at: string }) => {
    if (!acc[ev.run_id]) acc[ev.run_id] = [];
    acc[ev.run_id].push(ev.created_at);
    return acc;
  }, {} as Record<string, string[]>);
  const hrDurationsMin: number[] = [];
  const hrExitEvents = (await supabaseAdmin.from('run_events').select('run_id, created_at')
      .in('event_type', ['state.paused','state.stopped','state.policy_blocked','state.quarantined'])
      .in('run_id', runIds).gte('created_at', last30d)
      .order('created_at', { ascending: true })).data || [];
  const exitByRun = (hrExitEvents as Array<{ run_id: string; created_at: string }>).reduce((acc: Record<string, string[]>, ev) => {
    if (!acc[ev.run_id]) acc[ev.run_id] = [];
    acc[ev.run_id].push(ev.created_at);
    return acc;
  }, {} as Record<string, string[]>);
  for (const [rid, entries] of Object.entries(hrRuns)) {
    const exits = exitByRun[rid] || [];
    for (const entry of entries) {
      const nextExit = exits.find((e) => e > entry);
      if (nextExit) {
        hrDurationsMin.push(Math.round((new Date(nextExit).getTime() - new Date(entry).getTime()) / 60000));
      }
    }
  }

  // Compute incident_closure_time (average hours from creation to closure).
  const closureHours = (closedIncidentsData.data || [])
    .map((inc: { created_at: string; closed_at: string }) => {
      const dur = (new Date(inc.closed_at).getTime() - new Date(inc.created_at).getTime()) / 3600000;
      return Math.round(dur * 10) / 10;
    });
  const incidentClosureTime = closureHours.length > 0
    ? Math.round((closureHours.reduce((a: number, b: number) => a + b, 0) / closureHours.length) * 10) / 10
    : 0;
  const humanReviewTime = hrDurationsMin.length > 0
    ? Math.round(hrDurationsMin.reduce((a, b) => a + b, 0) / hrDurationsMin.length)
    : 0;

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
    human_review_time: { value: humanReviewTime, unit: 'min', period: '30d' },
    incident_closure_time: { value: incidentClosureTime, unit: 'hours', period: '30d' },
  };
}

/**
 * Generate a CSV string from the current analytics metrics.
 * Header row + one data row. Designed for admin export (pulled into sheets /
 * dashboards). Permission-gating is the caller's responsibility.
 */
export async function getAnalyticsCSV(workspaceId: string, filters: OperationsScopeFilters = {}): Promise<string> {
  const metrics = await getAnalyticsMetrics(workspaceId, filters);
  const rows: string[][] = [];
  const escape = (v: unknown): string => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Header
  rows.push([
    'metric',
    'period',
    'value',
    'unit',
    'trend',
  ]);
  // Active runs
  if (metrics.active_runs) rows.push(['active_runs', metrics.active_runs.period, escape(metrics.active_runs.value), metrics.active_runs.unit, metrics.active_runs.trend]);
  // Queue depth
  if (metrics.queue_depth) rows.push(['queue_depth', 'current', escape(metrics.queue_depth.value), metrics.queue_depth.unit, metrics.queue_depth.trend]);
  // Throughput
  if (metrics.throughput) {
    for (const [period, val] of Object.entries(metrics.throughput)) {
      rows.push(['throughput', period, escape(val), 'count', '']);
    }
  }
  // Failure rate
  if (metrics.failure_rate) {
    for (const [period, val] of Object.entries(metrics.failure_rate)) {
      rows.push(['failure_rate', period, escape(val), '%', '']);
    }
  }
  // Retry success rate
  if (metrics.retry_success_rate) {
    for (const [period, val] of Object.entries(metrics.retry_success_rate)) {
      rows.push(['retry_success_rate', period, escape(val), '%', '']);
    }
  }
  // Policy block rate
  if (metrics.policy_block_rate) {
    for (const [period, val] of Object.entries(metrics.policy_block_rate)) {
      rows.push(['policy_block_rate', period, escape(val), '%', '']);
    }
  }
  // Incidents
  if (metrics.incidents) {
    for (const [period, val] of Object.entries(metrics.incidents)) {
      const v = val as { created: number; resolved: number };
      rows.push(['incidents_created', period, escape(v.created), 'count', '']);
      rows.push(['incidents_resolved', period, escape(v.resolved), 'count', '']);
    }
  }
  // SLA breach rate
  if (metrics.sla_breach_rate !== undefined) rows.push(['sla_breach_rate', 'current', escape(metrics.sla_breach_rate), '%', '']);
  // Evidence completeness
  if (metrics.evidence_completeness !== undefined) rows.push(['evidence_completeness', 'current', escape(metrics.evidence_completeness), '%', '']);
  // Human review time
  if (metrics.human_review_time) rows.push(['human_review_time', metrics.human_review_time.period, escape(metrics.human_review_time.value), metrics.human_review_time.unit, '']);
  // Incident closure time
  if (metrics.incident_closure_time) rows.push(['incident_closure_time', metrics.incident_closure_time.period, escape(metrics.incident_closure_time.value), metrics.incident_closure_time.unit, '']);
  return rows.map((r) => r.join(',')).join('\n') + '\n';
}
