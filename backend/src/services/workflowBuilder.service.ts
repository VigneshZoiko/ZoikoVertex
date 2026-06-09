import { supabaseAdmin } from '../shared/supabase';
import { checkWorkflowDependencies } from './workflowDependency.service';

export async function validateWorkflowReadiness(versionId: string) {
  const [stepsResult, edgesResult] = await Promise.all([
    supabaseAdmin.from('workflow_steps').select('*').eq('version_id', versionId).order('sequence', { ascending: true }),
    supabaseAdmin.from('workflow_edges').select('*').eq('version_id', versionId),
  ]);

  if (stepsResult.error) throw stepsResult.error;
  if (edgesResult.error) throw edgesResult.error;

  const steps = stepsResult.data || [];
  const edges = edgesResult.data || [];
  const issues: string[] = [];
  const warnings: string[] = [];

  if (steps.length === 0) issues.push('Workflow has no steps');
  if (!steps.some((s) => s.step_type?.toLowerCase() === 'trigger')) issues.push('Missing Trigger node');
  if (!steps.some((s) => s.step_type?.toLowerCase() === 'end')) issues.push('Missing End node');
  if (!steps.some((s) => s.step_type?.toLowerCase() === 'evidence_capture')) warnings.push('No Evidence Capture node found');
  if (!steps.some((s) => s.step_type?.toLowerCase() === 'approval_gate')) warnings.push('No Approval Gate node found');

  const incompleteSteps = steps.filter((s) => !s.name || !s.owner_role);
  for (const s of incompleteSteps) {
    issues.push(`Step at sequence ${s.sequence} (${s.step_type}) is incomplete: missing name or owner_role`);
  }

  const stepsWithoutSLA = steps.filter((s) => s.sla_minutes == null);
  for (const s of stepsWithoutSLA) {
    warnings.push(`Step ${s.name || s.step_type} at sequence ${s.sequence} has no SLA defined`);
  }

  const stepsWithoutEdges = steps.filter((s) => !edges.some((e) => e.from_step_id === s.id || e.to_step_id === s.id));
  for (const s of stepsWithoutEdges) {
    issues.push(`Step ${s.name || s.step_type} at sequence ${s.sequence} has no connecting edges`);
  }

  const publishSteps = steps.filter((s) => s.step_type?.toLowerCase() === 'publish');
  for (const pStep of publishSteps) {
    const hasPrecedingPolicy = edges.some((e) => {
      if (e.to_step_id !== pStep.id) return false;
      const fromStep = steps.find((s) => s.id === e.from_step_id);
      return fromStep && fromStep.step_type?.toLowerCase() === 'policy_check';
    });
    if (!hasPrecedingPolicy) {
      issues.push(`Publish step "${pStep.name}" has no preceding policy check node`);
    }
  }

  const branchSteps = steps.filter((s) => s.step_type?.toLowerCase() === 'branch');
  for (const bStep of branchSteps) {
    const outEdges = edges.filter((e) => e.from_step_id === bStep.id);
    if (!outEdges.some((e) => e.default_path === true)) {
      warnings.push(`Branch step "${bStep.name}" has no default path`);
    }
    if (!outEdges.some((e) => e.fail_safe_path === true)) {
      warnings.push(`Branch step "${bStep.name}" has no fail-safe path`);
    }
  }

  let dependencyResults: any[] = [];
  try {
    const templateResult = await supabaseAdmin.from('workflow_versions').select('workflow_id').eq('id', versionId).single();
    if (templateResult.data?.workflow_id) {
      dependencyResults = await checkWorkflowDependencies(templateResult.data.workflow_id);
    }
  } catch {
    warnings.push('Could not check workflow dependencies');
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings,
    steps_count: steps.length,
    edges_count: edges.length,
    dependency_results: dependencyResults,
  };
}
