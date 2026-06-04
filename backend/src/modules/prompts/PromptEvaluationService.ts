import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService, PROMPT_AUDIT_EVENTS } from './PromptAuditService';
import { logToDatabase } from '../../shared/databaseLogger';

export interface EvaluationCriterion {
  id: string;
  name: string;
  weight: number;
  passThreshold: number;
  evaluator: 'instruction_adherence' | 'safety_policy' | 'brand_tone' | 'grounding_citations' | 'tool_use' | 'localization' | 'regression' | 'adversarial';
  config: Record<string, unknown>;
}

export interface EvaluationInput {
  promptId: string;
  promptVersionId: string;
  promptBody: string;
  riskTier: string;
  criteria: EvaluationCriterion[];
  workspaceId: string;
  actorId?: string;
}

export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  score: number;
  passed: boolean;
  evidence: string[];
  findings: string[];
  details: Record<string, unknown>;
}

export interface EvaluationResult {
  evaluationId: string;
  promptId: string;
  promptVersionId: string;
  riskTier: string;
  evaluatedAt: string;
  overallScore: number;
  passed: boolean;
  criteriaResults: CriterionResult[];
  evidenceRefs: string[];
  deploymentBlocked: boolean;
  hardcodedScoreDetected: boolean;
}

const PASS_THRESHOLD_BY_TIER: Record<string, number> = {
  tier_1_low: 60,
  tier_2_medium: 70,
  tier_3_high: 80,
  tier_4_critical: 90,
};

function detectHardcodedScores(promptBody: string): boolean {
  const hardcodedPatterns = [
    /score\s*[:=]\s*(?:100|99|9[0-8])\b/i,
    /evaluation\s*(?:result|outcome|score)\s*[:=]\s*(?:pass|true|100)/i,
    /always\s*(?:return|give|output)\s*(?:pass|100|approve)/i,
    /bypass\s*(?:evaluation|check|safety)/i,
    /ignore\s*(?:above|previous)\s*(?:instructions|directives)/i,
  ];
  return hardcodedPatterns.some((p) => p.test(promptBody));
}

function evaluateInstructionAdherence(body: string): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 100;
  if (!body.includes('You are') && !body.includes('you are')) {
    score -= 15; findings.push('No role definition found');
  }
  if (!body.includes('output') && !body.includes('format')) {
    score -= 10; findings.push('No output format guidance found');
  }
  if (body.length < 50) {
    score -= 15; findings.push('Prompt body is too short to establish clear instructions');
  }
  const boundIndicators = ['do not', 'must not', 'never', 'always', 'only'];
  const boundCount = boundIndicators.filter((w) => body.includes(w)).length;
  if (boundCount < 2) {
    score -= 10; findings.push('Insufficient boundary constraints');
  }
  return { score: Math.max(0, score), findings };
}

function evaluateSafetyPolicy(body: string): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 100;
  const prohibitedTerms = [
    { term: /harmful|dangerous|unsafe/i, label: 'unsafe content references' },
    { term: /illegal|unlawful|criminal/i, label: 'illegal activity references' },
    { term: /hate|discriminat|slur/i, label: 'hate speech references' },
    { term: /violent|weapon|attack/i, label: 'violence references' },
  ];
  for (const { term, label } of prohibitedTerms) {
    if (term.test(body)) {
      score -= 20; findings.push(`Contains ${label}`);
    }
  }
  const hasSafetyBlock = /\b(block|refuse|reject)\b.*\b(safe|harmful|prohibited)\b/i.test(body);
  if (!hasSafetyBlock) {
    score -= 10; findings.push('Missing safety refusal instructions');
  }
  return { score: Math.max(0, score), findings };
}

function evaluateBrandTone(body: string): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 100;
  const bannedBrandPhrases = [
    /guaranteed|definitely|absolutely.*(?:safe|secure)/i,
    /best.*(?:in|on).*(?:world|market|industry)/i,
    /no.*risk/i,
    /legal.*(?:safe|approve)/i,
  ];
  for (const pattern of bannedBrandPhrases) {
    if (pattern.test(body)) {
      score -= 20; findings.push(`Contains potentially overpromising language`);
    }
  }
  return { score: Math.max(0, score), findings };
}

