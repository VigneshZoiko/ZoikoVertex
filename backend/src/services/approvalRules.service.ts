import { supabaseAdmin } from '../shared/supabase';
import { internalEventBus } from '../shared/internalEventBus';
import { v4 as uuidv4 } from 'uuid';
import type { AuthContext } from '../shared/serviceAuth';
import { requireAnyPermission } from '../shared/serviceAuth';

export type RuleStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'READY_TO_PUBLISH' | 'ACTIVE' | 'ACTIVE_WITH_DRAFT_CHANGES' | 'DISABLED' | 'ARCHIVED' | 'CONFLICT_DETECTED' | 'INVALID';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PathType = 'SINGLE_APPROVER' | 'SEQUENTIAL' | 'PARALLEL' | 'QUORUM' | 'ROLE_BASED' | 'SPECIALIST' | 'CONDITIONAL' | 'EMERGENCY' | 'EXECUTIVE' | 'MULTI_STAGE_HYBRID';
export type ConflictType = 'OVERLAPPING_SCOPE' | 'CONTRADICTORY_OUTCOME' | 'MISSING_APPROVER' | 'AUTHORITY_GAP' | 'CIRCULAR_ESCALATION' | 'SLA_GAP' | 'RESTRICTED_MODE_GAP' | 'VALIDATION_CONTRADICTION' | 'PRIORITY_COLLISION' | 'POST_DECISION_CONFLICT' | 'REPLACEMENT_COVERAGE_GAP';

