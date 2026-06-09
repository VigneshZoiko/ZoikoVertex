/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

// Aligned to the live DB enums/columns:
//   policy_outcome  : pass | warning | blocked | pending_review | not_applicable
//   severity_level  : normal | attention | warning | critical | blocked
//   policy_results columns: id, run_id, policy_id, policy_version, outcome,
//     severity, failed_rule, check_category, affected_output_ref,
//     remediation_required, remediation_path, platform, notes, created_at
export type PolicyOutcome = 'pass' | 'warning' | 'blocked' | 'not_evaluated';
export type PolicySeverity = 'normal' | 'attention' | 'warning' | 'critical' | 'blocked';

export interface PolicyResult {
  id: string;
  run_id: string;
  policy_id: string | null;
  policy_version: string | null;
  outcome: PolicyOutcome | string;
  severity: PolicySeverity | string;
  failed_rule: string | null;
  check_category: string | null;
  affected_output_ref: string | null;
  remediation_required: boolean;
  remediation_path: string | null;
  platform: string | null;
  notes: string | null;
  created_at: string;
}

type PolicyEvaluation = {
  policy_id: string;
  policy_version: string;
  category: string;
  outcome: PolicyOutcome;
  severity: PolicySeverity;
  failed_rule: string | null;
  remediation_path: string | null;
  platform: string | null;
  remediation_required: boolean;
};

const POLICY_ENGINE_VERSION = 'operations-local-1.1';

// ── Fail-Closed Guard ───────────────────────────────────────────────────────
// Blocks policy evaluation when the engine state makes evaluation unsafe.
// G5 fix: fail-closed on missing/empty/malformed run data or engine misconfig.
export interface FailClosedGuardResult {
  blocked: boolean;
  reason: string | null;
  outcome: PolicyOutcome;
}

export function failClosedGuard(run: Record<string, unknown> | null | undefined): FailClosedGuardResult {
  // No run at all — cannot evaluate.
  if (!run) {
    return { blocked: true, reason: 'Run not found or not provided', outcome: 'not_evaluated' };
  }

  // Engine explicitly disabled — fail closed, not open.
  if (process.env.OPERATIONS_POLICY_ENGINE_DISABLED === 'true') {
    return { blocked: true, reason: 'Policy engine is disabled by configuration', outcome: 'not_evaluated' };
  }

  // Run has no task objective, agent name, or workflow — missing critical evaluation input.
  if (!run.task_objective && !run.workflow_name && !run.agent_name) {
    return { blocked: true, reason: 'Run lacks task_objective, workflow_name, and agent_name — insufficient data for evaluation', outcome: 'not_evaluated' };
  }

  // Environment is missing — we cannot determine scope of evaluation.
  if (!run.environment) {
    return { blocked: true, reason: 'Run environment is not set — cannot determine evaluation scope', outcome: 'not_evaluated' };
  }

  return { blocked: false, reason: null, outcome: 'pass' };
}

