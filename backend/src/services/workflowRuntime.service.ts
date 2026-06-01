/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

const VALID_INSTANCE_TRANSITIONS: Record<string, string[]> = {
  pending: ['running', 'cancelled', 'blocked'],
  running: ['waiting_review', 'completed', 'failed', 'blocked', 'paused'],
  waiting_review: ['running', 'failed'],
  blocked: ['running', 'failed', 'cancelled'],
  paused: ['running', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  version_id: string;
  status: string;
  trigger_type: string;
  trigger_source: string;
  started_by: string;
  current_step_id: string;
  priority: number;
  risk_score: number;
  confidence_score: number;
  started_at: string;
  due_at: string;
  completed_at: string;
  paused_at: string;
  evidence_bundle_id: string;
  created_at: string;
}

export async function listInstances(params: {
  workspace_id: string;
  workflow_id?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  let query = supabaseAdmin
    .from('workflow_instances')
    .select('*, workflow_templates!inner(name, workspace_id)', { count: 'exact' })
    .eq('workflow_templates.workspace_id', params.workspace_id)
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.workflow_id) query = query.eq('workflow_id', params.workflow_id);
  if (params.status) query = query.eq('status', params.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { instances: data || [], total: count || 0 };
}

export async function getInstance(instanceId: string) {
  const { data, error } = await supabaseAdmin
    .from('workflow_instances')
    .select('*, workflow_templates(name)')
    .eq('id', instanceId)
    .single();
  if (error) throw Object.assign(new Error('Instance not found'), { statusCode: 404 });
  return data;
}

export async function getStepRuns(instanceId: string) {
  const { data, error } = await supabaseAdmin
    .from('step_runs')
    .select('*, workflow_steps(name, step_type)')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function startInstance(workflowId: string, versionId: string, startedBy: string, triggerType?: string, triggerSource?: string, priority?: number, workspaceId?: string) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from('workflow_instances').insert({
    id,
    workflow_id: workflowId,
    version_id: versionId,
    workspace_id: workspaceId,
    status: 'pending',
    trigger_type: triggerType || 'manual',
    trigger_source: triggerSource || null,
    started_by: startedBy,
    priority: priority || 5,
    started_at: now,
  });
  if (error) throw error;
  return { id };
}

export async function transitionInstance(instanceId: string, newStatus: string, _reason?: string) {
  const { data: instance, error: fetchError } = await supabaseAdmin.from('workflow_instances').select('*').eq('id', instanceId).single();
  if (fetchError || !instance) throw Object.assign(new Error('Instance not found'), { statusCode: 404 });

  const allowed = VALID_INSTANCE_TRANSITIONS[instance.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw Object.assign(new Error(`Cannot transition instance from ${instance.status} to ${newStatus}`), { statusCode: 409 });
  }

  const now = new Date().toISOString();
  const updateData: any = { status: newStatus };
  if (newStatus === 'running') { updateData.started_at = now; }
  if (newStatus === 'paused') { updateData.paused_at = now; }
  if (['completed', 'failed', 'cancelled'].includes(newStatus)) { updateData.completed_at = now; }

  const { error } = await supabaseAdmin.from('workflow_instances').update(updateData).eq('id', instanceId);
  if (error) throw error;

  return { id: instanceId, previous_status: instance.status, new_status: newStatus };
}

export async function advanceStep(instanceId: string, stepRunId: string, newStatus: string, outputRef?: string, errorCode?: string, reasonCode?: string) {
  const now = new Date().toISOString();
  const updateData: any = { status: newStatus };
  if (outputRef) updateData.output_ref = outputRef;
  if (errorCode) updateData.error_code = errorCode;
  if (reasonCode) updateData.reason_code = reasonCode;
  if (['COMPLETED', 'FAILED'].includes(newStatus)) updateData.completed_at = now;

  const { error } = await supabaseAdmin.from('step_runs').update(updateData).eq('id', stepRunId);
  if (error) throw error;
  return { id: stepRunId, status: newStatus };
}

export async function createStepRun(params: {
  instance_id: string;
  step_id: string;
  input_ref?: string;
  actor_type?: string;
  actor_id?: string;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from('step_runs').insert({
    id,
    instance_id: params.instance_id,
    step_id: params.step_id,
    status: 'RUNNING',
    input_ref: params.input_ref || null,
    actor_type: params.actor_type || 'system',
    actor_id: params.actor_id || null,
    started_at: now,
  });
  if (error) throw error;
  return { id };
}
