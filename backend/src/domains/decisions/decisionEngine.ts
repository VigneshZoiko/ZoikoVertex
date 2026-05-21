import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { RiskClassifier } from './riskClassifier';

export interface DecisionResult {
  decision_id: string;
  status: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  confidence_score: number;
  risk_score: number;
  decision_class: string;
  governance_cleared: boolean;
}

export interface IntentPayload {
  content?: string;
  platform?: string;
  risk_score?: number;
  risk_level?: string;
  creator_id?: string;
  [key: string]: unknown;
}

export interface RiskContext {
  level?: string;
  score?: number;
  factors?: string[];
  [key: string]: unknown;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  triggerCondition: (intent: IntentPayload, riskAssessment: RiskContext) => boolean;
  action: 'APPROVE' | 'REJECT' | 'ESCALATE';
  failureReason: string;
}

export const ENTERPRISE_POLICIES: PolicyRule[] = [
  {
    id: 'pol-financial-disclaimer',
    name: 'Regulated Financial Disclosure Policy',
    description: 'Enforces that forward-looking statements or earnings disclosures contain a standard liability disclaimer.',
    triggerCondition: (intent, _risk) => {
      const content = (intent.content || '').toLowerCase();
      const hasFinancialTerms = ['earnings', 'revenue', 'profit', 'investment', 'roi', 'stock'].some(t => content.includes(t));
      const hasDisclaimer = ['disclaimer', 'not financial advice', 'past performance', 'capital at risk'].some(t => content.includes(t));
      return hasFinancialTerms && !hasDisclaimer;
    },
    action: 'ESCALATE',
    failureReason: 'Regulated financial language detected without mandatory disclosure disclaimer.'
  },
  {
    id: 'pol-healthcare-claims',
    name: 'Healthcare Claim Substantiation Policy',
    description: 'Restricts medical cures or therapeutic efficacy assertions without clinical evidence referencing.',
    triggerCondition: (intent, _risk) => {
      const content = (intent.content || '').toLowerCase();
      const hasMedicalClaims = ['cure', 'remedy', 'treatment', 'fda approved', 'clinically proven'].some(t => content.includes(t));
      const hasEvidenceAnchor = ['source', 'evidence', 'study', 'clinical trial', 'http'].some(t => content.includes(t));
      return hasMedicalClaims && !hasEvidenceAnchor;
    },
    action: 'REJECT',
    failureReason: 'Assertion of medical/health benefit lacking clinical source citations.'
  },
  {
    id: 'pol-sovereign-lexicon',
    name: 'Linguistic Compliance Policy',
    description: 'Blocks posts with excessive violations of sovereign brand lexicon guidelines.',
    triggerCondition: (intent, risk) => {
      return risk.level === 'RESTRICTED' || !!(risk.factors && risk.factors.some((f: string) => f.includes('Brand Lexicon violated')));
    },
    action: 'ESCALATE',
    failureReason: 'Critical violation of brand sovereignty vocabulary protocols.'
  },
  {
    id: 'pol-platform-overflow',
    name: 'Platform Constraints Integrity Policy',
    description: 'Enforces hard length constraints matching specific target platform layouts.',
    triggerCondition: (intent, _risk) => {
      const platform = (intent.platform || '').toLowerCase();
      return platform === 'twitter' && (intent.content || '').length > 280;
    },
    action: 'REJECT',
    failureReason: 'Content length (character overflow) violates target social platform guidelines.'
  }
];

function classifyRisk(riskScore: number): { decision_class: string; status: 'APPROVED' | 'REJECTED' | 'ESCALATED' } {
  if (riskScore >= 80) return { decision_class: 'HIGH_RISK', status: 'REJECTED' };
  if (riskScore >= 50) return { decision_class: 'MEDIUM_RISK', status: 'ESCALATED' };
  return { decision_class: 'LOW_RISK', status: 'APPROVED' };
}