export interface ApprovalRule {
  id: string;
  tenant_id: string;
  workspace_id: string;
  rule_name: string;
  rule_description?: string;
  rule_owner_id: string;
  rule_priority: number;
  rule_status: RuleStatus;
  risk_classification: RiskLevel;
  active_version: number;
  draft_version?: number;
  effective_at?: string;
  expires_at?: string;
  tags?: string[];
  keyword_rules?: Array<{ keywords: string[]; action: 'BLOCK' | 'REQUEST_REVIEW'; scopes?: string[] }>;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRuleInput {
  tenant_id: string;
  workspace_id: string;
  rule_name: string;
  rule_description?: string;
  rule_owner_id: string;
  rule_priority?: number;
  risk_classification?: RiskLevel;
  effective_at?: string;
  expires_at?: string;
  tags?: string[];
  keyword_rules?: Array<{ keywords: string[]; action: 'BLOCK' | 'REQUEST_REVIEW'; scopes?: string[] }>;
  created_by: string;
}

export async function createRule(input: ApprovalRuleInput, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  if (!input.rule_name || input.rule_name.trim().length === 0) {
    throw Object.assign(new Error('rule_name is required'), { statusCode: 400 });
  }
  if (!validUUID(input.rule_owner_id)) {
    throw Object.assign(new Error('rule_owner_id must be a valid UUID'), { statusCode: 400 });
  }
  if (!validUUID(input.created_by)) {
    throw Object.assign(new Error('created_by must be a valid UUID'), { statusCode: 400 });
  }

  const id = uuidv4();
  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .insert({
      id,
      tenant_id: input.tenant_id,
      workspace_id: input.workspace_id,
      rule_name: input.rule_name,
      rule_description: input.rule_description || null,
      rule_owner_id: input.rule_owner_id,
      rule_priority: input.rule_priority || 1000,
      rule_status: 'DRAFT',
      risk_classification: input.risk_classification || 'LOW',
      active_version: 1,
      created_by: input.created_by,
      updated_by: input.created_by,
      effective_at: input.effective_at || null,
      expires_at: input.expires_at || null,
      tags: input.tags || [],
      keyword_rules: input.keyword_rules || [],
    })
    .select()
    .single();
  if (error) {
    if (isMissingTable(error)) {
      throw Object.assign(new Error('Approval rules table not found. Run the 29_approval_rules.sql migration.'), { statusCode: 503, code: 'MIGRATION_REQUIRED' });
    }
    throw error;
  }

  await createAuditLog({
    tenant_id: input.tenant_id,
    approval_rule_id: id,
    action: 'rule.created',
    new_value: { rule_name: input.rule_name, risk_classification: input.risk_classification },
    performed_by: input.created_by,
  });

  return data as unknown as ApprovalRule;
}

export async function listRules(params: {
  tenant_id: string;
  status?: string[];
  risk_classification?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabaseAdmin
    .from('approval_rules')
    .select('*', { count: 'exact' })
    .eq('tenant_id', params.tenant_id)
    .order('rule_priority', { ascending: true });

  if (params.status && params.status.length > 0) {
    query = query.in('rule_status', params.status);
  }
  if (params.risk_classification) {
    query = query.eq('risk_classification', params.risk_classification);
  }
  if (params.search) {
    query = query.or(`rule_name.ilike.%${params.search}%,rule_description.ilike.%${params.search}%`);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  if (limit > 0) query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === '42P01' || code === '42703') {
      return { rules: [], total: 0 };
    }
    throw error;
  }
  return { rules: data as unknown as ApprovalRule[], total: count || 0 };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validUUID(s: string): boolean { return UUID_RE.test(s); }

function isMissingTable(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return code === '42P01' || code === '42703';
}

export async function deleteRule(id: string, tenant_id: string, deleted_by: string): Promise<void> {
  if (!validUUID(id)) throw Object.assign(new Error('Invalid rule ID'), { statusCode: 400 });
  const { error } = await supabaseAdmin
    .from('approval_rules')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant_id);
  if (error) {
    if (isMissingTable(error)) throw Object.assign(new Error('Approval rules table not found. Run the migration.'), { statusCode: 503 });
    throw error;
  }
  await createAuditLog({ tenant_id, approval_rule_id: id, action: 'rule.deleted', performed_by: deleted_by });
}

export async function getRule(id: string, tenant_id: string): Promise<ApprovalRule | null> {
  if (!validUUID(id)) return null;
  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return data as unknown as ApprovalRule | null;
}

export async function updateRule(params: {
  id: string;
  tenant_id: string;
  rule_name?: string;
  rule_description?: string;
  rule_owner_id?: string;
  rule_priority?: number;
  risk_classification?: RiskLevel;
  effective_at?: string;
  expires_at?: string;
  tags?: string[];
  keyword_rules?: Array<{ keywords: string[]; action: 'BLOCK' | 'REQUEST_REVIEW'; scopes?: string[] }>;
  updated_by: string;
}, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const current = await getRule(params.id, params.tenant_id);
  if (!current) throw new Error('Rule not found');

  const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: params.updated_by };
  if (params.rule_name !== undefined) updateFields.rule_name = params.rule_name;
  if (params.rule_description !== undefined) updateFields.rule_description = params.rule_description;
  if (params.rule_owner_id !== undefined) updateFields.rule_owner_id = params.rule_owner_id;
  if (params.rule_priority !== undefined) updateFields.rule_priority = params.rule_priority;
  if (params.risk_classification !== undefined) updateFields.risk_classification = params.risk_classification;
  if (params.effective_at !== undefined) updateFields.effective_at = params.effective_at;
  if (params.expires_at !== undefined) updateFields.expires_at = params.expires_at;
  if (params.tags !== undefined) updateFields.tags = params.tags;
  if (params.keyword_rules !== undefined) updateFields.keyword_rules = params.keyword_rules;

  // If rule is ACTIVE, editing creates a draft version (ACTIVE_WITH_DRAFT_CHANGES)
  if (current.rule_status === 'ACTIVE') {
    updateFields.rule_status = 'ACTIVE_WITH_DRAFT_CHANGES';
    updateFields.draft_version = (current.active_version || 0) + 1;
  }

  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .update(updateFields)
    .eq('id', params.id)
    .eq('tenant_id', params.tenant_id)
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id: params.tenant_id,
    approval_rule_id: params.id,
    action: 'rule.edited',
    new_value: updateFields,
    performed_by: params.updated_by,
  });

  return data as unknown as ApprovalRule;
}

