import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';


export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  state: string;
  change_summary: string;
  created_by: string;
  approved_by: string;
  activated_by: string;
  created_at: string;
}

export async function listVersions(workflowId: string) {
  const { data, error } = await supabaseAdmin
    .from('workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return (data || []) as WorkflowVersion[];
}

export async function getVersion(versionId: string) {
  const { data, error } = await supabaseAdmin.from('workflow_versions').select('*').eq('id', versionId).single();
  if (error) throw Object.assign(new Error('Version not found'), { statusCode: 404 });
  return data as WorkflowVersion;
}

export async function createDraftVersion(workflowId: string, changeSummary: string, changeReason: string, createdBy: string) {
  const { data: versions, error: listError } = await supabaseAdmin
    .from('workflow_versions')
    .select('version_number')
    .eq('workflow_id', workflowId)
    .order('version_number', { ascending: false })
    .limit(1);
  if (listError) throw listError;

  const nextVersion = (versions?.[0]?.version_number || 0) + 1;
  const id = uuidv4();

  const { error: insertError } = await supabaseAdmin.from('workflow_versions').insert({
    id,
    workflow_id: workflowId,
    version_number: nextVersion,
    state: 'draft',
    change_summary: changeSummary || null,
    change_reason: changeReason || null,
    created_by: createdBy,
  });
  if (insertError) throw insertError;

  await supabaseAdmin.from('workflow_templates').update({ current_version_id: id, updated_at: new Date().toISOString() }).eq('id', workflowId);
  return { id, version_number: nextVersion };
}

export async function submitForApproval(versionId: string) {
  const version = await getVersion(versionId);
  if (version.state !== 'draft' && version.state !== 'test') {
    throw Object.assign(new Error('Only draft or test versions can be submitted for approval'), { statusCode: 409 });
  }
  const { error } = await supabaseAdmin.from('workflow_versions').update({ state: 'pending_approval' }).eq('id', versionId);
  if (error) throw error;
  return { id: versionId, state: 'pending_approval' };
}

export async function approveVersion(versionId: string, approvedBy: string) {
  const version = await getVersion(versionId);
  if (version.state !== 'pending_approval') {
    throw Object.assign(new Error('Version must be in pending_approval state'), { statusCode: 409 });
  }
  const { error } = await supabaseAdmin.from('workflow_versions').update({
    state: 'approved',
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
  }).eq('id', versionId);
  if (error) throw error;
  return { id: versionId, state: 'approved' };
}

export async function rejectVersion(versionId: string, reason: string) {
  const version = await getVersion(versionId);
  if (version.state !== 'pending_approval') {
    throw Object.assign(new Error('Version must be in pending_approval state'), { statusCode: 409 });
  }
  const { error } = await supabaseAdmin.from('workflow_versions').update({ state: 'draft', change_reason: reason }).eq('id', versionId);
  if (error) throw error;
  return { id: versionId, state: 'draft' };
}

export async function activateVersion(versionId: string, activatedBy: string) {
  const version = await getVersion(versionId);
  if (version.state !== 'approved') {
    throw Object.assign(new Error('Only approved versions can be activated'), { statusCode: 409 });
  }
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from('workflow_versions').update({
    state: 'active',
    activated_by: activatedBy,
    activated_at: now,
  }).eq('id', versionId);
  if (error) throw error;

  await supabaseAdmin.from('workflow_templates').update({
    status: 'active',
    current_version_id: versionId,
    active_from: now,
    updated_at: now,
  }).eq('id', version.workflow_id);

  return { id: versionId, state: 'active' };
}

export async function rollbackVersion(workflowId: string, targetVersionId: string, reason: string, activatedBy: string) {
  const targetVersion = await getVersion(targetVersionId);
  if (targetVersion.state !== 'approved' && targetVersion.state !== 'active') {
    throw Object.assign(new Error('Can only rollback to an approved or active version'), { statusCode: 409 });
  }

  const { data: currentActive, error: activeError } = await supabaseAdmin
    .from('workflow_versions')
    .select('id')
    .eq('workflow_id', workflowId)
    .eq('state', 'active')
    .single();
  if (activeError && activeError.code !== 'PGRST116') throw activeError;

  const newVersionId = uuidv4();
  const { data: versions } = await supabaseAdmin.from('workflow_versions').select('version_number').eq('workflow_id', workflowId).order('version_number', { ascending: false }).limit(1);
  const nextVersion = (versions?.[0]?.version_number || 0) + 1;
  const now = new Date().toISOString();

  await supabaseAdmin.from('workflow_versions').insert({
    id: newVersionId,
    workflow_id: workflowId,
    version_number: nextVersion,
    state: 'active',
    change_summary: `Rollback to version ${targetVersion.version_number}`,
    change_reason: reason,
    created_by: activatedBy,
    activated_by: activatedBy,
    activated_at: now,
    rollback_from: currentActive?.id || null,
    rollback_reason: reason,
  });

  await supabaseAdmin.from('workflow_templates').update({
    status: 'active',
    current_version_id: newVersionId,
    updated_at: now,
  }).eq('id', workflowId);

  return { id: newVersionId, version_number: nextVersion, state: 'active' };
}

export async function pauseVersion(versionId: string) {
  const version = await getVersion(versionId);
  if (version.state !== 'active') throw Object.assign(new Error('Only active versions can be paused'), { statusCode: 409 });
  await supabaseAdmin.from('workflow_versions').update({ state: 'paused' }).eq('id', versionId);
  await supabaseAdmin.from('workflow_templates').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', version.workflow_id);
  return { id: versionId, state: 'paused' };
}

export async function retireVersion(versionId: string) {
  const version = await getVersion(versionId);
  if (!['active', 'paused', 'deprecated'].includes(version.state)) {
    throw Object.assign(new Error('Only active, paused, or deprecated versions can be retired'), { statusCode: 409 });
  }
  const now = new Date().toISOString();
  await supabaseAdmin.from('workflow_versions').update({ state: 'retired' }).eq('id', versionId);
  await supabaseAdmin.from('workflow_templates').update({ status: 'retired', retired_at: now, updated_at: now }).eq('id', version.workflow_id);
  return { id: versionId, state: 'retired' };
}
