import { supabaseAdmin } from '../../shared/supabase';
import { PromptApprovalPolicyService } from './PromptApprovalPolicyService';
import { DeploymentGateService } from './DeploymentGateService';
import { AdversarialTestService } from './AdversarialTestService';
import { GovernanceDriftService } from './services/GovernanceDriftService';
import { PromptBindingPolicyService } from './PromptBindingPolicyService';
import { PromptTestService } from './PromptTestService';
import { PromptAuditService } from './PromptAuditService';

export type SimulationType =
  | 'approval_rule'
  | 'risk_tier_threshold'
  | 'deployment_rule'
  | 'adversarial_policy'
  | 'drift_tolerance'
  | 'binding_policy';

export interface SimulationInput {
  workspace_id: string;
  simulation_type: SimulationType;
  parameters: Record<string, unknown>;
  prompt_id?: string;
  actor_id?: string;
  actor_role?: string;
}

export interface SimBlockingIssue {
  type: string;
  detail: string;
  blocking: boolean;
}

export interface PromptImpactAssessment {
  prompt_id: string;
  title: string;
  current_risk_tier: string;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  affected_versions: string[];
  expected_impact: string;
  blocking_issues: SimBlockingIssue[];
  recommended_action: string;
}

export interface SimulationReport {
  simulation_type: SimulationType;
  input_parameters: Record<string, unknown>;
  generated_at: string;
  workspace_id: string;
  total_prompts_scanned: number;
  prompts_affected: number;
  prompts_unaffected: number;
  per_prompt_impacts: PromptImpactAssessment[];
  summary_by_severity: Record<string, number>;
  warnings: string[];
}

export class PolicySimulationService {
  static async simulate(input: SimulationInput): Promise<SimulationReport> {
    const { workspace_id, simulation_type, parameters, prompt_id, actor_id, actor_role } = input;

    let promptsData: any[];
    if (prompt_id) {
      const { data } = await supabaseAdmin
        .from('prompts')
        .select('*')
        .eq('id', prompt_id)
        .eq('workspace_id', workspace_id)
        .maybeSingle();
      promptsData = data ? [data] : [];
    } else {
      const { data } = await supabaseAdmin
        .from('prompts')
        .select('*')
        .eq('workspace_id', workspace_id);
      promptsData = data || [];
    }

    const totalPromptsScanned = promptsData.length;
    const perPromptImpacts: PromptImpactAssessment[] = [];
    const summaryBySeverity: Record<string, number> = { none: 0, low: 0, medium: 0, high: 0, critical: 0 };
    const warnings: string[] = [];

    for (const p of promptsData) {
      const impact = await this.evaluatePrompt(p, simulation_type, parameters, workspace_id, warnings);
      perPromptImpacts.push(impact);
      summaryBySeverity[impact.severity] = (summaryBySeverity[impact.severity] || 0) + 1;
    }

    const promptsAffected = perPromptImpacts.filter((i) => i.severity !== 'none').length;

    await PromptAuditService.record({
      event_type: 'prompt.policy.simulation.completed',
      workspace_id,
      prompt_id: prompt_id || undefined,
      actor_id,
      actor_role,
      reason: `Policy simulation ${simulation_type}: ${promptsAffected}/${totalPromptsScanned} prompts affected`,
      risk_level: Object.entries(summaryBySeverity).filter(([_, v]) => v > 0).map(([k]) => k).reverse()[0] || 'low',
      after_state: {
        simulation_type,
        prompts_scanned: totalPromptsScanned,
        prompts_affected: promptsAffected,
      },
    });

    return {
      simulation_type,
      input_parameters: parameters,
      generated_at: new Date().toISOString(),
      workspace_id,
      total_prompts_scanned: totalPromptsScanned,
      prompts_affected: promptsAffected,
      prompts_unaffected: totalPromptsScanned - promptsAffected,
      per_prompt_impacts: perPromptImpacts,
      summary_by_severity: summaryBySeverity,
      warnings,
    };
  }

