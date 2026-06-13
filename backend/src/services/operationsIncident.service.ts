 
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Incident {
  id: string;
  workspace_id: string;
  run_id: string;
  severity: string;
  category: string;
  owner_id: string;
  owner_name: string;
  status: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  due_at: string;
  root_cause: string;
  remediation: string;
  closed_by: string;
  closed_at: string;
}

export async function listIncidents(params: {
  workspace_id: string;
  status?: string;
  severity?: string;
  category?: string;
  environment?: string;
  brand_id?: string;
  brand_name?: string;
  limit: number;
  offset: number;
}) {
  let scopedRunIds: string[] | null = null;
  if (params.environment || params.brand_id || params.brand_name) {
    let runScope = supabaseAdmin
      .from('agent_runs')
      .select('id')
      .eq('workspace_id', params.workspace_id);
    if (params.environment) runScope = runScope.eq('environment', params.environment);
    if (params.brand_id) runScope = runScope.eq('brand_id', params.brand_id);
    if (params.brand_name) runScope = runScope.ilike('brand_name', params.brand_name);
    const { data: runs, error: runScopeError } = await runScope;
    if (runScopeError) throw runScopeError;
    scopedRunIds = (runs || []).map((run) => run.id);
    if (scopedRunIds.length === 0) return { incidents: [], total: 0 };
  }

  let query = supabaseAdmin
    .from('incidents')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.status) query = query.eq('status', params.status);
  if (params.severity) query = query.eq('severity', params.severity);
  if (params.category) query = query.eq('category', params.category);
  if (scopedRunIds) query = query.in('run_id', scopedRunIds);

  const { data, error, count } = await query;
  if (error) throw error;

  const incidents = data || [];
  const incidentsWithRuns = await Promise.all(
    incidents.map(async (inc: any) => {
      if (inc.run_id) {
        const { data: run } = await supabaseAdmin
          .from('agent_runs')
          .select('task_objective')
          .eq('id', inc.run_id)
          .single();
        return { ...inc, run_name: run?.task_objective || 'Unknown' };
      }
      return { ...inc, run_name: 'System' };
    })
  );

  return { incidents: incidentsWithRuns, total: count || 0 };
}

export async function createIncident(params: {
  workspace_id: string;
  run_id?: string;
  severity: string;
  category: string;
  owner_id?: string;
  owner_name?: string;
  created_by: string;
  created_by_name?: string;
  due_at?: string;
  root_cause?: string;
  remediation?: string;
}) {
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('incidents').insert({
    id,
    workspace_id: params.workspace_id,
    run_id: params.run_id || null,
    severity: params.severity,
    category: params.category,
    owner_id: params.owner_id || null,
    owner_name: params.owner_name || null,
    status: 'open',
    created_by: params.created_by,
    created_by_name: params.created_by_name || null,
    due_at: params.due_at || null,
    root_cause: params.root_cause || null,
    remediation: params.remediation || null,
  });
  if (error) throw error;
  return { id };
}

export async function getIncident(incidentId: string) {
  const { data, error } = await supabaseAdmin
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();
  if (error || !data) throw Object.assign(new Error('Incident not found'), { statusCode: 404 });
  return data as Incident;
}

export async function resolveIncident(incidentId: string, closedBy: string, remediation?: string) {
  const existing = await getIncident(incidentId);
  if (existing.status === 'resolved') throw Object.assign(new Error('Incident already resolved'), { statusCode: 409 });

  const updateData: Record<string, any> = {
    status: 'resolved',
    closed_by: closedBy,
    closed_at: new Date().toISOString(),
  };
  if (remediation) updateData.remediation = remediation;

  const { error } = await supabaseAdmin.from('incidents').update(updateData).eq('id', incidentId);
  if (error) throw error;
  return { id: incidentId, status: 'resolved' };
}

// Advance an incident into the "investigating" lifecycle state (used by run
// escalation that links to an existing incident). Append-only on status; never
// moves a resolved incident backwards.
export async function acknowledgeIncident(incidentId: string, actorId: string, note?: string) {
  const existing = await getIncident(incidentId);
  if (existing.status === 'resolved') {
    throw Object.assign(new Error('Incident already resolved'), { statusCode: 409 });
  }
  if (existing.status === 'investigating' || existing.status === 'in_remediation') {
    return { id: incidentId, status: existing.status };
  }
  const updateData: Record<string, any> = { status: 'investigating' };
  if (note) updateData.root_cause = existing.root_cause || note;
  if (actorId) updateData.owner_id = existing.owner_id || actorId;
  const { error } = await supabaseAdmin.from('incidents').update(updateData).eq('id', incidentId);
  if (error) throw error;
  return { id: incidentId, status: 'investigating' };
}

// ── Postmortem Generation (G4) ──────────────────────────────────────────────
// Generates a structured postmortem for a resolved incident, collecting the
// run timeline, policy results, control actions, and queue history.

export interface PostmortemData {
  incident_id: string;
  created_at: string;
  created_by: string;
  summary: {
    incident_category: string;
    incident_severity: string;
    root_cause: string;
    remediation: string;
    incident_lifetime_hours: number;
    run_id: string | null;
  };
  timeline: Array<{
    event_type: string;
    actor_name: string;
    timestamp: string;
    reason?: string;
  }>;
  policy_violations: Array<{
    outcome: string;
    failed_rule: string | null;
    check_category: string | null;
    remediation_path: string | null;
    created_at: string;
  }>;
  control_actions: Array<{
    action_type: string;
    requested_by: string;
    reason: string;
    result: string;
    created_at: string;
  }>;
  recommendations: string[];
}

