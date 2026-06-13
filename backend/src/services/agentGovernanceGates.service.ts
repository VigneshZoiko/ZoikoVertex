 
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';
import { getAgentVersions } from './agentVersion.service';
import { getSafetyResults } from './agentSafetyPolicy.service';

const SERVICE = 'AgentGovernanceGates';

export const GOVERNANCE_GATES = [
  'identity',
  'scope',
  'prompt',
  'knowledge',
  'safety',
  'approval',
  'runtime',
  'evidence',
] as const;

export type GateType = typeof GOVERNANCE_GATES[number];

export interface GateStatus {
  gate_type: GateType;
  status: 'pending' | 'passed' | 'failed';
  passed_at: string | null;
  failed_reason: string | null;
  blocking: boolean;
}

export async function evaluateAllGates(agentId: string): Promise<{
  gates: GateStatus[];
  all_passed: boolean;
  blockers: string[];
}> {
  const gates: GateStatus[] = [];
  const blockers: string[] = [];

  try {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) return { gates: [], all_passed: false, blockers: ['Agent not found'] };

    // Identity Gate
    const identityOk = Boolean(agent.name && agent.primary_dri_id && agent.type && agent.risk_level);
    gates.push({
      gate_type: 'identity',
      status: identityOk ? 'passed' : 'failed',
      passed_at: identityOk ? new Date().toISOString() : null,
      failed_reason: identityOk ? null : 'Agent must have name, owner, brand, purpose, and risk tier',
      blocking: !identityOk,
    });
    if (!identityOk) blockers.push('Identity: Agent must have name, owner, brand, purpose, and risk tier');

    // Scope Gate
    const hasChannels = agent.linked_channels && agent.linked_channels.length > 0;
    const hasPermissions = agent.permitted_actions && agent.permitted_actions.length > 0;
    const scopeOk = Boolean(hasChannels && hasPermissions);
    gates.push({
      gate_type: 'scope',
      status: scopeOk ? 'passed' : 'failed',
      passed_at: scopeOk ? new Date().toISOString() : null,
      failed_reason: scopeOk ? null : 'Channels, workflows, permissions, and environment must be defined',
      blocking: !scopeOk,
    });
    if (!scopeOk) blockers.push('Scope: Channels, workflows, permissions, and environment must be defined');

    // Prompt Gate
    const hasPrompts = agent.linked_prompts && agent.linked_prompts.length > 0;
    gates.push({
      gate_type: 'prompt',
      status: hasPrompts ? 'passed' : 'failed',
      passed_at: hasPrompts ? new Date().toISOString() : null,
      failed_reason: hasPrompts ? null : 'Agent must use an approved prompt version with passing tests',
      blocking: !hasPrompts,
    });
    if (!hasPrompts) blockers.push('Prompt: Agent must use an approved prompt version');

    // Knowledge Gate
    const hasKnowledge = agent.linked_knowledge_sources && agent.linked_knowledge_sources.length > 0;
    gates.push({
      gate_type: 'knowledge',
      status: hasKnowledge ? 'passed' : 'failed',
      passed_at: hasKnowledge ? new Date().toISOString() : null,
      failed_reason: hasKnowledge ? null : 'Agent must use approved knowledge sources with access rights and freshness rules',
      blocking: !hasKnowledge,
    });
    if (!hasKnowledge) blockers.push('Knowledge: Agent must use approved knowledge sources');

    // Safety Gate
    const safetyResults = await getSafetyResults(agentId);
    const safetyPassed = safetyResults.length === 0 || safetyResults.every(r => r.pass_fail);
    gates.push({
      gate_type: 'safety',
      status: safetyPassed ? 'passed' : 'failed',
      passed_at: safetyPassed ? new Date().toISOString() : null,
      failed_reason: safetyPassed ? null : 'Offensive, prohibited, unsupported, confidential, or platform-policy checks failed',
      blocking: !safetyPassed,
    });
    if (!safetyPassed) blockers.push('Safety: Mandatory safety checks failed');

    // Approval Gate
    const approvalRequired = agent.approval_required;
    let approvalPassed = !approvalRequired;
    if (approvalRequired) {
      const { data: pendingApprovals } = await supabaseAdmin
        .from('agent_approvals')
        .select('id')
        .eq('agent_id', agentId)
        .eq('status', 'PENDING');
      approvalPassed = !pendingApprovals || pendingApprovals.length === 0;
    }
    gates.push({
      gate_type: 'approval',
      status: approvalPassed ? 'passed' : 'failed',
      passed_at: approvalPassed ? new Date().toISOString() : null,
      failed_reason: approvalPassed ? null : 'Required approvals must be obtained before deployment',
      blocking: !approvalPassed,
    });
    if (!approvalPassed) blockers.push('Approval: All required approvals must be obtained');

    // Runtime Gate
    const rtControls = agent.runtime_controls as Record<string, any> || {};
    const runtimeOk = Boolean(rtControls.rate_limit || rtControls.token_budget);
    gates.push({
      gate_type: 'runtime',
      status: runtimeOk ? 'passed' : 'failed',
      passed_at: runtimeOk ? new Date().toISOString() : null,
      failed_reason: runtimeOk ? null : 'Rate limits, tool scopes, schedules, logging, rollback, and emergency pause must be configured',
      blocking: !runtimeOk,
    });
    if (!runtimeOk) blockers.push('Runtime: Rate limits, tool scopes, and emergency pause must be configured');

    // Evidence Gate
    const evidenceVersions = await getAgentVersions(agentId);
    const evidenceOk = evidenceVersions.length > 0;
    gates.push({
      gate_type: 'evidence',
      status: evidenceOk ? 'passed' : 'failed',
      passed_at: evidenceOk ? new Date().toISOString() : null,
      failed_reason: evidenceOk ? null : 'Agent must create immutable evidence for creation, tests, approvals, and deployment',
      blocking: !evidenceOk,
    });
    if (!evidenceOk) blockers.push('Evidence: Evidence capture must be enabled and populated');

    const all_passed = gates.every(g => g.status === 'passed');

    await logToDatabase('info', SERVICE, `Governance gates evaluated for agent ${agentId}`, { all_passed, blockers_count: blockers.length });
    return { gates, all_passed, blockers };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to evaluate governance gates', { agentId, err });
    return { gates: [], all_passed: false, blockers: ['System error evaluating governance gates'] };
  }
}