  private static async evaluatePrompt(
    prompt: any,
    simulationType: SimulationType,
    parameters: Record<string, unknown>,
    workspaceId: string,
    warnings: string[],
  ): Promise<PromptImpactAssessment> {
    const promptId = prompt.id;
    const title = prompt.name || promptId;
    const riskTier = String(prompt.risk_tier || 'tier_1_low').toLowerCase();

    switch (simulationType) {
      case 'approval_rule':
        return this.evaluateApprovalRule(prompt, parameters, warnings);
      case 'risk_tier_threshold':
        return this.evaluateRiskTierThreshold(prompt, parameters, workspaceId, warnings);
      case 'deployment_rule':
        return this.evaluateDeploymentRule(prompt, parameters, workspaceId, warnings);
      case 'adversarial_policy':
        return this.evaluateAdversarialPolicy(prompt, parameters, workspaceId, warnings);
      case 'drift_tolerance':
        return this.evaluateDriftTolerance(prompt, parameters, workspaceId, warnings);
      case 'binding_policy':
        return this.evaluateBindingPolicy(prompt, parameters, workspaceId, warnings);
      default:
        return {
          prompt_id: promptId,
          title,
          current_risk_tier: riskTier,
          severity: 'none',
          affected_versions: [],
          expected_impact: 'Unknown simulation type.',
          blocking_issues: [],
          recommended_action: '',
        };
    }
  }

  // ─── Approval Rule Simulation ────────────────────────────────────────────
  // Delegates to PromptApprovalPolicyService

  private static async evaluateApprovalRule(
    prompt: any,
    parameters: Record<string, unknown>,
    warnings: string[],
  ): Promise<PromptImpactAssessment> {
    const hypotheticalMapping = parameters.hypothetical_risk_tier_mapping as Record<string, string[]> | undefined;
    const promptId = prompt.id;
    const riskTier = String(prompt.risk_tier || 'tier_1_low').toLowerCase();
    const currentRoles = PromptApprovalPolicyService.requiredApprovalRoles(riskTier);
    const simulatedRoles = hypotheticalMapping
      ? PromptApprovalPolicyService.computeRequiredRoles(riskTier, hypotheticalMapping)
      : currentRoles;

    const blockingIssues: SimBlockingIssue[] = [];
    const roleDiff = simulatedRoles.filter((r) => !currentRoles.includes(r));
    const roleRemoved = currentRoles.filter((r) => !simulatedRoles.includes(r));

    let impact: string;
    let severity: PromptImpactAssessment['severity'] = 'none';

    if (roleDiff.length > 0 || roleRemoved.length > 0) {
      if (roleDiff.length > 0) {
        blockingIssues.push({
          type: 'missing_simulated_role',
          detail: `Simulated mapping would require additional roles: ${roleDiff.join(', ')}. Current approvals may be incomplete.`,
          blocking: true,
        });
        severity = 'high';
      }
      if (roleRemoved.length > 0) {
        warnings.push(`Simulated mapping removes role(s) ${roleRemoved.join(', ')} for tier ${riskTier}.`);
      }
      impact = `Approval rule change: roles change from [${currentRoles.join(', ')}] to [${simulatedRoles.join(', ')}] for tier ${riskTier}.`;
    } else {
      impact = 'No change to approval role requirements for this prompt.';
    }

    return {
      prompt_id: promptId,
      title: prompt.name || promptId,
      current_risk_tier: riskTier,
      severity,
      affected_versions: prompt.current_version_id ? [prompt.current_version_id] : [],
      expected_impact: impact,
      blocking_issues: blockingIssues,
      recommended_action: roleDiff.length > 0
        ? `Ensure approvals are obtained from: ${roleDiff.join(', ')}`
        : 'No action required.',
    };
  }

  // ─── Risk Tier Threshold Simulation ──────────────────────────────────────
  // Delegates to DeploymentGateService + PromptApprovalPolicyService