export async function generatePostmortem(
  incidentId: string,
  createdBy: string,
): Promise<{ id: string; postmortem: PostmortemData }> {
  const incident = await getIncident(incidentId);
  if (!incident.root_cause) {
    throw Object.assign(new Error('Cannot generate postmortem: incident has no root cause'), { statusCode: 400 });
  }

  // Build the structured postmortem data.
  const runId = incident.run_id;
  const now = new Date().toISOString();
  const created = new Date(incident.created_at);
  const closed = incident.closed_at ? new Date(incident.closed_at) : new Date();
  const lifetimeHours = (closed.getTime() - created.getTime()) / 3600000;

  // Collect run timeline events.
  let timeline: Array<{ event_type: string; actor_name: string; timestamp: string; reason?: string }> = [];
  if (runId) {
    const { data: events } = await supabaseAdmin
      .from('run_events')
      .select('event_type, actor_name, reason, created_at')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });
    if (events) {
      timeline = events.map((e: any) => ({
        event_type: e.event_type,
        actor_name: e.actor_name || 'system',
        timestamp: e.created_at,
        reason: e.reason || undefined,
      }));
    }
  }

  // Collect policy violations for the run.
  let policyViolations: Array<{
    outcome: string;
    failed_rule: string | null;
    check_category: string | null;
    remediation_path: string | null;
    created_at: string;
  }> = [];
  if (runId) {
    const { data: policies } = await supabaseAdmin
      .from('policy_results')
      .select('outcome, failed_rule, check_category, remediation_path, created_at')
      .eq('run_id', runId)
      .neq('outcome', 'pass')
      .order('created_at', { ascending: false });
    if (policies) policyViolations = policies;
  }

  // Collect control actions for the run.
  let controlActions: Array<{
    action_type: string;
    requested_by: string;
    reason: string;
    result: string;
    created_at: string;
  }> = [];
  if (runId) {
    const { data: actions } = await supabaseAdmin
      .from('runtime_control_actions')
      .select('action_type, requested_by, reason, result, created_at')
      .eq('run_id', runId)
      .order('created_at', { ascending: false });
    if (actions) {
      controlActions = actions.map((a: any) => ({
        action_type: a.action_type,
        requested_by: a.requested_by || 'system',
        reason: a.reason,
        result: a.result || 'completed',
        created_at: a.created_at,
      }));
    }
  }

  // Build recommendations based on incident data.
  const recommendations: string[] = [];
  if (incident.root_cause.toLowerCase().includes('policy')) {
    recommendations.push('Review and update policy rules to prevent recurrence');
  }
  if (incident.category === 'integration_failure') {
    recommendations.push('Verify integration health and re-run connectivity tests');
  }
  if (controlActions.length > 2) {
    recommendations.push('Reduce manual intervention overhead by automating common remediation paths');
  }
  if (timeline.length > 20) {
    recommendations.push('Review run lifecycle duration; consider optimizing long-running workflows');
  }
  if (policyViolations.length > 0) {
    recommendations.push('Address all policy violations before the next similar run is scheduled');
  }
  if (incident.severity === 'critical' || incident.severity === 'high') {
    recommendations.push('Schedule a formal incident review with the operations team');
  }
  recommendations.push('Document lessons learned and update the runbook for this scenario');

  const postmortem: PostmortemData = {
    incident_id: incidentId,
    created_at: now,
    created_by: createdBy,
    summary: {
      incident_category: incident.category,
      incident_severity: incident.severity,
      root_cause: incident.root_cause,
      remediation: incident.remediation || '',
      incident_lifetime_hours: Math.round(lifetimeHours * 100) / 100,
      run_id: runId,
    },
    timeline,
    policy_violations: policyViolations,
    control_actions: controlActions,
    recommendations,
  };

  // Persist the postmortem data on the incident record.
  const { error } = await supabaseAdmin
    .from('incidents')
    .update({
      postmortem: JSON.stringify(postmortem),
      postmortem_created_at: now,
      postmortem_created_by: createdBy,
    })
    .eq('id', incidentId);
  if (error) throw error;

  return { id: incidentId, postmortem };
}

export async function getPostmortem(incidentId: string): Promise<PostmortemData | null> {
  const { data, error } = await supabaseAdmin
    .from('incidents')
    .select('postmortem')
    .eq('id', incidentId)
    .single();
  if (error || !data) throw Object.assign(new Error('Incident not found'), { statusCode: 404 });
  return data.postmortem ? (typeof data.postmortem === 'string' ? JSON.parse(data.postmortem) : data.postmortem) : null;
}

export async function getIncidentStats(workspaceId: string) {
  const [openIncidents, criticalIncidents, totalIncidents] = await Promise.all([
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('status', 'resolved'),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('severity', 'critical').neq('status', 'resolved'),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  ]);

  return {
    open_incidents: openIncidents.count || 0,
    critical_open: criticalIncidents.count || 0,
    total_incidents: totalIncidents.count || 0,
  };
}
