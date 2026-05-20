import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { v4 as uuidv4 } from 'uuid';

export interface RuntimeControlAction {
  id: string;
  run_id: string;
  action_type: string;
  requested_by: string;
  approved_by: string;
  reason: string;
  impact_scope: string;
  result: string;
  created_at: string;
}

export async function recordRuntimeControlAction(params: {
  run_id: string;
  action_type: string;
  requested_by: string;
  approved_by?: string;
  reason: string;
  impact_scope?: string;
  result?: string;
}) {
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('runtime_control_actions').insert({
    id,
    run_id: params.run_id,
    action_type: params.action_type,
    requested_by: params.requested_by,
    approved_by: params.approved_by || null,
    reason: params.reason,
    impact_scope: params.impact_scope || null,
    result: params.result || 'completed',
  });
  if (error) throw error;
  return { id };
}

export async function getRuntimeControlActions(runId: string) {
  const { data, error } = await supabaseAdmin
    .from('runtime_control_actions')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as RuntimeControlAction[];
}