  private static async evaluateRiskTierThreshold(
    prompt: any,
    parameters: Record<string, unknown>,
    workspaceId: string,
    warnings: string[],
  ): Promise<PromptImpactAssessment> {
    const newRiskTier = String(parameters.new_risk_tier || prompt.risk_tier || 'tier_1_low').toLowerCase();
    const currentTier = String(prompt.risk_tier || 'tier_1_low').toLowerCase();
    const promptId = prompt.id;

    if (newRiskTier === currentTier) {
      return {
        prompt_id: promptId,
        title: prompt.name || promptId,
        current_risk_tier: currentTier,
        severity: 'none',
        affected_versions: [],
        expected_impact: `Risk tier unchanged (${currentTier}). No impact.`,
        blocking_issues: [],
        recommended_action: '',
      };
    }

    const blockingIssues: SimBlockingIssue[] = [];
    const currentRoles = PromptApprovalPolicyService.requiredApprovalRoles(currentTier);
    const newRoles = PromptApprovalPolicyService.requiredApprovalRoles(newRiskTier);
    const extraRoles = newRoles.filter((r) => !currentRoles.includes(r));

    if (currentTier !== newRiskTier && extraRoles.length > 0) {
      blockingIssues.push({
        type: 'missing_approval_roles',
        detail: `Reclassifying to ${newRiskTier} requires additional approval roles: ${extraRoles.join(', ')}.`,
        blocking: true,
      });
    }

    // Check adversarial test status for the new risk tier
    if (prompt.current_version_id) {
      const advRuns = await supabaseAdmin
        .from('prompt_test_runs')
        .select('*')
        .eq('prompt_version_id', prompt.current_version_id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (advRuns.data && advRuns.data.length > 0) {
        const result = AdversarialTestService.isBlockingResult(newRiskTier, advRuns.data[0].pass_fail);
        if (result) {
          blockingIssues.push({
            type: 'adversarial_blocked',
            detail: `Adversarial test status would block deployment at ${newRiskTier}.`,
            blocking: true,
          });
        }
      }
    }

    let severity: PromptImpactAssessment['severity'] = blockingIssues.length > 0 ? 'high' : 'low';

    return {
      prompt_id: promptId,
      title: prompt.name || promptId,
      current_risk_tier: currentTier,
      severity,
      affected_versions: prompt.current_version_id ? [prompt.current_version_id] : [],
      expected_impact: `Reclassifying from ${currentTier} to ${newRiskTier} changes approval requirements from [${currentRoles.join(', ')}] to [${newRoles.join(', ')}].`,
      blocking_issues: blockingIssues,
      recommended_action: extraRoles.length > 0
        ? `Request approvals from: ${extraRoles.join(', ')} and re-run adversarial tests if needed.`
        : 'Risk tier change can proceed.',
    };
  }

  // ─── Deployment Rule Simulation ──────────────────────────────────────────
  // Delegates to DeploymentGateService

  private static async evaluateDeploymentRule(
    prompt: any,
    parameters: Record<string, unknown>,
    workspaceId: string,
    warnings: string[],
  ): Promise<PromptImpactAssessment> {
    const promptId = prompt.id;

    if (!prompt.current_version_id) {
      return {
        prompt_id: promptId,
        title: prompt.name || promptId,
        current_risk_tier: String(prompt.risk_tier || 'tier_1_low').toLowerCase(),
        severity: 'none',
        affected_versions: [],
        expected_impact: 'Prompt has no current version. Cannot evaluate deployment rules.',
        blocking_issues: [],
        recommended_action: 'Create a version first.',
      };
    }

    const gateResult = await DeploymentGateService.check(prompt.current_version_id, {
      prompt,
      riskTier: prompt.risk_tier,
      environment: String(parameters.environment || 'staging'),
      workspaceId,
      overrides: {
        requireAdversarialPass: parameters.require_adversarial_pass !== false,
        requireDriftResolution: parameters.require_drift_resolution !== false,
        minimumApprovals: (parameters.minimum_approvals as number) || undefined,
      },
    });

    const severity: PromptImpactAssessment['severity'] = gateResult.blockingIssues.some((i) => i.blocking)
      ? 'high'
      : gateResult.warnings.length > 0
        ? 'medium'
        : 'none';

    return {
      prompt_id: promptId,
      title: prompt.name || promptId,
      current_risk_tier: String(prompt.risk_tier || 'tier_1_low').toLowerCase(),
      severity,
      affected_versions: [prompt.current_version_id],
      expected_impact: gateResult.blockingIssues.length > 0
        ? `Deployment blocked by: ${gateResult.blockingIssues.map((i) => i.detail).join('; ')}`
        : 'Deployment rules are satisfied.',
      blocking_issues: gateResult.blockingIssues,
      recommended_action: gateResult.blockingIssues.length > 0
        ? `Resolve: ${gateResult.blockingIssues.map((i) => i.type).join(', ')}`
        : 'Ready to deploy.',
    };
  }

  // ─── Adversarial Policy Simulation ───────────────────────────────────────
  // Delegates to AdversarialTestService

  private static async evaluateAdversarialPolicy(
    prompt: any,
    parameters: Record<string, unknown>,
    workspaceId: string,
    warnings: string[],
  ): Promise<PromptImpactAssessment> {
    const promptId = prompt.id;
    const riskTier = String(prompt.risk_tier || 'tier_1_low').toLowerCase();

    if (!prompt.current_version_id) {
      return {
        prompt_id: promptId,
        title: prompt.name || promptId,
        current_risk_tier: riskTier,
        severity: 'none',
        affected_versions: [],
        expected_impact: 'No current version to evaluate.',
        blocking_issues: [],
        recommended_action: '',
      };
    }

    const advRuns = await PromptTestService.listAdversarialRuns(prompt.current_version_id);
    const latestAdv = advRuns[0];
    if (!latestAdv) {
      return {
        prompt_id: promptId,
        title: prompt.name || promptId,
        current_risk_tier: riskTier,
        severity: 'low',
        affected_versions: [prompt.current_version_id],
        expected_impact: 'No adversarial test run found. Cannot evaluate policy change impact.',
        blocking_issues: [],
        recommended_action: 'Run adversarial tests first.',
      };
    }

    const minScore = (parameters.pass_threshold as number) || undefined;
    const zeroCritical = parameters.require_zero_critical !== false;
    const passFail = AdversarialTestService.computePassFail(
      riskTier, latestAdv.score_summary as any, { minScore, zeroCritical },
    );

    const blockingIssues: SimBlockingIssue[] = [];
    if (passFail !== 'PASS') {
      blockingIssues.push({
        type: 'adversarial_policy_fail',
        detail: `Adversarial policy change would cause FAIL: score ${latestAdv.score_summary?.overall_score}, requires min score ${minScore ?? 'default'}.`,
        blocking: riskTier === 'tier_4_critical',
      });
    }

    return {
      prompt_id: promptId,
      title: prompt.name || promptId,
      current_risk_tier: riskTier,
      severity: blockingIssues.length > 0 ? 'high' : 'none',
      affected_versions: [prompt.current_version_id],
      expected_impact: blockingIssues.length > 0
        ? `Adversarial policy change would affect this prompt: ${blockingIssues[0].detail}`
        : 'Adversarial policy change does not affect this prompt.',
      blocking_issues: blockingIssues,
      recommended_action: blockingIssues.length > 0
        ? 'Review prompt body and re-run adversarial tests with updated thresholds.'
        : 'No action required.',
    };
  }

  // ─── Drift Tolerance Simulation ──────────────────────────────────────────
  // Delegates to GovernanceDriftService

  private static async evaluateDriftTolerance(
    prompt: any,
    parameters: Record<string, unknown>,
    workspaceId: string,
    warnings: string[],
  ): Promise<PromptImpactAssessment> {
    const promptId = prompt.id;

    const findings = await GovernanceDriftService.detectPromptDrift(promptId, workspaceId, {
      stalenessDays: (parameters.staleness_days as number) || undefined,
      auditGapMs: (parameters.audit_gap_seconds as number) != null
        ? (parameters.audit_gap_seconds as number) * 1000
        : undefined,
      riskTierGapMs: (parameters.risk_tier_gap_seconds as number) != null
        ? (parameters.risk_tier_gap_seconds as number) * 1000
        : undefined,
    });

    const severityMap: Record<string, 'none' | 'low' | 'medium' | 'high' | 'critical'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
    };
    const maxSeverity = findings.reduce((max, f) => {
      const s = severityMap[f.severity] || 'none';
      const levels = ['none', 'low', 'medium', 'high', 'critical'];
      return levels.indexOf(s) > levels.indexOf(max) ? s : max;
    }, 'none' as 'none' | 'low' | 'medium' | 'high' | 'critical');

    return {
      prompt_id: promptId,
      title: prompt.name || promptId,
      current_risk_tier: String(prompt.risk_tier || 'tier_1_low').toLowerCase(),
      severity: maxSeverity,
      affected_versions: prompt.current_version_id ? [prompt.current_version_id] : [],
      expected_impact: findings.length > 0
        ? `Drift tolerance change would affect this prompt: ${findings.length} finding(s) detected.`
        : 'No drift findings for this prompt.',
      blocking_issues: findings.map((f) => ({
        type: f.category,
        detail: f.description,
        blocking: f.severity === 'high',
      })),
      recommended_action: findings.length > 0
        ? `Review ${findings.length} drift finding(s) and resolve before policy change.`
        : 'No action required.',
    };
  }

