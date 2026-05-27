import { supabaseAdmin } from '../shared/supabase';

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

async function getQueueItemScoped(queueId: string, workspaceId: string) {
  const { data, error } = await supabaseAdmin
    .from('queue_items')
    .select('*')
    .eq('id', queueId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as QueueItem | null;
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

  const queues = (data || []).map((item) => ({
    ...item,
    sla_breached:
      Boolean(item.due_at) &&
      !['RESOLVED', 'CANCELLED'].includes(String(item.status || '').toUpperCase()) &&
      new Date(item.due_at).getTime() < Date.now(),
  }));

  return { queues, total: count || 0 };
}

export async function assignQueueItem(
  workspaceId: string,
  queueId: string,
  assigneeId: string,
  assigneeName: string,
) {
  const item = await getQueueItemScoped(queueId, workspaceId);
  if (!item) {
    throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });
  }

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
    .eq('id', queueId)
    .eq('workspace_id', workspaceId);
  if (updateError) throw updateError;

  return { id: queueId, assignee_id: assigneeId, assignee_name: assigneeName };
}

export async function resolveQueueItem(
  workspaceId: string,
  queueId: string,
  resolutionNotes?: string,
) {
  const item = await getQueueItemScoped(queueId, workspaceId);
  if (!item) {
    throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });
  }

  const { error } = await supabaseAdmin
    .from('queue_items')
    .update({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)
    .eq('workspace_id', workspaceId);
  if (error) throw error;

  return { id: queueId, status: 'RESOLVED', resolution_notes: resolutionNotes || null };
}
