import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';

export interface QueueItem {
  id: string;
  workspace_id: string;
  run_id: string;
  queue_type: string;
  priority: number;
  assignee_id: string;
  assignee_name: string;
  team_id: string;
  due_at: string;
  status: string;
  claimed_by: string;
  claimed_at: string;
  resolved_at: string;
  created_at: string;
  updated_at: string;
}

export async function listQueues(params: {
  workspace_id: string;
  queue_type?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  let query = supabaseAdmin
    .from('queue_items')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.queue_type) query = query.eq('queue_type', params.queue_type);
  if (params.status) query = query.eq('status', params.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { queues: data || [], total: count || 0 };
}

export async function assignQueueItem(
  queueId: string,
  assigneeId: string,
  assigneeName: string
) {
  const { data: item, error: fetchError } = await supabaseAdmin
    .from('queue_items')
    .select('*')
    .eq('id', queueId)
    .single();
  if (fetchError) throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });
  if (!item) throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });

  const { error: updateError } = await supabaseAdmin
    .from('queue_items')
    .update({
      assignee_id: assigneeId,
      assignee_name: assigneeName,
      status: item.status === 'PENDING' ? 'ASSIGNED' : item.status,
      claimed_by: assigneeId,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId);
  if (updateError) throw updateError;

  return { id: queueId, assignee_id: assigneeId, assignee_name: assigneeName };
}

export async function resolveQueueItem(queueId: string) {
  const { error } = await supabaseAdmin
    .from('queue_items')
    .update({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId);
  if (error) throw error;
  return { id: queueId, status: 'RESOLVED' };
}
