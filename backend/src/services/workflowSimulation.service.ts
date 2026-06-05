import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function runSimulation(params: {
  workflow_version_id: string;
  scenario_name?: string;
  sample_input_ref?: string;
  created_by: string;
}) {
  const id = uuidv4();
  const sampleResults = {
    warnings: [] as Array<{ type: string; steps?: string[]; message?: string }>,
    blocks: [] as Array<{ type: string; steps?: string[]; message?: string }>,
    failed_steps: [] as string[],
  };

  const { data: steps, error: stepsError } = await supabaseAdmin
    .from('workflow_steps')
    .select('*')
    .eq('version_id', params.workflow_version_id)
    .order('sequence', { ascending: true });
  if (stepsError) throw stepsError;

  const missingPolicy = (steps || []).filter((s) => (s.required_policy_checks || []).length === 0);
  const missingEvidence = (steps || []).filter((s) => (s.required_evidence || []).length === 0);

  if (missingPolicy.length > 0) {
    sampleResults.warnings.push({ type: 'missing_policy_checks', steps: missingPolicy.map((s) => s.name) });
  }
  if (missingEvidence.length > 0) {
    sampleResults.warnings.push({ type: 'missing_evidence_requirements', steps: missingEvidence.map((s) => s.name) });
  }

  const hasApprovalGate = (steps || []).some((s) => s.step_type === 'Approval Gate');
  const hasTrigger = (steps || []).some((s) => s.step_type === 'Trigger');
  const hasEnd = (steps || []).some((s) => s.step_type === 'End');

  if (!hasTrigger) sampleResults.blocks.push({ type: 'missing_trigger', message: 'Workflow must have a Trigger node' });
  if (!hasEnd) sampleResults.blocks.push({ type: 'missing_end', message: 'Workflow must have an End node' });
  if (!hasApprovalGate) sampleResults.warnings.push({ type: 'no_approval_gate', message: 'No approval gate found in workflow' });

  const result = sampleResults.blocks.length > 0 ? 'BLOCKED' : sampleResults.warnings.length > 0 ? 'PASSED_WARNINGS' : 'PASSED';

  await supabaseAdmin.from('simulation_runs').insert({
    id,
    workflow_version_id: params.workflow_version_id,
    scenario_name: params.scenario_name || 'Standard Test',
    sample_input_ref: params.sample_input_ref || null,
    result,
    warnings: sampleResults.warnings,
    blocks: sampleResults.blocks,
    failed_steps: sampleResults.failed_steps,
    created_by: params.created_by,
  });

  return { id, result, warnings: sampleResults.warnings, blocks: sampleResults.blocks, failed_steps: sampleResults.failed_steps };
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
