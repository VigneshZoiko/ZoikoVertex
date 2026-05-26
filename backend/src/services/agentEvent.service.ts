import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

const SERVICE = 'AgentEvents';

export type AgentEventType =
  | 'agent.created'
  | 'agent.updated'
  | 'agent.test_passed'
  | 'agent.test_failed'
  | 'agent.approval_requested'
  | 'agent.approved'
  | 'agent.rejected'
  | 'agent.deployed'
  | 'agent.paused'
  | 'agent.restricted'
  | 'agent.rollback'
  | 'agent.retired'
  | 'agent.incident_opened'
  | 'agent.resumed'
  | 'agent.cloned';

export interface AgentEvent {
  event_id: string;
  event_type: AgentEventType;
  agent_id: string;
  actor_id: string;
  tenant_id?: string;
  workspace_id?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export async function emitAgentEvent(
  eventType: AgentEventType,
  agentId: string,
  actorId: string,
  metadata: Record<string, unknown> = {},
  tenantId?: string,
  workspaceId?: string
): Promise<{ success: boolean; event_id?: string }> {
  try {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await logToDatabase('info', SERVICE, `Event: ${eventType}`, {
      event_id: eventId,
      event_type: eventType,
      agent_id: agentId,
      actor_id: actorId,
      metadata,
      tenant_id: tenantId,
      workspace_id: workspaceId,
    });
    
    try {
      await supabaseAdmin.from('agent_events').insert([{
        event_id: eventId,
        event_type: eventType,
        agent_id: agentId,
        actor_id: actorId,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        metadata,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      logToDatabase('warn', SERVICE, 'agent_events table unavailable (non-blocking)', { error: String(err) });
    }
    
    return { success: true, event_id: eventId };
  } catch (error) {
    await logToDatabase('error', SERVICE, `Failed to emit event ${eventType}`, { error });
    return { success: false };
  }
}

export async function getAgentEvents(
  agentId: string,
  limit = 50
): Promise<AgentEvent[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_events')
      .select('*')
      .eq('agent_id', agentId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []) as AgentEvent[];
  } catch {
    return [];
  }
}

export const AGENT_EVENT_MAP: Record<string, AgentEventType> = {
  create: 'agent.created',
  update: 'agent.updated',
  certify: 'agent.test_passed',
  test_failed: 'agent.test_failed',
  request_approval: 'agent.approval_requested',
  approve: 'agent.approved',
  reject: 'agent.rejected',
  deploy: 'agent.deployed',
  pause: 'agent.paused',
  resume: 'agent.resumed',
  restrict: 'agent.restricted',
  rollback: 'agent.rollback',
  retire: 'agent.retired',
  incident: 'agent.incident_opened',
  clone: 'agent.cloned',
};
