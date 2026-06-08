import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { type DependencyResult } from './workflowDependency.service';

export interface SimulationWarning {
  type: string;
  step_name?: string;
  message: string;
}

export interface SimulationBlock {
  type: string;
  step_name?: string;
  message: string;
}

export interface FailedStep {
  step_name: string;
  step_type: string;
  reason: string;
}

export interface PolicyResult {
  step_name: string;
  policy_check: string;
  status: 'passed' | 'warning' | 'failed' | 'missing';
}

export interface MissingDependency {
  dependency_type: string;
  dependency_id: string;
  dependency_name: string;
  required_status: string;
  current_status: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface SimulationResult {
  id: string;
  result: 'pass' | 'warning' | 'block' | 'escalation' | 'missing_dependency' | 'failed_integration';
  warnings: SimulationWarning[];
  blocks: SimulationBlock[];
  failed_steps: FailedStep[];
  missing_dependencies: MissingDependency[];
  policy_results: PolicyResult[];
  dependency_results: DependencyResult[];
  evidence_ref: string;
}

function flattenStepConfig(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config || {})) {
    if (v != null) out[k] = v;
    if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
      const nested = flattenStepConfig(v as Record<string, unknown>);
      for (const [nk, nv] of Object.entries(nested)) {
        out[`${k}.${nk}`] = nv;
      }
    }
  }
  return out;
}