  // ─── Binding Policy Simulation ───────────────────────────────────────────
  // Delegates to PromptBindingPolicyService (with PromptBindingService queries)

  private static async evaluateBindingPolicy(
    prompt: any,
    parameters: Record<string, unknown>,
    workspaceId: string,
    warnings: string[],
  ): Promise<PromptImpactAssessment> {
    const promptId = prompt.id;
    const riskTier = String(prompt.risk_tier || 'tier_1_low').toLowerCase();

    if (!prompt.current_version_id) {
      return {
        prompt_id: promptId,
        title: prompt.name || promptId,
        current_risk_tier: riskTier,
        severity: 'none',
        affected_versions: [],
        expected_impact: 'No current version to evaluate bindings.',
        blocking_issues: [],
        recommended_action: '',
      };
    }

    const { data: bindings } = await supabaseAdmin
      .from('prompt_bindings')
      .select('*')
      .eq('prompt_version_id', prompt.current_version_id);

    const allowedEnvs = parameters.allowed_environments as string[] | undefined;
    const maxBindings = parameters.max_bindings_per_version as number | undefined;

    const evaluation = PromptBindingPolicyService.evaluateBindings(
      bindings || [],
      allowedEnvs,
      maxBindings,
    );

    const severity: PromptImpactAssessment['severity'] = evaluation.violations.length > 0
      ? 'medium'
      : 'none';

    return {
      prompt_id: promptId,
      title: prompt.name || promptId,
      current_risk_tier: riskTier,
      severity,
      affected_versions: [prompt.current_version_id],
      expected_impact: evaluation.violations.length > 0
        ? `Binding policy change would affect ${evaluation.violations.length} binding(s).`
        : 'Binding policy change does not affect this prompt.',
      blocking_issues: evaluation.violations.map((v) => ({
        type: v.type,
        detail: v.detail,
        blocking: false,
      })),
      recommended_action: evaluation.violations.length > 0
        ? 'Review and update bindings to comply with the new policy.'
        : 'No action required.',
    };
  }
}
