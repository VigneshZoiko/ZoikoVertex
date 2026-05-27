import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { createReviewItem } from './reviewQueue.service';
import { createApprovalItem } from './approval.service';
import { internalEventBus } from '../shared/internalEventBus';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RoutingSourceModule = 'validation_desk' | 'review_queue' | 'approvals' | 'quality_audit' | 'exceptions';
export type RoutingTargetModule = 'review_queue' | 'approvals' | 'quality_audit' | 'exceptions';
export type RoutingStatus = 'routed' | 'completed' | 'failed' | 'skipped';

export interface RoutingRule {
  id: string;
  source_module: RoutingSourceModule;
  target_module: RoutingTargetModule;
  condition: string;
  label: string;
}

export interface RoutingTrail {
  id: string;
  source_module: RoutingSourceModule;
  source_entity_id: string;
  target_module: RoutingTargetModule;
  target_entity_id: string;
  target_item_id: string;
  status: RoutingStatus;
  routed_by: string;
  workspace_id: string;
  tenant_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Supported Workflow Chains ───────────────────────────────────────────────

const WORKFLOW_CHAINS: Array<{
  id: string;
  label: string;
  steps: Array<{ from: RoutingSourceModule; to: RoutingTargetModule; label: string }>;
}> = [
  {
    id: 'validation_to_review',
    label: 'Validation → Review Queue',
    steps: [{ from: 'validation_desk', to: 'review_queue', label: 'Forward to Review' }],
  },
  {
    id: 'validation_to_approvals',
    label: 'Validation → Approvals',
    steps: [{ from: 'validation_desk', to: 'approvals', label: 'Forward to Approvals' }],
  },
  {
    id: 'review_to_approvals',
    label: 'Review Queue → Approvals',
    steps: [{ from: 'review_queue', to: 'approvals', label: 'Forward to Approvals' }],
  },
  {
    id: 'validation_review_approve',
    label: 'Validation → Review → Approvals',
    steps: [
      { from: 'validation_desk', to: 'review_queue', label: 'Forward to Review' },
      { from: 'review_queue', to: 'approvals', label: 'Forward to Approvals' },
    ],
  },
  {
    id: 'exception_to_validation',
    label: 'Exceptions → Validation',
    steps: [{ from: 'exceptions', to: 'quality_audit', label: 'Forward to Quality Audit' }],
  },
];

export function getWorkflowChains(): typeof WORKFLOW_CHAINS {
  return WORKFLOW_CHAINS;
}

// ─── Routing Logic ───────────────────────────────────────────────────────────

async function createRoutedItem(params: {
  source_module: RoutingSourceModule;
  target_module: RoutingTargetModule;
  source_entity_id: string;
  title: string;
  item_type: string;
  risk_level: string;
  submitted_by: string;
  workspace_id: string;
  tenant_id: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (params.target_module === 'review_queue') {
    const item = await createReviewItem({
      tenant_id: params.tenant_id,
      workspace_id: params.workspace_id,
      item_type: (params.item_type || 'validation_failed') as any,
      source_module: params.source_module,
      source_entity_id: params.source_entity_id,
      title: params.title,
      submitted_by: params.submitted_by,
      risk_level: (params.risk_level || 'LOW') as any,
      priority: 'NORMAL',
      content_snapshot: params.metadata || {},
    });
    return item.id;
  }

  if (params.target_module === 'approvals') {
    const item = await createApprovalItem({
      tenant_id: params.tenant_id,
      workspace_id: params.workspace_id,
      source_module: params.source_module,
      source_entity_id: params.source_entity_id,
      item_type: (params.item_type || 'VALIDATION_OVERRIDE') as any,
      title: params.title,
      submitted_by: params.submitted_by,
      risk_level: params.risk_level || 'LOW',
    });
    return item.id;
  }

  throw new Error(`Routing to ${params.target_module} is not yet supported`);
}

export async function routeItem(params: {
  source_module: RoutingSourceModule;
  source_entity_id: string;
  target_module: RoutingTargetModule;
  title: string;
  item_type?: string;
  risk_level?: string;
  routed_by: string;
  workspace_id: string;
  tenant_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<RoutingTrail> {
  const tenantId = params.tenant_id || params.workspace_id;
  const itemType = params.item_type || 'validation_failed';
  const riskLevel = params.risk_level || 'LOW';

  const targetItemId = await createRoutedItem({
    source_module: params.source_module,
    target_module: params.target_module,
    source_entity_id: params.source_entity_id,
    title: params.title,
    item_type: itemType,
    risk_level: riskLevel,
    submitted_by: params.routed_by,
    workspace_id: params.workspace_id,
    tenant_id: tenantId,
    metadata: params.metadata,
  });

  const trail: RoutingTrail = {
    id: uuidv4(),
    source_module: params.source_module,
    source_entity_id: params.source_entity_id,
    target_module: params.target_module,
    target_entity_id: targetItemId,
    target_item_id: targetItemId,
    status: 'routed',
    routed_by: params.routed_by,
    workspace_id: params.workspace_id,
    tenant_id: tenantId,
    metadata: { item_type: itemType, risk_level: riskLevel, ...params.metadata },
    created_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from('routing_trail').insert(trail);
  if (error) throw error;

  internalEventBus.emit('workflow:routed', {
    source_module: params.source_module,
    source_entity_id: params.source_entity_id,
    target_module: params.target_module,
    target_item_id: targetItemId,
    workspace_id: params.workspace_id,
    timestamp: trail.created_at,
  });

  return trail;
}

export async function executeWorkflowChain(params: {
  chain_id: string;
  source_module: RoutingSourceModule;
  source_entity_id: string;
  title: string;
  item_type?: string;
  risk_level?: string;
  routed_by: string;
  workspace_id: string;
  tenant_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<RoutingTrail[]> {
  const chain = WORKFLOW_CHAINS.find(c => c.id === params.chain_id);
  if (!chain) throw new Error(`Unknown workflow chain: ${params.chain_id}`);

  const trails: RoutingTrail[] = [];
  let currentSourceId = params.source_entity_id;
  let currentModule = params.source_module;

  for (const step of chain.steps) {
    const trail = await routeItem({
      source_module: currentModule,
      source_entity_id: currentSourceId,
      target_module: step.to,
      title: params.title,
      item_type: params.item_type,
      risk_level: params.risk_level,
      routed_by: params.routed_by,
      workspace_id: params.workspace_id,
      tenant_id: params.tenant_id,
      metadata: { workflow_chain: params.chain_id, step_label: step.label, ...params.metadata },
    });
    trails.push(trail);
    currentSourceId = trail.target_item_id;
    currentModule = step.to as RoutingSourceModule;
  }

  return trails;
}

export async function getRoutingHistory(params: {
  source_module?: RoutingSourceModule;
  source_entity_id?: string;
  target_module?: RoutingTargetModule;
  target_item_id?: string;
  workspace_id: string;
  limit?: number;
}): Promise<{ trails: RoutingTrail[]; total: number }> {
  const limit = Math.min(params.limit || 50, 100);

  let query = supabaseAdmin
    .from('routing_trail')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (params.source_module) query = query.eq('source_module', params.source_module);
  if (params.source_entity_id) query = query.eq('source_entity_id', params.source_entity_id);
  if (params.target_module) query = query.eq('target_module', params.target_module);
  if (params.target_item_id) query = query.eq('target_item_id', params.target_item_id);

  const { data, error, count } = await query;
  if (error) throw error;

  return { trails: data || [], total: count || 0 };
}
