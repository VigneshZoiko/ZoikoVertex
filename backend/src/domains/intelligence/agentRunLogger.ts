import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

export const logAgentRun = async (
  agentId: string,
  actionType: string,
  userId: string,
  result: 'SUCCESS' | 'FAILURE',
  metadata: object,
): Promise<void> => {
  try {
    const { error } = await supabaseAdmin.from('outbox_events').insert({
      aggregate_type: 'agent',
      aggregate_id: randomUUID(),
      event_name: 'agent.run.completed',
      payload: { agentId, actionType, userId, result, ...metadata },
    });

    if (error) {
      logger.warn({ error }, '[AgentRunLogger] Insert failed, logging to console only');
    }
  } catch (err) {
    logger.warn({ err }, '[AgentRunLogger] outbox_events unavailable, logging to console only');
  }
};