// ---------------------------------------------------------------------------
// Detection keyword groups.
// These mirror the check categories defined in the implementation workflow
// doc (Phase 7 — Risk Scoring: Legal, Financial, Healthcare, Political,
// Controversial) plus the Agent Operations spec Section 8 categories
// (offensive language, platform, brand, grounding, autonomy). Every group is
// evaluated on each run so the Policy panel always presents the full set of
// checks — passing or failing.
// ---------------------------------------------------------------------------
const OFFENSIVE_PATTERNS = [
  /\bslur\b/i, /\bhate speech\b/i, /\bharass/i,
  /\bracis(m|t)\b/i, /\bbigot/i, /\bn-word\b/i, /\bsupremacis/i,
];
const SEXUAL_PATTERNS = [
  /\bsexually explicit\b/i, /\bpornograph/i, /\bnsfw\b/i, /\bxxx\b/i,
  /\bexplicit (?:sexual|adult) content\b/i, /\bnude(s|ity)?\b/i,
];
const LEGAL_PATTERNS = [
  /\bguaranteed returns?\b/i, /\bcure(s|d)?\b/i, /\brisk[- ]free\b/i, /\bprivate data\b/i,
  /\blawsuit\b/i, /\bliability\b/i, /\bregulation\b/i, /\bcompliance\b/i,
];
const FINANCIAL_PATTERNS = [
  /\bearnings\b/i, /\bstock\b/i, /\bSEC\b/, /\bacquisition\b/i, /\binsider\b/i,
];
const HEALTHCARE_PATTERNS = [
  /\bdrug\b/i, /\bdiagnosis\b/i, /\bFDA\b/, /\bprescription\b/i,
  /\bclinically proven\b/i, /\btreats?\b/i, /\bheals?\b/i,
];
const POLITICAL_PATTERNS = [
  /\belection\b/i, /\bcandidate\b/i, /\bgovernment\b/i, /\bballot\b/i, /\bvoting\b/i,
];
const CONTROVERSIAL_PATTERNS = [
  /\babortion\b/i, /\bgun(s)?\b/i, /\breligion\b/i, /\bdiscrimination\b/i,
];

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

  const platformRuleHit = channel === 'x' && text.length > 280;
  const brandHit = includesAny(text, [/\boff brand\b/i, /\bcompetitor\b/i]);
  const groundingHit = evidenceStatus === 'failed' || evidenceStatus === 'partial';
  const autonomyHit = environment !== 'production' && includesAny(text, [/\bpublish\b/i, /\bexternal action\b/i]);

  const evaluations: PolicyEvaluation[] = [
    {
      policy_id: '00000000-0000-0000-0000-000000000001',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'offensive_language',
      outcome: includesAny(text, OFFENSIVE_PATTERNS) ? 'blocked' : 'pass',
      severity: 'critical',
      failed_rule: 'Offensive, hateful, or racist language detected',
      remediation_path: 'Remove the flagged language before any external publishing.',
      platform: channel || null,
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000008',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'sexual_content',
      outcome: includesAny(text, SEXUAL_PATTERNS) ? 'blocked' : 'pass',
      severity: 'critical',
      failed_rule: 'Sexually explicit or adult content detected',
      remediation_path: 'Remove sexual/adult content; it cannot be published on brand channels.',
      platform: channel || null,
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000002',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'legal_compliance',
      outcome: includesAny(text, LEGAL_PATTERNS) ? 'blocked' : 'pass',
      severity: 'critical',
      failed_rule: 'Potential regulated, privacy, or unsupported legal claim',
      remediation_path: 'Route to legal/compliance approver; attach verified source or remove the claim.',
      platform: channel || null,
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000009',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'financial_disclosure',
      outcome: includesAny(text, FINANCIAL_PATTERNS) ? 'warning' : 'pass',
      severity: 'attention',
      failed_rule: 'Financial / market-sensitive reference detected',
      remediation_path: 'Route for disclosure review before publishing financial or market claims.',
      platform: channel || null,
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000010',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'healthcare_claims',
      outcome: includesAny(text, HEALTHCARE_PATTERNS) ? 'blocked' : 'pass',
      severity: 'critical',
      failed_rule: 'Regulated healthcare or medical claim detected',
      remediation_path: 'Route to compliance; medical/health claims require approved evidence or removal.',
      platform: channel || null,
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000011',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'political_content',
      outcome: includesAny(text, POLITICAL_PATTERNS) ? 'warning' : 'pass',
      severity: 'attention',
      failed_rule: 'Political or electoral reference detected',
      remediation_path: 'Route for governance review; political content may breach platform/brand rules.',
      platform: channel || null,
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000012',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'controversial_sensitive',
      outcome: includesAny(text, CONTROVERSIAL_PATTERNS) ? 'warning' : 'pass',
      severity: 'attention',
      failed_rule: 'Controversial or culturally sensitive topic detected',
      remediation_path: 'Route to governance/brand review before publishing sensitive-topic content.',
      platform: channel || null,
      remediation_required: true,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000003',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'platform_rules',
      outcome: platformRuleHit ? 'warning' : 'pass',
      severity: 'attention',
      failed_rule: 'Platform-specific length or metadata rule warning',
      remediation_path: 'Shorten or adapt the output for the target platform.',
      platform: channel || null,
      remediation_required: platformRuleHit,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000004',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'brand_governance',
      outcome: brandHit ? 'warning' : 'pass',
      severity: 'attention',
      failed_rule: 'Brand-sensitive wording or competitor reference detected',
      remediation_path: 'Route to Brand Governance Lead for review or request revision.',
      platform: channel || null,
      remediation_required: brandHit,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000005',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'knowledge_grounding',
      outcome: groundingHit ? 'warning' : 'pass',
      severity: 'warning',
      failed_rule: 'Evidence capture is incomplete for grounded output',
      remediation_path: 'Hold final evidence-ready label until artifacts are complete.',
      platform: channel || null,
      remediation_required: groundingHit,
    },
    {
      policy_id: '00000000-0000-0000-0000-000000000006',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'autonomy_boundary',
      outcome: autonomyHit ? 'blocked' : 'pass',
      severity: 'critical',
      failed_rule: 'Autonomous external action attempted outside production authority',
      remediation_path: 'Stop or escalate the run for autonomy review.',
      platform: channel || null,
      remediation_required: autonomyHit,
    },
  ];

  if (['failed', 'mixed', 'blocked', 'policy_blocked'].includes(policyResult)) {
    evaluations.push({
      policy_id: '00000000-0000-0000-0000-000000000007',
      policy_version: POLICY_ENGINE_VERSION,
      category: 'upstream_policy_result',
      outcome: 'blocked',
      severity: 'blocked',
      failed_rule: `Run already reports policy result: ${policyResult}`,
      remediation_path: 'Fail-closed until the upstream policy state is remediated.',
      platform: channel || null,
      remediation_required: true,
    });
  }

  // For PASS results, null out the failure-only fields.
  return evaluations.map((evaluation) =>
    evaluation.outcome === 'pass'
      ? { ...evaluation, failed_rule: null, remediation_path: null, remediation_required: false }
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
  policy_id?: string;
  policy_version?: string;
  outcome: PolicyOutcome;
  severity?: PolicySeverity;
  failed_rule?: string;
  check_category?: string;
  affected_output_ref?: string;
  remediation_required?: boolean;
  remediation_path?: string;
  platform?: string;
}) {
  const id = uuidv4();
  const isPass = params.outcome === 'pass';
  const { error } = await supabaseAdmin.from('policy_results').insert({
    id,
    run_id: params.run_id,
    policy_id: params.policy_id || null,
    policy_version: params.policy_version || POLICY_ENGINE_VERSION,
    outcome: params.outcome,
    severity: params.severity || 'normal',
    failed_rule: isPass ? null : params.failed_rule || null,
    check_category: isPass ? null : params.check_category || null,
    affected_output_ref: params.affected_output_ref || null,
    remediation_required: params.remediation_required || false,
    remediation_path: isPass ? null : params.remediation_path || null,
    platform: params.platform || null,
    notes: POLICY_ENGINE_VERSION,
  });
  if (error) throw error;
  return { id };
}

