import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

const VALID_STATUSES = ['Draft', 'Testing', 'Pending Approval', 'Approved', 'Active', 'Paused', 'Blocked', 'Deprecated', 'Retired', 'Failed'];

export interface WorkflowTemplate {
  id: string;
  workspace_id: string;
  brand_ids: string[];
  name: string;
  description: string;
  type: string;
  status: string;
  risk_level: string;
  owner_id: string;
  owner_name: string;
  platforms: string[];
  current_version_id: string;
  total_runs: number;
  active_runs_count: number;
  health: string;
  created_at: string;
  updated_at: string;
}

export async function listTemplates(params: {
  workspace_id: string;
  status?: string;
  risk_level?: string;
  type?: string;
  owner_id?: string;
  search?: string;
  limit: number;
  offset: number;
}) {
  let query = supabaseAdmin
    .from('workflow_templates')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('updated_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.status) query = query.eq('status', params.status);
  if (params.risk_level) query = query.eq('risk_level', params.risk_level);
  if (params.type) query = query.eq('type', params.type);
  if (params.owner_id) query = query.eq('owner_id', params.owner_id);
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { templates: data || [], total: count || 0 };
}

export async function getTemplate(templateId: string) {
  const { data, error } = await supabaseAdmin.from('workflow_templates').select('*').eq('id', templateId).single();
  if (error) throw Object.assign(new Error('Workflow template not found'), { statusCode: 404 });
  return data as WorkflowTemplate;
}

export async function createTemplate(params: {
  workspace_id: string;
  name: string;
  description?: string;
  risk_level?: string;
  owner_id: string;
  owner_name?: string;
  brand_ids?: string[];
  platforms?: string[];
  type?: string;
}) {
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('workflow_templates').insert({
    id,
    workspace_id: params.workspace_id,
    name: params.name,
    description: params.description || null,
    type: params.type || 'governed',
    status: 'Draft',
    risk_level: params.risk_level || 'medium',
    owner_id: params.owner_id,
    owner_name: params.owner_name || null,
    brand_ids: params.brand_ids || [],
    platforms: params.platforms || [],
    health: 'Healthy',
  });
  if (error) throw error;
  return { id };
}

export async function updateTemplate(templateId: string, params: Partial<{
  name: string;
  description: string;
  risk_level: string;
  owner_id: string;
  owner_name: string;
  brand_ids: string[];
  platforms: string[];
}>) {
  const { data: existing, error: fetchError } = await supabaseAdmin.from('workflow_templates').select('status').eq('id', templateId).single();
  if (fetchError || !existing) throw Object.assign(new Error('Workflow template not found'), { statusCode: 404 });
  if (existing.status === 'Active' || existing.status === 'Retired') {
    throw Object.assign(new Error('Active or retired workflows cannot be directly edited. Create a draft version.'), { statusCode: 409 });
  }
  const updateData: any = { ...params, updated_at: new Date().toISOString() };
  const { error } = await supabaseAdmin.from('workflow_templates').update(updateData).eq('id', templateId);
  if (error) throw error;
  return { id: templateId };
}

export async function duplicateTemplate(templateId: string, newName: string) {
  const original = await getTemplate(templateId);
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('workflow_templates').insert({
    id,
    workspace_id: original.workspace_id,
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    type: original.type,
    status: 'Draft',
    risk_level: original.risk_level,
    owner_id: original.owner_id,
    owner_name: original.owner_name,
    brand_ids: original.brand_ids,
    platforms: original.platforms,
    health: 'Healthy',
  });
  if (error) throw error;
  return { id, original_id: templateId };
}

export async function deleteDraftTemplate(templateId: string) {
  const { data: existing, error: fetchError } = await supabaseAdmin.from('workflow_templates').select('status').eq('id', templateId).single();
  if (fetchError || !existing) throw Object.assign(new Error('Workflow template not found'), { statusCode: 404 });
  if (existing.status !== 'Draft') throw Object.assign(new Error('Only draft workflows can be deleted'), { statusCode: 409 });
  const { error } = await supabaseAdmin.from('workflow_templates').delete().eq('id', templateId);
  if (error) throw error;
  return { id: templateId };
}
