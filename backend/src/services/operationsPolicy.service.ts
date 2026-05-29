/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface PolicyResult {
  id: string;
  run_id: string;
  policy_id: string;
  policy_version: string;
  outcome: 'PASS' | 'WARNING' | 'BLOCKED' | 'ESCALATE';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  failed_rule: string | null;
  failed_category?: string | null;
  platform_impact?: string | null;
  source_policy?: string | null;
  affected_output_ref: string | null;
  remediation_required: boolean;
  created_at: string;
}

type PolicyOutcome = PolicyResult['outcome'];

type PolicyEvaluation = {
  policy_id: string;
  policy_version: string;
  category: string;
  outcome: PolicyOutcome;
  severity: PolicyResult['severity'];
  failed_rule: string | null;
  platform_impact: string | null;
  remediation_required: boolean;
};

const POLICY_ENGINE_VERSION = 'operations-local-1.0';

export function getPolicyEngineHealth() {
  const disabled = process.env.OPERATIONS_POLICY_ENGINE_DISABLED === 'true';
  return {
    healthy: !disabled,
    mode: disabled ? 'disabled' : 'local_deterministic',
    version: POLICY_ENGINE_VERSION,
  };
}

function includesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function evaluateRunPolicy(run: Record<string, unknown>): PolicyEvaluation[] {
  const text = [
    run.task_objective,
    run.current_step,
    run.workflow_name,
    run.agent_name,
    run.channel,
    (run as any).output_snapshot,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const channel = String(run.channel || '').toLowerCase();
  const environment = String(run.environment || '').toLowerCase();
  const policyResult = String(run.policy_result || '').toLowerCase();
  const evidenceStatus = String(run.evidence_status || '').toLowerCase();

  const evaluations: PolicyEvaluation[] = [
    {
      policy_id: '00000000-0000-0000-0000-000000000001',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'offensive_language',
      outcome: includesAny(text, [/\bslur\b/i, /\bhate speech\b/i, /\bharass/i]) ? 'BLOCKED' : 'PASS',
      severity: 'high',
      failed_rule: 'Offensive or prohibited language detected',
      platform_impact: 'External publishing blocked until language is remediated',
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000002',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'legal_compliance',
      outcome: includesAny(text, [/\bguaranteed returns?\b/i, /\bcure(s|d)?\b/i, /\brisk[- ]free\b/i, /\bprivate data\b/i]) ? 'BLOCKED' : 'PASS',
      severity: 'critical',
      failed_rule: 'Potential regulated, privacy, or unsupported legal claim',
      platform_impact: 'Legal/compliance approval required before continuation',
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000003',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'platform_rules',
      outcome: channel === 'x' && text.length > 280 ? 'WARNING' : 'PASS',
      severity: 'medium',
      failed_rule: 'Platform-specific length or metadata rule warning',
      platform_impact: 'Reviewer should shorten or adapt output for target platform',
      remediation_required: channel === 'x' && text.length > 280,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000004',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'brand_governance',
      outcome: includesAny(text, [/\boff brand\b/i, /\bcompetitor\b/i]) ? 'WARNING' : 'PASS',
      severity: 'medium',
      failed_rule: 'Brand-sensitive wording or competitor reference detected',
      platform_impact: 'Brand governance review recommended',
      remediation_required: includesAny(text, [/\boff brand\b/i, /\bcompetitor\b/i]),
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000005',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'knowledge_grounding',
      outcome: evidenceStatus === 'failed' || evidenceStatus === 'partial' ? 'WARNING' : 'PASS',
      severity: 'high',
      failed_rule: 'Evidence capture is incomplete for grounded output',
      platform_impact: 'Hold final evidence-ready label until artifacts are complete',
      remediation_required: evidenceStatus === 'failed' || evidenceStatus === 'partial',
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000006',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'autonomy_boundary',
      outcome: environment !== 'production' && includesAny(text, [/\bpublish\b/i, /\bexternal action\b/i]) ? 'BLOCKED' : 'PASS',
      severity: 'critical',
      failed_rule: 'Autonomous external action attempted outside production authority',
      platform_impact: 'Run must be stopped or escalated for autonomy review',
      remediation_required: environment !== 'production' && includesAny(text, [/\bpublish\b/i, /\bexternal action\b/i]),
    },
  ];

  if (['failed', 'mixed', 'blocked', 'policy_blocked'].includes(policyResult)) {
    evaluations.push({
      policy_id: '00000000-0000-0000-0000-000000000007',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'upstream_policy_result',
      outcome: 'BLOCKED',
      severity: 'critical',
      failed_rule: `Run already reports policy result: ${policyResult}`,
      platform_impact: 'Fail-closed until upstream policy state is remediated',
      remediation_required: true,
    });
  }

  return evaluations.map((evaluation) =>
    evaluation.outcome === 'PASS'
      ? { ...evaluation, failed_rule: null, platform_impact: null, remediation_required: false }
      : evaluation,
  );
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
  outcome: PolicyOutcome;
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
    failed_category: params.outcome === 'PASS' ? null : params.policy_id,
    platform_impact: null,
    source_policy: POLICY_ENGINE_VERSION,
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

  const health = getPolicyEngineHealth();
  if (!health.healthy) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'blocked', status: 'POLICY_BLOCKED', updated_at: new Date().toISOString() })
      .eq('id', runId);
    throw Object.assign(new Error('Policy engine unavailable; external actions are blocked fail-closed'), {
      statusCode: 503,
      code: 'POLICY_ENGINE_UNAVAILABLE',
    });
  }

  const results: PolicyResult[] = [];
  const checkDefinitions = evaluateRunPolicy(run as Record<string, unknown>);

  for (const def of checkDefinitions) {
    const resultId = uuidv4();
    await supabaseAdmin.from('policy_results').insert({
      id: resultId,
      run_id: runId,
      policy_id: def.policy_id,
      policy_version: def.policy_version,
      outcome: def.outcome,
      severity: def.severity,
      failed_rule: def.failed_rule,
      failed_category: def.outcome === 'PASS' ? null : def.category,
      platform_impact: def.platform_impact,
      source_policy: POLICY_ENGINE_VERSION,
      affected_output_ref: null,
      remediation_required: def.remediation_required,
    });
    results.push({
      id: resultId,
      run_id: runId,
      policy_id: def.policy_id,
      policy_version: def.policy_version,
      outcome: def.outcome,
      severity: def.severity,
      failed_rule: def.failed_rule,
      failed_category: def.outcome === 'PASS' ? null : def.category,
      platform_impact: def.platform_impact,
      source_policy: POLICY_ENGINE_VERSION,
      affected_output_ref: null,
      remediation_required: def.remediation_required,
      created_at: new Date().toISOString(),
    });
  }

  const allPassed = results.every((r) => r.outcome === 'PASS');
  const hasFailures = results.some((r) => r.outcome === 'BLOCKED' || r.outcome === 'ESCALATE');
  const hasWarnings = results.some((r) => r.outcome === 'WARNING');

  if (hasFailures) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'blocked', status: 'POLICY_BLOCKED', updated_at: new Date().toISOString() })
      .eq('id', runId);
  } else if (allPassed) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'passed', updated_at: new Date().toISOString() })
      .eq('id', runId);
  } else if (hasWarnings) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'warning', updated_at: new Date().toISOString() })
      .eq('id', runId);
  }

  return { run_id: runId, health, results, summary: allPassed ? 'all_passed' : hasFailures ? 'has_blocking_failures' : 'has_warnings' };
}
