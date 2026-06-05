import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export async function createEvidenceBundle(params: {
  workspace_id: string;
  instance_id: string;
}) {
  const id = uuidv4();
  const hashInput = `${id}:${params.instance_id}:${params.workspace_id}:${Date.now()}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  const { error } = await supabaseAdmin.from('evidence_bundles').insert({
    id,
    workspace_id: params.workspace_id,
    run_id: params.instance_id,
    status: 'pending',
    hash,
  });
  if (error) throw error;

  await supabaseAdmin.from('workflow_instances').update({ evidence_bundle_id: id }).eq('id', params.instance_id);
  return { id, hash };
}

export async function getWorkflowEvidence(instanceId: string) {
  const { data: instance, error: instError } = await supabaseAdmin.from('workflow_instances').select('evidence_bundle_id').eq('id', instanceId).single();
  if (instError || !instance) throw Object.assign(new Error('Instance not found'), { statusCode: 404 });
  if (!instance.evidence_bundle_id) return null;

  const { data: bundle, error } = await supabaseAdmin.from('evidence_bundles').select('*').eq('id', instance.evidence_bundle_id).single();
  if (error) return null;
  return bundle;
}
