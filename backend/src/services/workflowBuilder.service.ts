import { supabaseAdmin } from '../shared/supabase';

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
  if (!steps.some((s) => s.step_type === 'Trigger')) issues.push('Missing Trigger node');
  if (!steps.some((s) => s.step_type === 'End')) issues.push('Missing End node');
  if (!steps.some((s) => s.step_type === 'Evidence Capture')) warnings.push('No Evidence Capture node found');
  if (!steps.some((s) => s.step_type === 'Approval Gate')) warnings.push('No Approval Gate node found');

  const incompleteSteps = steps.filter((s) => !s.name || !s.owner_role);
  for (const s of incompleteSteps) {
    issues.push(`Step at sequence ${s.sequence} (${s.step_type}) is incomplete: missing name or owner_role`);
  }

  const stepsWithoutEdges = steps.filter((s) => !edges.some((e) => e.from_step_id === s.id || e.to_step_id === s.id));
  for (const s of stepsWithoutEdges) {
    issues.push(`Step ${s.name || s.step_type} at sequence ${s.sequence} has no connecting edges`);
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings,
    steps_count: steps.length,
    edges_count: edges.length,
  };
}
