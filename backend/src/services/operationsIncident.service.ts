/* eslint-disable @typescript-eslint/no-explicit-any */
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
  limit: number;
  offset: number;
}) {
  let query = supabaseAdmin
    .from('incidents')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.status) query = query.eq('status', params.status);
  if (params.severity) query = query.eq('severity', params.severity);
  if (params.category) query = query.eq('category', params.category);

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
    status: 'OPEN',
    created_by: params.created_by,
    created_by_name: params.created_by_name || null,
    due_at: params.due_at || null,
    root_cause: params.root_cause || null,
    remediation: params.remediation || null,
  });
  if (error) throw error;
  return { id };
}

export async function resolveIncident(incidentId: string, closedBy: string, remediation?: string) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();
  if (fetchError || !existing) throw Object.assign(new Error('Incident not found'), { statusCode: 404 });
  if (existing.status === 'RESOLVED') throw Object.assign(new Error('Incident already resolved'), { statusCode: 409 });

  const updateData: Record<string, any> = {
    status: 'RESOLVED',
    closed_by: closedBy,
    closed_at: new Date().toISOString(),
  };
  if (remediation) updateData.remediation = remediation;

  const { error } = await supabaseAdmin.from('incidents').update(updateData).eq('id', incidentId);
  if (error) throw error;
  return { id: incidentId, status: 'RESOLVED' };
}

export async function getIncidentStats(workspaceId: string) {
  const [openIncidents, criticalIncidents, totalIncidents] = await Promise.all([
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('status', 'RESOLVED'),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('severity', 'critical').neq('status', 'RESOLVED'),
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  ]);

  return {
    open_incidents: openIncidents.count || 0,
    critical_open: criticalIncidents.count || 0,
    total_incidents: totalIncidents.count || 0,
  };
}