export async function runSimulation(params: {
  workflow_version_id: string;
  scenario_name?: string;
  sample_input_ref?: string;
  created_by: string;
  workspace_id?: string;
}): Promise<SimulationResult> {
  const id = uuidv4();
  const warnings: SimulationWarning[] = [];
  const blocks: SimulationBlock[] = [];
  const failed_steps: FailedStep[] = [];
  const missing_dependencies: MissingDependency[] = [];
  const policy_results: PolicyResult[] = [];

  const [stepsResult, edgesResult, versionResult, templateResult] = await Promise.all([
    supabaseAdmin.from('workflow_steps').select('*').eq('version_id', params.workflow_version_id).order('sequence', { ascending: true }),
    supabaseAdmin.from('workflow_edges').select('*').eq('version_id', params.workflow_version_id),
    supabaseAdmin.from('workflow_versions').select('*, workflow_id').eq('id', params.workflow_version_id).single(),
    supabaseAdmin.from('workflow_templates').select('*').eq('current_version_id', params.workflow_version_id).maybeSingle(),
  ]);

  if (stepsResult.error) throw stepsResult.error;
  if (edgesResult.error) throw edgesResult.error;
  if (versionResult.error) throw versionResult.error;

  const steps = stepsResult.data || [];
  const edges = edgesResult.data || [];
  const version = versionResult.data;
  const template = templateResult.data;

  const workflowId = version?.workflow_id || (template?.id ?? null);
  const riskLevel: string = template?.risk_level || 'medium';

  if (steps.length === 0) {
    blocks.push({ type: 'no_steps', message: 'Workflow has no steps' });
  }

  const hasTrigger = steps.some((s: any) => String(s.step_type).toLowerCase() === 'trigger');
  const hasEnd = steps.some((s: any) => String(s.step_type).toLowerCase() === 'end');

  if (!hasTrigger) blocks.push({ type: 'missing_trigger', message: 'Workflow must have a Trigger node' });
  if (!hasEnd) blocks.push({ type: 'missing_end', message: 'Workflow must have an End node' });

  const stepsWithoutOwner = steps.filter((s: any) => !s.owner_role);
  for (const s of stepsWithoutOwner) {
    warnings.push({
      type: 'missing_owner',
      step_name: s.name || s.step_type,
      message: `Step ${s.name || s.step_type} at sequence ${s.sequence} has no owner_role assigned`,
    });
  }

  const stepsWithoutSLA = steps.filter((s: any) => s.sla_minutes == null);
  for (const s of stepsWithoutSLA) {
    warnings.push({
      type: 'missing_sla',
      step_name: s.name || s.step_type,
      message: `Step ${s.name || s.step_type} at sequence ${s.sequence} has no SLA defined`,
    });
  }

  const edgesSet = new Set<string>();
  for (const e of edges) {
    edgesSet.add(e.from_step_id);
    edgesSet.add(e.to_step_id);
  }
  const orphanSteps = steps.filter((s: any) => !edgesSet.has(s.id));
  for (const s of orphanSteps) {
    warnings.push({
      type: 'orphan_step',
      step_name: s.name || s.step_type,
      message: `Step ${s.name || s.step_type} at sequence ${s.sequence} has no connecting edges`,
    });
  }

  const approvalStepCount = steps.filter((s: any) => String(s.step_type).toLowerCase() === 'approval_gate').length;
  const requiredChain = getChainForRiskLevel(riskLevel);
  if (approvalStepCount === 0) {
    blocks.push({ type: 'missing_approval_gate', message: `No approval gate found; risk level ${riskLevel} requires ${requiredChain.length} approval key(s)` });
  } else if (approvalStepCount < requiredChain.length) {
    warnings.push({
      type: 'insufficient_approval_gates',
      message: `Risk level ${riskLevel} requires ${requiredChain.length} approval key(s) but only ${approvalStepCount} approval gate(s) found`,
    });
  }

  const hasEvidenceCapture = steps.some((s: any) => String(s.step_type).toLowerCase() === 'evidence_capture');
  if (!hasEvidenceCapture) {
    warnings.push({
      type: 'missing_evidence_capture',
      message: 'No Evidence Capture node found; evidence will not be automatically collected',
    });
  }

  const publishSteps = steps.filter((s: any) => String(s.step_type).toLowerCase() === 'publish');
  const policyCheckSteps = steps.filter((s: any) => String(s.step_type).toLowerCase() === 'policy_check');

  for (const pStep of publishSteps) {
    const hasPrecedingPolicy = edges.some((e: any) => {
      if (e.to_step_id !== pStep.id) return false;
      const fromStep = steps.find((s: any) => s.id === e.from_step_id);
      return fromStep && String(fromStep.step_type).toLowerCase() === 'policy_check';
    });
    if (!hasPrecedingPolicy) {
      blocks.push({
        type: 'missing_policy_check_before_publish',
        step_name: pStep.name || pStep.step_type,
        message: `Publish step "${pStep.name}" has no preceding policy check node`,
      });
    }
  }

  if (policyCheckSteps.length > 0) {
    for (const pc of policyCheckSteps) {
      const checks = pc.required_policy_checks;
      if (!checks || !Array.isArray(checks) || checks.length === 0) {
        warnings.push({
          type: 'empty_policy_checks',
          step_name: pc.name || pc.step_type,
          message: `Policy check step "${pc.name}" has no required_policy_checks configured`,
        });
      } else {
        for (const check of checks) {
          policy_results.push({
            step_name: pc.name || pc.step_type,
            policy_check: check,
            status: 'passed' as const,
          });
        }
      }
    }
  }

  const branchSteps = steps.filter((s: any) => String(s.step_type).toLowerCase() === 'branch');
  for (const bStep of branchSteps) {
    const outEdges = edges.filter((e: any) => e.from_step_id === bStep.id);
    const hasDefault = outEdges.some((e: any) => e.default_path === true);
    const hasFailSafe = outEdges.some((e: any) => e.fail_safe_path === true);
    if (!hasDefault) {
      warnings.push({
        type: 'missing_default_branch',
        step_name: bStep.name || bStep.step_type,
        message: `Branch step "${bStep.name}" has no default path`,
      });
    }
    if (!hasFailSafe) {
      warnings.push({
        type: 'missing_fail_safe_branch',
        step_name: bStep.name || bStep.step_type,
        message: `Branch step "${bStep.name}" has no fail-safe path`,
      });
    }
  }

  const flatConfigs = steps.map((s: any) => ({
    step_name: s.name,
    step_type: s.step_type,
    config: flattenStepConfig(s.config || {}),
  }));

  const agentRefs = new Set<string>();
  const promptRefs = new Set<string>();
  const knowledgeRefs = new Set<string>();
  const connectorRefs = new Set<string>();

  for (const fc of flatConfigs) {
    for (const [k, v] of Object.entries(fc.config)) {
      if (typeof v === 'string') {
        if (k.includes('agent') || k.includes('agent_id')) agentRefs.add(v);
        if (k.includes('prompt') || k.includes('prompt_id')) promptRefs.add(v);
        if (k.includes('knowledge') || k.includes('knowledge_id') || k.includes('source_id')) knowledgeRefs.add(v);
        if (k.includes('connector') || k.includes('connector_id') || k.includes('platform')) connectorRefs.add(v);
      }
    }
  }

  const dependencyResults: DependencyResult[] = [];
  try {
    const deps = await checkWorkflowDependenciesWithRefs(workflowId, {
      agentRefs: [...agentRefs],
      promptRefs: [...promptRefs],
      knowledgeRefs: [...knowledgeRefs],
      connectorRefs: [...connectorRefs],
    });
    dependencyResults.push(...deps);
    for (const dep of deps) {
      if (dep.blocking) {
        blocks.push({
          type: `blocking_dependency_${dep.dependency_type}`,
          message: `${dep.dependency_type} ${dep.dependency_id_ref} is ${dep.current_status}: ${dep.recommended_action}`,
        });
      } else if (dep.health === 'stale' || dep.health === 'paused') {
        warnings.push({
          type: `dependency_${dep.health}`,
          message: `${dep.dependency_type} ${dep.dependency_id_ref} is ${dep.health}: ${dep.recommended_action}`,
        });
      }
    }
  } catch {
    warnings.push({ type: 'dependency_check_failed', message: 'Could not check linked dependencies' });
  }

  const result: SimulationResult['result'] = blocks.length > 0 ? 'block' : warnings.length > 0 ? 'warning' : 'pass';
  const evidenceInput = {
    scenario: params.scenario_name || 'Standard Test',
    steps_count: steps.length,
    edges_count: edges.length,
    risk_level: riskLevel,
  };
  const hashInput = `${id}:${params.workflow_version_id}:${result}:${JSON.stringify(evidenceInput)}:${Date.now()}`;
  const evidenceRef = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);

  await supabaseAdmin.from('simulation_runs').insert({
    id,
    workflow_version_id: params.workflow_version_id,
    scenario_name: params.scenario_name || 'Standard Test',
    sample_input_ref: params.sample_input_ref || null,
    result,
    warnings,
    blocks,
    failed_steps,
    evidence_ref: evidenceRef,
    created_by: params.created_by,
  });

  return {
    id,
    result,
    warnings,
    blocks,
    failed_steps,
    missing_dependencies,
    policy_results,
    dependency_results: dependencyResults,
    evidence_ref: evidenceRef,
  };
}

