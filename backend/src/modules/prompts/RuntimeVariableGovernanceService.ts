import * as crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { PromptVariableService } from './PromptVariableService';
import { ParameterPolicyService } from './ParameterPolicyService';
import { ConstraintShadowService, ConstraintRule } from './ConstraintShadowService';
import { PromptAuditService } from './PromptAuditService';

export interface RuntimeGovernanceInput {
  promptVersionId: string;
  parameters: Record<string, unknown>;
  riskTier: string;
  workspaceId: string;
  executionId?: string;
}

export interface RuntimeGovernanceResult {
  passed: boolean;
  variableValidation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  parameterPolicyResult: {
    allowed: boolean;
    blockedParams: string[];
  };
  constraintViolations: string[];
  enforcementAction: 'allow' | 'block' | 'escalate';
  governancePassId: string;
}

export class RuntimeVariableGovernanceService {
  static async enforce(input: RuntimeGovernanceInput): Promise<RuntimeGovernanceResult> {
    const constraintViolations: string[] = [];
    const governancePassId = `GOV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const variableResult = await PromptVariableService.validateVariables(
      input.promptVersionId,
      input.parameters,
    );

    const policyResult = await ParameterPolicyService.evaluateParameters(
      input.parameters,
      input.riskTier,
      input.promptVersionId,
    );

    // Runtime enforcement is driven by the LOCKED Constraint Shadow persisted at
    // commissioning — NOT the static risk-tier table. Fail closed if the locked
    // shadow is missing, hash-mismatched (tampered), or stale (rules changed
    // since lock): real production runs must not proceed on an unverifiable or
    // outdated guardrail.
    let shadowFailClosed: string | null = null;
    const lockedShadow = await ConstraintShadowService.getLockedShadow(input.promptVersionId);
    if (!lockedShadow) {
      shadowFailClosed = 'locked_constraint_shadow_missing';
    } else if (!ConstraintShadowService.verifyIntegrity(lockedShadow)) {
      shadowFailClosed = 'constraint_shadow_hash_mismatch';
    } else if (await ConstraintShadowService.isStale(input.promptVersionId, ConstraintShadowService.getRulesForTier(input.riskTier))) {
      shadowFailClosed = 'constraint_shadow_stale';
    } else {
      const lockedRules = (lockedShadow.compiled_shadow?.rules || []) as ConstraintRule[];
      for (const rule of lockedRules.filter((r) => r.severity === 'block' && r.enabled)) {
        constraintViolations.push(`Constraint [${rule.domain}] ${rule.rule}`);
      }
    }

    const hasBlockingViolations = constraintViolations.length > 0;
    const passed = !shadowFailClosed && variableResult.valid && policyResult.allowed && !hasBlockingViolations;

    let enforcementAction: 'allow' | 'block' | 'escalate' = 'allow';
    if (!passed) {
      // Any locked-shadow failure is non-negotiable: block regardless of tier.
      if (shadowFailClosed || input.riskTier === 'tier_4_critical' || input.riskTier === 'tier_3_high') {
        enforcementAction = 'block';
      } else {
        enforcementAction = 'escalate';
      }
    }

    await PromptAuditService.record({
      event_type: passed ? 'prompt.runtime.governance.passed' : 'prompt.runtime.governance.blocked',
      workspace_id: input.workspaceId,
      version_id: input.promptVersionId,
      risk_level: input.riskTier,
      reason: passed
        ? `Runtime governance passed (${governancePassId})`
        : `Runtime governance blocked: ${[
            ...(shadowFailClosed ? [`fail-closed: ${shadowFailClosed}`] : []),
            ...(!variableResult.valid ? ['variable validation failed'] : []),
            ...(!policyResult.allowed ? ['parameter policy blocked'] : []),
            ...(hasBlockingViolations ? ['constraint violations'] : []),
          ].join(', ')}`,
      after_state: {
        governance_pass_id: governancePassId,
        shadow_fail_closed: shadowFailClosed,
        locked_shadow_hash: lockedShadow?.shadow_hash ?? null,
        variable_valid: variableResult.valid,
        policy_allowed: policyResult.allowed,
        constraint_violations: constraintViolations.length,
        enforcement_action: enforcementAction,
      },
    });

    if (input.executionId) {
      try {
        await supabaseAdmin.from('prompt_runtime_traces').insert({
          execution_id: input.executionId,
          prompt_version_id: input.promptVersionId,
          workspace_id: input.workspaceId,
          tenant_id: input.workspaceId,
          violation: !passed,
          violation_reason: passed ? null : enforcementAction === 'block' ? 'runtime governance block' : 'runtime governance escalate',
          policy_result_json: {
            governance_pass_id: governancePassId,
            variable_valid: variableResult.valid,
            policy_allowed: policyResult.allowed,
            constraint_violations: constraintViolations,
            enforcement_action: enforcementAction,
          },
        });
      } catch {
      }
    }

    return {
      passed,
      variableValidation: {
        valid: variableResult.valid,
        errors: variableResult.errors,
        warnings: variableResult.warnings,
      },
      parameterPolicyResult: {
        allowed: policyResult.allowed,
        blockedParams: policyResult.blockedParams,
      },
      constraintViolations,
      enforcementAction,
      governancePassId,
    };
  }
}