export async function evaluateIntent(
  intentId: string,
  orgId: string,
  workspaceId: string,
): Promise<DecisionResult> {
  const { data: intent, error: intentError } = await supabaseAdmin
    .from('publish_intents')
    .select('content, platform, risk_score, risk_level, creator_id')
    .eq('id', intentId)
    .single();

  if (intentError || !intent) throw new Error(`Intent ${intentId} not found`);

  // 1. Evaluate Advanced Interconnected Content Safety
  const safetyResult = await RiskClassifier.assessContentAdvanced(
    intent.content || '',
    intent.platform || 'linkedin',
    workspaceId,
    intent.creator_id
  );
  
  const riskAssessment = safetyResult.assessment;
  const riskScore = Math.max(intent.risk_score ?? 0, riskAssessment.score);

  // 1.5 Evaluate AI Faithfulness Score (Accountability Layer Requirement)
  // If Faithfulness Score falls below the threshold, route to Validator.
  const faithfulnessScore = 100 - riskScore; // Placeholder logic
  if (faithfulnessScore < 85) {
    await supabaseAdmin.from('publish_intents')
      .update({ 
         approval_level: 'REVIEWER -> VALIDATOR -> APPROVER'
      }).eq('id', intentId);
  }

  // 2. Evaluate Dynamic Enterprise Policies (Policy Center)
  const policyResults = ENTERPRISE_POLICIES.map(p => {
    const triggered = p.triggerCondition(intent, riskAssessment as unknown as RiskContext);
    return {
      policy_id: p.id,
      name: p.name,
      triggered,
      action: triggered ? p.action : 'PASS',
      reason: triggered ? p.failureReason : undefined
    };
  });

  // Calculate policy-driven decision overrides
  let status: 'APPROVED' | 'REJECTED' | 'ESCALATED' = 'APPROVED';
  let decision_class = 'POLICY_CLEARED';

  const rejectedPolicies = policyResults.filter(r => r.triggered && r.action === 'REJECT');
  const escalatedPolicies = policyResults.filter(r => r.triggered && r.action === 'ESCALATE');

  if (rejectedPolicies.length > 0) {
    status = 'REJECTED';
    decision_class = `POLICY_REJECTED: ${rejectedPolicies[0].name}`;
  } else if (escalatedPolicies.length > 0) {
    status = 'ESCALATED';
    decision_class = `POLICY_ESCALATED: ${escalatedPolicies[0].name}`;
  } else {
    // Fallback to standard risk classifier evaluation
    const baselineClassification = classifyRisk(riskScore);
    status = baselineClassification.status;
    decision_class = baselineClassification.decision_class;
  }

  const confidenceScore = Math.max(0, 100 - riskScore);
  const governance_cleared = status === 'APPROVED';

  let decision_id = `decision_${intentId}_${Date.now()}`;

  try {
    const { data: decision, error: decisionError } = await supabaseAdmin
      .from('decisions')
      .insert({
        intent_id: intentId,
        workspace_id: workspaceId,
        org_id: orgId,
        decision_type: 'CONTENT_PUBLISH',
        status,
        confidence_score: confidenceScore,
        risk_score: riskScore,
        decision_class,
        binding: true,
        governance_cleared,
      })
      .select('id')
      .single();

    if (!decisionError && decision) {
      decision_id = decision.id;

      const evaluationPayload = {
        decision_id: decision.id,
        intent_id: intentId,
        workspace_id: workspaceId,
        result: status,
        evaluated_at: new Date().toISOString(),
      };

      try {
        await supabaseAdmin.from('policy_evaluations').insert({
          ...evaluationPayload,
          metadata: {
            evaluated_policies: policyResults,
            active_policies_count: ENTERPRISE_POLICIES.length,
            triggered_policies_count: policyResults.filter(r => r.triggered).length,
            agent_compliance: safetyResult.agentCompliance
          }
        });
      } catch {
        await supabaseAdmin.from('policy_evaluations').insert(evaluationPayload);
      }

      await supabaseAdmin.from('governance_tokens').insert({
        decision_id: decision.id,
        intent_id: intentId,
        workspace_id: workspaceId,
        token_type: 'EXECUTION_CLEARANCE',
        granted: governance_cleared,
        issued_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.warn(
      { err, intentId },
      '[DecisionEngine] Governance DB unavailable — applying Resiliency Mode (fail-closed for elevated risk)',
    );

    // GAP FIX 4: Resiliency Mode — must NOT fail open.
    // Per Policy Center spec: "If policy status cannot be verified, ZoikoVertex must not
    // proceed autonomously." Only allow auto-pass for confirmed LOW risk items.
    const failSafeCleared = riskScore < 20 && decision_class === 'POLICY_CLEARED';
    return {
      decision_id,
      status: failSafeCleared ? 'APPROVED' : 'ESCALATED',
      confidence_score: confidenceScore,
      risk_score: riskScore,
      decision_class: failSafeCleared ? decision_class : 'RESILIENCY_MODE_ESCALATED',
      governance_cleared: failSafeCleared,
    };
  }

  return { decision_id, status, confidence_score: confidenceScore, risk_score: riskScore, decision_class, governance_cleared };
}