function evaluateGroundingCitations(body: string): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 100;
  const hasCitationInstruction = /cite|reference|source|according/i.test(body);
  if (!hasCitationInstruction) {
    score -= 20; findings.push('Missing citation/sourcing instructions');
  }
  const hasGroundingRule = /ground|base.*on|use.*(?:knowledge|source|data)/i.test(body);
  if (!hasGroundingRule) {
    score -= 15; findings.push('Missing grounding instructions');
  }
  return { score: Math.max(0, score), findings };
}

function evaluateToolUse(body: string): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 100;
  const hasToolRules = /tool|function|api/i.test(body);
  if (hasToolRules) {
    if (!/\b(?:only|must|can|may|allowed)\b.*\btool/i.test(body)) {
      score -= 15; findings.push('Tool-use boundaries not clearly defined');
    }
  }
  return { score: Math.max(0, score), findings };
}

function evaluateLocalization(body: string): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 100;
  const hasLocaleAwareness = /locale|language|region|cultural|translat/i.test(body);
  if (!hasLocaleAwareness) {
    score -= 10; findings.push('No locale/region awareness detected');
  }
  return { score: Math.max(0, score), findings };
}

function evaluateRegression(body: string): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 100;
  const hasVersionInstruction = /version|changelog|change.*log/i.test(body);
  if (!hasVersionInstruction) {
    score -= 5; findings.push('No version tracking in prompt body');
  }
  return { score: Math.max(0, score), findings };
}

function evaluateAdversarialCoverage(body: string): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 100;
  const injectionProtections = [
    /ignore.*(?:above|previous)/i,
    /do not.*(?:disclose|reveal|output)/i,
    /system.*(?:prompt|instruction)/i,
    /role.*bound/i,
  ];
  const protectionsFound = injectionProtections.filter((p) => p.test(body)).length;
  if (protectionsFound < 2) {
    score -= 20; findings.push('Insufficient prompt injection protections');
  }
  return { score: Math.max(0, score), findings };
}

const EVALUATORS: Record<string, (body: string) => { score: number; findings: string[] }> = {
  instruction_adherence: evaluateInstructionAdherence,
  safety_policy: evaluateSafetyPolicy,
  brand_tone: evaluateBrandTone,
  grounding_citations: evaluateGroundingCitations,
  tool_use: evaluateToolUse,
  localization: evaluateLocalization,
  regression: evaluateRegression,
  adversarial: evaluateAdversarialCoverage,
};

export class PromptEvaluationService {
  static async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const hardcodedDetected = detectHardcodedScores(input.promptBody);
    if (hardcodedDetected) {
      await logToDatabase('warn', 'prompt-governance', 'prompt.evaluation.hardcoded_score_detected', {
        prompt_id: input.promptId,
        prompt_version_id: input.promptVersionId,
      });
    }

