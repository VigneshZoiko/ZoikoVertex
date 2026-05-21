import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

const SERVICE = 'AgentEventLogger';

export async function logAgentEvent(
  eventType: string,
  agentId: string,
  actorId: string | undefined,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('org_id, workspace_id')
      .eq('id', agentId)
      .single();

    await supabaseAdmin.from('agent_events').insert([{
      event_type: eventType,
      agent_id: agentId,
      actor_id: actorId || null,
      tenant_id: agent?.org_id || null,
      workspace_id: agent?.workspace_id || null,
      metadata,
    }]);

    await logToDatabase('info', SERVICE, `Agent event: ${eventType}`, { agentId, eventType, metadata });
  } catch (err) {
    await logToDatabase('warn', SERVICE, `Failed to log agent event: ${eventType}`, { agentId, err });
  }
}

export async function createEvidenceRecord(
  fields: {
    agent_id: string;
    event_type: string;
    actor_id?: string;
    object_version?: string;
    decision?: string;
    reason?: string;
    input_hash?: string;
    output_hash?: string;
    model_id?: string;
    prompt_version?: string;
    knowledge_snapshot?: string;
    policy_results?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabaseAdmin.from('agent_evidence_records').insert([{
      agent_id: fields.agent_id,
      event_type: fields.event_type,
      actor_id: fields.actor_id || null,
      object_version: fields.object_version || null,
      decision: fields.decision || null,
      reason: fields.reason || null,
      input_hash: fields.input_hash || null,
      output_hash: fields.output_hash || null,
      model_id: fields.model_id || null,
      prompt_version: fields.prompt_version || null,
      knowledge_snapshot: fields.knowledge_snapshot || null,
      policy_results: fields.policy_results || {},
    }]);

    await logToDatabase('info', SERVICE, `Evidence record created: ${fields.event_type}`, {
      agent_id: fields.agent_id,
      event_type: fields.event_type,
    });
  } catch (err) {
    await logToDatabase('warn', SERVICE, 'Failed to create evidence record', { err });
  }
}