export async function submitRuleForReview(id: string, tenant_id: string, userId: string, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .update({ rule_status: 'NEEDS_REVIEW', updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id, approval_rule_id: id, action: 'rule.submitted_for_review',
    new_value: { rule_status: 'NEEDS_REVIEW' }, performed_by: userId,
  });

  return data as unknown as ApprovalRule;
}

export async function publishRule(id: string, tenant_id: string, userId: string, publishNote?: string, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const rule = await getRule(id, tenant_id);
  if (!rule) throw new Error('Rule not found');

  if (rule.rule_status === 'CONFLICT_DETECTED') {
    throw new Error('Resolve blocking conflicts before publishing');
  }

  const newVersion = (rule.active_version || 0) + 1;

  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .update({
      rule_status: 'ACTIVE',
      active_version: newVersion,
      draft_version: null,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;

  await supabaseAdmin.from('approval_rule_versions').insert({
    approval_rule_id: id,
    version_number: newVersion,
    configuration_snapshot: rule,
    change_summary: publishNote || 'Published without change summary',
    publish_note: publishNote || null,
    author_id: rule.created_by,
    publisher_id: userId,
    published_at: new Date().toISOString(),
  });

  await createAuditLog({
    tenant_id, approval_rule_id: id, action: 'rule.published',
    new_value: { active_version: newVersion, publish_note: publishNote }, performed_by: userId,
  });

  return data as unknown as ApprovalRule;
}

export async function deactivateRule(id: string, tenant_id: string, userId: string, reason?: string, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .update({ rule_status: 'DISABLED', updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id, approval_rule_id: id, action: 'rule.deactivated',
    new_value: { rule_status: 'DISABLED', reason }, performed_by: userId,
  });

  return data as unknown as ApprovalRule;
}

export async function reactivateRule(id: string, tenant_id: string, userId: string, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .update({ rule_status: 'ACTIVE', updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id, approval_rule_id: id, action: 'rule.reactivated',
    new_value: { rule_status: 'ACTIVE' }, performed_by: userId,
  });

  return data as unknown as ApprovalRule;
}

export async function archiveRule(id: string, tenant_id: string, userId: string, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .update({ rule_status: 'ARCHIVED', updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id, approval_rule_id: id, action: 'rule.archived',
    new_value: { rule_status: 'ARCHIVED' }, performed_by: userId,
  });

  return data as unknown as ApprovalRule;
}

export async function markRuleReadyToPublish(id: string, tenant_id: string, userId: string, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .update({ rule_status: 'READY_TO_PUBLISH', updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id, approval_rule_id: id, action: 'rule.ready_to_publish',
    new_value: { rule_status: 'READY_TO_PUBLISH' }, performed_by: userId,
  });

  return data as unknown as ApprovalRule;
}

export async function markRuleInvalid(id: string, tenant_id: string, userId: string, reason: string, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const { data, error } = await supabaseAdmin
    .from('approval_rules')
    .update({ rule_status: 'INVALID', updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id, approval_rule_id: id, action: 'rule.marked_invalid',
    new_value: { rule_status: 'INVALID', reason }, performed_by: userId,
  });

  return data as unknown as ApprovalRule;
}

export async function cloneRule(id: string, tenant_id: string, workspace_id: string, userId: string, auth?: AuthContext): Promise<ApprovalRule> {
  requireAnyPermission(auth, 'rules:manage');
  const source = await getRule(id, tenant_id);
  if (!source) throw new Error('Source rule not found');

  const cloned = await createRule({
    tenant_id,
    workspace_id,
    rule_name: `${source.rule_name} (Clone)`,
    rule_description: source.rule_description,
    rule_owner_id: userId,
    rule_priority: source.rule_priority,
    risk_classification: source.risk_classification as RiskLevel,
    created_by: userId,
  });

  return cloned;
}

export async function getRuleScope(approval_rule_id: string) {
  if (!validUUID(approval_rule_id)) return null;
  const { data, error } = await supabaseAdmin
    .from('approval_rule_scopes')
    .select('*')
    .eq('approval_rule_id', approval_rule_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertRuleScope(params: {
  approval_rule_id: string;
  tenant_id: string;
  workspace_id: string;
  brand_id?: string;
  campaign_id?: string;
  source_module?: string;
  item_type?: string;
  platform?: string;
  jurisdiction?: string;
  language?: string;
  audience_segment?: string;
  department_id?: string;
  team_id?: string;
  user_role?: string;
  agent_id?: string;
  workflow_id?: string;
  restricted_mode_status?: string;
}, auth?: AuthContext) {
  requireAnyPermission(auth, 'rules:manage');
  if (!validUUID(params.approval_rule_id)) throw new Error('Rule not found');
  const existing = await getRuleScope(params.approval_rule_id);
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('approval_rule_scopes')
      .update({
        brand_id: params.brand_id || null,
        campaign_id: params.campaign_id || null,
        source_module: params.source_module || null,
        item_type: params.item_type || null,
        platform: params.platform || null,
        jurisdiction: params.jurisdiction || null,
        language: params.language || null,
        audience_segment: params.audience_segment || null,
        department_id: params.department_id || null,
        team_id: params.team_id || null,
        user_role: params.user_role || null,
        agent_id: params.agent_id || null,
        workflow_id: params.workflow_id || null,
        restricted_mode_status: params.restricted_mode_status || null,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('approval_rule_scopes')
    .insert({
      approval_rule_id: params.approval_rule_id,
      tenant_id: params.tenant_id,
      workspace_id: params.workspace_id,
      brand_id: params.brand_id || null,
      campaign_id: params.campaign_id || null,
      source_module: params.source_module || null,
      item_type: params.item_type || null,
      platform: params.platform || null,
      jurisdiction: params.jurisdiction || null,
      language: params.language || null,
      audience_segment: params.audience_segment || null,
      department_id: params.department_id || null,
      team_id: params.team_id || null,
      user_role: params.user_role || null,
      agent_id: params.agent_id || null,
      workflow_id: params.workflow_id || null,
      restricted_mode_status: params.restricted_mode_status || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRulePath(approval_rule_id: string) {
  if (!validUUID(approval_rule_id)) return null;
  const { data, error } = await supabaseAdmin
    .from('approval_rule_paths')
    .select('*')
    .eq('approval_rule_id', approval_rule_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertRulePath(params: {
  approval_rule_id: string;
  path_type: PathType;
  required_approval_level?: number;
  quorum_required?: boolean;
  quorum_count?: number;
  allow_conditional_approval?: boolean;
  allow_delegation?: boolean;
  emergency_route_enabled?: boolean;
}, auth?: AuthContext) {
  requireAnyPermission(auth, 'rules:manage');
  if (!validUUID(params.approval_rule_id)) throw new Error('Rule not found');
  const existing = await getRulePath(params.approval_rule_id);
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('approval_rule_paths')
      .update({
        path_type: params.path_type,
        required_approval_level: params.required_approval_level || 1,
        quorum_required: params.quorum_required || false,
        quorum_count: params.quorum_count || null,
        allow_conditional_approval: params.allow_conditional_approval || false,
        allow_delegation: params.allow_delegation !== undefined ? params.allow_delegation : true,
        emergency_route_enabled: params.emergency_route_enabled || false,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('approval_rule_paths')
    .insert({
      approval_rule_id: params.approval_rule_id,
      path_type: params.path_type,
      required_approval_level: params.required_approval_level || 1,
      quorum_required: params.quorum_required || false,
      quorum_count: params.quorum_count || null,
      allow_conditional_approval: params.allow_conditional_approval || false,
      allow_delegation: params.allow_delegation !== undefined ? params.allow_delegation : true,
      emergency_route_enabled: params.emergency_route_enabled || false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRuleStages(approval_rule_path_id: string) {
  const { data, error } = await supabaseAdmin
    .from('approval_rule_stages')
    .select('*')
    .eq('approval_rule_path_id', approval_rule_path_id)
    .order('stage_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRuleEscalations(approval_rule_id: string) {
  if (!validUUID(approval_rule_id)) return [];
  const { data, error } = await supabaseAdmin
    .from('approval_rule_escalations')
    .select('*')
    .eq('approval_rule_id', approval_rule_id);
  if (error) throw error;
  return data || [];
}

export async function getRuleDetails(approval_rule_id: string) {
  if (!validUUID(approval_rule_id)) return null;
  const rule = await supabaseAdmin
    .from('approval_rules')
    .select('*')
    .eq('id', approval_rule_id)
    .single();
  if (rule.error) throw rule.error;

  const scopes = await getRuleScope(approval_rule_id);
  const path = await getRulePath(approval_rule_id);
  let stages: unknown[] = [];
  if (path) {
    stages = await getRuleStages((path as { id: string }).id);
  }

  return {
    ...rule.data,
    scopes,
    path: path ? { ...path, stages } : null,
  };
}

export async function getRuleStats(tenant_id: string) {
  const { data: all, error } = await supabaseAdmin
    .from('approval_rules')
    .select('rule_status, risk_classification')
    .eq('tenant_id', tenant_id);
  if (error) throw error;

  const stats = {
    active: 0,
    draft: 0,
    needs_review: 0,
    conflicts_detected: 0,
    high_risk_rules: 0,
    restricted_mode_rules: 0,
    disabled: 0,
  };

  for (const r of all || []) {
    if (r.rule_status === 'ACTIVE' || r.rule_status === 'ACTIVE_WITH_DRAFT_CHANGES') stats.active++;
    if (r.rule_status === 'DRAFT') stats.draft++;
    if (r.rule_status === 'NEEDS_REVIEW') stats.needs_review++;
    if (r.rule_status === 'CONFLICT_DETECTED') stats.conflicts_detected++;
    if (r.rule_status === 'DISABLED') stats.disabled++;
    if (r.risk_classification === 'HIGH' || r.risk_classification === 'CRITICAL') stats.high_risk_rules++;
  }

  return stats;
}

export async function getRuleVersions(approval_rule_id: string) {
  if (!validUUID(approval_rule_id)) return [];
  const { data, error } = await supabaseAdmin
    .from('approval_rule_versions')
    .select('*')
    .eq('approval_rule_id', approval_rule_id)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRuleAuditLog(approval_rule_id: string) {
  if (!validUUID(approval_rule_id)) return [];
  const { data, error } = await supabaseAdmin
    .from('approval_rule_audit_logs')
    .select('*')
    .eq('approval_rule_id', approval_rule_id)
    .order('performed_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRuleConflicts(approval_rule_id: string) {
  if (!validUUID(approval_rule_id)) return [];
  const { data, error } = await supabaseAdmin
    .from('approval_rule_conflicts')
    .select('*')
    .eq('approval_rule_id', approval_rule_id)
    .order('detected_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function resolveConflict(conflict_id: string, userId: string, auth?: AuthContext) {
  requireAnyPermission(auth, 'rules:manage');
  const { data, error } = await supabaseAdmin
    .from('approval_rule_conflicts')
    .update({ conflict_status: 'RESOLVED', resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq('id', conflict_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function detectRuleConflicts(approval_rule_id: string, tenant_id: string, auth?: AuthContext) {
  requireAnyPermission(auth, 'rules:manage');
  const rule = await getRule(approval_rule_id, tenant_id);
  if (!rule) return [];

  const ruleScope = await getRuleScope(approval_rule_id);
  const rulePath = await getRulePath(approval_rule_id);

  const { data: allRules } = await supabaseAdmin
    .from('approval_rules')
    .select('*')
    .eq('tenant_id', tenant_id)
    .neq('id', approval_rule_id)
    .in('rule_status', ['ACTIVE', 'ACTIVE_WITH_DRAFT_CHANGES', 'DRAFT', 'NEEDS_REVIEW', 'CONFLICT_DETECTED']);

  const allRuleIds = (allRules || []).map(r => r.id);

  const { data: allScopes } = await supabaseAdmin
    .from('approval_rule_scopes')
    .select('*')
    .in('approval_rule_id', allRuleIds.length > 0 ? allRuleIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: allPaths } = await supabaseAdmin
    .from('approval_rule_paths')
    .select('*')
    .in('approval_rule_id', allRuleIds.length > 0 ? allRuleIds : ['00000000-0000-0000-0000-000000000000']);

  const scopeByRuleId = new Map<string, Record<string, unknown>>();
  const pathByRuleId = new Map<string, Record<string, unknown>>();

  for (const s of allScopes || []) {
    scopeByRuleId.set(s.approval_rule_id, s as unknown as Record<string, unknown>);
  }
  for (const p of allPaths || []) {
    pathByRuleId.set(p.approval_rule_id, p as unknown as Record<string, unknown>);
  }

  const conflicts: Array<{
    conflict_type: ConflictType;
    conflict_summary: string;
    blocking: boolean;
    related_rule_id?: string;
  }> = [];

  for (const other of allRules || []) {
    const otherScope = scopeByRuleId.get(other.id);
    const otherPath = pathByRuleId.get(other.id);

    if (rule.rule_priority === other.rule_priority) {
      conflicts.push({
        conflict_type: 'PRIORITY_COLLISION',
        conflict_summary: `Rule "${rule.rule_name}" has same priority (${rule.rule_priority}) as "${other.rule_name}"`,
        blocking: false,
        related_rule_id: other.id,
      });
    }

    if (ruleScope && otherScope) {
      const sharedDimensions: string[] = [];

      const rs = ruleScope as Record<string, unknown>;
      const os = otherScope as Record<string, unknown>;

      const dims = ['jurisdiction', 'platform', 'source_module', 'item_type', 'language', 'audience_segment', 'brand_id', 'campaign_id', 'department_id', 'team_id', 'user_role', 'agent_id', 'workflow_id'];
      for (const dim of dims) {
        if (rs[dim] && os[dim] && rs[dim] === os[dim]) {
          sharedDimensions.push(`${dim}:${rs[dim]}`);
        }
      }

      if (sharedDimensions.length > 0) {
        conflicts.push({
          conflict_type: 'OVERLAPPING_SCOPE',
          conflict_summary: `Rule "${rule.rule_name}" overlaps with "${other.rule_name}" on: ${sharedDimensions.join(', ')}`,
          blocking: false,
          related_rule_id: other.id,
        });
      }
    }

    if (rulePath && otherPath) {
      const rp = rulePath as Record<string, unknown>;
      const op = otherPath as Record<string, unknown>;
      if (rp.path_type !== op.path_type && ruleScope && otherScope) {
        const rs = ruleScope as Record<string, unknown>;
        const os = otherScope as Record<string, unknown>;
        if (rs.source_module && os.source_module && rs.source_module === os.source_module) {
          conflicts.push({
            conflict_type: 'CONTRADICTORY_OUTCOME',
            conflict_summary: `Rules "${rule.rule_name}" and "${other.rule_name}" have different paths (${rp.path_type} vs ${op.path_type}) for same source module`,
            blocking: true,
            related_rule_id: other.id,
          });
        }
      }
    }
  }

  if (rulePath) {
    const rp = rulePath as Record<string, unknown>;
    if (!rp.emergency_route_enabled) {
      conflicts.push({
        conflict_type: 'MISSING_APPROVER',
        conflict_summary: `Rule "${rule.rule_name}" has no emergency escalation route enabled`,
        blocking: false,
      });
    }
  }

  for (const conflict of conflicts) {
    await supabaseAdmin.from('approval_rule_conflicts').insert({
      approval_rule_id,
      conflict_type: conflict.conflict_type,
      conflict_status: 'OPEN',
      conflict_summary: conflict.conflict_summary,
      blocking: conflict.blocking,
      related_rule_id: conflict.related_rule_id || null,
    });
  }

  if (conflicts.length > 0) {
    await supabaseAdmin
      .from('approval_rules')
      .update({ rule_status: 'CONFLICT_DETECTED', updated_at: new Date().toISOString() })
      .eq('id', approval_rule_id);

    try {
      internalEventBus.emit('approval_rules.conflict_detected', {
        workspace_id: rule.workspace_id || tenant_id,
        tenant_id,
        actor_id: 'system',
        rule_id: approval_rule_id,
        conflict_count: conflicts.length,
      });
    } catch { /* non-blocking */ }
  }

  return conflicts;
}

export async function runSimulation(params: {
  approval_rule_id: string;
  simulated_by: string;
  simulation_input: Record<string, unknown>;
}, auth?: AuthContext) {
  requireAnyPermission(auth, 'rules:manage');
  if (!validUUID(params.approval_rule_id)) throw new Error('Rule not found');
  const { data: rule } = await supabaseAdmin
    .from('approval_rules')
    .select('*')
    .eq('id', params.approval_rule_id)
    .single();

  if (!rule) throw new Error('Rule not found');

  const path = await getRulePath(params.approval_rule_id);
  const stages = path ? await getRuleStages((path as { id: string }).id) : [];
  const scope = await getRuleScope(params.approval_rule_id);
  const escalations = await getRuleEscalations(params.approval_rule_id);

  const input = params.simulation_input as Record<string, unknown>;
  const matchedConditions: string[] = [];
  const blocked_reasons: string[] = [];
  let matched = false;

  if (scope) {
    const s = scope as Record<string, unknown>;
    const inputType = input.item_type as string;
    const inputSource = input.source_module as string;
    const inputJurisdiction = input.jurisdiction as string;
    const inputPlatform = input.platform as string;

    if (s.item_type && inputType && s.item_type === inputType) {
      matchedConditions.push(`item_type: ${inputType}`);
    }
    if (s.source_module && inputSource && s.source_module === inputSource) {
      matchedConditions.push(`source_module: ${inputSource}`);
    }
    if (s.jurisdiction && inputJurisdiction && s.jurisdiction === inputJurisdiction) {
      matchedConditions.push(`jurisdiction: ${inputJurisdiction}`);
    }
    if (s.platform && inputPlatform && s.platform === inputPlatform) {
      matchedConditions.push(`platform: ${inputPlatform}`);
    }
  }

  if (path) {
    const p = path as { path_type: string };
    matchedConditions.push(`path_type: ${p.path_type}`);
  }

  matched = matchedConditions.length > 1;

  const conflicts = await detectRuleConflicts(params.approval_rule_id, rule.tenant_id as string);
  const conflict_warnings = conflicts.map(c => c.conflict_summary);

  const simulationResult = {
    matched,
    matched_conditions: matchedConditions,
    generated_path: path,
    generated_sla: stages,
    generated_escalation: escalations.length > 0 ? escalations : null,
    generated_fallback: escalations.some(e => (e as Record<string, unknown>).fallback_after_escalation) || null,
    conflict_warnings,
    blocked_reasons,
  };

  const { data, error } = await supabaseAdmin
    .from('approval_rule_simulations')
    .insert({
      approval_rule_id: params.approval_rule_id,
      simulated_by: params.simulated_by,
      simulation_input: input,
      matched,
      matched_conditions: matchedConditions,
      generated_path: path ? path : null,
      generated_sla: stages.length > 0 ? { stages } : null,
      generated_escalation: escalations.length > 0 ? escalations : null,
      generated_fallback: escalations.some(e => (e as Record<string, unknown>).fallback_after_escalation) || null,
      conflict_warnings,
      blocked_reasons,
    })
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    tenant_id: rule.tenant_id as string,
    approval_rule_id: params.approval_rule_id,
    action: 'rule.simulation_run',
    new_value: { simulation_id: (data as { id: string }).id, matched },
    performed_by: params.simulated_by,
  });

  return simulationResult;
}

async function createAuditLog(params: {
  tenant_id: string;
  approval_rule_id: string;
  action: string;
  previous_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  reason_note?: string;
  performed_by: string;
}) {
  const { error } = await supabaseAdmin.from('approval_rule_audit_logs').insert({
    tenant_id: params.tenant_id,
    approval_rule_id: params.approval_rule_id,
    action: params.action,
    previous_value: params.previous_value || null,
    new_value: params.new_value || null,
    reason_note: params.reason_note || null,
    performed_by: params.performed_by,
  });
  if (error) console.error('[ApprovalRules] Audit log error:', error);
}
