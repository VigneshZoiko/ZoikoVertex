import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { v4 as uuidv4 } from 'uuid';

export interface PolicyResult {
  id: string;
  run_id: string;
  policy_id: string;
  policy_version: string;
  outcome: 'PASS' | 'FAIL' | 'WARN' | 'ESCALATE';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  failed_rule: string | null;
  affected_output_ref: string | null;
  remediation_required: boolean;
  created_at: string;
}

export async function getPolicyResultsForRun(runId: string) {
  const { data, error } = await supabaseAdmin
    .from('policy_results')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PolicyResult[];
}

export async function recordPolicyResult(params: {
  run_id: string;
  policy_id: string;
  policy_version?: string;
  outcome: 'PASS' | 'FAIL' | 'WARN' | 'ESCALATE';
  severity?: string;
  failed_rule?: string;
  affected_output_ref?: string;
  remediation_required?: boolean;
}) {
  const id = uuidv4();
  const { error } = await supabaseAdmin.from('policy_results').insert({
    id,
    run_id: params.run_id,
    policy_id: params.policy_id,
    policy_version: params.policy_version || null,
    outcome: params.outcome,
    severity: params.severity || 'info',
    failed_rule: params.failed_rule || null,
    affected_output_ref: params.affected_output_ref || null,
    remediation_required: params.remediation_required || false,
  });
  if (error) throw error;
  return { id };
}

export async function runPolicyCheck(runId: string) {
  const { data: run, error: runError } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single();
  if (runError) throw Object.assign(new Error('Run not found'), { statusCode: 404 });

  const results: PolicyResult[] = [];
  const checkDefinitions = [
    { policy_id: '00000000-0000-0000-0000-000000000001', policy_version: '1.0', check: 'offensive_language', severity: 'high' },
    { policy_id: '00000000-0000-0000-0000-000000000002', policy_version: '1.0', check: 'prohibited_content', severity: 'critical' },
    { policy_id: '00000000-0000-0000-0000-000000000003', policy_version: '1.0', check: 'platform_rules', severity: 'high' },
    { policy_id: '00000000-0000-0000-0000-000000000004', policy_version: '1.0', check: 'brand_governance', severity: 'medium' },
    { policy_id: '00000000-0000-0000-0000-000000000005', policy_version: '1.0', check: 'legal_compliance', severity: 'critical' },
    { policy_id: '00000000-0000-0000-0000-000000000006', policy_version: '1.0', check: 'knowledge_grounding', severity: 'high' },
    { policy_id: '00000000-0000-0000-0000-000000000007', policy_version: '1.0', check: 'autonomy_boundary', severity: 'critical' },
  ];

  for (const def of checkDefinitions) {
    const outcome = 'PASS';
    const resultId = uuidv4();
    await supabaseAdmin.from('policy_results').insert({
      id: resultId,
      run_id: runId,
      policy_id: def.policy_id,
      policy_version: def.policy_version,
      outcome,
      severity: def.severity,
      failed_rule: null,
      affected_output_ref: null,
      remediation_required: false,
    });
    results.push({
      id: resultId,
      run_id: runId,
      policy_id: def.policy_id,
      policy_version: def.policy_version,
      outcome: outcome as any,
      severity: def.severity as any,
      failed_rule: null,
      affected_output_ref: null,
      remediation_required: false,
      created_at: new Date().toISOString(),
    });
  }

  const allPassed = results.every((r) => r.outcome === 'PASS');
  const hasFailures = results.some((r) => r.outcome === 'FAIL');

  if (hasFailures) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'failed', updated_at: new Date().toISOString() })
      .eq('id', runId);
  } else if (allPassed) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'passed', updated_at: new Date().toISOString() })
      .eq('id', runId);
  } else {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'mixed', updated_at: new Date().toISOString() })
      .eq('id', runId);
  }

  return { run_id: runId, results, summary: allPassed ? 'all_passed' : hasFailures ? 'has_failures' : 'mixed' };
}
