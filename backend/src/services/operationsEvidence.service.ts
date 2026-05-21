import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface EvidenceBundle {
  id: string;
  workspace_id: string;
  run_id: string;
  status: string;
  hash: string;
  locked_at: string;
  exported_by: string;
  exported_at: string;
  export_reason: string;
  storage_ref: string;
  created_at: string;
}

export async function getRunEvidence(bundleId: string) {
  const { data, error } = await supabaseAdmin
    .from('evidence_bundles')
    .select('*')
    .eq('id', bundleId)
    .single();
  if (error) throw Object.assign(new Error('Evidence bundle not found'), { statusCode: 404 });
  return data as EvidenceBundle;
}

export async function exportEvidence(params: {
  bundleId: string;
  exportedBy: string;
  exportReason: string;
  storageRef?: string;
}) {
  const { data: bundle, error: fetchError } = await supabaseAdmin
    .from('evidence_bundles')
    .select('*')
    .eq('id', params.bundleId)
    .single();
  if (fetchError || !bundle) throw Object.assign(new Error('Evidence bundle not found'), { statusCode: 404 });

  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from('evidence_bundles')
    .update({
      status: 'exported',
      exported_by: params.exportedBy,
      exported_at: now,
      export_reason: params.exportReason,
      storage_ref: params.storageRef || null,
    })
    .eq('id', params.bundleId);
  if (updateError) throw updateError;

  return { id: params.bundleId, exported_by: params.exportedBy, exported_at: now };
}

export async function createEvidenceBundle(params: {
  workspace_id: string;
  run_id: string;
}) {
  const id = uuidv4();
  const hashInput = `${id}:${params.run_id}:${params.workspace_id}:${Date.now()}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  const { error } = await supabaseAdmin.from('evidence_bundles').insert({
    id,
    workspace_id: params.workspace_id,
    run_id: params.run_id,
    status: 'pending',
    hash,
  });
  if (error) throw error;
  return { id, hash };
}

export async function lockEvidenceBundle(bundleId: string) {
  const { data: bundle, error: fetchError } = await supabaseAdmin
    .from('evidence_bundles')
    .select('*')
    .eq('id', bundleId)
    .single();
  if (fetchError || !bundle) throw Object.assign(new Error('Evidence bundle not found'), { statusCode: 404 });
  if (bundle.locked_at) throw Object.assign(new Error('Evidence bundle already locked'), { statusCode: 409 });

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('evidence_bundles')
    .update({ status: 'locked', locked_at: now })
    .eq('id', bundleId);
  if (error) throw error;
  return { id: bundleId, locked_at: now };
}

export async function listEvidenceBundles(params: {
  workspace_id: string;
  run_id?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  let query = supabaseAdmin
    .from('evidence_bundles')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.run_id) query = query.eq('run_id', params.run_id);
  if (params.status) query = query.eq('status', params.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { bundles: data || [], total: count || 0 };
}
