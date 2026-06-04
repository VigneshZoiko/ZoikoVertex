import { supabaseAdmin } from '../../shared/supabase';
import { ConstraintShadowService } from './ConstraintShadowService';
import { PromptAuditService } from './PromptAuditService';

export interface PDIResult {
  promptId: string;
  promptVersionId: string;
  pdiScore: number;
  pdiLevel: 'critical' | 'low' | 'moderate' | 'strong' | 'maximum';
  componentScores: {
    instructionClarity: number;
    boundaryStrength: number;
    constraintCoverage: number;
    adversarialRobustness: number;
    policyAlignment: number;
    evidenceCompleteness: number;
  };
  findings: string[];
  evaluatedAt: string;
}

function computePDILevel(score: number): PDIResult['pdiLevel'] {
  if (score >= 90) return 'maximum';
  if (score >= 75) return 'strong';
  if (score >= 55) return 'moderate';
  if (score >= 35) return 'low';
  return 'critical';
}

export class PromptDefensibilityIndexService {
  static async compute(
    promptId: string,
    promptVersionId: string,
    workspaceId: string,
  ): Promise<PDIResult> {
    const { data: prompt } = await supabaseAdmin
      .from('prompts')
      .select('id, risk_tier, status, linked_agent, knowledge_sources, tools_permitted')
      .eq('id', promptId)
      .single();

    const { data: version } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, body, variables_json, guardrails_json')
      .eq('id', promptVersionId)
      .single();

    const body = String(version?.body || '');
    const riskTier = String(prompt?.risk_tier || 'tier_2_medium');
    const findings: string[] = [];

    const instructionClarity = (() => {
      let score = 100;
      if (body.length < 100) { score -= 20; findings.push('Low instruction clarity: prompt body is short'); }
      if (!body.includes('You are') && !body.includes('you are')) { score -= 10; findings.push('Missing role definition'); }
      if (!body.includes('output')) { score -= 10; findings.push('No output specification'); }
      const stepIndicators = body.match(/\d+\.\s|step|first|then|finally/gi);
      if (!stepIndicators || stepIndicators.length < 2) { score -= 10; findings.push('No structured instruction steps'); }
      return Math.max(0, score);
    })();

    const boundaryStrength = (() => {
      let score = 100;
      const boundaries = ['do not', 'must not', 'never', 'only if', 'unless', 'always', 'required'];
      const found = boundaries.filter((b) => body.toLowerCase().includes(b)).length;
      score -= (3 - Math.min(found, 3)) * 15;
      if (found < 2) findings.push('Weak boundary constraints: add more do-not/must-not rules');
      return Math.max(0, score);
    })();

    const constraintCoverage = (() => {
      const rules = ConstraintShadowService.getRulesForTier(riskTier);
      const blockingRules = rules.filter((r) => r.severity === 'block').length;
      const totalRules = rules.length;
      if (totalRules === 0) return 0;
      const score = Math.round((blockingRules / Math.max(totalRules, 1)) * 50 + 50);
      if (score < 70) findings.push(`Constraint coverage is low: ${blockingRules}/${totalRules} blocking rules for tier ${riskTier}`);
      return score;
    })();

    const adversarialRobustness = (() => {
      let score = 80;
      const protections = [
        /ignore.*(?:above|previous)/i, /do not.*(?:disclose|reveal)/i,
        /system.*(?:prompt|instruction)/i, /role.*(?:bound|restrict)/i,
        /refuse|decline|reject/i,
      ];
      const found = protections.filter((p) => p.test(body)).length;
      score += found * 5;
      if (found < 2) { score -= 15; findings.push('Low adversarial robustness: add prompt injection protections'); }
      return Math.min(100, score);
    })();

    const policyAlignment = (() => {
      let score = 70;
      const hasPolicyRefs = /policy|rule|complian|regulat|standard/i.test(body);
      if (hasPolicyRefs) score += 15;
      const hasReviewTrigger = /review|approve|human|escalat/i.test(body);
      if (hasReviewTrigger) score += 15;
      if (!hasPolicyRefs) findings.push('No policy references found in prompt body');
      return Math.min(100, score);
    })();

    const evidenceCompleteness = await (async () => {
      let score = 60;
      try {
        const { count: evidenceCount } = await supabaseAdmin
          .from('prompt_evidence_links')
          .select('*', { count: 'exact', head: true })
          .eq('prompt_id', promptId);
        score += Math.min((evidenceCount || 0) * 5, 30);
        if (!evidenceCount || evidenceCount < 3) findings.push('Low evidence count: at least 3 evidence records recommended');
      } catch {
        score = 50;
      }
      return Math.min(100, score);
    })();

    const componentScores = {
      instructionClarity,
      boundaryStrength,
      constraintCoverage,
      adversarialRobustness,
      policyAlignment,
      evidenceCompleteness,
    };

    const weights = { instructionClarity: 0.25, boundaryStrength: 0.20, constraintCoverage: 0.20, adversarialRobustness: 0.15, policyAlignment: 0.10, evidenceCompleteness: 0.10 };
    const pdiScore = Math.round(
      (Object.entries(componentScores) as [keyof typeof weights, number][]).reduce(
        (sum, [key, score]) => sum + score * weights[key],
        0,
      ),
    );

    const pdiLevel = computePDILevel(pdiScore);

    await PromptAuditService.record({
      event_type: 'prompt.scorecard.generated',
      workspace_id: workspaceId,
      prompt_id: promptId,
      version_id: promptVersionId,
      reason: `PDI computed: ${pdiScore}/100 (${pdiLevel})`,
      risk_level: riskTier,
      after_state: { pdi_score: pdiScore, pdi_level: pdiLevel, component_scores: componentScores },
    });

    return {
      promptId,
      promptVersionId,
      pdiScore,
      pdiLevel,
      componentScores,
      findings,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