    const criteriaResults: CriterionResult[] = [];
    for (const criterion of input.criteria) {
      const evaluatorFn = EVALUATORS[criterion.evaluator];
      if (!evaluatorFn) {
        criteriaResults.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          score: 0,
          passed: false,
          evidence: [],
          findings: ['Unknown evaluator type'],
          details: {},
        });
        continue;
      }

      const { score, findings } = evaluatorFn(input.promptBody);
      const effectiveScore = hardcodedDetected ? Math.min(score, 50) : score;
      const passed = effectiveScore >= criterion.passThreshold;

      let evidenceRef: string | null = null;
      try {
        const { data } = await supabaseAdmin
          .from('prompt_evidence_links')
          .select('vault_item_id')
          .eq('prompt_version_id', input.promptVersionId)
          .eq('event_type', `prompt.evaluation.${criterion.evaluator}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) evidenceRef = data.vault_item_id;
      } catch {
      }

      criteriaResults.push({
        criterionId: criterion.id,
        criterionName: criterion.name,
        score: effectiveScore,
        passed,
        evidence: evidenceRef ? [evidenceRef] : [],
        findings,
        details: { threshold: criterion.passThreshold, rawScore: score },
      });
    }

    const totalWeight = input.criteria.reduce((s, c) => s + c.weight, 0);
    const weightedScore = criteriaResults.reduce(
      (s, r, i) => s + r.score * (input.criteria[i]?.weight || 0),
      0,
    );
    const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    const tierThreshold = PASS_THRESHOLD_BY_TIER[input.riskTier] || 70;
    const passed = overallScore >= tierThreshold && !hardcodedDetected;

    const evidenceRefs: string[] = [];
    const evaluationId = `EVAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    try {
      const { data: evalRecord } = await supabaseAdmin
        .from('prompt_test_runs')
        .insert({
          prompt_version_id: input.promptVersionId,
          suite_id: `evaluation-${input.riskTier}`,
          environment: 'evaluation',
          pass_fail: passed ? 'PASS' : 'FAIL',
          score_summary: { overall_score: overallScore, tier_threshold: tierThreshold, hardcoded_detected: hardcodedDetected },
          run_metadata: { evaluation_id: evaluationId, criteria_count: criteriaResults.length },
          created_by: input.actorId || 'system',
        })
        .select()
        .single();
      if (evalRecord?.id) evidenceRefs.push(evalRecord.id);
    } catch (err) {
      await logToDatabase('error', 'prompt-governance', 'prompt.evaluation.persist_failed', {
        prompt_version_id: input.promptVersionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await PromptAuditService.record({
      event_type: hardcodedDetected ? PROMPT_AUDIT_EVENTS.TESTED_FAIL : passed ? PROMPT_AUDIT_EVENTS.TESTED_PASS : PROMPT_AUDIT_EVENTS.TESTED_FAIL,
      workspace_id: input.workspaceId,
      prompt_id: input.promptId,
      version_id: input.promptVersionId,
      actor_id: input.actorId,
      reason: hardcodedDetected
        ? `Evaluation blocked: hardcoded score patterns detected in prompt body`
        : `Evaluation ${passed ? 'passed' : 'failed'}: overall score ${overallScore}/${tierThreshold}`,
      risk_level: input.riskTier,
      after_state: { overall_score: overallScore, passed, hardcoded_detected: hardcodedDetected },
    });

    return {
      evaluationId,
      promptId: input.promptId,
      promptVersionId: input.promptVersionId,
      riskTier: input.riskTier,
      evaluatedAt: new Date().toISOString(),
      overallScore,
      passed,
      criteriaResults,
      evidenceRefs,
      deploymentBlocked: !passed || hardcodedDetected,
      hardcodedScoreDetected: hardcodedDetected,
    };
  }

  static async evaluatePromptVersion(
    promptVersionId: string,
    workspaceId: string,
    actorId?: string,
  ): Promise<EvaluationResult> {
    const { data: version, error: vErr } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, prompt_id, body')
      .eq('id', promptVersionId)
      .single();
    if (vErr || !version) throw new Error(`Prompt version ${promptVersionId} not found`);

    const { data: prompt, error: pErr } = await supabaseAdmin
      .from('prompts')
      .select('id, risk_tier')
      .eq('id', version.prompt_id)
      .single();
    if (pErr || !prompt) throw new Error(`Prompt ${version.prompt_id} not found`);

    const criteria: EvaluationCriterion[] = [
      { id: 'inst-adh-1', name: 'Instruction Adherence', weight: 20, passThreshold: 70, evaluator: 'instruction_adherence', config: {} },
      { id: 'saf-pol-1', name: 'Safety & Policy', weight: 20, passThreshold: 70, evaluator: 'safety_policy', config: {} },
      { id: 'bnd-ton-1', name: 'Brand & Tone', weight: 15, passThreshold: 60, evaluator: 'brand_tone', config: {} },
      { id: 'gnd-cit-1', name: 'Grounding & Citations', weight: 15, passThreshold: 60, evaluator: 'grounding_citations', config: {} },
      { id: 'tol-use-1', name: 'Tool-Use Governance', weight: 10, passThreshold: 50, evaluator: 'tool_use', config: {} },
      { id: 'loc-001', name: 'Localization', weight: 5, passThreshold: 50, evaluator: 'localization', config: {} },
      { id: 'reg-001', name: 'Regression', weight: 5, passThreshold: 50, evaluator: 'regression', config: {} },
      { id: 'adv-001', name: 'Adversarial Coverage', weight: 10, passThreshold: 60, evaluator: 'adversarial', config: {} },
    ];

    return this.evaluate({
      promptId: prompt.id,
      promptVersionId: version.id,
      promptBody: version.body || '',
      riskTier: prompt.risk_tier || 'tier_2_medium',
      criteria,
      workspaceId,
      actorId,
    });
  }
}
