 
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

const SERVICE = 'AgentIncidents';

export interface AgentIncident {
  id: string;
  agent_id: string;
  severity: string;
  incident_type: string;
  affected_channel?: string;
  description: string;
  output_id?: string;
  status: string;
  owner_id?: string;
  evidence_id?: string;
  remediation?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export async function listAgentIncidents(agentId: string): Promise<AgentIncident[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_incidents')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as AgentIncident[];
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to list incidents', { agentId, err });
    return [];
  }
}

export async function createIncident(
  incident: {
    agent_id: string;
    severity: string;
    incident_type: string;
    description: string;
    affected_channel?: string;
    output_id?: string;
    owner_id?: string;
  }
): Promise<{ success: boolean; incident?: AgentIncident; message?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_incidents')
      .insert([{
        agent_id: incident.agent_id,
        severity: incident.severity,
        incident_type: incident.incident_type,
        description: incident.description,
        affected_channel: incident.affected_channel || null,
        output_id: incident.output_id || null,
        owner_id: incident.owner_id || null,
        status: 'OPEN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    const { createAgentVersion } = await import('./agentVersion.service');
    await createAgentVersion(incident.agent_id, incident.owner_id || 'system', `Incident created: ${incident.incident_type}`, incident.description);

    await logToDatabase('warn', SERVICE, `Incident created for agent ${incident.agent_id}`, { incident_type: incident.incident_type, severity: incident.severity });
    return { success: true, incident: data as AgentIncident };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to create incident', { err });
    return { success: false, message: 'Failed to create incident' };
  }
}

export async function resolveIncident(incidentId: string, remediation: string, _userId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('agent_incidents')
      .update({
        status: 'CLOSED',
        remediation,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) throw error;

    await logToDatabase('info', SERVICE, `Incident ${incidentId} resolved`, { remediation });
    return { success: true, message: 'Incident resolved' };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to resolve incident', { incidentId, err });
    return { success: false, message: 'Failed to resolve incident' };
  }
}

export async function openIncidentsByAgent(workspaceId: string): Promise<{ agent_id: string; incident_count: number }[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_incidents')
      .select(`
        agent_id,
        agents!inner(workspace_id)
      `)
      .eq('agents.workspace_id', workspaceId)
      .eq('status', 'OPEN');

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data || []).forEach((item: any) => {
      const aid = item.agent_id;
      counts[aid] = (counts[aid] || 0) + 1;
    });

    return Object.entries(counts).map(([agent_id, incident_count]) => ({ agent_id, incident_count }));
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get open incident counts', { workspaceId, err });
    return [];
  }
}