export async function runPolicyCheck(runId: string) {
  const { data: run, error: runError } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle();
  if (runError) throw runError;
  if (!run) throw Object.assign(new Error('Run not found'), { statusCode: 404 });

  const health = getPolicyEngineHealth();
  if (!health.healthy) {
    // Fail closed: block external actions when the engine is unavailable.
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'not_evaluated', status: 'POLICY_BLOCKED', updated_at: new Date().toISOString() })
      .eq('id', runId);
    throw Object.assign(new Error('Policy engine unavailable; external actions are blocked fail-closed'), {
      statusCode: 503,
      code: 'POLICY_ENGINE_UNAVAILABLE',
    });
  }

  // Apply fail-closed guard: if the run data is incomplete/malformed, record
  // not_evaluated results rather than silently passing (G5/G6 fix).
  const guardResult = failClosedGuard(run as Record<string, unknown>);
  if (guardResult.blocked) {
    // Record a not_evaluated policy result for the audit trail.
    const resultId = uuidv4();
    const row = {
      id: resultId,
      run_id: runId,
      policy_id: null,
      policy_version: POLICY_ENGINE_VERSION,
      outcome: 'not_evaluated' as PolicyOutcome,
      severity: 'blocked' as PolicySeverity,
      failed_rule: guardResult.reason,
      check_category: 'system_integrity',
      affected_output_ref: null,
      remediation_required: true,
      remediation_path: 'Provide complete run data (task objective, environment) and re-check policy.',
      platform: null,
      notes: `${POLICY_ENGINE_VERSION} — fail-closed guard`,
    };
    const { error: insertError } = await supabaseAdmin.from('policy_results').insert(row);
    if (insertError) throw insertError;

    // Mark the run as not_evaluated / POLICY_BLOCKED so downstream systems
    // know evaluation was skipped due to safety, not because it passed.
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'not_evaluated', status: 'POLICY_BLOCKED', updated_at: new Date().toISOString() })
      .eq('id', runId);

    // Write a runtime control action so the audit trail records the block.
    const { recordRuntimeControlAction } = await import('./operationsRuntimeControl.service');
    await recordRuntimeControlAction({
      run_id: runId,
      action_type: 'policy_block',
      requested_by: 'system',
      reason: `Fail-closed guard blocked policy evaluation: ${guardResult.reason}`,
      impact_scope: 'policy_evaluation',
      result: 'blocked',
    });

    return {
      run_id: runId,
      health,
      results: [{ ...row, created_at: new Date().toISOString() } as PolicyResult],
      summary: 'fail_closed_not_evaluated',
      guard_message: guardResult.reason,
    };
  }

  const results: PolicyResult[] = [];
  const checkDefinitions = evaluateRunPolicy(run as Record<string, unknown>);

  for (const def of checkDefinitions) {
    const resultId = uuidv4();
    const row = {
      id: resultId,
      run_id: runId,
      policy_id: def.policy_id,
      policy_version: def.policy_version,
      outcome: def.outcome,
      severity: def.severity,
      failed_rule: def.failed_rule,
      check_category: def.outcome === 'pass' ? null : def.category,
      affected_output_ref: null as string | null,
      remediation_required: def.remediation_required,
      remediation_path: def.remediation_path,
      platform: def.platform,
      notes: POLICY_ENGINE_VERSION,
    };
    const { error } = await supabaseAdmin.from('policy_results').insert(row);
    if (error) throw error;
    results.push({ ...row, created_at: new Date().toISOString() } as PolicyResult);
  }

  const allPassed = results.every((r) => r.outcome === 'pass');
  const hasFailures = results.some((r) => r.outcome === 'blocked');
  const hasWarnings = results.some((r) => r.outcome === 'warning');

  if (hasFailures) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'blocked', status: 'POLICY_BLOCKED', updated_at: new Date().toISOString() })
      .eq('id', runId);
  } else if (allPassed) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'pass', updated_at: new Date().toISOString() })
      .eq('id', runId);
  } else if (hasWarnings) {
    await supabaseAdmin
      .from('agent_runs')
      .update({ policy_result: 'warning', updated_at: new Date().toISOString() })
      .eq('id', runId);
  }

  return {
    run_id: runId,
    health,
    results,
    summary: allPassed ? 'all_passed' : hasFailures ? 'has_blocking_failures' : 'has_warnings',
  };
}
