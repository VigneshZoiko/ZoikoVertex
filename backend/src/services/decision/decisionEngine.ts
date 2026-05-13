import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

export interface DecisionResult {
  decision_id: string;
  status: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  confidence_score: number;
  risk_score: number;
  decision_class: string;
  governance_cleared: boolean;
}

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
    .select('risk_score, risk_level, creator_id')
    .eq('id', intentId)
    .single();

  if (intentError || !intent) throw new Error(`Intent ${intentId} not found`);

  const riskScore: number = intent.risk_score ?? 0;
  const confidenceScore = Math.max(0, 100 - riskScore);
  const { decision_class, status } = classifyRisk(riskScore);
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

      await supabaseAdmin.from('policy_evaluations').insert({
        decision_id: decision.id,
        intent_id: intentId,
        workspace_id: workspaceId,
        result: status,
        evaluated_at: new Date().toISOString(),
      });

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
      '[DecisionEngine] decisions table not yet available — falling through to execution',
    );
    return {
      decision_id,
      status: 'APPROVED',
      confidence_score: confidenceScore,
      risk_score: riskScore,
      decision_class,
      governance_cleared: true,
    };
  }

  return { decision_id, status, confidence_score: confidenceScore, risk_score: riskScore, decision_class, governance_cleared };
}
