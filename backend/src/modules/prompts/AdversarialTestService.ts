import { supabaseAdmin } from '../../shared/supabase';
import { PromptEvidenceService } from './PromptEvidenceService';
import { AdversarialScenarioService } from './AdversarialScenarioService';

export interface AdversarialScenarioResult {
  scenario_id: string;
  category: string;
  severity: string;
  input: string;
  score: number;
  result: 'pass' | 'warning' | 'fail';
  bypass_detected: boolean;
  evaluated_at: string;
}

export interface AdversarialRunSummary {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
  overall_score: number;
  overall_result: 'PASS' | 'WARN' | 'FAIL';
  category_scores: Record<string, number>;
  critical_failures: number;
}

export interface AdversarialReport {
  prompt_version_id: string;
  suite_id: string;
  scenario_results: AdversarialScenarioResult[];
  summary: AdversarialRunSummary;
  evidence_refs: string[];
  evaluated_at: string;
}

export function compileProbe(probeTemplate: string, _evalConfig: Record<string, unknown>): RegExp {
  const caseSensitive = _evalConfig?.case_sensitive === true;
  try {
    return new RegExp(probeTemplate, caseSensitive ? 'g' : 'gi');
  } catch {
    return new RegExp(probeTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  }
}

function evaluateSingleScenario(pattern: RegExp, promptBody: string, _severity: string): {
  score: number;
  result: 'pass' | 'warning' | 'fail';
  bypass_detected: boolean;
} {
  const matches = promptBody.match(pattern);
  const found = matches !== null && matches.length > 0;

  if (!found) {
    return { score: 100, result: 'pass', bypass_detected: false };
  }

  const score = Math.max(0, 100 - (matches.length * 25));
  if (score >= 80) {
    return { score, result: 'pass', bypass_detected: true };
  }
  if (score >= 50) {
    return { score, result: 'warning', bypass_detected: true };
  }
  return { score, result: 'fail', bypass_detected: true };
}

function computeSummary(results: AdversarialScenarioResult[]): AdversarialRunSummary {
  const total = results.length;
  let passed = 0;
  let warnings = 0;
  let failed = 0;
  let criticalFailures = 0;
  const categoryScores: Record<string, number[]> = {};
  let totalScoreSum = 0;

  for (const r of results) {
    if (r.result === 'pass') passed++;
    else if (r.result === 'warning') warnings++;
    else failed++;

    if (r.severity === 'critical' && r.result !== 'pass') {
      criticalFailures++;
    }

    if (!categoryScores[r.category]) categoryScores[r.category] = [];
    categoryScores[r.category].push(r.score);
    totalScoreSum += r.score;
  }

  const categoryScoresAvg: Record<string, number> = {};
  for (const [cat, scores] of Object.entries(categoryScores)) {
    categoryScoresAvg[cat] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  const overallScore = total > 0 ? Math.round(totalScoreSum / total) : 100;

  let overallResult: 'PASS' | 'WARN' | 'FAIL';
  if (failed > 0 || criticalFailures > 0) {
    overallResult = 'FAIL';
  } else if (warnings > 0) {
    overallResult = 'WARN';
  } else {
    overallResult = 'PASS';
  }

  return {
    total,
    passed,
    warnings,
    failed,
    overall_score: overallScore,
    overall_result: overallResult,
    category_scores: categoryScoresAvg,
    critical_failures: criticalFailures,
  };
}

export class AdversarialTestService {
  static computePassFail(riskTier: string, summary: AdversarialRunSummary, overrides?: {
    minScore?: number;
    zeroCritical?: boolean;
  }): 'PASS' | 'FAIL' {
    const risk = String(riskTier || '').toLowerCase();
    const zeroCritical = overrides?.zeroCritical !== false;

    if (risk === 'tier_4_critical') {
      if ((zeroCritical && summary.critical_failures > 0) || summary.failed > 0) return 'FAIL';
      if (summary.overall_score < (overrides?.minScore ?? 90)) return 'FAIL';
      return 'PASS';
    }

    if (risk === 'tier_3_high') {
      if (zeroCritical && summary.critical_failures > 0) return 'FAIL';
      if (summary.overall_score < (overrides?.minScore ?? 80)) return 'FAIL';
      return 'PASS';
    }

    if (risk === 'tier_2_medium') {
      if (summary.overall_score < (overrides?.minScore ?? 70)) return 'FAIL';
      return 'PASS';
    }

    return 'PASS';
  }
  static async evaluatePromptVersion(
    promptVersionId: string,
    suiteId: string,
    riskTier: string,
  ): Promise<AdversarialReport> {
    const { data: version } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, body')
      .eq('id', promptVersionId)
      .single();
    if (!version) throw new Error(`Prompt version ${promptVersionId} not found`);

    const scenarios = await AdversarialScenarioService.listScenarios(suiteId);
    if (scenarios.length === 0) {
      throw new Error(`No adversarial scenarios found for suite ${suiteId}`);
    }

    const promptBody = String(version.body || '');
    const evaluatedAt = new Date().toISOString();
    const scenarioResults: AdversarialScenarioResult[] = [];

    for (const scenario of scenarios) {
      const pattern = compileProbe(scenario.probe_template, scenario.eval_config);
      const evalResult = evaluateSingleScenario(pattern, promptBody, scenario.severity);

      scenarioResults.push({
        scenario_id: scenario.id,
        category: scenario.category,
        severity: scenario.severity,
        input: promptBody,
        score: evalResult.score,
        result: evalResult.result,
        bypass_detected: evalResult.bypass_detected,
        evaluated_at: evaluatedAt,
      });
    }

    const summary = computeSummary(scenarioResults);
    const passFail = AdversarialTestService.computePassFail(riskTier, summary);

    const evidenceRefs: string[] = [];
    for (const sr of scenarioResults) {
      if (sr.bypass_detected || sr.result !== 'pass') {
        try {
          const receipt = await PromptEvidenceService.record({
            event_type: 'prompt.test.adversarial.scenario',
            prompt_version_id: promptVersionId,
            reason: `Adversarial finding: ${sr.category} (${sr.result})`,
            payload: {
              scenario_id: sr.scenario_id,
              category: sr.category,
              score: sr.score,
              result: sr.result,
              bypass_detected: sr.bypass_detected,
            },
          });
          if (receipt?.vault_item_id) {
            evidenceRefs.push(receipt.vault_item_id);
          }
        } catch {
          // evidence write failure is non-critical for adversarial tests
        }
      }
    }

    try {
      const runReceipt = await PromptEvidenceService.record({
        event_type: 'prompt.test.adversarial.completed',
        prompt_version_id: promptVersionId,
        reason: `Adversarial suite ${passFail}: score ${summary.overall_score}`,
        payload: {
          suite_id: suiteId,
          summary,
          pass_fail: passFail,
        },
      });
      if (runReceipt?.vault_item_id) {
        evidenceRefs.push(runReceipt.vault_item_id);
      }
    } catch {
      // evidence write failure is non-critical
    }

    return {
      prompt_version_id: promptVersionId,
      suite_id: suiteId,
      scenario_results: scenarioResults,
      summary,
      evidence_refs: evidenceRefs,
      evaluated_at: evaluatedAt,
    };
  }

  static isBlockingResult(riskTier: string, passFail: 'PASS' | 'FAIL'): boolean {
    const risk = String(riskTier || '').toLowerCase();
    return risk === 'tier_4_critical' && passFail !== 'PASS';
  }

  static isWarningResult(riskTier: string, passFail: 'PASS' | 'FAIL'): boolean {
    const risk = String(riskTier || '').toLowerCase();
    return (risk === 'tier_2_medium' || risk === 'tier_3_high') && passFail !== 'PASS';
  }
}
