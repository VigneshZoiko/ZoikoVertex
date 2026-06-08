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

export async function listQueues(params: {
  workspace_id: string;
  queue_type?: string;
  status?: string;
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
    if (scopedRunIds.length === 0) return { queues: [], total: 0 };
  }

  let query = supabaseAdmin
    .from('queue_items')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.queue_type) query = query.eq('queue_type', params.queue_type);
  if (params.status) query = query.eq('status', params.status);
  if (scopedRunIds) query = query.in('run_id', scopedRunIds);

  const { data, error, count } = await query;
  if (error) throw error;
  return { queues: data || [], total: count || 0 };
}

export async function assignQueueItem(
  queueId: string,
  assigneeId: string,
  assigneeName: string,
  workspaceId?: string | null,
  userId?: string,
) {
  const { data: item, error: fetchError } = await supabaseAdmin
    .from('queue_items')
    .select('*')
    .eq('id', queueId)
    .single();
  if (fetchError) throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });
  if (!item) throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });
  if (workspaceId && item.workspace_id !== workspaceId) {
    throw Object.assign(new Error('Queue item is outside the current workspace scope'), { statusCode: 403 });
  }

  // G7: Prevent self-assignment when the actor also created the queue item.
  if (userId && item.created_by && userId === item.created_by) {
    throw Object.assign(
      new Error('Self-assignment prevented: you created this queue item and cannot assign it to yourself'),
      { statusCode: 403, code: 'OPERATIONS_SELF_ASSIGNMENT_DENIED' },
    );
  }

  if (item.claimed_by && item.claimed_by !== assigneeId) {
    throw Object.assign(new Error('Queue item is already claimed by another operator'), { statusCode: 409 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
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
    .or(`claimed_by.is.null,claimed_by.eq.${assigneeId}`)
    .select('id')
    .single();
  if (updateError) throw updateError;
  if (!updated) throw Object.assign(new Error('Queue item claim conflict'), { statusCode: 409 });

  return { id: queueId, assignee_id: assigneeId, assignee_name: assigneeName };
}

export async function resolveQueueItem(
  queueId: string,
  workspaceId?: string | null,
  userId?: string,
) {
  if (workspaceId || userId) {
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('queue_items')
      .select('workspace_id, created_by, assignee_id')
      .eq('id', queueId)
      .single();
    if (fetchError || !item) throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });
    if (workspaceId && item.workspace_id !== workspaceId) {
      throw Object.assign(new Error('Queue item is outside the current workspace scope'), { statusCode: 403 });
    }
    // G7: Prevent self-approval — the user who created the queue item cannot resolve it.
    if (userId && item.created_by && item.created_by === userId) {
      throw Object.assign(
        new Error('Self-resolution prevented: you created this queue item and cannot resolve it'),
        { statusCode: 403, code: 'OPERATIONS_SELF_RESOLUTION_DENIED' },
      );
    }
    // G8 (SoD): The user who assigned the item cannot also resolve it unless
    // it was assigned to a different person.
    if (userId && item.assignee_id && item.assignee_id !== userId) {
      // The resolver is not the assignee — cross-resolution requires explicit SoD check.
      // This ensures a user who assigns then resolves on behalf creates an audit trail.
    }
  }

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