function getChainForRiskLevel(riskLevel: string): string[] {
  switch (riskLevel) {
    case 'low': return ['AGENT_ARCHITECT'];
    case 'medium': return ['AGENT_ARCHITECT', 'ADMIN'];
    case 'high':
    case 'critical': return ['AGENT_ARCHITECT', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN'];
    default: return ['AGENT_ARCHITECT'];
  }
}

async function checkWorkflowDependenciesWithRefs(
  workflowId: string | null,
  refs: { agentRefs: string[]; promptRefs: string[]; knowledgeRefs: string[]; connectorRefs: string[] },
): Promise<DependencyResult[]> {
  const deps: DependencyResult[] = [];

  if (refs.agentRefs.length > 0) {
    const { data: agents } = await supabaseAdmin.from('agents').select('id, name, status').in('id', refs.agentRefs);
    for (const ref of refs.agentRefs) {
      const agent = (agents || []).find((a: any) => a.id === ref);
      if (!agent) {
        deps.push(makeDepResult('agent', ref, 'missing', 'Unknown', 'Agent not found', 'high', true, 'Create or re-link the agent'));
      } else {
        deps.push(checkSingleDependency('agent', agent.id, agent.name || 'agent', agent.status, ['active', 'idle']));
      }
    }
  }

  if (refs.promptRefs.length > 0) {
    const { data: prompts } = await supabaseAdmin.from('prompts').select('id, name, status').in('id', refs.promptRefs);
    for (const ref of refs.promptRefs) {
      const prompt = (prompts || []).find((p: any) => p.id === ref);
      if (!prompt) {
        deps.push(makeDepResult('prompt', ref, 'missing', 'Unknown', 'Prompt not found', 'high', true, 'Create or re-link the prompt'));
      } else {
        deps.push(checkSingleDependency('prompt', prompt.id, prompt.name || 'prompt', prompt.status, ['active', 'approved']));
      }
    }
  }

  if (refs.knowledgeRefs.length > 0) {
    const { data: sources } = await supabaseAdmin.from('knowledge_sources').select('id, name, status').in('id', refs.knowledgeRefs);
    for (const ref of refs.knowledgeRefs) {
      const source = (sources || []).find((k: any) => k.id === ref);
      if (!source) {
        deps.push(makeDepResult('knowledge_source', ref, 'missing', 'Unknown', 'Knowledge source not found', 'medium', true, 'Create or re-link the knowledge source'));
      } else {
        deps.push(checkSingleDependency('knowledge_source', source.id, source.name || 'source', source.status, ['active', 'ready']));
      }
    }
  }

  if (refs.connectorRefs.length > 0) {
    const { data: connectors } = await supabaseAdmin.from('platform_connectors').select('id, name, status').in('id', refs.connectorRefs);
    for (const ref of refs.connectorRefs) {
      const conn = (connectors || []).find((c: any) => c.id === ref);
      if (!conn) {
        deps.push(makeDepResult('connector', ref, 'missing', 'Unknown', 'Platform connector not found', 'critical', true, 'Create or re-link the connector'));
      } else {
        deps.push(checkSingleDependency('connector', conn.id, conn.name || 'connector', conn.status, ['active', 'connected', 'ready']));
      }
    }
  }

  return deps;
}

function checkSingleDependency(
  depType: string,
  id: string,
  name: string,
  status: string,
  healthyStatuses: string[],
): DependencyResult {
  if (!status || !healthyStatuses.includes(status.toLowerCase())) {
    const health = determineHealth(status);
    return {
      dependency_type: depType,
      dependency_id_ref: id,
      dependency_name: name,
      required_status: healthyStatuses.join(', '),
      current_status: status || 'unknown',
      health,
      impact_level: 'high',
      last_checked_at: new Date().toISOString(),
      blocking: health === 'missing' || health === 'critical_failure',
      recommended_action: `Resolve ${depType} status: current "${status || 'unknown'}", expected one of [${healthyStatuses.join(', ')}]`,
    };
  }
  return {
    dependency_type: depType,
    dependency_id_ref: id,
    dependency_name: name,
    required_status: healthyStatuses.join(', '),
    current_status: status,
    health: 'healthy',
    impact_level: 'low',
    last_checked_at: new Date().toISOString(),
    blocking: false,
    recommended_action: 'No action required',
  };
}

function determineHealth(status: string): 'healthy' | 'stale' | 'paused' | 'missing' | 'deprecated' | 'critical_failure' {
  if (!status || status === 'unknown') return 'missing';
  const s = status.toLowerCase();
  if (s === 'active' || s === 'ready' || s === 'connected' || s === 'idle') return 'healthy';
  if (s === 'paused') return 'paused';
  if (s === 'deprecated' || s === 'retired') return 'deprecated';
  if (s === 'failed' || s === 'error' || s === 'suspended') return 'critical_failure';
  return 'stale';
}

function makeDepResult(
  depType: string,
  id: string,
  health: string,
  status: string,
  name: string,
  impact: string,
  blocking: boolean,
  action: string,
): DependencyResult {
  return {
    dependency_type: depType,
    dependency_id_ref: id,
    dependency_name: name,
    required_status: 'active',
    current_status: status,
    health: health as any,
    impact_level: impact as any,
    last_checked_at: new Date().toISOString(),
    blocking,
    recommended_action: action,
  };
}

export async function listSimulations(versionId: string) {
  const { data, error } = await supabaseAdmin
    .from('simulation_runs')
    .select('*')
    .eq('workflow_version_id', versionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
